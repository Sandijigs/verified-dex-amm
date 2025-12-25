;; VDEX Token Tests
;; Comprehensive test suite for the VDEX governance token

(define-constant deployer tx-sender)
(define-constant treasury 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5)
(define-constant user1 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG)
(define-constant user2 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC)
(define-constant farming-contract 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND)

;; ============================================
;; INITIALIZATION TESTS
;; ============================================

(define-public (test-initialization)
  (let (
    (init-result (contract-call? .vdex-token initialize treasury))
  )
    (asserts! (is-ok init-result) (err u1))

    ;; Check treasury received allocation
    (asserts!
      (is-eq
        (unwrap-panic (contract-call? .vdex-token get-balance treasury))
        u300000000000000) ;; 300M VDEX
      (err u2)
    )

    ;; Check deployer received liquidity allocation
    (asserts!
      (is-eq
        (unwrap-panic (contract-call? .vdex-token get-balance deployer))
        u50000000000000) ;; 50M VDEX
      (err u3)
    )

    ;; Check total supply
    (asserts!
      (is-eq
        (unwrap-panic (contract-call? .vdex-token get-total-supply))
        u350000000000000) ;; 350M total minted
      (err u4)
    )

    (ok true)
  )
)

(define-public (test-double-initialization)
  (let (
    (first-init (contract-call? .vdex-token initialize treasury))
    (second-init (contract-call? .vdex-token initialize treasury))
  )
    ;; First should succeed
    (asserts! (is-ok first-init) (err u5))

    ;; Second should fail
    (asserts! (is-err second-init) (err u6))
    (asserts! (is-eq (unwrap-err-panic second-init) u404) (err u7))

    (ok true)
  )
)

;; ============================================
;; SIP-010 TESTS
;; ============================================

(define-public (test-get-name)
  (let (
    (name (unwrap-panic (contract-call? .vdex-token get-name)))
  )
    (asserts! (is-eq name "Verified DEX Token") (err u10))
    (ok true)
  )
)

(define-public (test-get-symbol)
  (let (
    (symbol (unwrap-panic (contract-call? .vdex-token get-symbol)))
  )
    (asserts! (is-eq symbol "VDEX") (err u11))
    (ok true)
  )
)

(define-public (test-get-decimals)
  (let (
    (decimals (unwrap-panic (contract-call? .vdex-token get-decimals)))
  )
    (asserts! (is-eq decimals u6) (err u12))
    (ok true)
  )
)

(define-public (test-transfer)
  (begin
    ;; Initialize first
    (unwrap-panic (contract-call? .vdex-token initialize treasury))

    ;; Transfer from treasury to user1
    (let (
      (transfer-result (as-contract (contract-call? .vdex-token transfer u1000000 treasury user1 none)))
    )
      (asserts! (is-ok transfer-result) (err u13))

      ;; Check user1 balance
      (asserts!
        (is-eq
          (unwrap-panic (contract-call? .vdex-token get-balance user1))
          u1000000)
        (err u14)
      )

      (ok true)
    )
  )
)

(define-public (test-unauthorized-transfer)
  (begin
    ;; Initialize
    (unwrap-panic (contract-call? .vdex-token initialize treasury))

    ;; Try to transfer someone else's tokens
    (let (
      (transfer-result (contract-call? .vdex-token transfer u1000000 treasury user1 none))
    )
      ;; Should fail with not authorized
      (asserts! (is-err transfer-result) (err u15))
      (asserts! (is-eq (unwrap-err-panic transfer-result) u401) (err u16))

      (ok true)
    )
  )
)

;; ============================================
;; MINTING TESTS
;; ============================================

(define-public (test-authorized-minting)
  (begin
    ;; Initialize
    (unwrap-panic (contract-call? .vdex-token initialize treasury))

    ;; Authorize farming contract as minter
    (unwrap-panic (contract-call? .vdex-token authorize-minter farming-contract true))

    ;; Mint as farming contract
    (let (
      (mint-result (as-contract (contract-call? .vdex-token mint u10000000000 user1)))
    )
      (asserts! (is-ok mint-result) (err u20))

      ;; Check user1 received tokens
      (asserts!
        (is-eq
          (unwrap-panic (contract-call? .vdex-token get-balance user1))
          u10000000000)
        (err u21)
      )

      ;; Check farming-minted counter
      (asserts!
        (is-eq
          (contract-call? .vdex-token get-farming-minted)
          u10000000000)
        (err u22)
      )

      (ok true)
    )
  )
)

(define-public (test-unauthorized-minting)
  (begin
    ;; Initialize
    (unwrap-panic (contract-call? .vdex-token initialize treasury))

    ;; Try to mint without authorization
    (let (
      (mint-result (contract-call? .vdex-token mint u1000000 user1))
    )
      ;; Should fail
      (asserts! (is-err mint-result) (err u23))
      (asserts! (is-eq (unwrap-err-panic mint-result) u401) (err u24))

      (ok true)
    )
  )
)

(define-public (test-farming-cap)
  (begin
    ;; Initialize
    (unwrap-panic (contract-call? .vdex-token initialize treasury))

    ;; Set deployer as minter
    (unwrap-panic (contract-call? .vdex-token set-minter deployer))

    ;; Try to mint more than farming allocation
    (let (
      (mint-result (contract-call? .vdex-token mint u500000000000000 user1))
    )
      ;; Should fail - exceeds 400M farming cap
      (asserts! (is-err mint-result) (err u25))
      (asserts! (is-eq (unwrap-err-panic mint-result) u403) (err u26))

      (ok true)
    )
  )
)

(define-public (test-incremental-farming-minting)
  (begin
    ;; Initialize
    (unwrap-panic (contract-call? .vdex-token initialize treasury))

    ;; Set deployer as minter
    (unwrap-panic (contract-call? .vdex-token set-minter deployer))

    ;; Mint 100M
    (unwrap-panic (contract-call? .vdex-token mint u100000000000000 user1))

    ;; Mint another 100M
    (unwrap-panic (contract-call? .vdex-token mint u100000000000000 user2))

    ;; Check remaining supply
    (let (
      (remaining (contract-call? .vdex-token get-remaining-farm-supply))
    )
      (asserts! (is-eq remaining u200000000000000) (err u27)) ;; 200M remaining

      (ok true)
    )
  )
)

;; ============================================
;; BURN TESTS
;; ============================================

(define-public (test-burn)
  (begin
    ;; Initialize
    (unwrap-panic (contract-call? .vdex-token initialize treasury))

    ;; Get initial balance
    (let (
      (initial-balance (unwrap-panic (contract-call? .vdex-token get-balance deployer)))
      (burn-amount u1000000)
    )
      ;; Burn tokens
      (unwrap-panic (contract-call? .vdex-token burn burn-amount))

      ;; Check new balance
      (asserts!
        (is-eq
          (unwrap-panic (contract-call? .vdex-token get-balance deployer))
          (- initial-balance burn-amount))
        (err u30)
      )

      ;; Check total supply decreased
      (asserts!
        (is-eq
          (unwrap-panic (contract-call? .vdex-token get-total-supply))
          (- u350000000000000 burn-amount))
        (err u31)
      )

      (ok true)
    )
  )
)

;; ============================================
;; ADMIN TESTS
;; ============================================

(define-public (test-set-minter)
  (begin
    ;; Initialize
    (unwrap-panic (contract-call? .vdex-token initialize treasury))

    ;; Set new minter
    (unwrap-panic (contract-call? .vdex-token set-minter farming-contract))

    ;; Verify
    (asserts!
      (is-eq (contract-call? .vdex-token get-minter) farming-contract)
      (err u40)
    )

    (ok true)
  )
)

(define-public (test-unauthorized-admin)
  (begin
    ;; Initialize
    (unwrap-panic (contract-call? .vdex-token initialize treasury))

    ;; Try to set minter as non-owner
    (let (
      (result (as-contract (contract-call? .vdex-token set-minter user1)))
    )
      ;; Should fail
      (asserts! (is-err result) (err u41))
      (asserts! (is-eq (unwrap-err-panic result) u401) (err u42))

      (ok true)
    )
  )
)

;; ============================================
;; HELPER READ-ONLY TESTS
;; ============================================

(define-public (test-allocation-info)
  (let (
    (info (contract-call? .vdex-token get-allocation-info))
  )
    (asserts! (is-eq (get farming info) u400000000000000) (err u50))
    (asserts! (is-eq (get treasury info) u300000000000000) (err u51))
    (asserts! (is-eq (get team info) u150000000000000) (err u52))
    (asserts! (is-eq (get airdrop info) u100000000000000) (err u53))
    (asserts! (is-eq (get liquidity info) u50000000000000) (err u54))
    (asserts! (is-eq (get total-max info) u1000000000000000) (err u55))

    (ok true)
  )
)

(define-public (test-is-authorized-minter)
  (begin
    ;; Initialize
    (unwrap-panic (contract-call? .vdex-token initialize treasury))

    ;; Deployer should be authorized (is minter by default)
    (asserts!
      (contract-call? .vdex-token is-authorized-minter deployer)
      (err u60)
    )

    ;; Authorize farming contract
    (unwrap-panic (contract-call? .vdex-token authorize-minter farming-contract true))

    (asserts!
      (contract-call? .vdex-token is-authorized-minter farming-contract)
      (err u61)
    )

    ;; User1 should not be authorized
    (asserts!
      (not (contract-call? .vdex-token is-authorized-minter user1))
      (err u62)
    )

    (ok true)
  )
)

;; ============================================
;; RUN ALL TESTS
;; ============================================

(define-public (run-all-tests)
  (begin
    (print "Running VDEX Token Tests...")

    ;; Initialization tests
    (try! (test-initialization))
    (try! (test-double-initialization))

    ;; SIP-010 tests
    (try! (test-get-name))
    (try! (test-get-symbol))
    (try! (test-get-decimals))
    (try! (test-transfer))
    (try! (test-unauthorized-transfer))

    ;; Minting tests
    (try! (test-authorized-minting))
    (try! (test-unauthorized-minting))
    (try! (test-farming-cap))
    (try! (test-incremental-farming-minting))

    ;; Burn tests
    (try! (test-burn))

    ;; Admin tests
    (try! (test-set-minter))
    (try! (test-unauthorized-admin))

    ;; Helper tests
    (try! (test-allocation-info))
    (try! (test-is-authorized-minter))

    (print "✅ All VDEX Token tests passed!")
    (ok true)
  )
)
