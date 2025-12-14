;; Pool Trait for Verified DEX
;; This trait defines the required interface that all liquidity pools must implement
;; Every pool in the verified DEX must implement this trait to be registered

(define-trait pool-trait
  (
    ;; Add liquidity to the pool
    ;; @param token-a-desired: desired amount of token A to add
    ;; @param token-b-desired: desired amount of token B to add
    ;; @param deadline: block height deadline for the transaction
    ;; @returns: tuple containing LP tokens minted and actual amounts used
    (add-liquidity (uint uint uint)
      (response
        (tuple
          (lp-tokens uint)
          (token-a-used uint)
          (token-b-used uint)
        )
        uint
      )
    )

    ;; Remove liquidity from the pool
    ;; @param lp-tokens: amount of LP tokens to burn
    ;; @param min-token-a: minimum amount of token A to receive
    ;; @param min-token-b: minimum amount of token B to receive
    ;; @returns: tuple containing amounts of tokens returned
    (remove-liquidity (uint uint uint)
      (response
        (tuple
          (token-a uint)
          (token-b uint)
        )
        uint
      )
    )

    ;; Swap token A for token B
    ;; @param amount-in: amount of token A to swap
    ;; @param min-amount-out: minimum amount of token B to receive
    ;; @returns: actual amount of token B received
    (swap-a-for-b (uint uint)
      (response uint uint)
    )

    ;; Swap token B for token A
    ;; @param amount-in: amount of token B to swap
    ;; @param min-amount-out: minimum amount of token A to receive
    ;; @returns: actual amount of token A received
    (swap-b-for-a (uint uint)
      (response uint uint)
    )

    ;; Get current reserves in the pool
    ;; @returns: tuple containing reserve amounts for both tokens
    (get-reserves ()
      (response
        (tuple
          (reserve-a uint)
          (reserve-b uint)
        )
        uint
      )
    )

    ;; Get the pool fee in basis points
    ;; @returns: fee in basis points (e.g., 30 = 0.3%)
    (get-fee ()
      (response uint uint)
    )

    ;; Get the token principals for this pool
    ;; @returns: tuple containing the principal addresses of both tokens
    (get-tokens ()
      (response
        (tuple
          (token-a principal)
          (token-b principal)
        )
        uint
      )
    )
  )
)