import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

/**
 * Test Suite for Router Contract
 *
 * Tests the main entry point for DEX interactions:
 * 1. Initialization with registry and factory
 * 2. Single and multi-hop swaps
 * 3. Deadline protection
 * 4. Slippage protection
 * 5. Liquidity management through router
 * 6. Receipt generation
 * 7. Path validation
 */

describe("Router: Initialization", () => {
  it("allows owner to initialize router", () => {
    const registry = Cl.principal(wallet1);
    const factory = Cl.principal(wallet2);

    const { result } = simnet.callPublicFn(
      "router",
      "initialize",
      [registry, factory],
      deployer
    );

    expect(result).toBeOk(Cl.bool(true));

    // Verify configuration
    const config = simnet.callReadOnlyFn(
      "router",
      "get-config",
      [],
      deployer
    );

    expect(config.result.data.registry).toEqual(registry);
    expect(config.result.data.factory).toEqual(factory);
    expect(config.result.data['is-initialized']).toEqual(Cl.bool(true));
  });

  it("prevents non-owner from initializing", () => {
    const { result } = simnet.callPublicFn(
      "router",
      "initialize",
      [Cl.principal(wallet1), Cl.principal(wallet2)],
      wallet1 // Not the owner
    );

    expect(result).toBeErr(Cl.uint(5007)); // ERR_NOT_OWNER
  });

  it("prevents double initialization", () => {
    // First initialization
    simnet.callPublicFn(
      "router",
      "initialize",
      [Cl.principal(wallet1), Cl.principal(wallet2)],
      deployer
    );

    // Try to initialize again
    const { result } = simnet.callPublicFn(
      "router",
      "initialize",
      [Cl.principal(wallet2), Cl.principal(wallet3)],
      deployer
    );

    expect(result).toBeErr(Cl.uint(5006)); // ERR_NOT_INITIALIZED (already initialized)
  });

  it("allows owner transfer", () => {
    const newOwner = wallet1;

    const { result } = simnet.callPublicFn(
      "router",
      "set-owner",
      [Cl.principal(newOwner)],
      deployer
    );

    expect(result).toBeOk(Cl.bool(true));

    // Verify new owner in config
    const config = simnet.callReadOnlyFn(
      "router",
      "get-config",
      [],
      deployer
    );

    expect(config.result.data.owner).toEqual(Cl.principal(newOwner));
  });
});

describe("Router: Swap Exact Tokens For Tokens", () => {
  beforeEach(() => {
    // Initialize router with test registry and factory
    simnet.callPublicFn(
      "router",
      "initialize",
      [Cl.principal(deployer), Cl.principal(deployer)],
      deployer
    );

    // Set up test pool in factory (simplified for testing)
    // In production, would set up actual pools
  });

  it("executes direct swap successfully", () => {
    const amountIn = 1000;
    const minAmountOut = 900;
    const path = Cl.list([
      Cl.principal(wallet1), // token A
      Cl.principal(wallet2)  // token B
    ]);
    const to = Cl.principal(wallet3);
    const deadline = 1000000;

    const { result, events } = simnet.callPublicFn(
      "router",
      "swap-exact-tokens-for-tokens",
      [
        Cl.uint(amountIn),
        Cl.uint(minAmountOut),
        path,
        to,
        Cl.uint(deadline)
      ],
      wallet3
    );

    // Check swap succeeded
    expect(result).toBeOk();

    // Check statistics updated
    const config = simnet.callReadOnlyFn(
      "router",
      "get-config",
      [],
      deployer
    );
    expect(config.result.data['total-swaps'].value).toBeGreaterThan(0n);

    // Check user stats updated
    const userStats = simnet.callReadOnlyFn(
      "router",
      "get-user-stats",
      [to],
      deployer
    );
    expect(userStats.result.data['swap-count'].value).toBeGreaterThan(0n);
  });

  it("executes multi-hop swap successfully", () => {
    const amountIn = 1000;
    const minAmountOut = 800;
    const path = Cl.list([
      Cl.principal(wallet1), // token A
      Cl.principal(wallet2), // token B (intermediate)
      Cl.principal(wallet3)  // token C
    ]);
    const to = Cl.principal(deployer);
    const deadline = 1000000;

    const { result } = simnet.callPublicFn(
      "router",
      "swap-exact-tokens-for-tokens",
      [
        Cl.uint(amountIn),
        Cl.uint(minAmountOut),
        path,
        to,
        Cl.uint(deadline)
      ],
      wallet3
    );

    // Check multi-hop swap succeeded
    expect(result).toBeOk();

    // Verify total swaps incremented by 2 (two hops)
    const config = simnet.callReadOnlyFn(
      "router",
      "get-config",
      [],
      deployer
    );
    expect(config.result.data['total-swaps'].value).toBeGreaterThanOrEqual(2n);
  });

  it("fails if deadline passed", () => {
    const path = Cl.list([
      Cl.principal(wallet1),
      Cl.principal(wallet2)
    ]);

    const { result } = simnet.callPublicFn(
      "router",
      "swap-exact-tokens-for-tokens",
      [
        Cl.uint(1000),
        Cl.uint(900),
        path,
        Cl.principal(wallet3),
        Cl.uint(0) // Past deadline
      ],
      wallet3
    );

    expect(result).toBeErr(Cl.uint(5003)); // ERR_EXPIRED
  });

  it("fails with invalid path length", () => {
    // Path too short (only 1 token)
    const shortPath = Cl.list([Cl.principal(wallet1)]);

    const { result: shortResult } = simnet.callPublicFn(
      "router",
      "swap-exact-tokens-for-tokens",
      [
        Cl.uint(1000),
        Cl.uint(900),
        shortPath,
        Cl.principal(wallet3),
        Cl.uint(1000000)
      ],
      wallet3
    );

    expect(shortResult).toBeErr(Cl.uint(5004)); // ERR_INVALID_PATH

    // Path too long (4 tokens)
    const longPath = Cl.list([
      Cl.principal(wallet1),
      Cl.principal(wallet2),
      Cl.principal(wallet3),
      Cl.principal(deployer)
    ]);

    const { result: longResult } = simnet.callPublicFn(
      "router",
      "swap-exact-tokens-for-tokens",
      [
        Cl.uint(1000),
        Cl.uint(900),
        longPath,
        Cl.principal(wallet3),
        Cl.uint(1000000)
      ],
      wallet3
    );

    expect(longResult).toBeErr(Cl.uint(5004)); // ERR_INVALID_PATH
  });

  it("fails with zero amount", () => {
    const path = Cl.list([
      Cl.principal(wallet1),
      Cl.principal(wallet2)
    ]);

    const { result } = simnet.callPublicFn(
      "router",
      "swap-exact-tokens-for-tokens",
      [
        Cl.uint(0), // Zero amount
        Cl.uint(0),
        path,
        Cl.principal(wallet3),
        Cl.uint(1000000)
      ],
      wallet3
    );

    expect(result).toBeErr(Cl.uint(5009)); // ERR_INVALID_AMOUNT
  });

  it("requires router to be initialized", () => {
    // Deploy a new router without initialization
    simnet.deployContract(
      "test-router",
      simnet.getContractSource("router"),
      deployer
    );

    const path = Cl.list([
      Cl.principal(wallet1),
      Cl.principal(wallet2)
    ]);

    const { result } = simnet.callPublicFn(
      "test-router",
      "swap-exact-tokens-for-tokens",
      [
        Cl.uint(1000),
        Cl.uint(900),
        path,
        Cl.principal(wallet3),
        Cl.uint(1000000)
      ],
      wallet3
    );

    expect(result).toBeErr(Cl.uint(5006)); // ERR_NOT_INITIALIZED
  });
});

describe("Router: Swap Tokens For Exact Tokens", () => {
  beforeEach(() => {
    // Initialize router
    simnet.callPublicFn(
      "router",
      "initialize",
      [Cl.principal(deployer), Cl.principal(deployer)],
      deployer
    );
  });

  it("calculates required input for exact output", () => {
    const amountOut = 1000;
    const maxAmountIn = 1100;
    const path = Cl.list([
      Cl.principal(wallet1),
      Cl.principal(wallet2)
    ]);

    const { result } = simnet.callPublicFn(
      "router",
      "swap-tokens-for-exact-tokens",
      [
        Cl.uint(amountOut),
        Cl.uint(maxAmountIn),
        path,
        Cl.principal(wallet3),
        Cl.uint(1000000)
      ],
      wallet3
    );

    expect(result).toBeOk();
    // Should return the amount of input tokens used
    const inputUsed = result.value as any;
    expect(inputUsed.value).toBeLessThanOrEqual(maxAmountIn);
  });

  it("fails if required input exceeds maximum", () => {
    const amountOut = 1000;
    const maxAmountIn = 100; // Too low
    const path = Cl.list([
      Cl.principal(wallet1),
      Cl.principal(wallet2)
    ]);

    const { result } = simnet.callPublicFn(
      "router",
      "swap-tokens-for-exact-tokens",
      [
        Cl.uint(amountOut),
        Cl.uint(maxAmountIn),
        path,
        Cl.principal(wallet3),
        Cl.uint(1000000)
      ],
      wallet3
    );

    expect(result).toBeErr(Cl.uint(5010)); // ERR_EXCESSIVE_INPUT
  });
});

describe("Router: Liquidity Management", () => {
  beforeEach(() => {
    // Initialize router
    simnet.callPublicFn(
      "router",
      "initialize",
      [Cl.principal(deployer), Cl.principal(deployer)],
      deployer
    );
  });

  it("adds liquidity successfully", () => {
    const tokenA = Cl.principal(wallet1);
    const tokenB = Cl.principal(wallet2);

    const { result } = simnet.callPublicFn(
      "router",
      "add-liquidity",
      [
        tokenA,
        tokenB,
        Cl.uint(100000), // amount-a-desired
        Cl.uint(50000),  // amount-b-desired
        Cl.uint(95000),  // amount-a-min
        Cl.uint(47500),  // amount-b-min
        Cl.principal(wallet3),
        Cl.uint(1000000)
      ],
      wallet3
    );

    expect(result).toBeOk();

    // Check liquidity operation count
    const config = simnet.callReadOnlyFn(
      "router",
      "get-config",
      [],
      deployer
    );
    expect(config.result.data['total-liquidity-ops'].value).toBeGreaterThan(0n);

    // Check user liquidity count
    const userStats = simnet.callReadOnlyFn(
      "router",
      "get-user-stats",
      [Cl.principal(wallet3)],
      deployer
    );
    expect(userStats.result.data['liquidity-count'].value).toBeGreaterThan(0n);
  });

  it("prevents adding liquidity with same tokens", () => {
    const sameToken = Cl.principal(wallet1);

    const { result } = simnet.callPublicFn(
      "router",
      "add-liquidity",
      [
        sameToken,
        sameToken, // Same as token A
        Cl.uint(100000),
        Cl.uint(50000),
        Cl.uint(95000),
        Cl.uint(47500),
        Cl.principal(wallet3),
        Cl.uint(1000000)
      ],
      wallet3
    );

    expect(result).toBeErr(Cl.uint(5011)); // ERR_INVALID_TOKENS
  });

  it("enforces minimum amounts for liquidity", () => {
    const tokenA = Cl.principal(wallet1);
    const tokenB = Cl.principal(wallet2);

    const { result } = simnet.callPublicFn(
      "router",
      "add-liquidity",
      [
        tokenA,
        tokenB,
        Cl.uint(100000),
        Cl.uint(50000),
        Cl.uint(200000), // Min too high
        Cl.uint(100000), // Min too high
        Cl.principal(wallet3),
        Cl.uint(1000000)
      ],
      wallet3
    );

    expect(result).toBeErr(Cl.uint(5002)); // ERR_INSUFFICIENT_OUTPUT
  });

  it("removes liquidity successfully", () => {
    const tokenA = Cl.principal(wallet1);
    const tokenB = Cl.principal(wallet2);

    const { result } = simnet.callPublicFn(
      "router",
      "remove-liquidity",
      [
        tokenA,
        tokenB,
        Cl.uint(10000),  // lp-amount
        Cl.uint(9000),   // amount-a-min
        Cl.uint(4500),   // amount-b-min
        Cl.principal(wallet3),
        Cl.uint(1000000)
      ],
      wallet3
    );

    expect(result).toBeOk();

    // Check liquidity operation count increased
    const config = simnet.callReadOnlyFn(
      "router",
      "get-config",
      [],
      deployer
    );
    expect(config.result.data['total-liquidity-ops'].value).toBeGreaterThan(0n);
  });

  it("prevents removing zero LP tokens", () => {
    const { result } = simnet.callPublicFn(
      "router",
      "remove-liquidity",
      [
        Cl.principal(wallet1),
        Cl.principal(wallet2),
        Cl.uint(0), // Zero LP amount
        Cl.uint(0),
        Cl.uint(0),
        Cl.principal(wallet3),
        Cl.uint(1000000)
      ],
      wallet3
    );

    expect(result).toBeErr(Cl.uint(5009)); // ERR_INVALID_AMOUNT
  });

  it("enforces deadline for liquidity operations", () => {
    const { result } = simnet.callPublicFn(
      "router",
      "add-liquidity",
      [
        Cl.principal(wallet1),
        Cl.principal(wallet2),
        Cl.uint(100000),
        Cl.uint(50000),
        Cl.uint(95000),
        Cl.uint(47500),
        Cl.principal(wallet3),
        Cl.uint(0) // Past deadline
      ],
      wallet3
    );

    expect(result).toBeErr(Cl.uint(5003)); // ERR_EXPIRED
  });
});

describe("Router: Read-only Functions", () => {
  beforeEach(() => {
    // Initialize router
    simnet.callPublicFn(
      "router",
      "initialize",
      [Cl.principal(deployer), Cl.principal(deployer)],
      deployer
    );
  });

  it("calculates amounts out for path", () => {
    const amountIn = 1000;

    // Direct swap path
    const directPath = Cl.list([
      Cl.principal(wallet1),
      Cl.principal(wallet2)
    ]);

    const { result: directResult } = simnet.callReadOnlyFn(
      "router",
      "get-amounts-out",
      [Cl.uint(amountIn), directPath],
      deployer
    );

    expect(directResult).toBeOk();

    // Multi-hop path
    const multiPath = Cl.list([
      Cl.principal(wallet1),
      Cl.principal(wallet2),
      Cl.principal(wallet3)
    ]);

    const { result: multiResult } = simnet.callReadOnlyFn(
      "router",
      "get-amounts-out",
      [Cl.uint(amountIn), multiPath],
      deployer
    );

    expect(multiResult).toBeOk();

    // Multi-hop should have more slippage than direct
    const directOut = directResult.value as any;
    const multiOut = multiResult.value as any;
    expect(multiOut.value).toBeLessThan(directOut.value);
  });

  it("calculates amounts in for exact output", () => {
    const amountOut = 1000;

    // Direct swap path
    const directPath = Cl.list([
      Cl.principal(wallet1),
      Cl.principal(wallet2)
    ]);

    const { result: directResult } = simnet.callReadOnlyFn(
      "router",
      "get-amounts-in",
      [Cl.uint(amountOut), directPath],
      deployer
    );

    expect(directResult).toBeOk();

    // Multi-hop path
    const multiPath = Cl.list([
      Cl.principal(wallet1),
      Cl.principal(wallet2),
      Cl.principal(wallet3)
    ]);

    const { result: multiResult } = simnet.callReadOnlyFn(
      "router",
      "get-amounts-in",
      [Cl.uint(amountOut), multiPath],
      deployer
    );

    expect(multiResult).toBeOk();

    // Multi-hop should require more input than direct
    const directIn = directResult.value as any;
    const multiIn = multiResult.value as any;
    expect(multiIn.value).toBeGreaterThan(directIn.value);
  });

  it("provides liquidity quote", () => {
    const tokenA = Cl.principal(wallet1);
    const tokenB = Cl.principal(wallet2);
    const amountA = 100000;

    const { result } = simnet.callReadOnlyFn(
      "router",
      "quote-add-liquidity",
      [tokenA, tokenB, Cl.uint(amountA)],
      deployer
    );

    expect(result).toBeOk();
    const quote = result.value as any;
    expect(quote.data['amount-b-needed']).toBeDefined();
    expect(quote.data['expected-lp-tokens']).toBeDefined();
  });

  it("returns error for invalid amounts in quotes", () => {
    const { result } = simnet.callReadOnlyFn(
      "router",
      "quote-add-liquidity",
      [
        Cl.principal(wallet1),
        Cl.principal(wallet2),
        Cl.uint(0) // Zero amount
      ],
      deployer
    );

    expect(result).toBeErr(Cl.uint(5009)); // ERR_INVALID_AMOUNT
  });

  it("returns router configuration", () => {
    const { result } = simnet.callReadOnlyFn(
      "router",
      "get-config",
      [],
      deployer
    );

    expect(result.data.owner).toEqual(Cl.principal(deployer));
    expect(result.data['is-initialized']).toEqual(Cl.bool(true));
    expect(result.data['total-swaps']).toBeDefined();
    expect(result.data['total-liquidity-ops']).toBeDefined();
  });

  it("tracks user statistics", () => {
    // Execute a swap to generate stats
    const path = Cl.list([
      Cl.principal(wallet1),
      Cl.principal(wallet2)
    ]);

    simnet.callPublicFn(
      "router",
      "swap-exact-tokens-for-tokens",
      [
        Cl.uint(1000),
        Cl.uint(900),
        path,
        Cl.principal(wallet3),
        Cl.uint(1000000)
      ],
      wallet3
    );

    // Check user stats
    const { result } = simnet.callReadOnlyFn(
      "router",
      "get-user-stats",
      [Cl.principal(wallet3)],
      deployer
    );

    expect(result.data['swap-count'].value).toBeGreaterThan(0n);
    expect(result.data['liquidity-count']).toBeDefined();
  });
});