;; Pool Factory Contract
;; Factory for deploying new pools using verified templates
;; Works with pool-registry to ensure only verified pools are created

;; Constants
(define-constant CONTRACT_OWNER tx-sender)

;; Error codes
(define-constant ERR_NOT_OWNER (err u4001))
(define-constant ERR_POOL_EXISTS (err u4002))
(define-constant ERR_SAME_TOKEN (err u4003))
(define-constant ERR_REGISTRY_NOT_SET (err u4004))
(define-constant ERR_INVALID_TOKENS (err u4005))
(define-constant ERR_POOL_NOT_FOUND (err u4006))
(define-constant ERR_REGISTRY_CALL_FAILED (err u4007))
(define-constant ERR_ZERO_ADDRESS (err u4008))

;; Data variables
(define-data-var contract-owner principal CONTRACT_OWNER)
(define-data-var pool-count uint u0)
(define-data-var registry-contract principal CONTRACT_OWNER) ;; Will be set to pool-registry address

;; Maps

;; Map token pairs to pool address
;; Uses sorted tokens to ensure consistent lookup regardless of order
(define-map pools-by-tokens
  {token-a: principal, token-b: principal}
  principal ;; pool address
)

;; Map pool ID to pool address for enumeration
(define-map pool-by-id
  uint
  principal
)

;; Map pool address to pool metadata
(define-map pool-metadata
  principal ;; pool address
  {
    id: uint,
    token-a: principal,
    token-b: principal,
    created-at: uint,
    created-by: principal,
    template-used: (buff 32) ;; hash of template used
  }
)

;; Private functions

;; Helper to create a consistent key for token pairs
;; Since we can't easily sort principals, we'll check both orderings
(define-private (get-pool-key (token-a principal) (token-b principal))
  {token-a: token-a, token-b: token-b}
)

;; Admin functions

;; Transfer ownership
(define-public (set-owner (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_OWNER)
    (asserts! (not (is-eq new-owner (var-get contract-owner))) ERR_INVALID_TOKENS)
    (var-set contract-owner new-owner)
    (ok true)
  )
)

;; Set the registry contract address
(define-public (set-registry (registry principal))
  (begin
    ;; Only owner can set registry
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_OWNER)
    ;; Registry must be a valid address
    (asserts! (not (is-eq registry tx-sender)) ERR_ZERO_ADDRESS)
    ;; Set the registry
    (var-set registry-contract registry)
    (ok true)
  )
)

;; Core functionality

;; Create a new pool for token pair
;; In production, this would deploy a new contract or clone a template
;; For this implementation, we track pool creation and verification
(define-public (create-pool (token-a principal) (token-b principal) (pool-address principal) (template-hash (buff 32)))
  (let
    (
      ;; Create pool key for storage
      (pool-key-ab (get-pool-key token-a token-b))
      (pool-key-ba (get-pool-key token-b token-a))
      (registry (var-get registry-contract))
      (new-id (+ (var-get pool-count) u1))
    )
    ;; Check registry is set
    (asserts! (not (is-eq registry CONTRACT_OWNER)) ERR_REGISTRY_NOT_SET)

    ;; Ensure tokens are different
    (asserts! (not (is-eq token-a token-b)) ERR_SAME_TOKEN)

    ;; Ensure tokens are valid (not zero address)
    (asserts! (and (not (is-eq token-a tx-sender))
                   (not (is-eq token-b tx-sender))) ERR_INVALID_TOKENS)

    ;; Ensure pool doesn't already exist (check both orderings)
    (asserts! (and (is-none (map-get? pools-by-tokens pool-key-ab))
                   (is-none (map-get? pools-by-tokens pool-key-ba)))
              ERR_POOL_EXISTS)

    ;; Verify the pool with the registry
    ;; In production, pool-address would be the deployed pool contract
    (match (contract-call? .pool-registry verify-pool pool-address token-a token-b)
      success
        (begin
          ;; Add to pools-by-tokens map (both orderings for easy lookup)
          (map-set pools-by-tokens pool-key-ab pool-address)
          (map-set pools-by-tokens pool-key-ba pool-address)

          ;; Add to pool-by-id map
          (map-set pool-by-id new-id pool-address)

          ;; Store pool metadata
          (map-set pool-metadata
            pool-address
            {
              id: new-id,
              token-a: token-a,
              token-b: token-b,
              created-at: stacks-block-time,
              created-by: tx-sender,
              template-used: template-hash
            }
          )

          ;; Increment pool count
          (var-set pool-count new-id)

          ;; Return pool address and ID
          (ok {
            pool-address: pool-address,
            pool-id: new-id
          })
        )
      error ERR_REGISTRY_CALL_FAILED
    )
  )
)

;; Read-only functions

;; Get pool for token pair (simple lookup since we store both orderings)
(define-read-only (get-pool (token-a principal) (token-b principal))
  ;; Simply look up with the given order
  (map-get? pools-by-tokens {token-a: token-a, token-b: token-b})
)

;; Get pool by ID
(define-read-only (get-pool-by-id (id uint))
  (map-get? pool-by-id id)
)

;; Get total pool count
(define-read-only (get-pool-count)
  (var-get pool-count)
)

;; Get pool metadata
(define-read-only (get-pool-metadata (pool-address principal))
  (map-get? pool-metadata pool-address)
)

;; Check if pool exists for token pair
(define-read-only (pool-exists (token-a principal) (token-b principal))
  (is-some (get-pool token-a token-b))
)

;; Get registry contract
(define-read-only (get-registry)
  (var-get registry-contract)
)

;; Get owner
(define-read-only (get-owner)
  (var-get contract-owner)
)

;; Get pool details including verification status
(define-read-only (get-pool-details (pool-address principal))
  (match (map-get? pool-metadata pool-address)
    metadata
      (let
        (
          ;; Check verification status with registry
          (is-verified (contract-call? .pool-registry is-pool-verified pool-address))
        )
        (some {
          id: (get id metadata),
          token-a: (get token-a metadata),
          token-b: (get token-b metadata),
          created-at: (get created-at metadata),
          created-by: (get created-by metadata),
          template-used: (get template-used metadata),
          is-verified: is-verified
        })
      )
    none
  )
)

;; Helper function to get all pools for a specific token
;; Note: This is a simplified implementation. In production, you'd need indexing
(define-read-only (get-pools-for-token (token principal) (start-id uint) (limit uint))
  (let
    (
      (max-id (if (< (+ start-id limit) (var-get pool-count))
                  (+ start-id limit)
                  (var-get pool-count)))
    )
    ;; This would iterate through pools checking if token matches
    ;; Simplified for this implementation
    {
      pools-checked: limit,
      total-pools: (var-get pool-count),
      message: "Use get-pool-by-id to retrieve specific pools"
    }
  )
)

;; Get pool creation info
(define-read-only (get-pool-creation-info (pool-address principal))
  (match (map-get? pool-metadata pool-address)
    metadata
      (ok {
        created-at: (get created-at metadata),
        created-by: (get created-by metadata),
        template-hash: (get template-used metadata)
      })
    ERR_POOL_NOT_FOUND
  )
)