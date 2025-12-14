import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const address1 = accounts.get("wallet_1")!;

/**
 * Test Suite for Math Library
 *
 * These tests verify:
 * 1. AMM calculation functions (get-amount-out, get-amount-in)
 * 2. LP token calculations (calculate-lp-tokens, calculate-withdrawal)
 * 3. Safe math operations (safe-mul, safe-div)
 * 4. Square root function
 * 5. Edge cases and error handling
 */

describe("Math lib: get-amount-out", () => {
  it("calculates correct swap amounts with standard parameters", () => {
    // Test standard swap: 1000 in, reserves 100000/50000, 0.3% fee
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "get-amount-out",
      [
        Cl.uint(1000),      // amount-in
        Cl.uint(100000),    // reserve-in
        Cl.uint(50000),     // reserve-out
        Cl.uint(30)         // fee-bps (0.3%)
      ],
      address1
    );
    // dy = 50000 * 1000 * 9970 / (100000 * 10000 + 1000 * 9970) = 494
    expect(result).toBeOk(Cl.uint(494));
  });

  it("calculates correct amount for large swap", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "get-amount-out",
      [
        Cl.uint(10000),
        Cl.uint(100000),
        Cl.uint(50000),
        Cl.uint(30)
      ],
      address1
    );
    // Should get less due to price impact
    expect(result).toBeOk(Cl.uint(4516));
  });

  it("calculates correct amount with zero fee", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "get-amount-out",
      [
        Cl.uint(1000),
        Cl.uint(100000),
        Cl.uint(50000),
        Cl.uint(0)
      ],
      address1
    );
    // Zero fee should give better rate
    expect(result).toBeOk(Cl.uint(495));
  });

  it("returns error for zero amount-in", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "get-amount-out",
      [
        Cl.uint(0),
        Cl.uint(100000),
        Cl.uint(50000),
        Cl.uint(30)
      ],
      address1
    );
    expect(result).toBeErr(Cl.uint(1005)); // ERR_INSUFFICIENT_LIQUIDITY
  });

  it("returns error for zero reserves", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "get-amount-out",
      [
        Cl.uint(1000),
        Cl.uint(0),
        Cl.uint(50000),
        Cl.uint(30)
      ],
      address1
    );
    expect(result).toBeErr(Cl.uint(1005)); // ERR_INSUFFICIENT_LIQUIDITY
  });
});

describe("Math lib: get-amount-in", () => {
  it("calculates correct required input for desired output", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "get-amount-in",
      [
        Cl.uint(500),       // amount-out
        Cl.uint(100000),    // reserve-in
        Cl.uint(50000),     // reserve-out
        Cl.uint(30)         // fee-bps
      ],
      address1
    );
    // Should calculate required input (will be > 1000 due to fee)
    const value = result.value as any;
    expect(value.type).toBe(Cl.ClarityType.ResponseOk);
    expect(value.value.value).toBeGreaterThan(1000n);
  });

  it("returns error for output equal to reserve", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "get-amount-in",
      [
        Cl.uint(50000),
        Cl.uint(100000),
        Cl.uint(50000),
        Cl.uint(30)
      ],
      address1
    );
    expect(result).toBeErr(Cl.uint(1005)); // ERR_INSUFFICIENT_LIQUIDITY
  });

  it("returns error for zero output", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "get-amount-in",
      [
        Cl.uint(0),
        Cl.uint(100000),
        Cl.uint(50000),
        Cl.uint(30)
      ],
      address1
    );
    expect(result).toBeErr(Cl.uint(1005)); // ERR_INSUFFICIENT_LIQUIDITY
  });
});

describe("Math lib: calculate-lp-tokens", () => {
  it("calculates sqrt for first liquidity provision", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "calculate-lp-tokens",
      [
        Cl.uint(100000),    // amount-a
        Cl.uint(50000),     // amount-b
        Cl.uint(0),         // reserve-a (0 for first)
        Cl.uint(0),         // reserve-b (0 for first)
        Cl.uint(0)          // total-supply (0 for first)
      ],
      address1
    );
    // Should return sqrt(100000 * 50000) ≈ 70710
    const value = result.value as any;
    expect(value.type).toBe(Cl.ClarityType.ResponseOk);
    expect(value.value.value).toBeGreaterThan(70000n);
    expect(value.value.value).toBeLessThan(71000n);
  });

  it("calculates proportional LP tokens for subsequent liquidity", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "calculate-lp-tokens",
      [
        Cl.uint(10000),     // amount-a (10% of reserves)
        Cl.uint(5000),      // amount-b (10% of reserves)
        Cl.uint(100000),    // reserve-a
        Cl.uint(50000),     // reserve-b
        Cl.uint(70710)      // total-supply
      ],
      address1
    );
    // 10% of reserves = 10% of supply
    expect(result).toBeOk(Cl.uint(7071));
  });

  it("uses minimum ratio for unbalanced liquidity", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "calculate-lp-tokens",
      [
        Cl.uint(10000),     // amount-a
        Cl.uint(10000),     // amount-b (too much)
        Cl.uint(100000),    // reserve-a
        Cl.uint(50000),     // reserve-b
        Cl.uint(70710)      // total-supply
      ],
      address1
    );
    // Should use the minimum ratio
    expect(result).toBeOk(Cl.uint(7071));
  });
});

describe("Math lib: calculate-withdrawal", () => {
  it("calculates correct withdrawal for 10% of liquidity", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "calculate-withdrawal",
      [
        Cl.uint(1000),      // lp-amount (10% of 10000)
        Cl.uint(100000),    // reserve-a
        Cl.uint(50000),     // reserve-b
        Cl.uint(10000)      // total-supply
      ],
      address1
    );
    // 10% withdrawal should get 10% of reserves
    expect(result).toBeOk(Cl.tuple({
      'token-a': Cl.uint(10000),
      'token-b': Cl.uint(5000)
    }));
  });

  it("calculates correct withdrawal for all liquidity", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "calculate-withdrawal",
      [
        Cl.uint(10000),     // lp-amount
        Cl.uint(100000),    // reserve-a
        Cl.uint(50000),     // reserve-b
        Cl.uint(10000)      // total-supply
      ],
      address1
    );
    // 100% withdrawal should get all reserves
    expect(result).toBeOk(Cl.tuple({
      'token-a': Cl.uint(100000),
      'token-b': Cl.uint(50000)
    }));
  });

  it("returns error for over-withdrawal", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "calculate-withdrawal",
      [
        Cl.uint(10001),     // lp-amount (too much)
        Cl.uint(100000),    // reserve-a
        Cl.uint(50000),     // reserve-b
        Cl.uint(10000)      // total-supply
      ],
      address1
    );
    expect(result).toBeErr(Cl.uint(1004)); // ERR_INVALID_INPUT
  });
});

describe("Math lib: safe math operations", () => {
  it("performs safe multiplication correctly", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "safe-mul",
      [Cl.uint(1000), Cl.uint(2000)],
      address1
    );
    expect(result).toBeOk(Cl.uint(2000000));
  });

  it("handles zero multiplication", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "safe-mul",
      [Cl.uint(0), Cl.uint(1000)],
      address1
    );
    expect(result).toBeOk(Cl.uint(0));
  });

  it("returns error on multiplication overflow", () => {
    const maxUint = "340282366920938463463374607431768211455";
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "safe-mul",
      [Cl.uint(maxUint), Cl.uint(2)],
      address1
    );
    expect(result).toBeErr(Cl.uint(1002)); // ERR_OVERFLOW
  });

  it("performs safe division correctly", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "safe-div",
      [Cl.uint(1000), Cl.uint(10)],
      address1
    );
    expect(result).toBeOk(Cl.uint(100));
  });

  it("returns error for division by zero", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "safe-div",
      [Cl.uint(1000), Cl.uint(0)],
      address1
    );
    expect(result).toBeErr(Cl.uint(1001)); // ERR_DIVIDE_BY_ZERO
  });
});

describe("Math lib: sqrt function", () => {
  it("calculates sqrt of perfect squares correctly", () => {
    const testCases = [
      { input: 0, expected: 0 },
      { input: 1, expected: 1 },
      { input: 4, expected: 2 },
      { input: 9, expected: 3 },
      { input: 16, expected: 4 },
      { input: 100, expected: 10 },
      { input: 10000, expected: 100 },
      { input: 1000000, expected: 1000 },
    ];

    for (const { input, expected } of testCases) {
      const { result } = simnet.callReadOnlyFn(
        "math-lib",
        "sqrt",
        [Cl.uint(input)],
        address1
      );
      expect(result).toBeOk(Cl.uint(expected));
    }
  });

  it("approximates sqrt of non-perfect squares", () => {
    // sqrt(2) ≈ 1.4
    const { result: r1 } = simnet.callReadOnlyFn(
      "math-lib",
      "sqrt",
      [Cl.uint(2)],
      address1
    );
    expect(r1).toBeOk(Cl.uint(1));

    // sqrt(10) ≈ 3.16
    const { result: r2 } = simnet.callReadOnlyFn(
      "math-lib",
      "sqrt",
      [Cl.uint(10)],
      address1
    );
    expect(r2).toBeOk(Cl.uint(3));

    // sqrt(999) ≈ 31.6
    const { result: r3 } = simnet.callReadOnlyFn(
      "math-lib",
      "sqrt",
      [Cl.uint(999)],
      address1
    );
    expect(r3).toBeOk(Cl.uint(31));
  });

  it("handles large numbers", () => {
    // sqrt(1000000000) ≈ 31622.7
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "sqrt",
      [Cl.uint(1000000000)],
      address1
    );
    expect(result).toBeOk(Cl.uint(31622));
  });
});

describe("Math lib: min and max functions", () => {
  it("min returns smaller value", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "min",
      [Cl.uint(100), Cl.uint(200)],
      address1
    );
    expect(result).toBe(Cl.uint(100));
  });

  it("max returns larger value", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "max",
      [Cl.uint(100), Cl.uint(200)],
      address1
    );
    expect(result).toBe(Cl.uint(200));
  });

  it("handles equal values", () => {
    const { result: minResult } = simnet.callReadOnlyFn(
      "math-lib",
      "min",
      [Cl.uint(100), Cl.uint(100)],
      address1
    );
    expect(minResult).toBe(Cl.uint(100));

    const { result: maxResult } = simnet.callReadOnlyFn(
      "math-lib",
      "max",
      [Cl.uint(100), Cl.uint(100)],
      address1
    );
    expect(maxResult).toBe(Cl.uint(100));
  });
});

describe("Math lib: calculate-optimal-amounts", () => {
  it("uses desired amounts for first liquidity", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "calculate-optimal-amounts",
      [
        Cl.uint(100000),    // amount-a-desired
        Cl.uint(50000),     // amount-b-desired
        Cl.uint(0),         // reserve-a
        Cl.uint(0),         // reserve-b
      ],
      address1
    );
    expect(result).toBeOk(Cl.tuple({
      'amount-a': Cl.uint(100000),
      'amount-b': Cl.uint(50000)
    }));
  });

  it("maintains ratio for subsequent liquidity", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "calculate-optimal-amounts",
      [
        Cl.uint(10000),     // amount-a-desired
        Cl.uint(5000),      // amount-b-desired
        Cl.uint(100000),    // reserve-a
        Cl.uint(50000),     // reserve-b
      ],
      address1
    );
    expect(result).toBeOk(Cl.tuple({
      'amount-a': Cl.uint(10000),
      'amount-b': Cl.uint(5000)
    }));
  });

  it("adjusts amounts when too much token B provided", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "calculate-optimal-amounts",
      [
        Cl.uint(10000),     // amount-a-desired
        Cl.uint(10000),     // amount-b-desired (too much)
        Cl.uint(100000),    // reserve-a
        Cl.uint(50000),     // reserve-b
      ],
      address1
    );
    expect(result).toBeOk(Cl.tuple({
      'amount-a': Cl.uint(10000),
      'amount-b': Cl.uint(5000)  // Adjusted down
    }));
  });

  it("adjusts amounts when too much token A provided", () => {
    const { result } = simnet.callReadOnlyFn(
      "math-lib",
      "calculate-optimal-amounts",
      [
        Cl.uint(20000),     // amount-a-desired (too much)
        Cl.uint(5000),      // amount-b-desired
        Cl.uint(100000),    // reserve-a
        Cl.uint(50000),     // reserve-b
      ],
      address1
    );
    expect(result).toBeOk(Cl.tuple({
      'amount-a': Cl.uint(10000),  // Adjusted down
      'amount-b': Cl.uint(5000)
    }));
  });
});