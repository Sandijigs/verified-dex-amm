;; Math Library for Verified DEX AMM
;; Provides mathematical utilities for constant product AMM calculations
;; All calculations use safe math with overflow protection

;; Constants
(define-constant PRECISION u1000000) ;; 6 decimal precision for calculations
(define-constant MAX_UINT u340282366920938463463374607431768211455) ;; Maximum uint128 value
(define-constant BASIS_POINTS u10000) ;; Basis points denominator (100% = 10000 bps)

;; Error codes
(define-constant ERR_DIVIDE_BY_ZERO (err u1001))
(define-constant ERR_OVERFLOW (err u1002))
(define-constant ERR_UNDERFLOW (err u1003))
(define-constant ERR_INVALID_INPUT (err u1004))
(define-constant ERR_INSUFFICIENT_LIQUIDITY (err u1005))

;; Safe multiplication with overflow check
;; @param a: first operand
;; @param b: second operand
;; @returns: result or overflow error
(define-read-only (safe-mul (a uint) (b uint))
  (let
    (
      (result (* a b))
    )
    (if (or (is-eq a u0) (is-eq b u0))
      (ok u0)
      (if (is-eq (/ result a) b)
        (ok result)
        ERR_OVERFLOW
      )
    )
  )
)

;; Safe division with zero check
;; @param a: numerator
;; @param b: denominator
;; @returns: result or divide by zero error
(define-read-only (safe-div (a uint) (b uint))
  (if (is-eq b u0)
    ERR_DIVIDE_BY_ZERO
    (ok (/ a b))
  )
)

;; Calculate output amount for constant product AMM (x * y = k)
;; Formula: dy = (y * dx * (10000 - fee)) / (x * 10000 + dx * (10000 - fee))
;; @param amount-in: amount of tokens being swapped in
;; @param reserve-in: reserve of token being swapped in
;; @param reserve-out: reserve of token being swapped out
;; @param fee-bps: fee in basis points (e.g., 30 = 0.3%)
;; @returns: amount of tokens to be received
(define-read-only (get-amount-out
  (amount-in uint)
  (reserve-in uint)
  (reserve-out uint)
  (fee-bps uint))
  (if (or (is-eq amount-in u0) (is-eq reserve-in u0) (is-eq reserve-out u0))
    ERR_INSUFFICIENT_LIQUIDITY
    (let
      (
        ;; Calculate amount in after fee: amount-in * (10000 - fee)
        (amount-in-with-fee (* amount-in (- BASIS_POINTS fee-bps)))
        ;; Calculate numerator: reserve-out * amount-in-with-fee
        (numerator (* reserve-out amount-in-with-fee))
        ;; Calculate denominator: (reserve-in * 10000) + amount-in-with-fee
        (denominator (+ (* reserve-in BASIS_POINTS) amount-in-with-fee))
      )
      (if (is-eq denominator u0)
        ERR_DIVIDE_BY_ZERO
        (ok (/ numerator denominator))
      )
    )
  )
)

;; Calculate input amount needed for desired output
;; Formula: dx = (x * dy * 10000) / ((y - dy) * (10000 - fee)) + 1
;; @param amount-out: desired amount of tokens to receive
;; @param reserve-in: reserve of token being swapped in
;; @param reserve-out: reserve of token being swapped out
;; @param fee-bps: fee in basis points
;; @returns: amount of tokens required to swap in
(define-read-only (get-amount-in
  (amount-out uint)
  (reserve-in uint)
  (reserve-out uint)
  (fee-bps uint))
  (if (or (is-eq amount-out u0) (>= amount-out reserve-out))
    ERR_INSUFFICIENT_LIQUIDITY
    (let
      (
        ;; Calculate numerator: reserve-in * amount-out * 10000
        (numerator (* (* reserve-in amount-out) BASIS_POINTS))
        ;; Calculate denominator: (reserve-out - amount-out) * (10000 - fee)
        (denominator (* (- reserve-out amount-out) (- BASIS_POINTS fee-bps)))
      )
      (if (is-eq denominator u0)
        ERR_DIVIDE_BY_ZERO
        ;; Add 1 to round up (ensures user pays at least enough)
        (ok (+ (/ numerator denominator) u1))
      )
    )
  )
)

;; Calculate LP tokens to mint for liquidity provision
;; @param amount-a: amount of token A being added
;; @param amount-b: amount of token B being added
;; @param reserve-a: current reserve of token A
;; @param reserve-b: current reserve of token B
;; @param total-supply: current total supply of LP tokens
;; @returns: amount of LP tokens to mint
(define-read-only (calculate-lp-tokens
  (amount-a uint)
  (amount-b uint)
  (reserve-a uint)
  (reserve-b uint)
  (total-supply uint))
  (if (is-eq total-supply u0)
    ;; First liquidity provision: mint sqrt(amount-a * amount-b)
    (sqrt (* amount-a amount-b))
    ;; Subsequent provisions: min(amount-a * total-supply / reserve-a, amount-b * total-supply / reserve-b)
    (let
      (
        (liquidity-a (/ (* amount-a total-supply) reserve-a))
        (liquidity-b (/ (* amount-b total-supply) reserve-b))
      )
      (ok (if (< liquidity-a liquidity-b) liquidity-a liquidity-b))
    )
  )
)

;; Calculate tokens to return for LP burn
;; @param lp-amount: amount of LP tokens to burn
;; @param reserve-a: current reserve of token A
;; @param reserve-b: current reserve of token B
;; @param total-supply: current total supply of LP tokens
;; @returns: tuple containing amounts of both tokens to return
(define-read-only (calculate-withdrawal
  (lp-amount uint)
  (reserve-a uint)
  (reserve-b uint)
  (total-supply uint))
  (if (or (is-eq total-supply u0) (> lp-amount total-supply))
    ERR_INVALID_INPUT
    (ok (tuple
      (token-a (/ (* lp-amount reserve-a) total-supply))
      (token-b (/ (* lp-amount reserve-b) total-supply))
    ))
  )
)

;; Square root using Babylonian method
;; @param n: number to calculate square root of
;; @returns: approximate square root
(define-read-only (sqrt (n uint))
  (if (is-eq n u0)
    (ok u0)
    (if (is-eq n u1)
      (ok u1)
      (let
        (
          ;; Initial guess: (n + 1) / 2
          (x0 (/ (+ n u1) u2))
          ;; First iteration
          (x1 (/ (+ x0 (/ n x0)) u2))
          ;; Second iteration
          (x2 (/ (+ x1 (/ n x1)) u2))
          ;; Third iteration
          (x3 (/ (+ x2 (/ n x2)) u2))
          ;; Fourth iteration
          (x4 (/ (+ x3 (/ n x3)) u2))
          ;; Fifth iteration
          (x5 (/ (+ x4 (/ n x4)) u2))
          ;; Sixth iteration
          (x6 (/ (+ x5 (/ n x5)) u2))
          ;; Seventh iteration for better precision
          (x7 (/ (+ x6 (/ n x6)) u2))
        )
        (ok x7)
      )
    )
  )
)

;; Calculate the minimum of two uints
;; @param a: first value
;; @param b: second value
;; @returns: minimum value
(define-read-only (min (a uint) (b uint))
  (if (< a b) a b)
)

;; Calculate the maximum of two uints
;; @param a: first value
;; @param b: second value
;; @returns: maximum value
(define-read-only (max (a uint) (b uint))
  (if (> a b) a b)
)

;; Check if multiplication would overflow
;; @param a: first operand
;; @param b: second operand
;; @returns: true if multiplication would overflow
(define-read-only (would-overflow (a uint) (b uint))
  (if (or (is-eq a u0) (is-eq b u0))
    false
    (let
      (
        (result (* a b))
      )
      (not (is-eq (/ result a) b))
    )
  )
)

;; Calculate optimal amounts for adding liquidity
;; Given desired amounts and reserves, calculate the optimal amounts that maintain the pool ratio
;; @param amount-a-desired: desired amount of token A
;; @param amount-b-desired: desired amount of token B
;; @param reserve-a: current reserve of token A
;; @param reserve-b: current reserve of token B
;; @returns: tuple with optimal amounts
(define-read-only (calculate-optimal-amounts
  (amount-a-desired uint)
  (amount-b-desired uint)
  (reserve-a uint)
  (reserve-b uint))
  (if (and (is-eq reserve-a u0) (is-eq reserve-b u0))
    ;; First liquidity: use desired amounts
    (ok (tuple
      (amount-a amount-a-desired)
      (amount-b amount-b-desired)
    ))
    ;; Calculate optimal amount-b based on amount-a
    (let
      (
        (amount-b-optimal (/ (* amount-a-desired reserve-b) reserve-a))
      )
      (if (<= amount-b-optimal amount-b-desired)
        (ok (tuple
          (amount-a amount-a-desired)
          (amount-b amount-b-optimal)
        ))
        ;; Calculate optimal amount-a based on amount-b
        (let
          (
            (amount-a-optimal (/ (* amount-b-desired reserve-a) reserve-b))
          )
          (ok (tuple
            (amount-a amount-a-optimal)
            (amount-b amount-b-desired)
          ))
        )
      )
    )
  )
)