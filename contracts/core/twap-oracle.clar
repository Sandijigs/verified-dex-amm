;; TWAP Oracle Contract
;; Dedicated contract for tracking and querying time-weighted average prices
;; Uses Clarity 4's stacks-block-time for accurate timestamp-based calculations

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant MAX_OBSERVATIONS u100)  ;; Maximum observations per pool (circular buffer)
(define-constant MIN_TWAP_PERIOD u1)     ;; Minimum period for TWAP calculation (blocks)
(define-constant MAX_TWAP_PERIOD u10000) ;; Maximum period for TWAP calculation (blocks)
(define-constant PRECISION u1000000)     ;; Price precision (6 decimals)

;; Error codes
(define-constant ERR_POOL_NOT_FOUND (err u6001))
(define-constant ERR_INSUFFICIENT_HISTORY (err u6002))
(define-constant ERR_INVALID_PERIOD (err u6003))
(define-constant ERR_NOT_INITIALIZED (err u6004))
(define-constant ERR_NOT_AUTHORIZED (err u6005))
(define-constant ERR_INVALID_POOL (err u6006))
(define-constant ERR_NO_OBSERVATIONS (err u6007))
(define-constant ERR_CALCULATION_ERROR (err u6008))

;; Data structures

;; Price observation structure for storing snapshots
(define-map price-observations
  {pool: principal, index: uint}
  {
    timestamp: uint,
    price-a-cumulative: uint,
    price-b-cumulative: uint,
    reserve-a: uint,
    reserve-b: uint
  }
)

;; Pool observation state tracking
(define-map pool-observation-state
  principal  ;; pool address
  {
    current-index: uint,      ;; Current position in circular buffer
    cardinality: uint,        ;; Number of observations stored
    initialized: bool,        ;; Whether pool has been initialized
    last-update: uint,        ;; Last update timestamp
    total-observations: uint  ;; Total observations recorded
  }
)

;; Authorized pools that can record observations
(define-map authorized-pools principal bool)

;; Admin variables
(define-data-var contract-owner principal CONTRACT_OWNER)
(define-data-var paused bool false)

;; Admin Functions

;; Transfer ownership
(define-public (set-owner (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_AUTHORIZED)
    (var-set contract-owner new-owner)
    (ok true)
  )
)

;; Pause/unpause oracle
(define-public (set-paused (is-paused bool))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_AUTHORIZED)
    (var-set paused is-paused)
    (ok true)
  )
)

;; Authorize a pool to record observations
(define-public (authorize-pool (pool principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_AUTHORIZED)
    (map-set authorized-pools pool true)
    ;; Initialize pool state if not already done
    (if (is-none (map-get? pool-observation-state pool))
      (map-set pool-observation-state pool {
        current-index: u0,
        cardinality: u0,
        initialized: true,
        last-update: stacks-block-time,
        total-observations: u0
      })
      true
    )
    (ok true)
  )
)

;; Revoke pool authorization
(define-public (revoke-pool (pool principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_AUTHORIZED)
    (map-delete authorized-pools pool)
    (ok true)
  )
)

;; Core Oracle Functions

;; Record a price observation for a pool
;; USES CLARITY 4: stacks-block-time for timestamp
(define-public (record-observation
  (pool principal)
  (reserve-a uint)
  (reserve-b uint)
  (cumulative-price-a uint)
  (cumulative-price-b uint))
  (let
    (
      ;; Get current timestamp using Clarity 4's stacks-block-time
      (current-time stacks-block-time)
      (state (unwrap! (map-get? pool-observation-state pool) ERR_POOL_NOT_FOUND))
    )
    ;; Check authorization
    (asserts! (default-to false (map-get? authorized-pools pool)) ERR_NOT_AUTHORIZED)
    ;; Check not paused
    (asserts! (not (var-get paused)) ERR_NOT_AUTHORIZED)
    ;; Check reserves are valid
    (asserts! (and (> reserve-a u0) (> reserve-b u0)) ERR_INVALID_POOL)

    ;; Calculate next index in circular buffer
    (let
      (
        (next-index (if (< (get current-index state) (- MAX_OBSERVATIONS u1))
                      (+ (get current-index state) u1)
                      u0))  ;; Wrap around to 0
        (new-cardinality (if (< (get cardinality state) MAX_OBSERVATIONS)
                           (+ (get cardinality state) u1)
                           MAX_OBSERVATIONS))
      )
      ;; Store observation
      (map-set price-observations
        {pool: pool, index: next-index}
        {
          timestamp: current-time,
          price-a-cumulative: cumulative-price-a,
          price-b-cumulative: cumulative-price-b,
          reserve-a: reserve-a,
          reserve-b: reserve-b
        }
      )

      ;; Update pool state
      (map-set pool-observation-state pool
        (merge state {
          current-index: next-index,
          cardinality: new-cardinality,
          last-update: current-time,
          total-observations: (+ (get total-observations state) u1)
        })
      )

      (ok {
        index: next-index,
        timestamp: current-time,
        total-observations: (+ (get total-observations state) u1)
      })
    )
  )
)

;; Get TWAP for a specific period
;; USES CLARITY 4: stacks-block-time for current time
(define-read-only (get-twap (pool principal) (period uint))
  (let
    (
      ;; Get current time and calculate target time
      (current-time stacks-block-time)
      (state (unwrap! (map-get? pool-observation-state pool) ERR_POOL_NOT_FOUND))
    )
    ;; Validate period
    (asserts! (and (>= period MIN_TWAP_PERIOD) (<= period MAX_TWAP_PERIOD)) ERR_INVALID_PERIOD)
    ;; Check pool has observations
    (asserts! (> (get cardinality state) u0) ERR_NO_OBSERVATIONS)

    ;; Find observations for TWAP calculation
    (let
      (
        (target-time (if (> current-time period) (- current-time period) u0))
        ;; Get the most recent observation
        (recent-obs (unwrap!
          (map-get? price-observations {pool: pool, index: (get current-index state)})
          ERR_NO_OBSERVATIONS))
        ;; Find the observation closest to target time
        (old-obs (find-observation-near-timestamp pool target-time state))
      )
      ;; Calculate TWAP
      (match old-obs
        old-observation
          (let
            (
              (time-elapsed (- (get timestamp recent-obs) (get timestamp old-observation)))
              (price-a-delta (- (get price-a-cumulative recent-obs)
                               (get price-a-cumulative old-observation)))
              (price-b-delta (- (get price-b-cumulative recent-obs)
                               (get price-b-cumulative old-observation)))
            )
            ;; Ensure we have sufficient time elapsed
            (asserts! (> time-elapsed u0) ERR_INSUFFICIENT_HISTORY)

            (ok {
              twap-price-a: (/ price-a-delta time-elapsed),
              twap-price-b: (/ price-b-delta time-elapsed),
              time-range: time-elapsed,
              observations-used: u2
            })
          )
        ERR_INSUFFICIENT_HISTORY
      )
    )
  )
)

;; Get current spot price from latest observation
(define-read-only (get-spot-price (pool principal))
  (let
    (
      (state (unwrap! (map-get? pool-observation-state pool) ERR_POOL_NOT_FOUND))
    )
    ;; Check pool has observations
    (asserts! (> (get cardinality state) u0) ERR_NO_OBSERVATIONS)

    ;; Get the most recent observation
    (match (map-get? price-observations {pool: pool, index: (get current-index state)})
      observation
        (let
          (
            (reserve-a (get reserve-a observation))
            (reserve-b (get reserve-b observation))
          )
          ;; Calculate spot prices with precision
          (ok {
            price-a-in-b: (/ (* reserve-b PRECISION) reserve-a),
            price-b-in-a: (/ (* reserve-a PRECISION) reserve-b),
            reserve-a: reserve-a,
            reserve-b: reserve-b,
            timestamp: (get timestamp observation)
          })
        )
      ERR_NO_OBSERVATIONS
    )
  )
)

;; Get price with TWAP comparison for manipulation detection
(define-read-only (get-price-with-twap (pool principal) (twap-period uint))
  (let
    (
      (spot (try! (get-spot-price pool)))
      (twap (try! (get-twap pool twap-period)))
    )
    (ok {
      spot-price-a: (get price-a-in-b spot),
      spot-price-b: (get price-b-in-a spot),
      twap-price-a: (get twap-price-a twap),
      twap-price-b: (get twap-price-b twap),
      ;; Calculate divergence percentage (spot vs TWAP)
      divergence-a: (if (> (get twap-price-a twap) u0)
                      (/ (* (if (> (get price-a-in-b spot) (get twap-price-a twap))
                              (- (get price-a-in-b spot) (get twap-price-a twap))
                              (- (get twap-price-a twap) (get price-a-in-b spot)))
                           u10000)
                         (get twap-price-a twap))
                      u0),
      divergence-b: (if (> (get twap-price-b twap) u0)
                      (/ (* (if (> (get price-b-in-a spot) (get twap-price-b twap))
                              (- (get price-b-in-a spot) (get twap-price-b twap))
                              (- (get twap-price-b twap) (get price-b-in-a spot)))
                           u10000)
                         (get twap-price-b twap))
                      u0)
    })
  )
)

;; Helper Functions

;; Find observation near a specific timestamp (binary search through circular buffer)
(define-private (find-observation-near-timestamp
  (pool principal)
  (target-time uint)
  (state {current-index: uint, cardinality: uint, initialized: bool, last-update: uint, total-observations: uint}))
  ;; Simplified: return the oldest observation we have
  ;; In production, would implement binary search through circular buffer
  (if (>= (get cardinality state) u2)
    (let
      (
        ;; Get the oldest observation index
        (oldest-index (if (< (get cardinality state) MAX_OBSERVATIONS)
                        u0  ;; If buffer not full, oldest is at 0
                        (if (< (get current-index state) (- MAX_OBSERVATIONS u1))
                          (+ (get current-index state) u1)  ;; Next position is oldest
                          u0)))  ;; Wrapped around, 0 is oldest
      )
      (map-get? price-observations {pool: pool, index: oldest-index})
    )
    none
  )
)

;; Read-only Query Functions

;; Get pool observation state
(define-read-only (get-pool-state (pool principal))
  (map-get? pool-observation-state pool)
)

;; Check if pool is authorized
(define-read-only (is-pool-authorized (pool principal))
  (default-to false (map-get? authorized-pools pool))
)

;; Get specific observation by index
(define-read-only (get-observation (pool principal) (index uint))
  (map-get? price-observations {pool: pool, index: index})
)

;; Get latest observation for a pool
(define-read-only (get-latest-observation (pool principal))
  (match (map-get? pool-observation-state pool)
    state
      (map-get? price-observations {pool: pool, index: (get current-index state)})
    none
  )
)

;; Get oracle configuration
(define-read-only (get-config)
  {
    owner: (var-get contract-owner),
    paused: (var-get paused),
    max-observations: MAX_OBSERVATIONS,
    min-twap-period: MIN_TWAP_PERIOD,
    max-twap-period: MAX_TWAP_PERIOD,
    precision: PRECISION
  }
)

;; Calculate safe TWAP period based on available history
(define-read-only (get-safe-twap-period (pool principal))
  (match (map-get? pool-observation-state pool)
    state
      (match (get-oldest-observation pool state)
        oldest
          (let
            (
              (current-time stacks-block-time)
              (history-length (- current-time (get timestamp oldest)))
            )
            (ok {
              max-safe-period: history-length,
              total-observations: (get total-observations state),
              oldest-timestamp: (get timestamp oldest),
              current-time: current-time
            })
          )
        ERR_NO_OBSERVATIONS
      )
    ERR_POOL_NOT_FOUND
  )
)

;; Helper to get oldest observation
(define-private (get-oldest-observation
  (pool principal)
  (state {current-index: uint, cardinality: uint, initialized: bool, last-update: uint, total-observations: uint}))
  (if (> (get cardinality state) u0)
    (let
      (
        (oldest-index (if (< (get cardinality state) MAX_OBSERVATIONS)
                        u0
                        (if (< (get current-index state) (- MAX_OBSERVATIONS u1))
                          (+ (get current-index state) u1)
                          u0)))
      )
      (map-get? price-observations {pool: pool, index: oldest-index})
    )
    none
  )
)