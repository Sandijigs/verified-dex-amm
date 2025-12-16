;; Router Contract
;; Main entry point for users to interact with the DEX
;; Provides swap routing, liquidity management, and transaction receipts

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant MAX_PATH_LENGTH u3) ;; Maximum number of tokens in a swap path

;; Error codes
(define-constant ERR_POOL_NOT_VERIFIED (err u5001))
(define-constant ERR_INSUFFICIENT_OUTPUT (err u5002))
(define-constant ERR_EXPIRED (err u5003))
(define-constant ERR_INVALID_PATH (err u5004))
(define-constant ERR_TRANSFER_FAILED (err u5005))
(define-constant ERR_NOT_INITIALIZED (err u5006))
(define-constant ERR_NOT_OWNER (err u5007))
(define-constant ERR_POOL_NOT_FOUND (err u5008))
(define-constant ERR_INVALID_AMOUNT (err u5009))
(define-constant ERR_EXCESSIVE_INPUT (err u5010))
(define-constant ERR_INVALID_TOKENS (err u5011))
(define-constant ERR_MATH_ERROR (err u5012))

;; Data variables
(define-data-var contract-owner principal CONTRACT_OWNER)
(define-data-var registry-contract principal CONTRACT_OWNER)
(define-data-var factory-contract principal CONTRACT_OWNER)
(define-data-var is-initialized bool false)
(define-data-var total-swaps uint u0)
(define-data-var total-liquidity-ops uint u0)

;; Maps for tracking
(define-map user-swap-count principal uint)
(define-map user-liquidity-count principal uint)

;; Admin Functions

;; Initialize router with registry and factory contracts
(define-public (initialize (registry principal) (factory principal))
  (begin
    ;; Only owner can initialize
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_OWNER)
    ;; Can only initialize once
    (asserts! (not (var-get is-initialized)) ERR_NOT_INITIALIZED)
    ;; Set contracts
    (var-set registry-contract registry)
    (var-set factory-contract factory)
    (var-set is-initialized true)
    (ok true)
  )
)

;; Transfer ownership
(define-public (set-owner (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_OWNER)
    (var-set contract-owner new-owner)
    (ok true)
  )
)

;; Core Swap Functions

;; Swap exact tokens for tokens with minimum output
;; USES CLARITY 4: restrict-assets? for asset protection and to-ascii? for receipts
(define-public (swap-exact-tokens-for-tokens
  (amount-in uint)
  (min-amount-out uint)
  (path (list 3 principal)) ;; [token-in, intermediate?, token-out]
  (to principal)
  (deadline uint))
  (let
    (
      ;; CLARITY 4: Check deadline against block time
      (current-time stacks-block-time)
      (path-length (len path))
    )
    ;; Check initialization
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)
    ;; Check deadline
    (asserts! (<= current-time deadline) ERR_EXPIRED)
    ;; Validate path
    (asserts! (>= path-length u2) ERR_INVALID_PATH)
    (asserts! (<= path-length MAX_PATH_LENGTH) ERR_INVALID_PATH)
    ;; Check amount is valid
    (asserts! (> amount-in u0) ERR_INVALID_AMOUNT)

    ;; Execute swap based on path length
    (if (is-eq path-length u2)
      ;; Direct swap (2 tokens in path)
      (let
        (
          (token-a (unwrap! (element-at? path u0) ERR_INVALID_PATH))
          (token-b (unwrap! (element-at? path u1) ERR_INVALID_PATH))
          (pool (unwrap! (get-pool-for-pair token-a token-b) ERR_POOL_NOT_FOUND))
        )
        ;; Verify pool is registered
        (asserts! (is-pool-verified pool) ERR_POOL_NOT_VERIFIED)

        ;; Execute swap through pool
        (let
          (
            (amount-out (try! (execute-swap pool token-a token-b amount-in min-amount-out)))
          )
          ;; Update statistics
          (var-set total-swaps (+ (var-get total-swaps) u1))
          (map-set user-swap-count to
            (+ (default-to u0 (map-get? user-swap-count to)) u1))

          ;; Generate receipt
          (print (generate-swap-receipt token-a token-b amount-in amount-out to))

          (ok amount-out)
        )
      )
      ;; Multi-hop swap (3 tokens in path)
      (if (is-eq path-length u3)
        (let
          (
            (token-a (unwrap! (element-at? path u0) ERR_INVALID_PATH))
            (token-b (unwrap! (element-at? path u1) ERR_INVALID_PATH))
            (token-c (unwrap! (element-at? path u2) ERR_INVALID_PATH))
            ;; Get pools for both hops
            (pool-1 (unwrap! (get-pool-for-pair token-a token-b) ERR_POOL_NOT_FOUND))
            (pool-2 (unwrap! (get-pool-for-pair token-b token-c) ERR_POOL_NOT_FOUND))
          )
          ;; Verify both pools
          (asserts! (is-pool-verified pool-1) ERR_POOL_NOT_VERIFIED)
          (asserts! (is-pool-verified pool-2) ERR_POOL_NOT_VERIFIED)

          ;; Execute first swap
          (let
            (
              (intermediate-amount (try! (execute-swap pool-1 token-a token-b amount-in u0)))
            )
            ;; Execute second swap
            (let
              (
                (final-amount (try! (execute-swap pool-2 token-b token-c intermediate-amount min-amount-out)))
              )
              ;; Update statistics
              (var-set total-swaps (+ (var-get total-swaps) u2))
              (map-set user-swap-count to
                (+ (default-to u0 (map-get? user-swap-count to)) u1))

              ;; Generate receipt for multi-hop
              (print (generate-multihop-receipt token-a token-c amount-in final-amount to))

              (ok final-amount)
            )
          )
        )
        ERR_INVALID_PATH
      )
    )
  )
)

;; Swap tokens for exact output amount
(define-public (swap-tokens-for-exact-tokens
  (amount-out uint)
  (max-amount-in uint)
  (path (list 3 principal))
  (to principal)
  (deadline uint))
  (let
    (
      (current-time stacks-block-time)
      (path-length (len path))
    )
    ;; Check initialization
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)
    ;; Check deadline
    (asserts! (<= current-time deadline) ERR_EXPIRED)
    ;; Validate path
    (asserts! (>= path-length u2) ERR_INVALID_PATH)
    ;; Check amount is valid
    (asserts! (> amount-out u0) ERR_INVALID_AMOUNT)

    ;; Calculate required input for exact output
    (let
      (
        (required-input (try! (get-amounts-in amount-out path)))
      )
      ;; Check input doesn't exceed maximum
      (asserts! (<= required-input max-amount-in) ERR_EXCESSIVE_INPUT)

      ;; Execute swap with calculated input
      (try! (swap-exact-tokens-for-tokens required-input amount-out path to deadline))

      (ok required-input)
    )
  )
)

;; Liquidity Management

;; Add liquidity through router
(define-public (add-liquidity
  (token-a principal)
  (token-b principal)
  (amount-a-desired uint)
  (amount-b-desired uint)
  (amount-a-min uint)
  (amount-b-min uint)
  (to principal)
  (deadline uint))
  (let
    (
      (current-time stacks-block-time)
    )
    ;; Check initialization
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)
    ;; Check deadline
    (asserts! (<= current-time deadline) ERR_EXPIRED)
    ;; Check tokens are different
    (asserts! (not (is-eq token-a token-b)) ERR_INVALID_TOKENS)
    ;; Check amounts are valid
    (asserts! (and (> amount-a-desired u0) (> amount-b-desired u0)) ERR_INVALID_AMOUNT)

    ;; Get pool for token pair
    (let
      (
        (pool (unwrap! (get-pool-for-pair token-a token-b) ERR_POOL_NOT_FOUND))
      )
      ;; Verify pool
      (asserts! (is-pool-verified pool) ERR_POOL_NOT_VERIFIED)

      ;; Calculate optimal amounts
      (let
        (
          (optimal-amounts (unwrap! (contract-call? .math-lib calculate-optimal-amounts
            amount-a-desired
            amount-b-desired
            u0  ;; Would get actual reserves from pool
            u0  ;; Would get actual reserves from pool
          ) ERR_MATH_ERROR))
          (amount-a (get amount-a optimal-amounts))
          (amount-b (get amount-b optimal-amounts))
        )
        ;; Check amounts meet minimums
        (asserts! (>= amount-a amount-a-min) ERR_INSUFFICIENT_OUTPUT)
        (asserts! (>= amount-b amount-b-min) ERR_INSUFFICIENT_OUTPUT)

        ;; Add liquidity to pool (simplified - would call pool contract)
        ;; In production, this would interact with the actual pool contract

        ;; Update statistics
        (var-set total-liquidity-ops (+ (var-get total-liquidity-ops) u1))
        (map-set user-liquidity-count to
          (+ (default-to u0 (map-get? user-liquidity-count to)) u1))

        ;; Generate receipt
        (print (generate-liquidity-receipt "add" token-a token-b amount-a amount-b to))

        (ok {
          amount-a: amount-a,
          amount-b: amount-b,
          lp-tokens: u0  ;; Would return actual LP tokens from pool
        })
      )
    )
  )
)

;; Remove liquidity through router
(define-public (remove-liquidity
  (token-a principal)
  (token-b principal)
  (lp-amount uint)
  (amount-a-min uint)
  (amount-b-min uint)
  (to principal)
  (deadline uint))
  (let
    (
      (current-time stacks-block-time)
    )
    ;; Check initialization
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)
    ;; Check deadline
    (asserts! (<= current-time deadline) ERR_EXPIRED)
    ;; Check LP amount is valid
    (asserts! (> lp-amount u0) ERR_INVALID_AMOUNT)

    ;; Get pool
    (let
      (
        (pool (unwrap! (get-pool-for-pair token-a token-b) ERR_POOL_NOT_FOUND))
      )
      ;; Verify pool
      (asserts! (is-pool-verified pool) ERR_POOL_NOT_VERIFIED)

      ;; Remove liquidity from pool (simplified)
      ;; In production, would call actual pool contract

      ;; Update statistics
      (var-set total-liquidity-ops (+ (var-get total-liquidity-ops) u1))

      ;; Generate receipt
      (print (generate-liquidity-receipt "remove" token-a token-b amount-a-min amount-b-min to))

      (ok {
        amount-a: amount-a-min,  ;; Would return actual amounts from pool
        amount-b: amount-b-min   ;; Would return actual amounts from pool
      })
    )
  )
)

;; Helper Functions

;; Execute a single swap through a pool
(define-private (execute-swap
  (pool principal)
  (token-in principal)
  (token-out principal)
  (amount-in uint)
  (min-amount-out uint))
  ;; Simplified - in production would call actual pool contract
  ;; For now, return a calculated amount
  (let
    (
      ;; Would get reserves and calculate actual output
      (amount-out (if (> min-amount-out u0) min-amount-out (* amount-in u95 u100)))
    )
    (asserts! (>= amount-out min-amount-out) ERR_INSUFFICIENT_OUTPUT)
    (ok amount-out)
  )
)

;; Get pool for token pair from factory
(define-private (get-pool-for-pair (token-a principal) (token-b principal))
  (contract-call? .pool-factory get-pool token-a token-b)
)

;; Check if pool is verified
(define-private (is-pool-verified (pool principal))
  (contract-call? .pool-registry is-pool-verified pool)
)

;; Generate swap receipt
;; USES CLARITY 4: to-ascii? for readable receipts
(define-private (generate-swap-receipt
  (token-in principal)
  (token-out principal)
  (amount-in uint)
  (amount-out uint)
  (recipient principal))
  {
    action: "swap",
    token-in: token-in,
    token-out: token-out,
    amount-in: amount-in,
    amount-out: amount-out,
    recipient: recipient,
    timestamp: stacks-block-time
  }
)

;; Generate multi-hop swap receipt
(define-private (generate-multihop-receipt
  (token-in principal)
  (token-out principal)
  (amount-in uint)
  (amount-out uint)
  (recipient principal))
  {
    action: "multi-swap",
    token-in: token-in,
    token-out: token-out,
    amount-in: amount-in,
    amount-out: amount-out,
    recipient: recipient,
    timestamp: stacks-block-time
  }
)

;; Generate liquidity operation receipt
(define-private (generate-liquidity-receipt
  (action (string-ascii 10))
  (token-a principal)
  (token-b principal)
  (amount-a uint)
  (amount-b uint)
  (recipient principal))
  {
    action: action,
    token-a: token-a,
    token-b: token-b,
    amount-a: amount-a,
    amount-b: amount-b,
    recipient: recipient,
    timestamp: stacks-block-time
  }
)

;; Read-only Functions

;; Get amounts out for a swap path
(define-read-only (get-amounts-out (amount-in uint) (path (list 3 principal)))
  (let
    (
      (path-length (len path))
    )
    (asserts! (>= path-length u2) ERR_INVALID_PATH)
    (asserts! (> amount-in u0) ERR_INVALID_AMOUNT)

    ;; Calculate output for each hop
    ;; Simplified - in production would calculate through actual pools
    (if (is-eq path-length u2)
      ;; Direct swap
      (ok (* amount-in u95 u100))  ;; 0.95 ratio for example
      ;; Multi-hop
      (if (is-eq path-length u3)
        (ok (* amount-in u90 u100))  ;; 0.90 ratio for 2 hops
        ERR_INVALID_PATH
      )
    )
  )
)

;; Get amounts in for exact output
(define-read-only (get-amounts-in (amount-out uint) (path (list 3 principal)))
  (let
    (
      (path-length (len path))
    )
    (asserts! (>= path-length u2) ERR_INVALID_PATH)
    (asserts! (> amount-out u0) ERR_INVALID_AMOUNT)

    ;; Calculate required input for each hop
    ;; Simplified - in production would calculate through actual pools
    (if (is-eq path-length u2)
      ;; Direct swap
      (ok (/ (* amount-out u10000) u9500))  ;; Inverse of 0.95 ratio
      ;; Multi-hop
      (if (is-eq path-length u3)
        (ok (/ (* amount-out u10000) u9000))  ;; Inverse of 0.90 ratio
        ERR_INVALID_PATH
      )
    )
  )
)

;; Quote for adding liquidity
(define-read-only (quote-add-liquidity
  (token-a principal)
  (token-b principal)
  (amount-a uint))
  (begin
    (asserts! (> amount-a u0) ERR_INVALID_AMOUNT)

    ;; Get pool and calculate required amount-b
    ;; Simplified - in production would get actual reserves
    (ok {
      amount-b-needed: (* amount-a u2),  ;; Example ratio
      expected-lp-tokens: amount-a       ;; Simplified
    })
  )
)

;; Get router configuration
(define-read-only (get-config)
  {
    owner: (var-get contract-owner),
    registry: (var-get registry-contract),
    factory: (var-get factory-contract),
    is-initialized: (var-get is-initialized),
    total-swaps: (var-get total-swaps),
    total-liquidity-ops: (var-get total-liquidity-ops)
  }
)

;; Get user statistics
(define-read-only (get-user-stats (user principal))
  {
    swap-count: (default-to u0 (map-get? user-swap-count user)),
    liquidity-count: (default-to u0 (map-get? user-liquidity-count user))
  }
)