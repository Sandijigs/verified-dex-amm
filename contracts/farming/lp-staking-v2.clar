;; LP Staking V2 - Ultra-minimal, no as-contract complexity
;; Users stake LP tokens directly, rewards calculated on-demand

(use-trait sip-010-trait .sip-010-trait.sip-010-trait)

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant VDEX_TOKEN .vdex-token)
(define-constant ERR_NOT_AUTHORIZED (err u501))
(define-constant ERR_ALREADY_INITIALIZED (err u502))
(define-constant ERR_NOT_INITIALIZED (err u503))
(define-constant ERR_ZERO_AMOUNT (err u504))
(define-constant ERR_INSUFFICIENT_STAKE (err u505))
(define-constant ERR_TRANSFER_FAILED (err u506))

;; Reward rate: 100 VDEX per block (with 6 decimals)
(define-constant REWARD_PER_BLOCK u100000000)

;; Data variables
(define-data-var initialized bool false)
(define-data-var lp-token-address principal tx-sender)
(define-data-var total-staked uint u0)

;; Data maps
(define-map stakes principal {amount: uint, start-block: uint})

;; Initialize
(define-public (initialize (lp-token principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (asserts! (not (var-get initialized)) ERR_ALREADY_INITIALIZED)
    (var-set initialized true)
    (var-set lp-token-address lp-token)
    (ok true)
  )
)

;; Stake - user sends tokens, we record it
(define-public (stake (amount uint) (lp-token <sip-010-trait>))
  (let (
    (current-stake (default-to {amount: u0, start-block: block-height}
                               (map-get? stakes tx-sender)))
    (current-amount (get amount current-stake))
  )
    (asserts! (var-get initialized) ERR_NOT_INITIALIZED)
    (asserts! (> amount u0) ERR_ZERO_AMOUNT)

    ;; Transfer LP tokens from user to this contract
    (match (contract-call? lp-token transfer amount tx-sender (as-contract tx-sender) none)
      success
        (begin
          ;; Update stake
          (map-set stakes tx-sender {
            amount: (+ current-amount amount),
            start-block: (if (is-eq current-amount u0) block-height (get start-block current-stake))
          })
          (var-set total-staked (+ (var-get total-staked) amount))
          (ok (+ current-amount amount))
        )
      error ERR_TRANSFER_FAILED
    )
  )
)

;; Unstake - return tokens to user
(define-public (unstake (amount uint) (lp-token <sip-010-trait>))
  (let (
    (user-stake (unwrap! (map-get? stakes tx-sender) ERR_INSUFFICIENT_STAKE))
    (staked-amount (get amount user-stake))
    (start-block (get start-block user-stake))
    (blocks-staked (- block-height start-block))
    (rewards (/ (* (* blocks-staked REWARD_PER_BLOCK) staked-amount) (var-get total-staked)))
  )
    (asserts! (var-get initialized) ERR_NOT_INITIALIZED)
    (asserts! (> amount u0) ERR_ZERO_AMOUNT)
    (asserts! (>= staked-amount amount) ERR_INSUFFICIENT_STAKE)

    ;; Mint rewards first (if any)
    (if (> rewards u0)
      (try! (contract-call? VDEX_TOKEN mint rewards tx-sender))
      true
    )

    ;; Transfer LP tokens back using as-contract
    (match (as-contract (contract-call? lp-token transfer amount (as-contract tx-sender) tx-sender none))
      success
        (let ((remaining (- staked-amount amount)))
          (if (> remaining u0)
            (map-set stakes tx-sender {
              amount: remaining,
              start-block: block-height
            })
            (map-delete stakes tx-sender)
          )
          (var-set total-staked (- (var-get total-staked) amount))
          (ok {unstaked: amount, rewards: rewards})
        )
      error ERR_TRANSFER_FAILED
    )
  )
)

;; Claim rewards without unstaking
(define-public (claim-rewards)
  (let (
    (user-stake (unwrap! (map-get? stakes tx-sender) ERR_INSUFFICIENT_STAKE))
    (staked-amount (get amount user-stake))
    (start-block (get start-block user-stake))
    (blocks-staked (- block-height start-block))
    (total (var-get total-staked))
    (rewards (if (> total u0)
               (/ (* (* blocks-staked REWARD_PER_BLOCK) staked-amount) total)
               u0))
  )
    (asserts! (var-get initialized) ERR_NOT_INITIALIZED)
    (asserts! (> rewards u0) ERR_ZERO_AMOUNT)

    ;; Mint rewards
    (try! (contract-call? VDEX_TOKEN mint rewards tx-sender))

    ;; Reset start block
    (map-set stakes tx-sender {
      amount: staked-amount,
      start-block: block-height
    })

    (ok rewards)
  )
)

;; Read-only functions
(define-read-only (get-stake (account principal))
  (map-get? stakes account)
)

(define-read-only (get-pending-rewards (account principal))
  (match (map-get? stakes account)
    stake
    (let (
      (staked-amount (get amount stake))
      (start-block (get start-block stake))
      (blocks-staked (- block-height start-block))
      (total (var-get total-staked))
      (rewards (if (> total u0)
                 (/ (* (* blocks-staked REWARD_PER_BLOCK) staked-amount) total)
                 u0))
    )
      (ok rewards)
    )
    (ok u0)
  )
)

(define-read-only (get-total-staked)
  (ok (var-get total-staked))
)

(define-read-only (get-pool-info)
  {
    initialized: (var-get initialized),
    lp-token: (var-get lp-token-address),
    total-staked: (var-get total-staked),
    reward-per-block: REWARD_PER_BLOCK
  }
)
