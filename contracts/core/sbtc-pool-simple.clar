;; Simplified STX/sBTC AMM Pool
;; Basic constant product AMM (x*y=k) without complex math
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
(define-constant ERR_INVALID_AMOUNT (err u1004))
(define-constant ERR_ZERO_LIQUIDITY (err u1005))
(define-constant ERR_INSUFFICIENT_LP_BALANCE (err u1006))
(define-constant ERR_SLIPPAGE_TOO_HIGH (err u1007))
(define-constant ERR_INSUFFICIENT_LIQUIDITY (err u1008))

;; Fee: 0.3% = 30 basis points
(define-constant FEE_BASIS_POINTS u30)
(define-constant BASIS_POINTS_DENOM u10000)

;; Minimum liquidity for first deposit
(define-constant MIN_LIQUIDITY u1000)

;; ============================================
;; DATA VARIABLES
;; ============================================

(define-data-var is-initialized bool false)
(define-data-var pool-contract principal tx-sender)
(define-data-var reserve-stx uint u0)
(define-data-var reserve-sbtc uint u0)
(define-data-var total-lp-supply uint u0)

;; ============================================
;; DATA MAPS
;; ============================================

(define-map lp-balances principal uint)

;; ============================================
;; INITIALIZATION
;; ============================================

(define-public (initialize)
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (asserts! (not (var-get is-initialized)) ERR_ALREADY_INITIALIZED)

    (var-set is-initialized true)
    (var-set pool-contract (as-contract tx-sender))

    (print {event: "pool-initialized", pool: "STX-sBTC"})
    (ok true)
  )
)

;; ============================================
;; LP TOKEN HELPERS
;; ============================================

(define-private (mint-lp (recipient principal) (amount uint))
  (let (
    (current-balance (default-to u0 (map-get? lp-balances recipient)))
  )
    (map-set lp-balances recipient (+ current-balance amount))
    (var-set total-lp-supply (+ (var-get total-lp-supply) amount))
    (ok amount)
  )
)

(define-private (burn-lp (owner principal) (amount uint))
  (let (
    (current-balance (default-to u0 (map-get? lp-balances owner)))
  )
    (asserts! (>= current-balance amount) ERR_INSUFFICIENT_LP_BALANCE)
    (map-set lp-balances owner (- current-balance amount))
    (var-set total-lp-supply (- (var-get total-lp-supply) amount))
    (ok amount)
  )
)

;; ============================================
;; LIQUIDITY FUNCTIONS
;; ============================================

(define-public (add-liquidity (stx-amount uint) (sbtc-amount uint) (min-lp-tokens uint))
  (begin
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)
    (asserts! (> stx-amount u0) ERR_INVALID_AMOUNT)
    (asserts! (> sbtc-amount u0) ERR_INVALID_AMOUNT)

    (let (
      (stx-reserve (var-get reserve-stx))
      (sbtc-reserve (var-get reserve-sbtc))
      (total-supply (var-get total-lp-supply))
      (lp-tokens
        (if (is-eq total-supply u0)
          ;; First liquidity: simple sum (no sqrt!)
          (begin
            (asserts! (>= (+ stx-amount sbtc-amount) MIN_LIQUIDITY) ERR_INVALID_AMOUNT)
            (+ stx-amount sbtc-amount)
          )
          ;; Subsequent liquidity: proportional to existing
          (let (
            (lp-from-stx (/ (* stx-amount total-supply) stx-reserve))
            (lp-from-sbtc (/ (* sbtc-amount total-supply) sbtc-reserve))
          )
            ;; Use the smaller to maintain ratio
            (if (<= lp-from-stx lp-from-sbtc) lp-from-stx lp-from-sbtc)
          )
        )
      )
    )
      ;; Slippage check
      (asserts! (>= lp-tokens min-lp-tokens) ERR_SLIPPAGE_TOO_HIGH)

      ;; Transfer STX to pool
      (try! (stx-transfer? stx-amount tx-sender (var-get pool-contract)))

      ;; Transfer sBTC to pool
      (try! (contract-call? SBTC_CONTRACT transfer sbtc-amount tx-sender (var-get pool-contract) none))

      ;; Update reserves
      (var-set reserve-stx (+ stx-reserve stx-amount))
      (var-set reserve-sbtc (+ sbtc-reserve sbtc-amount))

      ;; Mint LP tokens
      (try! (mint-lp tx-sender lp-tokens))

      (print {
        event: "liquidity-added",
        user: tx-sender,
        stx: stx-amount,
        sbtc: sbtc-amount,
        lp-tokens: lp-tokens
      })

      (ok lp-tokens)
    )
  )
)

(define-public (remove-liquidity (lp-tokens uint) (min-stx uint) (min-sbtc uint))
  (begin
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)
    (asserts! (> lp-tokens u0) ERR_INVALID_AMOUNT)

    (let (
      (stx-reserve (var-get reserve-stx))
      (sbtc-reserve (var-get reserve-sbtc))
      (total-supply (var-get total-lp-supply))
      (stx-out (/ (* lp-tokens stx-reserve) total-supply))
      (sbtc-out (/ (* lp-tokens sbtc-reserve) total-supply))
    )
      ;; Slippage checks
      (asserts! (>= stx-out min-stx) ERR_SLIPPAGE_TOO_HIGH)
      (asserts! (>= sbtc-out min-sbtc) ERR_SLIPPAGE_TOO_HIGH)
      (asserts! (> stx-out u0) ERR_INSUFFICIENT_LIQUIDITY)
      (asserts! (> sbtc-out u0) ERR_INSUFFICIENT_LIQUIDITY)

      ;; Burn LP tokens
      (try! (burn-lp tx-sender lp-tokens))

      ;; Update reserves
      (var-set reserve-stx (- stx-reserve stx-out))
      (var-set reserve-sbtc (- sbtc-reserve sbtc-out))

      ;; Transfer STX back
      (try! (as-contract (stx-transfer? stx-out (var-get pool-contract) tx-sender)))

      ;; Transfer sBTC back
      (try! (as-contract (contract-call? SBTC_CONTRACT transfer sbtc-out (var-get pool-contract) tx-sender none)))

      (print {
        event: "liquidity-removed",
        user: tx-sender,
        lp-tokens: lp-tokens,
        stx: stx-out,
        sbtc: sbtc-out
      })

      (ok {stx: stx-out, sbtc: sbtc-out})
    )
  )
)

;; ============================================
;; SWAP FUNCTIONS
;; ============================================

(define-public (swap-stx-for-sbtc (stx-in uint) (min-sbtc-out uint))
  (begin
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)
    (asserts! (> stx-in u0) ERR_INVALID_AMOUNT)

    (let (
      (stx-reserve (var-get reserve-stx))
      (sbtc-reserve (var-get reserve-sbtc))
      ;; Apply 0.3% fee
      (fee (/ (* stx-in FEE_BASIS_POINTS) BASIS_POINTS_DENOM))
      (stx-after-fee (- stx-in fee))
      ;; Constant product: x*y=k
      (sbtc-out (/ (* stx-after-fee sbtc-reserve) (+ stx-reserve stx-after-fee)))
    )
      ;; Slippage check
      (asserts! (>= sbtc-out min-sbtc-out) ERR_SLIPPAGE_TOO_HIGH)
      (asserts! (> sbtc-out u0) ERR_INSUFFICIENT_LIQUIDITY)
      (asserts! (<= sbtc-out sbtc-reserve) ERR_INSUFFICIENT_LIQUIDITY)

      ;; Transfer STX from user to pool
      (try! (stx-transfer? stx-in tx-sender (var-get pool-contract)))

      ;; Update reserves
      (var-set reserve-stx (+ stx-reserve stx-in))
      (var-set reserve-sbtc (- sbtc-reserve sbtc-out))

      ;; Transfer sBTC to user
      (try! (as-contract (contract-call? SBTC_CONTRACT transfer sbtc-out (var-get pool-contract) tx-sender none)))

      (print {
        event: "swap-stx-for-sbtc",
        user: tx-sender,
        stx-in: stx-in,
        sbtc-out: sbtc-out,
        fee: fee
      })

      (ok sbtc-out)
    )
  )
)

(define-public (swap-sbtc-for-stx (sbtc-in uint) (min-stx-out uint))
  (begin
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)
    (asserts! (> sbtc-in u0) ERR_INVALID_AMOUNT)

    (let (
      (stx-reserve (var-get reserve-stx))
      (sbtc-reserve (var-get reserve-sbtc))
      ;; Apply 0.3% fee
      (fee (/ (* sbtc-in FEE_BASIS_POINTS) BASIS_POINTS_DENOM))
      (sbtc-after-fee (- sbtc-in fee))
      ;; Constant product: x*y=k
      (stx-out (/ (* sbtc-after-fee stx-reserve) (+ sbtc-reserve sbtc-after-fee)))
    )
      ;; Slippage check
      (asserts! (>= stx-out min-stx-out) ERR_SLIPPAGE_TOO_HIGH)
      (asserts! (> stx-out u0) ERR_INSUFFICIENT_LIQUIDITY)
      (asserts! (<= stx-out stx-reserve) ERR_INSUFFICIENT_LIQUIDITY)

      ;; Transfer sBTC from user to pool
      (try! (contract-call? SBTC_CONTRACT transfer sbtc-in tx-sender (var-get pool-contract) none))

      ;; Update reserves
      (var-set reserve-sbtc (+ sbtc-reserve sbtc-in))
      (var-set reserve-stx (- stx-reserve stx-out))

      ;; Transfer STX to user
      (try! (as-contract (stx-transfer? stx-out (var-get pool-contract) tx-sender)))

      (print {
        event: "swap-sbtc-for-stx",
        user: tx-sender,
        sbtc-in: sbtc-in,
        stx-out: stx-out,
        fee: fee
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
    is-initialized: (var-get is-initialized)
  }
)

(define-read-only (get-lp-balance (account principal))
  (default-to u0 (map-get? lp-balances account))
)

(define-read-only (get-reserves)
  {
    stx: (var-get reserve-stx),
    sbtc: (var-get reserve-sbtc)
  }
)

(define-read-only (get-quote-stx-to-sbtc (stx-amount uint))
  (let (
    (stx-reserve (var-get reserve-stx))
    (sbtc-reserve (var-get reserve-sbtc))
    (fee (/ (* stx-amount FEE_BASIS_POINTS) BASIS_POINTS_DENOM))
    (stx-after-fee (- stx-amount fee))
  )
    (if (and (> stx-reserve u0) (> sbtc-reserve u0))
      (ok (/ (* stx-after-fee sbtc-reserve) (+ stx-reserve stx-after-fee)))
      ERR_ZERO_LIQUIDITY
    )
  )
)

(define-read-only (get-quote-sbtc-to-stx (sbtc-amount uint))
  (let (
    (stx-reserve (var-get reserve-stx))
    (sbtc-reserve (var-get reserve-sbtc))
    (fee (/ (* sbtc-amount FEE_BASIS_POINTS) BASIS_POINTS_DENOM))
    (sbtc-after-fee (- sbtc-amount fee))
  )
    (if (and (> stx-reserve u0) (> sbtc-reserve u0))
      (ok (/ (* sbtc-after-fee stx-reserve) (+ sbtc-reserve sbtc-after-fee)))
      ERR_ZERO_LIQUIDITY
    )
  )
)
