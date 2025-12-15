;; Pool Template Contract (Simplified)
;; Reference implementation of a verified liquidity pool
;; Implements pool-trait and uses Clarity 4 features for security and TWAP oracle

;; Implements the pool trait
(impl-trait .pool-trait.pool-trait)

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant FEE_BPS u30) ;; 0.3% fee (30 basis points)
(define-constant MINIMUM_LIQUIDITY u1000)
(define-constant BASIS_POINTS u10000)

;; Error codes
(define-constant ERR_NOT_AUTHORIZED (err u3001))
(define-constant ERR_INSUFFICIENT_LIQUIDITY (err u3002))
(define-constant ERR_INSUFFICIENT_OUTPUT (err u3003))
(define-constant ERR_SLIPPAGE_EXCEEDED (err u3004))
(define-constant ERR_ZERO_AMOUNT (err u3005))
(define-constant ERR_POOL_NOT_INITIALIZED (err u3006))
(define-constant ERR_ASSET_TRANSFER_FAILED (err u3007))
(define-constant ERR_ALREADY_INITIALIZED (err u3008))
(define-constant ERR_INSUFFICIENT_LP_TOKENS (err u3009))
(define-constant ERR_SAME_TOKEN (err u3010))
(define-constant ERR_MIN_LP_NOT_MET (err u3011))
(define-constant ERR_MIN_AMOUNTS_NOT_MET (err u3012))

;; Data variables
(define-data-var token-a-principal principal tx-sender)
(define-data-var token-b-principal principal tx-sender)
(define-data-var reserve-a uint u0)
(define-data-var reserve-b uint u0)
(define-data-var total-lp-supply uint u0)
(define-data-var is-initialized bool false)

;; TWAP tracking (using Clarity 4's stacks-block-time)
(define-data-var last-cumulative-price-a uint u0)
(define-data-var last-cumulative-price-b uint u0)
(define-data-var last-update-time uint u0)

;; LP token balances
(define-map lp-balances principal uint)

;; Initialize pool with token pair
(define-public (initialize (token-a principal) (token-b principal))
  (begin
    ;; Can only initialize once
    (asserts! (not (var-get is-initialized)) ERR_ALREADY_INITIALIZED)
    ;; Tokens must be different
    (asserts! (not (is-eq token-a token-b)) ERR_SAME_TOKEN)
    ;; Set token principals
    (var-set token-a-principal token-a)
    (var-set token-b-principal token-b)
    ;; Set initialized to true
    (var-set is-initialized true)
    ;; Initialize TWAP timestamp
    (var-set last-update-time stacks-block-time)
    (ok true)
  )
)

;; Add liquidity to the pool
;; Implements pool-trait function with deadline parameter
(define-public (add-liquidity (amount-a-desired uint) (amount-b-desired uint) (deadline uint))
  (let
    (
      (sender tx-sender)
      (current-reserve-a (var-get reserve-a))
      (current-reserve-b (var-get reserve-b))
      (current-supply (var-get total-lp-supply))
    )
    ;; Check pool is initialized
    (asserts! (var-get is-initialized) ERR_POOL_NOT_INITIALIZED)
    ;; Check amounts are greater than zero
    (asserts! (and (> amount-a-desired u0) (> amount-b-desired u0)) ERR_ZERO_AMOUNT)
    ;; Check deadline
    (asserts! (>= deadline stacks-block-time) ERR_SLIPPAGE_EXCEEDED)

    ;; For simplicity in this version, we'll just use the desired amounts
    ;; In production, would calculate optimal amounts
    (let
      (
        ;; Calculate LP tokens to mint
        (lp-tokens (if (is-eq current-supply u0)
          ;; First liquidity provider: use minimum of desired amounts
          (let ((initial-lp (if (< amount-a-desired amount-b-desired)
                                amount-a-desired
                                amount-b-desired)))
            ;; Ensure minimum liquidity
            (asserts! (>= initial-lp MINIMUM_LIQUIDITY) ERR_INSUFFICIENT_LIQUIDITY)
            initial-lp)
          ;; Subsequent providers: proportional to existing liquidity
          (if (< (/ (* amount-a-desired current-supply) current-reserve-a)
                 (/ (* amount-b-desired current-supply) current-reserve-b))
              (/ (* amount-a-desired current-supply) current-reserve-a)
              (/ (* amount-b-desired current-supply) current-reserve-b))))
      )
      ;; Mint LP tokens to user
      (map-set lp-balances
        sender
        (+ (default-to u0 (map-get? lp-balances sender)) lp-tokens))

      ;; Update reserves
      (var-set reserve-a (+ current-reserve-a amount-a-desired))
      (var-set reserve-b (+ current-reserve-b amount-b-desired))

      ;; Update total supply
      (var-set total-lp-supply (+ current-supply lp-tokens))

      ;; Update TWAP
      (unwrap! (update-twap) ERR_INSUFFICIENT_LIQUIDITY)

      ;; Return result as per trait specification
      (ok (tuple
        (lp-tokens lp-tokens)
        (token-a-used amount-a-desired)
        (token-b-used amount-b-desired)
      ))
    )
  )
)

;; Remove liquidity from the pool
(define-public (remove-liquidity (lp-amount uint) (min-token-a uint) (min-token-b uint))
  (let
    (
      (sender tx-sender)
      (current-reserve-a (var-get reserve-a))
      (current-reserve-b (var-get reserve-b))
      (current-supply (var-get total-lp-supply))
      (sender-balance (default-to u0 (map-get? lp-balances sender)))
    )
    ;; Check pool is initialized
    (asserts! (var-get is-initialized) ERR_POOL_NOT_INITIALIZED)
    ;; Check LP amount is valid
    (asserts! (> lp-amount u0) ERR_ZERO_AMOUNT)
    (asserts! (<= lp-amount sender-balance) ERR_INSUFFICIENT_LP_TOKENS)

    ;; Calculate tokens to return
    (let
      (
        (token-a-amount (/ (* lp-amount current-reserve-a) current-supply))
        (token-b-amount (/ (* lp-amount current-reserve-b) current-supply))
      )
      ;; Check minimum amounts
      (asserts! (>= token-a-amount min-token-a) ERR_MIN_AMOUNTS_NOT_MET)
      (asserts! (>= token-b-amount min-token-b) ERR_MIN_AMOUNTS_NOT_MET)

      ;; Burn LP tokens
      (map-set lp-balances sender (- sender-balance lp-amount))

      ;; Update total supply
      (var-set total-lp-supply (- current-supply lp-amount))

      ;; Update reserves
      (var-set reserve-a (- current-reserve-a token-a-amount))
      (var-set reserve-b (- current-reserve-b token-b-amount))

      ;; Update TWAP
      (unwrap! (update-twap) ERR_INSUFFICIENT_LIQUIDITY)

      ;; Return result
      (ok (tuple
        (token-a token-a-amount)
        (token-b token-b-amount)
      ))
    )
  )
)

;; Swap token A for token B
(define-public (swap-a-for-b (amount-in uint) (min-amount-out uint))
  (let
    (
      (sender tx-sender)
      (current-reserve-a (var-get reserve-a))
      (current-reserve-b (var-get reserve-b))
    )
    ;; Check pool is initialized
    (asserts! (var-get is-initialized) ERR_POOL_NOT_INITIALIZED)
    ;; Check amount is valid
    (asserts! (> amount-in u0) ERR_ZERO_AMOUNT)

    ;; Calculate output amount using constant product formula with fee
    (let
      (
        ;; Apply fee to input amount
        (amount-in-with-fee (* amount-in (- BASIS_POINTS FEE_BPS)))
        ;; Calculate output: (reserve-b * amount-in-with-fee) / (reserve-a * 10000 + amount-in-with-fee)
        (amount-out (/ (* current-reserve-b amount-in-with-fee)
                      (+ (* current-reserve-a BASIS_POINTS) amount-in-with-fee)))
      )
      ;; Check slippage
      (asserts! (>= amount-out min-amount-out) ERR_SLIPPAGE_EXCEEDED)

      ;; Update reserves
      (var-set reserve-a (+ current-reserve-a amount-in))
      (var-set reserve-b (- current-reserve-b amount-out))

      ;; Update TWAP
      (unwrap! (update-twap) ERR_INSUFFICIENT_LIQUIDITY)

      ;; Return amount out
      (ok amount-out)
    )
  )
)

;; Swap token B for token A
(define-public (swap-b-for-a (amount-in uint) (min-amount-out uint))
  (let
    (
      (sender tx-sender)
      (current-reserve-a (var-get reserve-a))
      (current-reserve-b (var-get reserve-b))
    )
    ;; Check pool is initialized
    (asserts! (var-get is-initialized) ERR_POOL_NOT_INITIALIZED)
    ;; Check amount is valid
    (asserts! (> amount-in u0) ERR_ZERO_AMOUNT)

    ;; Calculate output amount using constant product formula with fee
    (let
      (
        ;; Apply fee to input amount
        (amount-in-with-fee (* amount-in (- BASIS_POINTS FEE_BPS)))
        ;; Calculate output: (reserve-a * amount-in-with-fee) / (reserve-b * 10000 + amount-in-with-fee)
        (amount-out (/ (* current-reserve-a amount-in-with-fee)
                      (+ (* current-reserve-b BASIS_POINTS) amount-in-with-fee)))
      )
      ;; Check slippage
      (asserts! (>= amount-out min-amount-out) ERR_SLIPPAGE_EXCEEDED)

      ;; Update reserves
      (var-set reserve-a (- current-reserve-a amount-out))
      (var-set reserve-b (+ current-reserve-b amount-in))

      ;; Update TWAP
      (unwrap! (update-twap) ERR_INSUFFICIENT_LIQUIDITY)

      ;; Return amount out
      (ok amount-out)
    )
  )
)

;; Update TWAP oracle
;; USES CLARITY 4: stacks-block-time for accurate time-weighted pricing
(define-private (update-twap)
  (let
    (
      (current-time stacks-block-time)
      (time-elapsed (- current-time (var-get last-update-time)))
      (current-reserve-a (var-get reserve-a))
      (current-reserve-b (var-get reserve-b))
    )
    (if (and (> time-elapsed u0) (> current-reserve-a u0) (> current-reserve-b u0))
      (begin
        ;; Update cumulative prices
        ;; price-a-cumulative += (reserve-b / reserve-a) * time-elapsed
        (var-set last-cumulative-price-a
          (+ (var-get last-cumulative-price-a)
             (* (/ (* current-reserve-b BASIS_POINTS) current-reserve-a) time-elapsed)))

        ;; price-b-cumulative += (reserve-a / reserve-b) * time-elapsed
        (var-set last-cumulative-price-b
          (+ (var-get last-cumulative-price-b)
             (* (/ (* current-reserve-a BASIS_POINTS) current-reserve-b) time-elapsed)))

        ;; Update last update time
        (var-set last-update-time current-time)
        (ok true)
      )
      (ok false)
    )
  )
)

;; Read-only functions (implementing pool-trait)

(define-read-only (get-reserves)
  (if (var-get is-initialized)
    (ok (tuple
      (reserve-a (var-get reserve-a))
      (reserve-b (var-get reserve-b))
    ))
    ERR_POOL_NOT_INITIALIZED
  )
)

(define-read-only (get-fee)
  (ok FEE_BPS)
)

(define-read-only (get-tokens)
  (ok (tuple
    (token-a (var-get token-a-principal))
    (token-b (var-get token-b-principal))
  ))
)

;; Additional read-only functions

(define-read-only (get-lp-balance (account principal))
  (default-to u0 (map-get? lp-balances account))
)

(define-read-only (get-total-supply)
  (ok (var-get total-lp-supply))
)

(define-read-only (get-pool-info)
  (ok {
    is-initialized: (var-get is-initialized),
    token-a: (var-get token-a-principal),
    token-b: (var-get token-b-principal),
    reserve-a: (var-get reserve-a),
    reserve-b: (var-get reserve-b),
    total-supply: (var-get total-lp-supply),
    fee: FEE_BPS
  })
)

;; Get TWAP prices
(define-read-only (get-twap-price-a)
  (ok (var-get last-cumulative-price-a))
)

(define-read-only (get-twap-price-b)
  (ok (var-get last-cumulative-price-b))
)

(define-read-only (get-last-update-time)
  (ok (var-get last-update-time))
)

;; Calculate spot price (current ratio)
(define-read-only (get-spot-price)
  (let
    (
      (current-reserve-a (var-get reserve-a))
      (current-reserve-b (var-get reserve-b))
    )
    (if (and (> current-reserve-a u0) (> current-reserve-b u0))
      (ok {
        price-a-in-b: (/ (* current-reserve-b BASIS_POINTS) current-reserve-a),
        price-b-in-a: (/ (* current-reserve-a BASIS_POINTS) current-reserve-b)
      })
      ERR_POOL_NOT_INITIALIZED
    )
  )
)