;; sBTC-STX AMM Pool Contract
;; Constant product AMM (x*y=k) for STX/sBTC trading with LP tokens
;; Phase 1 - Verified DEX

;; ============================================
;; TRAITS
;; ============================================

(use-trait sip-010-trait .sip-010-trait.sip-010-trait)

;; ============================================
;; CONSTANTS
;; ============================================

(define-constant CONTRACT_OWNER tx-sender)
(define-constant SBTC_CONTRACT .test-token)

;; Error codes
(define-constant ERR_NOT_AUTHORIZED (err u1001))
(define-constant ERR_ALREADY_INITIALIZED (err u1002))
(define-constant ERR_NOT_INITIALIZED (err u1003))
(define-constant ERR_INSUFFICIENT_LIQUIDITY (err u1004))
(define-constant ERR_SLIPPAGE_TOO_HIGH (err u1005))
(define-constant ERR_INVALID_AMOUNT (err u1006))
(define-constant ERR_INSUFFICIENT_STX (err u1007))
(define-constant ERR_INSUFFICIENT_SBTC (err u1008))
(define-constant ERR_ZERO_LIQUIDITY (err u1009))
(define-constant ERR_MIN_LIQUIDITY (err u1010))
(define-constant ERR_INSUFFICIENT_LP_BALANCE (err u1011))
(define-constant ERR_TRANSFER_FAILED (err u1012))
(define-constant ERR_ORACLE_UPDATE_FAILED (err u1013))

;; Fee constants (basis points)
(define-constant FEE_SWAP u30)           ;; 0.3% swap fee
(define-constant FEE_PROTOCOL u5)        ;; 0.05% protocol fee
(define-constant FEE_DENOMINATOR u10000)

;; Minimum liquidity locked permanently
(define-constant MINIMUM_LIQUIDITY u1000)

;; TWAP constants
(define-constant TWAP_PRECISION u1000000)

;; ============================================
;; DATA VARIABLES
;; ============================================

(define-data-var is-initialized bool false)
(define-data-var reserve-stx uint u0)
(define-data-var reserve-sbtc uint u0)
(define-data-var total-lp-supply uint u0)
(define-data-var protocol-fee-stx uint u0)
(define-data-var protocol-fee-sbtc uint u0)

;; TWAP oracle data
(define-data-var last-price-cumulative uint u0)
(define-data-var last-update-block uint u0)
(define-data-var block-timestamp-last uint u0)

;; ============================================
;; DATA MAPS
;; ============================================

(define-map lp-balances principal uint)
(define-map price-observations
  uint
  {
    timestamp: uint,
    price-cumulative: uint,
    reserve-stx: uint,
    reserve-sbtc: uint
  }
)

;; ============================================
;; HELPER FUNCTIONS
;; ============================================

;; Integer square root using iterative method (non-recursive)
(define-read-only (sqrt (n uint))
  (if (is-eq n u0)
    u0
    (if (<= n u3)
      u1
      (let (
        (initial-guess (/ n u2))
      )
        ;; Inline Newton's method iteration
        (fold sqrt-fold-helper
          (list u1 u2 u3 u4 u5 u6 u7 u8 u9 u10 u11 u12 u13 u14 u15 u16 u17 u18 u19 u20)
          {n: n, guess: initial-guess}
        )
      )
    )
  )
)

(define-private (sqrt-fold-helper (iteration uint) (state {n: uint, guess: uint}))
  (let (
    (n (get n state))
    (current-guess (get guess state))
    (next-guess (/ (+ current-guess (/ n current-guess)) u2))
  )
    (if (is-eq next-guess current-guess)
      state
      {n: n, guess: next-guess}
    )
  )
)

;; Calculate swap fee
(define-private (calculate-fee (amount uint) (fee-rate uint))
  (/ (* amount fee-rate) FEE_DENOMINATOR)
)

;; Update TWAP oracle
(define-private (update-oracle)
  (let (
    (current-block block-height)
    (last-block (var-get last-update-block))
    (stx-reserve (var-get reserve-stx))
    (sbtc-reserve (var-get reserve-sbtc))
  )
    (if (and (> stx-reserve u0) (> sbtc-reserve u0))
      (let (
        (price (* (/ (* sbtc-reserve TWAP_PRECISION) stx-reserve) (- current-block last-block)))
        (new-cumulative (+ (var-get last-price-cumulative) price))
      )
        (var-set last-price-cumulative new-cumulative)
        (var-set last-update-block current-block)
        (map-set price-observations current-block {
          timestamp: block-height,
          price-cumulative: new-cumulative,
          reserve-stx: stx-reserve,
          reserve-sbtc: sbtc-reserve
        })
        (ok true)
      )
      (ok false)
    )
  )
)

;; ============================================
;; INITIALIZATION
;; ============================================

(define-public (initialize)
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (asserts! (not (var-get is-initialized)) ERR_ALREADY_INITIALIZED)

    (var-set is-initialized true)
    (var-set last-update-block block-height)

    (print {
      event: "pool-initialized",
      pool: "STX-sBTC",
      initialized-by: tx-sender
    })

    (ok true)
  )
)

;; ============================================
;; LP TOKEN MANAGEMENT
;; ============================================

(define-private (mint-lp (recipient principal) (amount uint))
  (let (
    (current-balance (default-to u0 (map-get? lp-balances recipient)))
    (new-balance (+ current-balance amount))
    (new-total-supply (+ (var-get total-lp-supply) amount))
  )
    (map-set lp-balances recipient new-balance)
    (var-set total-lp-supply new-total-supply)
    (ok true)
  )
)

(define-private (burn-lp (owner principal) (amount uint))
  (let (
    (current-balance (default-to u0 (map-get? lp-balances owner)))
  )
    (asserts! (>= current-balance amount) ERR_INSUFFICIENT_LP_BALANCE)
    (let (
      (new-balance (- current-balance amount))
      (new-total-supply (- (var-get total-lp-supply) amount))
    )
      (map-set lp-balances owner new-balance)
      (var-set total-lp-supply new-total-supply)
      (ok true)
    )
  )
)

;; ============================================
;; LIQUIDITY FUNCTIONS
;; ============================================

(define-public (add-liquidity
  (stx-amount uint)
  (sbtc-amount uint)
  (min-lp-tokens uint)
)
  (begin
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)
    (asserts! (> stx-amount u0) ERR_INVALID_AMOUNT)
    (asserts! (> sbtc-amount u0) ERR_INVALID_AMOUNT)

    (let (
      (stx-reserve (var-get reserve-stx))
      (sbtc-reserve (var-get reserve-sbtc))
      (total-supply (var-get total-lp-supply))
      (lp-tokens-to-mint
        (if (is-eq total-supply u0)
          ;; First liquidity provision
          (let (
            (sqrt-result (sqrt (* stx-amount sbtc-amount)))
            (initial-lp (get guess sqrt-result))
          )
            (asserts! (>= initial-lp MINIMUM_LIQUIDITY) ERR_MIN_LIQUIDITY)
            ;; Lock minimum liquidity permanently
            (try! (mint-lp (as-contract tx-sender) MINIMUM_LIQUIDITY))
            (- initial-lp MINIMUM_LIQUIDITY)
          )
          ;; Subsequent liquidity provision
          (let (
            (lp-from-stx (/ (* stx-amount total-supply) stx-reserve))
            (lp-from-sbtc (/ (* sbtc-amount total-supply) sbtc-reserve))
          )
            (if (<= lp-from-stx lp-from-sbtc)
              lp-from-stx
              lp-from-sbtc
            )
          )
        )
      )
    )
      ;; Check slippage protection
      (asserts! (>= lp-tokens-to-mint min-lp-tokens) ERR_SLIPPAGE_TOO_HIGH)

      ;; Transfer STX from user to contract
      (try! (stx-transfer? stx-amount tx-sender (as-contract tx-sender)))

      ;; Transfer sBTC from user to contract
      (try! (contract-call? SBTC_CONTRACT transfer sbtc-amount tx-sender (as-contract tx-sender) none))

      ;; Update reserves
      (var-set reserve-stx (+ stx-reserve stx-amount))
      (var-set reserve-sbtc (+ sbtc-reserve sbtc-amount))

      ;; Mint LP tokens
      (try! (mint-lp tx-sender lp-tokens-to-mint))

      ;; Update oracle
      (try! (update-oracle))

      (print {
        event: "liquidity-added",
        provider: tx-sender,
        stx-amount: stx-amount,
        sbtc-amount: sbtc-amount,
        lp-tokens: lp-tokens-to-mint,
        total-lp-supply: (var-get total-lp-supply)
      })

      (ok lp-tokens-to-mint)
    )
  )
)

(define-public (remove-liquidity
  (lp-tokens uint)
  (min-stx uint)
  (min-sbtc uint)
)
  (begin
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)
    (asserts! (> lp-tokens u0) ERR_INVALID_AMOUNT)

    (let (
      (stx-reserve (var-get reserve-stx))
      (sbtc-reserve (var-get reserve-sbtc))
      (total-supply (var-get total-lp-supply))
      (stx-to-return (/ (* lp-tokens stx-reserve) total-supply))
      (sbtc-to-return (/ (* lp-tokens sbtc-reserve) total-supply))
    )
      ;; Check slippage protection
      (asserts! (>= stx-to-return min-stx) ERR_SLIPPAGE_TOO_HIGH)
      (asserts! (>= sbtc-to-return min-sbtc) ERR_SLIPPAGE_TOO_HIGH)
      (asserts! (> stx-to-return u0) ERR_INSUFFICIENT_LIQUIDITY)
      (asserts! (> sbtc-to-return u0) ERR_INSUFFICIENT_LIQUIDITY)

      ;; Burn LP tokens
      (try! (burn-lp tx-sender lp-tokens))

      ;; Update reserves
      (var-set reserve-stx (- stx-reserve stx-to-return))
      (var-set reserve-sbtc (- sbtc-reserve sbtc-to-return))

      ;; Transfer STX to user
      (try! (as-contract (stx-transfer? stx-to-return (as-contract tx-sender) tx-sender)))

      ;; Transfer sBTC to user
      (try! (as-contract (contract-call? SBTC_CONTRACT transfer sbtc-to-return (as-contract tx-sender) tx-sender none)))

      ;; Update oracle
      (try! (update-oracle))

      (print {
        event: "liquidity-removed",
        provider: tx-sender,
        lp-tokens: lp-tokens,
        stx-returned: stx-to-return,
        sbtc-returned: sbtc-to-return,
        total-lp-supply: (var-get total-lp-supply)
      })

      (ok {stx: stx-to-return, sbtc: sbtc-to-return})
    )
  )
)

;; ============================================
;; SWAP FUNCTIONS
;; ============================================

(define-public (swap-stx-for-sbtc
  (stx-amount uint)
  (min-sbtc-out uint)
)
  (begin
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)
    (asserts! (> stx-amount u0) ERR_INVALID_AMOUNT)

    (let (
      (stx-reserve (var-get reserve-stx))
      (sbtc-reserve (var-get reserve-sbtc))
      (swap-fee (calculate-fee stx-amount FEE_SWAP))
      (protocol-fee (calculate-fee stx-amount FEE_PROTOCOL))
      (stx-after-fees (- stx-amount (+ swap-fee protocol-fee)))
      (sbtc-out (/ (* stx-after-fees sbtc-reserve) (+ stx-reserve stx-after-fees)))
    )
      ;; Check slippage
      (asserts! (>= sbtc-out min-sbtc-out) ERR_SLIPPAGE_TOO_HIGH)
      (asserts! (> sbtc-out u0) ERR_INSUFFICIENT_LIQUIDITY)
      (asserts! (<= sbtc-out sbtc-reserve) ERR_INSUFFICIENT_SBTC)

      ;; Transfer STX from user to contract
      (try! (stx-transfer? stx-amount tx-sender (as-contract tx-sender)))

      ;; Update reserves
      (var-set reserve-stx (+ stx-reserve stx-amount))
      (var-set reserve-sbtc (- sbtc-reserve sbtc-out))
      (var-set protocol-fee-stx (+ (var-get protocol-fee-stx) protocol-fee))

      ;; Transfer sBTC to user
      (try! (as-contract (contract-call? SBTC_CONTRACT transfer sbtc-out (as-contract tx-sender) tx-sender none)))

      ;; Update oracle
      (try! (update-oracle))

      (print {
        event: "swap-stx-for-sbtc",
        trader: tx-sender,
        stx-in: stx-amount,
        sbtc-out: sbtc-out,
        swap-fee: swap-fee,
        protocol-fee: protocol-fee
      })

      (ok sbtc-out)
    )
  )
)

(define-public (swap-sbtc-for-stx
  (sbtc-amount uint)
  (min-stx-out uint)
)
  (begin
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)
    (asserts! (> sbtc-amount u0) ERR_INVALID_AMOUNT)

    (let (
      (stx-reserve (var-get reserve-stx))
      (sbtc-reserve (var-get reserve-sbtc))
      (swap-fee (calculate-fee sbtc-amount FEE_SWAP))
      (protocol-fee (calculate-fee sbtc-amount FEE_PROTOCOL))
      (sbtc-after-fees (- sbtc-amount (+ swap-fee protocol-fee)))
      (stx-out (/ (* sbtc-after-fees stx-reserve) (+ sbtc-reserve sbtc-after-fees)))
    )
      ;; Check slippage
      (asserts! (>= stx-out min-stx-out) ERR_SLIPPAGE_TOO_HIGH)
      (asserts! (> stx-out u0) ERR_INSUFFICIENT_LIQUIDITY)
      (asserts! (<= stx-out stx-reserve) ERR_INSUFFICIENT_STX)

      ;; Transfer sBTC from user to contract
      (try! (contract-call? SBTC_CONTRACT transfer sbtc-amount tx-sender (as-contract tx-sender) none))

      ;; Update reserves
      (var-set reserve-sbtc (+ sbtc-reserve sbtc-amount))
      (var-set reserve-stx (- stx-reserve stx-out))
      (var-set protocol-fee-sbtc (+ (var-get protocol-fee-sbtc) protocol-fee))

      ;; Transfer STX to user
      (try! (as-contract (stx-transfer? stx-out (as-contract tx-sender) tx-sender)))

      ;; Update oracle
      (try! (update-oracle))

      (print {
        event: "swap-sbtc-for-stx",
        trader: tx-sender,
        sbtc-in: sbtc-amount,
        stx-out: stx-out,
        swap-fee: swap-fee,
        protocol-fee: protocol-fee
      })

      (ok stx-out)
    )
  )
)

;; ============================================
;; READ-ONLY FUNCTIONS
;; ============================================

(define-read-only (get-pool-info)
  {
    reserve-stx: (var-get reserve-stx),
    reserve-sbtc: (var-get reserve-sbtc),
    total-lp-supply: (var-get total-lp-supply),
    protocol-fee-stx: (var-get protocol-fee-stx),
    protocol-fee-sbtc: (var-get protocol-fee-sbtc),
    is-initialized: (var-get is-initialized)
  }
)

(define-read-only (get-lp-balance (account principal))
  (default-to u0 (map-get? lp-balances account))
)

(define-read-only (get-quote-stx-to-sbtc (stx-amount uint))
  (let (
    (stx-reserve (var-get reserve-stx))
    (sbtc-reserve (var-get reserve-sbtc))
    (swap-fee (calculate-fee stx-amount FEE_SWAP))
    (protocol-fee (calculate-fee stx-amount FEE_PROTOCOL))
    (stx-after-fees (- stx-amount (+ swap-fee protocol-fee)))
  )
    (if (and (> stx-reserve u0) (> sbtc-reserve u0))
      (ok (/ (* stx-after-fees sbtc-reserve) (+ stx-reserve stx-after-fees)))
      ERR_ZERO_LIQUIDITY
    )
  )
)

(define-read-only (get-quote-sbtc-to-stx (sbtc-amount uint))
  (let (
    (stx-reserve (var-get reserve-stx))
    (sbtc-reserve (var-get reserve-sbtc))
    (swap-fee (calculate-fee sbtc-amount FEE_SWAP))
    (protocol-fee (calculate-fee sbtc-amount FEE_PROTOCOL))
    (sbtc-after-fees (- sbtc-amount (+ swap-fee protocol-fee)))
  )
    (if (and (> stx-reserve u0) (> sbtc-reserve u0))
      (ok (/ (* sbtc-after-fees stx-reserve) (+ sbtc-reserve sbtc-after-fees)))
      ERR_ZERO_LIQUIDITY
    )
  )
)

(define-read-only (get-twap-price)
  {
    last-price-cumulative: (var-get last-price-cumulative),
    last-update-block: (var-get last-update-block)
  }
)

(define-read-only (get-price-observation (block uint))
  (map-get? price-observations block)
)

;; ============================================
;; ADMIN FUNCTIONS
;; ============================================

(define-public (collect-protocol-fees)
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)

    (let (
      (fee-stx (var-get protocol-fee-stx))
      (fee-sbtc (var-get protocol-fee-sbtc))
    )
      ;; Reset protocol fees
      (var-set protocol-fee-stx u0)
      (var-set protocol-fee-sbtc u0)

      ;; Transfer STX fees
      (if (> fee-stx u0)
        (try! (as-contract (stx-transfer? fee-stx tx-sender CONTRACT_OWNER)))
        true
      )

      ;; Transfer sBTC fees
      (if (> fee-sbtc u0)
        (try! (as-contract (contract-call? SBTC_CONTRACT transfer fee-sbtc tx-sender CONTRACT_OWNER none)))
        true
      )

      (print {
        event: "protocol-fees-collected",
        stx-fees: fee-stx,
        sbtc-fees: fee-sbtc,
        recipient: CONTRACT_OWNER
      })

      (ok {stx: fee-stx, sbtc: fee-sbtc})
    )
  )
)
