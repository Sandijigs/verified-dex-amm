;; Pool Registry Contract
;; Manages approved pool template hashes and verifies pool contracts
;; Uses Clarity 4's contract-hash? function to ensure pools match approved templates

;; Constants
(define-constant CONTRACT_OWNER tx-sender)

;; Error codes
(define-constant ERR_NOT_OWNER (err u2001))
(define-constant ERR_TEMPLATE_EXISTS (err u2002))
(define-constant ERR_TEMPLATE_NOT_FOUND (err u2003))
(define-constant ERR_POOL_NOT_VERIFIED (err u2004))
(define-constant ERR_HASH_MISMATCH (err u2005))
(define-constant ERR_TEMPLATE_INACTIVE (err u2006))
(define-constant ERR_POOL_ALREADY_VERIFIED (err u2007))

;; Data variables
(define-data-var contract-owner principal CONTRACT_OWNER)

;; Maps

;; Store approved template hashes with metadata
(define-map approved-templates
  (buff 32)  ;; contract hash
  {
    name: (string-ascii 64),
    version: uint,
    approved-at: uint,
    approved-by: principal,
    active: bool
  }
)

;; Store verified pool instances
(define-map verified-pools
  principal  ;; pool contract address
  {
    template-hash: (buff 32),
    verified-at: uint,
    token-a: principal,
    token-b: principal
  }
)

;; Track number of pools using each template
(define-map template-usage-count
  (buff 32)  ;; template hash
  uint       ;; number of pools using this template
)

;; Admin Functions

;; Transfer ownership
(define-public (set-owner (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_OWNER)
    (var-set contract-owner new-owner)
    (ok true)
  )
)

;; Add a new approved template hash
(define-public (add-template (template-hash (buff 32)) (name (string-ascii 64)) (version uint))
  (begin
    ;; Only owner can add templates
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_OWNER)

    ;; Check template doesn't already exist
    (asserts! (is-none (map-get? approved-templates template-hash)) ERR_TEMPLATE_EXISTS)

    ;; Add to approved-templates map
    (map-set approved-templates
      template-hash
      {
        name: name,
        version: version,
        approved-at: stacks-block-height,
        approved-by: tx-sender,
        active: true
      }
    )

    ;; Initialize usage count
    (map-set template-usage-count template-hash u0)

    (ok true)
  )
)

;; Remove/deactivate a template
(define-public (deactivate-template (template-hash (buff 32)))
  (begin
    ;; Only owner can deactivate
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_OWNER)

    ;; Check template exists
    (match (map-get? approved-templates template-hash)
      template
        (begin
          ;; Deactivate by setting active to false
          (map-set approved-templates
            template-hash
            (merge template { active: false })
          )
          (ok true)
        )
      ERR_TEMPLATE_NOT_FOUND
    )
  )
)

;; Reactivate a previously deactivated template
(define-public (reactivate-template (template-hash (buff 32)))
  (begin
    ;; Only owner can reactivate
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_OWNER)

    ;; Check template exists
    (match (map-get? approved-templates template-hash)
      template
        (begin
          ;; Reactivate by setting active to true
          (map-set approved-templates
            template-hash
            (merge template { active: true })
          )
          (ok true)
        )
      ERR_TEMPLATE_NOT_FOUND
    )
  )
)

;; Verification Functions

;; Verify a pool contract matches an approved template
;; USES CLARITY 4: contract-hash? function
(define-public (verify-pool (pool-contract principal) (token-a principal) (token-b principal))
  (let
    (
      ;; Get the hash of the pool contract's code using Clarity 4's contract-hash?
      (pool-hash (unwrap! (contract-hash? pool-contract) ERR_HASH_MISMATCH))
    )
    ;; Check this pool isn't already verified
    (asserts! (is-none (map-get? verified-pools pool-contract)) ERR_POOL_ALREADY_VERIFIED)

    ;; Check if this hash is in approved-templates and is active
    (match (map-get? approved-templates pool-hash)
      template
        (begin
          ;; Template must be active
          (asserts! (get active template) ERR_TEMPLATE_INACTIVE)

          ;; Add to verified-pools map
          (map-set verified-pools
            pool-contract
            {
              template-hash: pool-hash,
              verified-at: stacks-block-height,
              token-a: token-a,
              token-b: token-b
            }
          )

          ;; Increment usage count
          (map-set template-usage-count
            pool-hash
            (+ (default-to u0 (map-get? template-usage-count pool-hash)) u1)
          )

          (ok true)
        )
      ERR_TEMPLATE_NOT_FOUND
    )
  )
)

;; Read-only Functions

;; Check if a pool is verified
(define-read-only (is-pool-verified (pool-contract principal))
  (is-some (map-get? verified-pools pool-contract))
)

;; Get pool verification details
(define-read-only (get-pool-info (pool-contract principal))
  (map-get? verified-pools pool-contract)
)

;; Get template info
(define-read-only (get-template-info (template-hash (buff 32)))
  (map-get? approved-templates template-hash)
)

;; Check if template is approved and active
(define-read-only (is-template-approved (template-hash (buff 32)))
  (match (map-get? approved-templates template-hash)
    template (get active template)
    false
  )
)

;; Get the current owner
(define-read-only (get-owner)
  (var-get contract-owner)
)

;; Get template usage count
(define-read-only (get-template-usage (template-hash (buff 32)))
  (default-to u0 (map-get? template-usage-count template-hash))
)

;; List all verified pools for a template (would need indexing in production)
;; This is a helper to check if a specific pool uses a specific template
(define-read-only (pool-uses-template (pool-contract principal) (template-hash (buff 32)))
  (match (map-get? verified-pools pool-contract)
    pool-info
      (is-eq (get template-hash pool-info) template-hash)
    false
  )
)

;; Get pool tokens
(define-read-only (get-pool-tokens (pool-contract principal))
  (match (map-get? verified-pools pool-contract)
    pool-info
      (some {
        token-a: (get token-a pool-info),
        token-b: (get token-b pool-info)
      })
    none
  )
)

;; Check if a pool can be verified (template exists and is active)
(define-read-only (can-verify-with-hash (template-hash (buff 32)))
  (match (map-get? approved-templates template-hash)
    template
      {
        can-verify: (get active template),
        template-name: (get name template),
        template-version: (get version template)
      }
    {
      can-verify: false,
      template-name: "",
      template-version: u0
    }
  )
)