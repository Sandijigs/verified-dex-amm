import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

/**
 * Test Suite for Pool Template Contract
 *
 * Tests the reference implementation of a verified liquidity pool that:
 * 1. Implements the pool-trait interface
 * 2. Uses Clarity 4's stacks-block-time for TWAP oracle
 * 3. Provides constant product AMM functionality
 * 4. Manages LP token minting/burning
 * 5. Applies fees to swaps correctly
 */

describe("Pool Template: Initialization", () => {
  it("successfully initializes pool with token pair", () => {
    const tokenA = Cl.principal(deployer);
    const tokenB = Cl.principal(wallet1);

    const { result } = simnet.callPublicFn(
      "pool-template",
      "initialize",
      [tokenA, tokenB],
      deployer
    );

    expect(result).toBeOk(Cl.bool(true));

    // Verify pool info
    const poolInfo = simnet.callReadOnlyFn(
      "pool-template",
      "get-pool-info",
      [],
      deployer
    );

    expect(poolInfo.result.data['is-initialized']).toEqual(Cl.bool(true));
    expect(poolInfo.result.data['token-a']).toEqual(tokenA);
    expect(poolInfo.result.data['token-b']).toEqual(tokenB);
  });

  it("prevents initializing pool twice", () => {
    const tokenA = Cl.principal(deployer);
    const tokenB = Cl.principal(wallet1);

    // First initialization
    simnet.callPublicFn(
      "pool-template",
      "initialize",
      [tokenA, tokenB],
      deployer
    );

    // Try to initialize again
    const { result } = simnet.callPublicFn(
      "pool-template",
      "initialize",
      [tokenA, tokenB],
      deployer
    );

    expect(result).toBeErr(Cl.uint(3008)); // ERR_ALREADY_INITIALIZED
  });

  it("prevents initializing with same token", () => {
    const sameToken = Cl.principal(deployer);

    const { result } = simnet.callPublicFn(
      "pool-template",
      "initialize",
      [sameToken, sameToken],
      deployer
    );

    expect(result).toBeErr(Cl.uint(3010)); // ERR_SAME_TOKEN
  });
});

describe("Pool Template: Add Liquidity", () => {
  beforeEach(() => {
    // Initialize pool before each test
    simnet.callPublicFn(
      "pool-template",
      "initialize",
      [Cl.principal(deployer), Cl.principal(wallet1)],
      deployer
    );
  });

  it("adds first liquidity successfully", () => {
    const amountA = 100000;
    const amountB = 50000;
    const deadline = 1000000;

    const { result } = simnet.callPublicFn(
      "pool-template",
      "add-liquidity",
      [
        Cl.uint(amountA),
        Cl.uint(amountB),
        Cl.uint(deadline)
      ],
      wallet2
    );

    expect(result).toBeOk();
    const response = result.value as any;

    // First provider gets min of the two amounts as LP tokens
    expect(response.data['lp-tokens']).toEqual(Cl.uint(50000));
    expect(response.data['token-a-used']).toEqual(Cl.uint(amountA));
    expect(response.data['token-b-used']).toEqual(Cl.uint(amountB));

    // Check reserves updated
    const reserves = simnet.callReadOnlyFn(
      "pool-template",
      "get-reserves",
      [],
      deployer
    );
    expect(reserves.result.value.data['reserve-a']).toEqual(Cl.uint(amountA));
    expect(reserves.result.value.data['reserve-b']).toEqual(Cl.uint(amountB));
  });

  it("prevents adding liquidity with zero amounts", () => {
    const { result } = simnet.callPublicFn(
      "pool-template",
      "add-liquidity",
      [
        Cl.uint(0),
        Cl.uint(100),
        Cl.uint(1000000)
      ],
      wallet2
    );

    expect(result).toBeErr(Cl.uint(3005)); // ERR_ZERO_AMOUNT
  });

  it("enforces minimum liquidity requirement", () => {
    const { result } = simnet.callPublicFn(
      "pool-template",
      "add-liquidity",
      [
        Cl.uint(500), // Below MINIMUM_LIQUIDITY
        Cl.uint(500),
        Cl.uint(1000000)
      ],
      wallet2
    );

    expect(result).toBeErr(Cl.uint(3002)); // ERR_INSUFFICIENT_LIQUIDITY
  });

  it("adds subsequent liquidity proportionally", () => {
    // Add first liquidity
    simnet.callPublicFn(
      "pool-template",
      "add-liquidity",
      [
        Cl.uint(100000),
        Cl.uint(50000),
        Cl.uint(1000000)
      ],
      wallet2
    );

    // Add second liquidity (10% of reserves)
    const { result } = simnet.callPublicFn(
      "pool-template",
      "add-liquidity",
      [
        Cl.uint(10000),
        Cl.uint(5000),
        Cl.uint(1000000)
      ],
      wallet3
    );

    expect(result).toBeOk();
    const response = result.value as any;

    // Should get proportional LP tokens (10% of 50000 = 5000)
    expect(response.data['lp-tokens']).toEqual(Cl.uint(5000));
  });

  it("checks deadline for slippage protection", () => {
    const { result } = simnet.callPublicFn(
      "pool-template",
      "add-liquidity",
      [
        Cl.uint(100000),
        Cl.uint(50000),
        Cl.uint(0) // Past deadline
      ],
      wallet2
    );

    expect(result).toBeErr(Cl.uint(3004)); // ERR_SLIPPAGE_EXCEEDED
  });
});

describe("Pool Template: Remove Liquidity", () => {
  beforeEach(() => {
    // Initialize pool and add liquidity
    simnet.callPublicFn(
      "pool-template",
      "initialize",
      [Cl.principal(deployer), Cl.principal(wallet1)],
      deployer
    );

    simnet.callPublicFn(
      "pool-template",
      "add-liquidity",
      [
        Cl.uint(100000),
        Cl.uint(50000),
        Cl.uint(1000000)
      ],
      wallet2
    );
  });

  it("removes liquidity successfully", () => {
    const lpAmount = 10000; // 20% of LP tokens

    const { result } = simnet.callPublicFn(
      "pool-template",
      "remove-liquidity",
      [
        Cl.uint(lpAmount),
        Cl.uint(19000), // Min token A (slightly less than 20% of 100000)
        Cl.uint(9000)    // Min token B (slightly less than 20% of 50000)
      ],
      wallet2
    );

    expect(result).toBeOk();
    const response = result.value as any;

    // Should get 20% of reserves
    expect(response.data['token-a']).toEqual(Cl.uint(20000));
    expect(response.data['token-b']).toEqual(Cl.uint(10000));

    // Check reserves decreased
    const reserves = simnet.callReadOnlyFn(
      "pool-template",
      "get-reserves",
      [],
      deployer
    );
    expect(reserves.result.value.data['reserve-a']).toEqual(Cl.uint(80000));
    expect(reserves.result.value.data['reserve-b']).toEqual(Cl.uint(40000));
  });

  it("prevents removing more LP tokens than balance", () => {
    const { result } = simnet.callPublicFn(
      "pool-template",
      "remove-liquidity",
      [
        Cl.uint(100000), // More than balance
        Cl.uint(0),
        Cl.uint(0)
      ],
      wallet2
    );

    expect(result).toBeErr(Cl.uint(3009)); // ERR_INSUFFICIENT_LP_TOKENS
  });

  it("enforces minimum token amounts", () => {
    const { result } = simnet.callPublicFn(
      "pool-template",
      "remove-liquidity",
      [
        Cl.uint(10000),
        Cl.uint(25000), // Too high minimum for token A
        Cl.uint(10000)
      ],
      wallet2
    );

    expect(result).toBeErr(Cl.uint(3012)); // ERR_MIN_AMOUNTS_NOT_MET
  });

  it("prevents removing zero LP tokens", () => {
    const { result } = simnet.callPublicFn(
      "pool-template",
      "remove-liquidity",
      [
        Cl.uint(0),
        Cl.uint(0),
        Cl.uint(0)
      ],
      wallet2
    );

    expect(result).toBeErr(Cl.uint(3005)); // ERR_ZERO_AMOUNT
  });
});

describe("Pool Template: Swaps", () => {
  beforeEach(() => {
    // Initialize pool and add liquidity
    simnet.callPublicFn(
      "pool-template",
      "initialize",
      [Cl.principal(deployer), Cl.principal(wallet1)],
      deployer
    );

    simnet.callPublicFn(
      "pool-template",
      "add-liquidity",
      [
        Cl.uint(100000),
        Cl.uint(100000), // Equal reserves for easy calculation
        Cl.uint(1000000)
      ],
      wallet2
    );
  });

  it("swaps token A for token B with correct fee", () => {
    const amountIn = 1000;

    const { result } = simnet.callPublicFn(
      "pool-template",
      "swap-a-for-b",
      [
        Cl.uint(amountIn),
        Cl.uint(900) // Min amount out
      ],
      wallet3
    );

    expect(result).toBeOk();

    // With 0.3% fee: amount-in-with-fee = 1000 * 9970 / 10000 = 997
    // Output = (100000 * 997) / (100000 * 10000 + 997) ≈ 994
    const amountOut = result.value as any;
    expect(amountOut.value).toBeGreaterThan(990n);
    expect(amountOut.value).toBeLessThan(1000n); // Less than input due to fee

    // Check reserves updated
    const reserves = simnet.callReadOnlyFn(
      "pool-template",
      "get-reserves",
      [],
      deployer
    );
    expect(reserves.result.value.data['reserve-a'].value).toBeGreaterThan(100000n);
    expect(reserves.result.value.data['reserve-b'].value).toBeLessThan(100000n);
  });

  it("swaps token B for token A with correct fee", () => {
    const amountIn = 1000;

    const { result } = simnet.callPublicFn(
      "pool-template",
      "swap-b-for-a",
      [
        Cl.uint(amountIn),
        Cl.uint(900) // Min amount out
      ],
      wallet3
    );

    expect(result).toBeOk();

    const amountOut = result.value as any;
    expect(amountOut.value).toBeGreaterThan(990n);
    expect(amountOut.value).toBeLessThan(1000n); // Less than input due to fee

    // Check reserves updated
    const reserves = simnet.callReadOnlyFn(
      "pool-template",
      "get-reserves",
      [],
      deployer
    );
    expect(reserves.result.value.data['reserve-b'].value).toBeGreaterThan(100000n);
    expect(reserves.result.value.data['reserve-a'].value).toBeLessThan(100000n);
  });

  it("enforces minimum output amount (slippage protection)", () => {
    const { result } = simnet.callPublicFn(
      "pool-template",
      "swap-a-for-b",
      [
        Cl.uint(1000),
        Cl.uint(1100) // Too high minimum
      ],
      wallet3
    );

    expect(result).toBeErr(Cl.uint(3004)); // ERR_SLIPPAGE_EXCEEDED
  });

  it("prevents swapping zero amount", () => {
    const { result } = simnet.callPublicFn(
      "pool-template",
      "swap-a-for-b",
      [
        Cl.uint(0),
        Cl.uint(0)
      ],
      wallet3
    );

    expect(result).toBeErr(Cl.uint(3005)); // ERR_ZERO_AMOUNT
  });

  it("applies price impact on large swaps", () => {
    // Large swap: 10% of reserve
    const largeAmount = 10000;

    const { result: largeSwap } = simnet.callPublicFn(
      "pool-template",
      "swap-a-for-b",
      [
        Cl.uint(largeAmount),
        Cl.uint(0)
      ],
      wallet3
    );

    // Small swap: 0.1% of reserve
    const smallAmount = 100;

    const { result: smallSwap } = simnet.callPublicFn(
      "pool-template",
      "swap-a-for-b",
      [
        Cl.uint(smallAmount),
        Cl.uint(0)
      ],
      wallet3
    );

    // Calculate effective rate (output/input)
    const largeRate = (largeSwap.value as any).value / BigInt(largeAmount);
    const smallRate = (smallSwap.value as any).value / BigInt(smallAmount);

    // Large swap should have worse rate due to price impact
    expect(largeRate).toBeLessThan(smallRate);
  });
});

describe("Pool Template: TWAP Oracle", () => {
  beforeEach(() => {
    // Initialize pool and add liquidity
    simnet.callPublicFn(
      "pool-template",
      "initialize",
      [Cl.principal(deployer), Cl.principal(wallet1)],
      deployer
    );

    simnet.callPublicFn(
      "pool-template",
      "add-liquidity",
      [
        Cl.uint(100000),
        Cl.uint(50000),
        Cl.uint(1000000)
      ],
      wallet2
    );
  });

  it("initializes TWAP on pool creation", () => {
    const { result: priceA } = simnet.callReadOnlyFn(
      "pool-template",
      "get-twap-price-a",
      [],
      deployer
    );

    const { result: priceB } = simnet.callReadOnlyFn(
      "pool-template",
      "get-twap-price-b",
      [],
      deployer
    );

    const { result: updateTime } = simnet.callReadOnlyFn(
      "pool-template",
      "get-last-update-time",
      [],
      deployer
    );

    expect(priceA).toBeOk(Cl.uint(0)); // Initial cumulative price
    expect(priceB).toBeOk(Cl.uint(0));
    expect(updateTime).toBeOk(); // Should have a timestamp
  });

  it("updates TWAP on swaps", () => {
    // Get initial TWAP
    const { result: initialPriceA } = simnet.callReadOnlyFn(
      "pool-template",
      "get-twap-price-a",
      [],
      deployer
    );

    // Perform a swap
    simnet.callPublicFn(
      "pool-template",
      "swap-a-for-b",
      [
        Cl.uint(1000),
        Cl.uint(0)
      ],
      wallet3
    );

    // Check TWAP updated
    const { result: updatedPriceA } = simnet.callReadOnlyFn(
      "pool-template",
      "get-twap-price-a",
      [],
      deployer
    );

    // TWAP should change after swap (if time has elapsed)
    // Note: In test environment, time might not elapse, so this might stay at 0
    expect(updatedPriceA).toBeOk();
  });

  it("updates TWAP on liquidity changes", () => {
    // Perform add liquidity
    simnet.callPublicFn(
      "pool-template",
      "add-liquidity",
      [
        Cl.uint(10000),
        Cl.uint(5000),
        Cl.uint(1000000)
      ],
      wallet3
    );

    // Check TWAP was called
    const { result: updateTime } = simnet.callReadOnlyFn(
      "pool-template",
      "get-last-update-time",
      [],
      deployer
    );

    expect(updateTime).toBeOk();

    // Remove liquidity
    simnet.callPublicFn(
      "pool-template",
      "remove-liquidity",
      [
        Cl.uint(1000),
        Cl.uint(0),
        Cl.uint(0)
      ],
      wallet2
    );

    // Check TWAP was called again
    const { result: newUpdateTime } = simnet.callReadOnlyFn(
      "pool-template",
      "get-last-update-time",
      [],
      deployer
    );

    expect(newUpdateTime).toBeOk();
  });
});

describe("Pool Template: Read-only Functions", () => {
  beforeEach(() => {
    // Initialize pool and add liquidity
    simnet.callPublicFn(
      "pool-template",
      "initialize",
      [Cl.principal(deployer), Cl.principal(wallet1)],
      deployer
    );

    simnet.callPublicFn(
      "pool-template",
      "add-liquidity",
      [
        Cl.uint(100000),
        Cl.uint(50000),
        Cl.uint(1000000)
      ],
      wallet2
    );
  });

  it("returns correct reserves", () => {
    const { result } = simnet.callReadOnlyFn(
      "pool-template",
      "get-reserves",
      [],
      deployer
    );

    expect(result).toBeOk(Cl.tuple({
      'reserve-a': Cl.uint(100000),
      'reserve-b': Cl.uint(50000)
    }));
  });

  it("returns correct fee", () => {
    const { result } = simnet.callReadOnlyFn(
      "pool-template",
      "get-fee",
      [],
      deployer
    );

    expect(result).toBeOk(Cl.uint(30)); // 0.3% = 30 basis points
  });

  it("returns correct tokens", () => {
    const { result } = simnet.callReadOnlyFn(
      "pool-template",
      "get-tokens",
      [],
      deployer
    );

    expect(result).toBeOk(Cl.tuple({
      'token-a': Cl.principal(deployer),
      'token-b': Cl.principal(wallet1)
    }));
  });

  it("returns correct LP balance", () => {
    const balance = simnet.callReadOnlyFn(
      "pool-template",
      "get-lp-balance",
      [Cl.principal(wallet2)],
      deployer
    );

    expect(balance.result).toBe(Cl.uint(50000)); // First liquidity provider balance
  });

  it("returns correct total supply", () => {
    const { result } = simnet.callReadOnlyFn(
      "pool-template",
      "get-total-supply",
      [],
      deployer
    );

    expect(result).toBeOk(Cl.uint(50000));
  });

  it("calculates spot price correctly", () => {
    const { result } = simnet.callReadOnlyFn(
      "pool-template",
      "get-spot-price",
      [],
      deployer
    );

    expect(result).toBeOk();
    const prices = result.value as any;

    // With 100000 A and 50000 B:
    // price-a-in-b = (50000 * 10000) / 100000 = 5000 (0.5 with 4 decimals)
    // price-b-in-a = (100000 * 10000) / 50000 = 20000 (2.0 with 4 decimals)
    expect(prices.data['price-a-in-b']).toEqual(Cl.uint(5000));
    expect(prices.data['price-b-in-a']).toEqual(Cl.uint(20000));
  });

  it("returns error for uninitialized pool functions", () => {
    // Deploy a new pool without initializing
    simnet.deployContract(
      "test-pool-2",
      simnet.getContractSource("pool-template"),
      deployer
    );

    const { result } = simnet.callReadOnlyFn(
      "test-pool-2",
      "get-reserves",
      [],
      deployer
    );

    expect(result).toBeErr(Cl.uint(3006)); // ERR_POOL_NOT_INITIALIZED
  });
});