;; LP Staking Contract - Multi-Pool Yield Farming
;; MasterChef-style farming with VDEX rewards
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
(define-constant ERR_POOL_NOT_FOUND (err u2004))
(define-constant ERR_POOL_ALREADY_EXISTS (err u2005))
(define-constant ERR_INVALID_AMOUNT (err u2006))
(define-constant ERR_INSUFFICIENT_STAKE (err u2007))
(define-constant ERR_TRANSFER_FAILED (err u2008))
(define-constant ERR_NO_REWARDS (err u2009))
(define-constant ERR_MINT_FAILED (err u2010))
(define-constant ERR_INVALID_POOL_ID (err u2011))
(define-constant ERR_ZERO_ALLOCATION (err u2012))

;; Precision for reward calculations
(define-constant PRECISION u1000000000000) ;; 1e12

;; Default emission rate (100 VDEX per block with 6 decimals)
(define-constant DEFAULT_REWARD_PER_BLOCK u100000000)

;; ============================================
;; DATA VARIABLES
;; ============================================

(define-data-var is-initialized bool false)
(define-data-var next-pool-id uint u0)
(define-data-var total-allocation-points uint u0)
(define-data-var reward-per-block uint DEFAULT_REWARD_PER_BLOCK)
(define-data-var start-block uint u0)

;; ============================================
;; DATA MAPS
;; ============================================

;; Pool information
(define-map pools
  uint
  {
    lp-token: principal,
    allocation-points: uint,
    last-reward-block: uint,
    accumulated-reward-per-share: uint,
    total-staked: uint
  }
)

;; User staking information per pool
(define-map user-info
  {pool-id: uint, user: principal}
  {
    amount: uint,
    reward-debt: uint
  }
)

;; Pool ID lookup by LP token
(define-map lp-token-to-pool principal uint)

;; ============================================
;; INITIALIZATION
;; ============================================

(define-public (initialize (start-block-height uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (asserts! (not (var-get is-initialized)) ERR_ALREADY_INITIALIZED)

    (var-set is-initialized true)
    (var-set start-block start-block-height)

    (print {
      event: "farming-initialized",
      start-block: start-block-height,
      reward-per-block: (var-get reward-per-block)
    })

    (ok true)
  )
)

;; ============================================
;; POOL MANAGEMENT
;; ============================================

(define-public (add-pool (lp-token principal) (allocation-points uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)
    (asserts! (> allocation-points u0) ERR_ZERO_ALLOCATION)
    (asserts! (is-none (map-get? lp-token-to-pool lp-token)) ERR_POOL_ALREADY_EXISTS)

    ;; Update all pools before adding new one
    (try! (update-all-pools))

    (let (
      (pool-id (var-get next-pool-id))
      (current-block block-height)
    )
      ;; Create new pool
      (map-set pools pool-id {
        lp-token: lp-token,
        allocation-points: allocation-points,
        last-reward-block: (if (> current-block (var-get start-block)) current-block (var-get start-block)),
        accumulated-reward-per-share: u0,
        total-staked: u0
      })

      ;; Map LP token to pool ID
      (map-set lp-token-to-pool lp-token pool-id)

      ;; Update total allocation points
      (var-set total-allocation-points (+ (var-get total-allocation-points) allocation-points))

      ;; Increment pool ID
      (var-set next-pool-id (+ pool-id u1))

      (print {
        event: "pool-added",
        pool-id: pool-id,
        lp-token: lp-token,
        allocation-points: allocation-points,
        total-allocation: (var-get total-allocation-points)
      })

      (ok pool-id)
    )
  )
)

(define-public (set-pool-allocation (pool-id uint) (new-allocation-points uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)

    (match (map-get? pools pool-id)
      pool
      (begin
        ;; Update all pools first
        (try! (update-all-pools))

        (let (
          (old-allocation (get allocation-points pool))
          (total-alloc (var-get total-allocation-points))
          (new-total-alloc (+ (- total-alloc old-allocation) new-allocation-points))
        )
          ;; Update pool allocation
          (map-set pools pool-id (merge pool {allocation-points: new-allocation-points}))

          ;; Update total allocation
          (var-set total-allocation-points new-total-alloc)

          (print {
            event: "pool-allocation-updated",
            pool-id: pool-id,
            old-allocation: old-allocation,
            new-allocation: new-allocation-points,
            total-allocation: new-total-alloc
          })

          (ok true)
        )
      )
      ERR_POOL_NOT_FOUND
    )
  )
)

;; ============================================
;; REWARD CALCULATION
;; ============================================

(define-private (calculate-pool-reward (pool-id uint) (from-block uint) (to-block uint))
  (match (map-get? pools pool-id)
    pool
    (let (
      (total-alloc (var-get total-allocation-points))
      (pool-alloc (get allocation-points pool))
      (blocks (- to-block from-block))
      (total-reward (* blocks (var-get reward-per-block)))
    )
      (if (is-eq total-alloc u0)
        u0
        (/ (* total-reward pool-alloc) total-alloc)
      )
    )
    u0
  )
)

(define-private (update-pool (pool-id uint))
  (match (map-get? pools pool-id)
    pool
    (let (
      (current-block block-height)
      (last-reward-block (get last-reward-block pool))
      (total-staked (get total-staked pool))
    )
      (if (or (<= current-block last-reward-block) (is-eq total-staked u0))
        (ok pool)
        (let (
          (reward (calculate-pool-reward pool-id last-reward-block current-block))
          (reward-per-share (/ (* reward PRECISION) total-staked))
          (new-accumulated (+ (get accumulated-reward-per-share pool) reward-per-share))
        )
          (map-set pools pool-id (merge pool {
            last-reward-block: current-block,
            accumulated-reward-per-share: new-accumulated
          }))
          (ok (merge pool {
            last-reward-block: current-block,
            accumulated-reward-per-share: new-accumulated
          }))
        )
      )
    )
    ERR_POOL_NOT_FOUND
  )
)

(define-private (update-all-pools)
  (let (
    (pool-count (var-get next-pool-id))
  )
    (if (> pool-count u0)
      (begin
        ;; Update pools using fold to avoid recursion
        (fold update-pool-fold
          (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9 u10 u11 u12 u13 u14 u15 u16 u17 u18 u19)
          pool-count
        )
        (ok true)
      )
      (ok true)
    )
  )
)

(define-private (update-pool-fold (pool-id uint) (max-pool-id uint))
  (begin
    (if (< pool-id max-pool-id)
      (update-pool pool-id)
      (ok {
        lp-token: tx-sender,
        allocation-points: u0,
        last-reward-block: u0,
        accumulated-reward-per-share: u0,
        total-staked: u0
      })
    )
    max-pool-id
  )
)

;; ============================================
;; STAKING FUNCTIONS
;; ============================================

(define-public (stake (pool-id uint) (amount uint) (lp-token <sip-010-trait>))
  (begin
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)

    (match (map-get? pools pool-id)
      pool
      (begin
        ;; Verify LP token matches
        (asserts! (is-eq (contract-of lp-token) (get lp-token pool)) ERR_INVALID_POOL_ID)

        ;; Update pool rewards
        (try! (update-pool pool-id))

        (let (
          (user tx-sender)
          (user-data (default-to {amount: u0, reward-debt: u0} (map-get? user-info {pool-id: pool-id, user: user})))
          (current-amount (get amount user-data))
          (updated-pool (unwrap-panic (map-get? pools pool-id)))
          (acc-reward-per-share (get accumulated-reward-per-share updated-pool))
        )
          ;; Claim pending rewards if user has existing stake
          (if (> current-amount u0)
            (let (
              (pending (- (/ (* current-amount acc-reward-per-share) PRECISION) (get reward-debt user-data)))
            )
              (if (> pending u0)
                (try! (mint-rewards user pending))
                true
              )
            )
            true
          )

          ;; Transfer LP tokens from user to contract
          (try! (contract-call? lp-token transfer amount user (as-contract tx-sender) none))

          ;; Update user info
          (let (
            (new-amount (+ current-amount amount))
            (new-reward-debt (/ (* new-amount acc-reward-per-share) PRECISION))
          )
            (map-set user-info {pool-id: pool-id, user: user} {
              amount: new-amount,
              reward-debt: new-reward-debt
            })

            ;; Update pool total staked
            (map-set pools pool-id (merge updated-pool {
              total-staked: (+ (get total-staked updated-pool) amount)
            }))

            (print {
              event: "staked",
              user: user,
              pool-id: pool-id,
              amount: amount,
              total-staked: new-amount
            })

            (ok new-amount)
          )
        )
      )
      ERR_POOL_NOT_FOUND
    )
  )
)

(define-public (unstake (pool-id uint) (amount uint) (lp-token <sip-010-trait>))
  (begin
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)

    (match (map-get? pools pool-id)
      pool
      (begin
        ;; Verify LP token matches
        (asserts! (is-eq (contract-of lp-token) (get lp-token pool)) ERR_INVALID_POOL_ID)

        ;; Update pool rewards
        (try! (update-pool pool-id))

        (let (
          (user tx-sender)
          (user-data (unwrap! (map-get? user-info {pool-id: pool-id, user: user}) ERR_INSUFFICIENT_STAKE))
          (current-amount (get amount user-data))
          (updated-pool (unwrap-panic (map-get? pools pool-id)))
          (acc-reward-per-share (get accumulated-reward-per-share updated-pool))
        )
          ;; Check user has enough staked
          (asserts! (>= current-amount amount) ERR_INSUFFICIENT_STAKE)

          ;; Claim pending rewards
          (let (
            (pending (- (/ (* current-amount acc-reward-per-share) PRECISION) (get reward-debt user-data)))
          )
            (if (> pending u0)
              (try! (mint-rewards user pending))
              true
            )
          )

          ;; Transfer LP tokens back to user
          (try! (as-contract (contract-call? lp-token transfer amount (as-contract tx-sender) user none)))

          ;; Update user info
          (let (
            (new-amount (- current-amount amount))
            (new-reward-debt (/ (* new-amount acc-reward-per-share) PRECISION))
          )
            (map-set user-info {pool-id: pool-id, user: user} {
              amount: new-amount,
              reward-debt: new-reward-debt
            })

            ;; Update pool total staked
            (map-set pools pool-id (merge updated-pool {
              total-staked: (- (get total-staked updated-pool) amount)
            }))

            (print {
              event: "unstaked",
              user: user,
              pool-id: pool-id,
              amount: amount,
              remaining-staked: new-amount
            })

            (ok new-amount)
          )
        )
      )
      ERR_POOL_NOT_FOUND
    )
  )
)

(define-public (claim-rewards (pool-id uint))
  (begin
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)

    (match (map-get? pools pool-id)
      pool
      (begin
        ;; Update pool rewards
        (try! (update-pool pool-id))

        (let (
          (user tx-sender)
          (user-data (unwrap! (map-get? user-info {pool-id: pool-id, user: user}) ERR_NO_REWARDS))
          (current-amount (get amount user-data))
          (updated-pool (unwrap-panic (map-get? pools pool-id)))
          (acc-reward-per-share (get accumulated-reward-per-share updated-pool))
        )
          ;; Calculate pending rewards
          (let (
            (pending (- (/ (* current-amount acc-reward-per-share) PRECISION) (get reward-debt user-data)))
          )
            (asserts! (> pending u0) ERR_NO_REWARDS)

            ;; Mint rewards to user
            (try! (mint-rewards user pending))

            ;; Update reward debt
            (map-set user-info {pool-id: pool-id, user: user} (merge user-data {
              reward-debt: (/ (* current-amount acc-reward-per-share) PRECISION)
            }))

            (print {
              event: "rewards-claimed",
              user: user,
              pool-id: pool-id,
              amount: pending
            })

            (ok pending)
          )
        )
      )
      ERR_POOL_NOT_FOUND
    )
  )
)

(define-public (emergency-unstake (pool-id uint) (lp-token <sip-010-trait>))
  (begin
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)

    (match (map-get? pools pool-id)
      pool
      (begin
        ;; Verify LP token matches
        (asserts! (is-eq (contract-of lp-token) (get lp-token pool)) ERR_INVALID_POOL_ID)

        (let (
          (user tx-sender)
          (user-data (unwrap! (map-get? user-info {pool-id: pool-id, user: user}) ERR_INSUFFICIENT_STAKE))
          (staked-amount (get amount user-data))
        )
          (asserts! (> staked-amount u0) ERR_INSUFFICIENT_STAKE)

          ;; Transfer LP tokens back without rewards
          (try! (as-contract (contract-call? lp-token transfer staked-amount (as-contract tx-sender) user none)))

          ;; Clear user info
          (map-set user-info {pool-id: pool-id, user: user} {
            amount: u0,
            reward-debt: u0
          })

          ;; Update pool total staked
          (map-set pools pool-id (merge pool {
            total-staked: (- (get total-staked pool) staked-amount)
          }))

          (print {
            event: "emergency-unstake",
            user: user,
            pool-id: pool-id,
            amount: staked-amount
          })

          (ok staked-amount)
        )
      )
      ERR_POOL_NOT_FOUND
    )
  )
)

;; ============================================
;; REWARD DISTRIBUTION
;; ============================================

(define-private (mint-rewards (recipient principal) (amount uint))
  (match (contract-call? VDEX_TOKEN mint amount recipient)
    success (ok true)
    error ERR_MINT_FAILED
  )
)

;; ============================================
;; READ-ONLY FUNCTIONS
;; ============================================

(define-read-only (get-pool-info (pool-id uint))
  (map-get? pools pool-id)
)

(define-read-only (get-user-info (pool-id uint) (user principal))
  (map-get? user-info {pool-id: pool-id, user: user})
)

(define-read-only (get-pending-rewards (pool-id uint) (user principal))
  (match (map-get? pools pool-id)
    pool
    (match (map-get? user-info {pool-id: pool-id, user: user})
      user-data
      (let (
        (current-block block-height)
        (last-reward-block (get last-reward-block pool))
        (total-staked (get total-staked pool))
        (acc-reward-per-share (get accumulated-reward-per-share pool))
        (user-amount (get amount user-data))
        (reward-debt (get reward-debt user-data))
      )
        (if (or (<= current-block last-reward-block) (is-eq total-staked u0))
          (ok (- (/ (* user-amount acc-reward-per-share) PRECISION) reward-debt))
          (let (
            (reward (calculate-pool-reward pool-id last-reward-block current-block))
            (reward-per-share (/ (* reward PRECISION) total-staked))
            (new-acc-reward (+ acc-reward-per-share reward-per-share))
          )
            (ok (- (/ (* user-amount new-acc-reward) PRECISION) reward-debt))
          )
        )
      )
      (ok u0)
    )
    ERR_POOL_NOT_FOUND
  )
)

(define-read-only (get-pool-apr (pool-id uint))
  (match (map-get? pools pool-id)
    pool
    (let (
      (total-staked (get total-staked pool))
      (allocation-points (get allocation-points pool))
      (total-alloc (var-get total-allocation-points))
      (reward-per-block (var-get reward-per-block))
      (blocks-per-year u52560) ;; Approximate blocks per year (10 min blocks)
    )
      (if (or (is-eq total-staked u0) (is-eq total-alloc u0))
        (ok u0)
        (let (
          (pool-rewards-per-block (/ (* reward-per-block allocation-points) total-alloc))
          (yearly-rewards (* pool-rewards-per-block blocks-per-year))
          ;; APR in basis points (0.01%)
          (apr (/ (* yearly-rewards u10000) total-staked))
        )
          (ok apr)
        )
      )
    )
    ERR_POOL_NOT_FOUND
  )
)

(define-read-only (get-total-allocation-points)
  (ok (var-get total-allocation-points))
)

(define-read-only (get-reward-per-block)
  (ok (var-get reward-per-block))
)

(define-read-only (get-pool-count)
  (ok (var-get next-pool-id))
)

(define-read-only (get-pool-id-by-lp-token (lp-token principal))
  (ok (map-get? lp-token-to-pool lp-token))
)

;; ============================================
;; ADMIN FUNCTIONS
;; ============================================

(define-public (set-reward-per-block (new-reward-per-block uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (asserts! (var-get is-initialized) ERR_NOT_INITIALIZED)

    ;; Update all pools before changing reward rate
    (try! (update-all-pools))

    (let (
      (old-reward (var-get reward-per-block))
    )
      (var-set reward-per-block new-reward-per-block)

      (print {
        event: "reward-per-block-updated",
        old-reward: old-reward,
        new-reward: new-reward-per-block
      })

      (ok true)
    )
  )
)

(define-read-only (is-initialized-check)
  (var-get is-initialized)
)
