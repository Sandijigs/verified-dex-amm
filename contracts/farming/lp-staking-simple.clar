;; Simplified LP Staking Contract
;; Single-pool staking for LP tokens to earn VDEX rewards
;; Phase 1 - Verified DEX

;; ============================================
;; TRAITS
;; ============================================

(use-trait sip-010-trait .sip-010-trait.sip-010-trait)

;; ============================================
;; CONSTANTS
;; ============================================

(define-constant CONTRACT_OWNER tx-sender)
(define-constant VDEX_TOKEN .vdex-token)

;; Error codes
(define-constant ERR_NOT_AUTHORIZED (err u2001))
(define-constant ERR_ALREADY_INITIALIZED (err u2002))
(define-constant ERR_NOT_INITIALIZED (err u2003))
(define-constant ERR_INVALID_AMOUNT (err u2004))
(define-constant ERR_INSUFFICIENT_STAKE (err u2005))
(define-constant ERR_NO_REWARDS (err u2006))
(define-constant ERR_TRANSFER_FAILED (err u2007))

;; Fixed reward: 100 VDEX per block (with 6 decimals)
(define-constant REWARD_PER_BLOCK u100000000)

;; ============================================
;; DATA VARIABLES
;; ============================================

(define-data-var is-initialized bool false)
(define-data-var staking-contract principal tx-sender)
(define-data-var lp-token-address principal tx-sender)
(define-data-var total-staked uint u0)
(define-data-var last-update-block uint u0)
(define-data-var reward-per-token uint u0)

;; ============================================
;; DATA MAPS
;; ============================================

(define-map user-stakes
  principal
  {
    amount: uint,
    reward-checkpoint: uint
  }
)

;; ============================================
;; INITIALIZATION
;; ============================================

(define-public (initialize (lp-token principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (asserts! (not (var-get is-initialized)) ERR_ALREADY_INITIALIZED)

    (var-set is-initialized true)
    (var-set staking-contract (as-contract tx-sender))
    (var-set lp-token-address lp-token)
    (var-set last-update-block block-height)

    (print {
      event: "staking-initialized",
      lp-token: lp-token,
      reward-per-block: REWARD_PER_BLOCK
    })

    (ok true)
  )
)

;; ============================================
;; REWARD CALCULATION
;; ============================================

(define-private (update-rewards)
  (let (
    (current-block block-height)
    (last-block (var-get last-update-block))
    (total (var-get total-staked))
  )
    (if (and (> total u0) (> current-block last-block))
      (let (
        (blocks-passed (- current-block last-block))
        (total-rewards (* blocks-passed REWARD_PER_BLOCK))
        ;; Simple reward per token calculation
        (reward-increase (/ total-rewards total))
      )
        (var-set reward-per-token (+ (var-get reward-per-token) reward-increase))
        (var-set last-update-block current-block)
        (ok true)
      )
      (begin
        (var-set last-update-block current-block)
        (ok true)
      )
    )
  )
)


;; ============================================
;; STAKING FUNCTIONS
;; ============================================

(define-public (stake (amount uint) (lp-token <sip-010-trait>))
  (begin
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)

    ;; Update rewards before staking
    (try! (update-rewards))

    (let (
      (user tx-sender)
      (user-data (default-to {amount: u0, reward-checkpoint: u0} (map-get? user-stakes user)))
      (current-amount (get amount user-data))
    )
      ;; Claim pending rewards if user has existing stake
      (if (> current-amount u0)
        (let (
          (pending (* current-amount (- (var-get reward-per-token) (get reward-checkpoint user-data))))
        )
          (if (> pending u0)
            (try! (contract-call? VDEX_TOKEN mint pending user))
            true
          )
        )
        true
      )

      ;; Transfer LP tokens to staking contract
      (try! (contract-call? lp-token transfer amount user (var-get staking-contract) none))

      ;; Update user stake
      (let (
        (new-amount (+ current-amount amount))
      )
        (map-set user-stakes user {
          amount: new-amount,
          reward-checkpoint: (var-get reward-per-token)
        })

        ;; Update total staked
        (var-set total-staked (+ (var-get total-staked) amount))

        (print {
          event: "staked",
          user: user,
          amount: amount,
          total-staked: new-amount
        })

        (ok new-amount)
      )
    )
  )
)

(define-public (unstake (amount uint) (lp-token <sip-010-trait>))
  (begin
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)

    ;; Update rewards before unstaking
    (try! (update-rewards))

    (let (
      (user tx-sender)
      (user-data (unwrap! (map-get? user-stakes user) ERR_INSUFFICIENT_STAKE))
      (current-amount (get amount user-data))
    )
      ;; Check sufficient stake
      (asserts! (>= current-amount amount) ERR_INSUFFICIENT_STAKE)

      ;; Claim all pending rewards
      (let (
        (pending (* current-amount (- (var-get reward-per-token) (get reward-checkpoint user-data))))
      )
        (if (> pending u0)
          (try! (contract-call? VDEX_TOKEN mint pending user))
          true
        )
      )

      ;; Transfer LP tokens back to user
      (try! (as-contract (contract-call? lp-token transfer amount (var-get staking-contract) user none)))

      ;; Update user stake
      (let (
        (new-amount (- current-amount amount))
      )
        (map-set user-stakes user {
          amount: new-amount,
          reward-checkpoint: (var-get reward-per-token)
        })

        ;; Update total staked
        (var-set total-staked (- (var-get total-staked) amount))

        (print {
          event: "unstaked",
          user: user,
          amount: amount,
          remaining-staked: new-amount
        })

        (ok new-amount)
      )
    )
  )
)

(define-public (claim-rewards)
  (begin
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)

    ;; Update rewards first
    (try! (update-rewards))

    (let (
      (user tx-sender)
      (user-data (unwrap! (map-get? user-stakes user) ERR_NO_REWARDS))
      (user-amount (get amount user-data))
      (pending (* user-amount (- (var-get reward-per-token) (get reward-checkpoint user-data))))
    )
      ;; Check for rewards
      (asserts! (> pending u0) ERR_NO_REWARDS)

      ;; Mint rewards to user
      (try! (contract-call? VDEX_TOKEN mint pending user))

      ;; Update user reward checkpoint
      (map-set user-stakes user (merge user-data {
        reward-checkpoint: (var-get reward-per-token)
      }))

      (print {
        event: "rewards-claimed",
        user: user,
        amount: pending
      })

      (ok pending)
    )
  )
)

;; ============================================
;; READ-ONLY FUNCTIONS
;; ============================================

(define-read-only (get-user-stake (user principal))
  (map-get? user-stakes user)
)

(define-read-only (get-pending-rewards (user principal))
  (match (map-get? user-stakes user)
    stake
    (let (
      (total (var-get total-staked))
      (user-amount (get amount stake))
      (user-checkpoint (get reward-checkpoint stake))
    )
      (if (> total u0)
        (let (
          (current-block block-height)
          (last-block (var-get last-update-block))
          (blocks-passed (- current-block last-block))
          (total-rewards (* blocks-passed REWARD_PER_BLOCK))
          (reward-increase (/ total-rewards total))
          (projected-reward-per-token (+ (var-get reward-per-token) reward-increase))
        )
          (ok (* user-amount (- projected-reward-per-token user-checkpoint)))
        )
        (ok u0)
      )
    )
    (ok u0)
  )
)

(define-read-only (get-pool-info)
  {
    total-staked: (var-get total-staked),
    reward-per-block: REWARD_PER_BLOCK,
    reward-per-token: (var-get reward-per-token),
    last-update-block: (var-get last-update-block),
    is-initialized: (var-get is-initialized),
    lp-token: (var-get lp-token-address)
  }
)

(define-read-only (get-total-staked)
  (ok (var-get total-staked))
)
