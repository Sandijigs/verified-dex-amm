;; Minimal LP Staking - Ultra-simplified single pool
;; Stake LP tokens, earn VDEX rewards

(use-trait sip-010-trait .sip-010-trait.sip-010-trait)

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant VDEX_TOKEN .vdex-token)
(define-constant ERR_NOT_AUTHORIZED (err u501))
(define-constant ERR_ALREADY_INITIALIZED (err u502))
(define-constant ERR_NOT_INITIALIZED (err u503))
(define-constant ERR_ZERO_AMOUNT (err u504))
(define-constant ERR_INSUFFICIENT_STAKE (err u505))

;; Reward rate: 100 VDEX per block (with 6 decimals)
(define-constant REWARD_PER_BLOCK u100000000)

;; Data variables
(define-data-var initialized bool false)
(define-data-var lp-token principal tx-sender)
(define-data-var total-staked uint u0)
(define-data-var last-update-block uint u0)

;; Data maps
(define-map user-stakes principal {amount: uint, last-claim-block: uint})

;; Initialize
(define-public (initialize (lp-token-address principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (asserts! (not (var-get initialized)) ERR_ALREADY_INITIALIZED)

    (var-set initialized true)
    (var-set lp-token lp-token-address)
    (var-set last-update-block block-height)

    (ok true)
  )
)

;; Stake LP tokens
(define-public (stake (amount uint) (lp-token-contract <sip-010-trait>))
  (begin
    (asserts! (var-get initialized) ERR_NOT_INITIALIZED)
    (asserts! (> amount u0) ERR_ZERO_AMOUNT)

    (let (
      (user-stake (default-to {amount: u0, last-claim-block: block-height}
                               (map-get? user-stakes tx-sender)))
      (current-amount (get amount user-stake))
      (new-amount (+ current-amount amount))
    )
      ;; Claim pending rewards first
      (if (> current-amount u0)
        (try! (claim-rewards))
        true
      )

      ;; Transfer LP tokens to this contract
      (try! (contract-call? lp-token-contract transfer amount tx-sender (as-contract tx-sender) none))

      ;; Update stake
      (map-set user-stakes tx-sender {
        amount: new-amount,
        last-claim-block: block-height
      })
      (var-set total-staked (+ (var-get total-staked) amount))

      (ok new-amount)
    )
  )
)

;; Unstake LP tokens
(define-public (unstake (amount uint) (lp-token-contract <sip-010-trait>))
  (begin
    (asserts! (var-get initialized) ERR_NOT_INITIALIZED)
    (asserts! (> amount u0) ERR_ZERO_AMOUNT)

    (let (
      (user-stake (unwrap! (map-get? user-stakes tx-sender) ERR_INSUFFICIENT_STAKE))
      (current-amount (get amount user-stake))
      (new-amount (- current-amount amount))
    )
      (asserts! (>= current-amount amount) ERR_INSUFFICIENT_STAKE)

      ;; Claim pending rewards first
      (try! (claim-rewards))

      ;; Transfer LP tokens back to user
      (try! (as-contract (contract-call? lp-token-contract transfer amount tx-sender tx-sender none)))

      ;; Update stake
      (if (> new-amount u0)
        (map-set user-stakes tx-sender {
          amount: new-amount,
          last-claim-block: block-height
        })
        (map-delete user-stakes tx-sender)
      )
      (var-set total-staked (- (var-get total-staked) amount))

      (ok new-amount)
    )
  )
)

;; Claim rewards
(define-public (claim-rewards)
  (begin
    (asserts! (var-get initialized) ERR_NOT_INITIALIZED)

    (let (
      (user-stake (unwrap! (map-get? user-stakes tx-sender) ERR_INSUFFICIENT_STAKE))
      (staked-amount (get amount user-stake))
      (last-claim (get last-claim-block user-stake))
      (blocks-elapsed (- block-height last-claim))
      (total-pool (var-get total-staked))
      ;; Calculate user's share of rewards
      (user-rewards (if (> total-pool u0)
                      (/ (* (* blocks-elapsed REWARD_PER_BLOCK) staked-amount) total-pool)
                      u0))
    )
      (if (> user-rewards u0)
        (begin
          ;; Mint VDEX rewards
          (try! (contract-call? VDEX_TOKEN mint user-rewards tx-sender))

          ;; Update last claim block
          (map-set user-stakes tx-sender {
            amount: staked-amount,
            last-claim-block: block-height
          })

          (ok user-rewards)
        )
        (ok u0)
      )
    )
  )
)

;; Read-only: Get user stake
(define-read-only (get-user-stake (account principal))
  (map-get? user-stakes account)
)

;; Read-only: Get pending rewards
(define-read-only (get-pending-rewards (account principal))
  (match (map-get? user-stakes account)
    stake
    (let (
      (staked-amount (get amount stake))
      (last-claim (get last-claim-block stake))
      (blocks-elapsed (- block-height last-claim))
      (total-pool (var-get total-staked))
      (rewards (if (> total-pool u0)
                 (/ (* (* blocks-elapsed REWARD_PER_BLOCK) staked-amount) total-pool)
                 u0))
    )
      (ok rewards)
    )
    (ok u0)
  )
)

;; Read-only: Get total staked
(define-read-only (get-total-staked)
  (ok (var-get total-staked))
)

;; Read-only: Is initialized
(define-read-only (is-initialized)
  (var-get initialized)
)
