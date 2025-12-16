import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;
const address3 = accounts.get("wallet_3")!;

// Mock pool addresses for testing
const poolA = accounts.get("wallet_4")!;
const poolB = accounts.get("wallet_5")!;
const poolC = accounts.get("wallet_6")!;

/**
 * Test Suite for TWAP Oracle Contract
 *
 * These tests verify:
 * 1. Observation recording with stacks-block-time
 * 2. Circular buffer behavior
 * 3. TWAP calculation over different periods
 * 4. Spot price queries
 * 5. Price manipulation detection
 * 6. Authorization system
 * 7. Error handling
 */

describe("TWAP Oracle: Initialization and Authorization", () => {
  it("initializes with correct configuration", () => {
    const { result } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-config",
      [],
      address1
    );

    const config = result.value as any;
    expect(config.paused.value).toBe(false);
    expect(config['max-observations'].value).toBe(100n);
    expect(config['min-twap-period'].value).toBe(1n);
    expect(config['max-twap-period'].value).toBe(10000n);
    expect(config.precision.value).toBe(1000000n);
  });

  it("allows owner to authorize a pool", () => {
    const { result, events } = simnet.callPublicFn(
      "twap-oracle",
      "authorize-pool",
      [Cl.principal(poolA)],
      address1
    );

    expect(result).toBeOk(Cl.bool(true));

    // Check pool is authorized
    const { result: authResult } = simnet.callReadOnlyFn(
      "twap-oracle",
      "is-pool-authorized",
      [Cl.principal(poolA)],
      address1
    );
    expect(authResult).toBe(Cl.bool(true));
  });

  it("prevents non-owner from authorizing pools", () => {
    const { result } = simnet.callPublicFn(
      "twap-oracle",
      "authorize-pool",
      [Cl.principal(poolB)],
      address2
    );

    expect(result).toBeErr(Cl.uint(6005)); // ERR_NOT_AUTHORIZED
  });

  it("allows owner to revoke pool authorization", () => {
    // First authorize
    simnet.callPublicFn(
      "twap-oracle",
      "authorize-pool",
      [Cl.principal(poolA)],
      address1
    );

    // Then revoke
    const { result } = simnet.callPublicFn(
      "twap-oracle",
      "revoke-pool",
      [Cl.principal(poolA)],
      address1
    );

    expect(result).toBeOk(Cl.bool(true));

    // Check pool is no longer authorized
    const { result: authResult } = simnet.callReadOnlyFn(
      "twap-oracle",
      "is-pool-authorized",
      [Cl.principal(poolA)],
      address1
    );
    expect(authResult).toBe(Cl.bool(false));
  });

  it("allows owner to pause and unpause the oracle", () => {
    // Pause
    const { result: pauseResult } = simnet.callPublicFn(
      "twap-oracle",
      "set-paused",
      [Cl.bool(true)],
      address1
    );
    expect(pauseResult).toBeOk(Cl.bool(true));

    // Check config
    const { result: config1 } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-config",
      [],
      address1
    );
    expect((config1.value as any).paused.value).toBe(true);

    // Unpause
    const { result: unpauseResult } = simnet.callPublicFn(
      "twap-oracle",
      "set-paused",
      [Cl.bool(false)],
      address1
    );
    expect(unpauseResult).toBeOk(Cl.bool(true));

    // Check config again
    const { result: config2 } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-config",
      [],
      address1
    );
    expect((config2.value as any).paused.value).toBe(false);
  });
});

describe("TWAP Oracle: Recording Observations", () => {
  beforeEach(() => {
    // Authorize poolA for each test
    simnet.callPublicFn(
      "twap-oracle",
      "authorize-pool",
      [Cl.principal(poolA)],
      address1
    );
  });

  it("records observation with correct data", () => {
    const { result } = simnet.callPublicFn(
      "twap-oracle",
      "record-observation",
      [
        Cl.principal(poolA),
        Cl.uint(100000),  // reserve-a
        Cl.uint(50000),   // reserve-b
        Cl.uint(1000),    // cumulative-price-a
        Cl.uint(2000)     // cumulative-price-b
      ],
      poolA // Called by the pool itself
    );

    expect(result).toBeOk(Cl.tuple({
      'index': Cl.uint(1),
      'timestamp': Cl.uint(0), // Will be stacks-block-time
      'total-observations': Cl.uint(1)
    }));

    // Check pool state
    const { result: stateResult } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-pool-state",
      [Cl.principal(poolA)],
      address1
    );

    const state = stateResult.value as any;
    expect(state.some.value['current-index'].value).toBe(1n);
    expect(state.some.value.cardinality.value).toBe(1n);
    expect(state.some.value['total-observations'].value).toBe(1n);
  });

  it("uses stacks-block-time for timestamp", () => {
    // Record first observation
    const { result: r1 } = simnet.callPublicFn(
      "twap-oracle",
      "record-observation",
      [
        Cl.principal(poolA),
        Cl.uint(100000),
        Cl.uint(50000),
        Cl.uint(1000),
        Cl.uint(2000)
      ],
      poolA
    );

    const firstTimestamp = (r1.value as any).value.timestamp.value;

    // Mine a block to advance time
    simnet.mineEmptyBlock();

    // Record second observation
    const { result: r2 } = simnet.callPublicFn(
      "twap-oracle",
      "record-observation",
      [
        Cl.principal(poolA),
        Cl.uint(110000),
        Cl.uint(45000),
        Cl.uint(1100),
        Cl.uint(2200)
      ],
      poolA
    );

    const secondTimestamp = (r2.value as any).value.timestamp.value;

    // Second timestamp should be greater than first
    expect(secondTimestamp).toBeGreaterThan(firstTimestamp);
  });

  it("prevents unauthorized pool from recording", () => {
    const { result } = simnet.callPublicFn(
      "twap-oracle",
      "record-observation",
      [
        Cl.principal(poolB), // Not authorized
        Cl.uint(100000),
        Cl.uint(50000),
        Cl.uint(1000),
        Cl.uint(2000)
      ],
      poolB
    );

    expect(result).toBeErr(Cl.uint(6001)); // ERR_POOL_NOT_FOUND
  });

  it("prevents recording when paused", () => {
    // Pause the oracle
    simnet.callPublicFn(
      "twap-oracle",
      "set-paused",
      [Cl.bool(true)],
      address1
    );

    const { result } = simnet.callPublicFn(
      "twap-oracle",
      "record-observation",
      [
        Cl.principal(poolA),
        Cl.uint(100000),
        Cl.uint(50000),
        Cl.uint(1000),
        Cl.uint(2000)
      ],
      poolA
    );

    expect(result).toBeErr(Cl.uint(6005)); // ERR_NOT_AUTHORIZED
  });

  it("rejects observations with zero reserves", () => {
    const { result } = simnet.callPublicFn(
      "twap-oracle",
      "record-observation",
      [
        Cl.principal(poolA),
        Cl.uint(0),      // Invalid reserve-a
        Cl.uint(50000),
        Cl.uint(1000),
        Cl.uint(2000)
      ],
      poolA
    );

    expect(result).toBeErr(Cl.uint(6006)); // ERR_INVALID_POOL
  });
});

describe("TWAP Oracle: Circular Buffer", () => {
  beforeEach(() => {
    // Authorize poolA
    simnet.callPublicFn(
      "twap-oracle",
      "authorize-pool",
      [Cl.principal(poolA)],
      address1
    );
  });

  it("observations rotate correctly in circular buffer", () => {
    // Record MAX_OBSERVATIONS + 1 observations to test rotation
    for (let i = 0; i < 101; i++) {
      const { result } = simnet.callPublicFn(
        "twap-oracle",
        "record-observation",
        [
          Cl.principal(poolA),
          Cl.uint(100000 + i * 1000),
          Cl.uint(50000 + i * 500),
          Cl.uint(1000 + i * 10),
          Cl.uint(2000 + i * 20)
        ],
        poolA
      );

      if (i < 100) {
        // First 100 observations
        expect((result.value as any).value.index.value).toBe(BigInt(i + 1));
      } else {
        // 101st observation should wrap around to index 0
        expect((result.value as any).value.index.value).toBe(0n);
      }

      // Mine block to advance time between observations
      if (i < 100) simnet.mineEmptyBlock();
    }

    // Check pool state
    const { result: stateResult } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-pool-state",
      [Cl.principal(poolA)],
      address1
    );

    const state = stateResult.value as any;
    expect(state.some.value['current-index'].value).toBe(0n); // Wrapped around
    expect(state.some.value.cardinality.value).toBe(100n); // Max observations
    expect(state.some.value['total-observations'].value).toBe(101n); // Total recorded
  });

  it("maintains correct cardinality", () => {
    // Record 50 observations
    for (let i = 0; i < 50; i++) {
      simnet.callPublicFn(
        "twap-oracle",
        "record-observation",
        [
          Cl.principal(poolA),
          Cl.uint(100000 + i * 1000),
          Cl.uint(50000 + i * 500),
          Cl.uint(1000 + i * 10),
          Cl.uint(2000 + i * 20)
        ],
        poolA
      );
      simnet.mineEmptyBlock();
    }

    // Check cardinality is 50
    const { result: stateResult } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-pool-state",
      [Cl.principal(poolA)],
      address1
    );

    const state = stateResult.value as any;
    expect(state.some.value.cardinality.value).toBe(50n);
    expect(state.some.value['total-observations'].value).toBe(50n);
  });
});

describe("TWAP Oracle: Spot Price Queries", () => {
  beforeEach(() => {
    // Authorize and record an observation for poolA
    simnet.callPublicFn(
      "twap-oracle",
      "authorize-pool",
      [Cl.principal(poolA)],
      address1
    );

    simnet.callPublicFn(
      "twap-oracle",
      "record-observation",
      [
        Cl.principal(poolA),
        Cl.uint(100000),  // reserve-a
        Cl.uint(50000),   // reserve-b
        Cl.uint(1000),
        Cl.uint(2000)
      ],
      poolA
    );
  });

  it("returns correct spot price from latest observation", () => {
    const { result } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-spot-price",
      [Cl.principal(poolA)],
      address1
    );

    expect(result).toBeOk(Cl.tuple({
      'price-a-in-b': Cl.uint(500000),  // (50000 * 1000000) / 100000
      'price-b-in-a': Cl.uint(2000000), // (100000 * 1000000) / 50000
      'reserve-a': Cl.uint(100000),
      'reserve-b': Cl.uint(50000),
      'timestamp': Cl.uint(0)
    }));
  });

  it("updates spot price with new observations", () => {
    // Mine block and record new observation
    simnet.mineEmptyBlock();

    simnet.callPublicFn(
      "twap-oracle",
      "record-observation",
      [
        Cl.principal(poolA),
        Cl.uint(110000),  // Changed reserves
        Cl.uint(45000),
        Cl.uint(1100),
        Cl.uint(2200)
      ],
      poolA
    );

    const { result } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-spot-price",
      [Cl.principal(poolA)],
      address1
    );

    // New spot prices based on new reserves
    expect(result).toBeOk(Cl.tuple({
      'price-a-in-b': Cl.uint(409090),   // (45000 * 1000000) / 110000
      'price-b-in-a': Cl.uint(2444444),  // (110000 * 1000000) / 45000
      'reserve-a': Cl.uint(110000),
      'reserve-b': Cl.uint(45000),
      'timestamp': Cl.uint(1)
    }));
  });

  it("returns error for uninitialized pool", () => {
    const { result } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-spot-price",
      [Cl.principal(poolB)], // Not initialized
      address1
    );

    expect(result).toBeErr(Cl.uint(6001)); // ERR_POOL_NOT_FOUND
  });

  it("returns error for pool with no observations", () => {
    // Authorize poolB but don't record any observations
    simnet.callPublicFn(
      "twap-oracle",
      "authorize-pool",
      [Cl.principal(poolB)],
      address1
    );

    const { result } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-spot-price",
      [Cl.principal(poolB)],
      address1
    );

    expect(result).toBeErr(Cl.uint(6007)); // ERR_NO_OBSERVATIONS
  });
});

describe("TWAP Oracle: TWAP Calculation", () => {
  beforeEach(() => {
    // Setup poolA with multiple observations
    simnet.callPublicFn(
      "twap-oracle",
      "authorize-pool",
      [Cl.principal(poolA)],
      address1
    );

    // Record initial observation
    simnet.callPublicFn(
      "twap-oracle",
      "record-observation",
      [
        Cl.principal(poolA),
        Cl.uint(100000),
        Cl.uint(50000),
        Cl.uint(0),      // Starting cumulative prices
        Cl.uint(0)
      ],
      poolA
    );

    // Mine 10 blocks and record observations with changing prices
    for (let i = 1; i <= 10; i++) {
      simnet.mineEmptyBlock();

      // Simulate price changes
      const reserveA = 100000 + i * 1000;
      const reserveB = 50000 - i * 500;

      // Calculate cumulative prices (simplified)
      const cumulativeA = i * 500;  // Price increases
      const cumulativeB = i * 2000; // Price changes

      simnet.callPublicFn(
        "twap-oracle",
        "record-observation",
        [
          Cl.principal(poolA),
          Cl.uint(reserveA),
          Cl.uint(reserveB),
          Cl.uint(cumulativeA),
          Cl.uint(cumulativeB)
        ],
        poolA
      );
    }
  });

  it("calculates TWAP over short period", () => {
    const { result } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-twap",
      [Cl.principal(poolA), Cl.uint(5)], // 5 block period
      address1
    );

    expect(result).toBeOk(Cl.tuple({
      'twap-price-a': Cl.uint(100),  // (500/5)
      'twap-price-b': Cl.uint(400),  // (2000/5)
      'time-range': Cl.uint(5),
      'observations-used': Cl.uint(2)
    }));
  });

  it("calculates TWAP over long period", () => {
    const { result } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-twap",
      [Cl.principal(poolA), Cl.uint(10)], // 10 block period
      address1
    );

    expect(result).toBeOk(Cl.tuple({
      'twap-price-a': Cl.uint(50),   // (500/10)
      'twap-price-b': Cl.uint(200),  // (2000/10)
      'time-range': Cl.uint(10),
      'observations-used': Cl.uint(2)
    }));
  });

  it("returns error for period exceeding history", () => {
    const { result } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-twap",
      [Cl.principal(poolA), Cl.uint(100)], // Period longer than history
      address1
    );

    // Should still work but use oldest available observation
    const value = result.value as any;
    expect(value.type).toBe(Cl.ClarityType.ResponseOk);
  });

  it("returns error for invalid period", () => {
    // Period too small (0)
    const { result: r1 } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-twap",
      [Cl.principal(poolA), Cl.uint(0)],
      address1
    );
    expect(r1).toBeErr(Cl.uint(6003)); // ERR_INVALID_PERIOD

    // Period too large (> MAX_TWAP_PERIOD)
    const { result: r2 } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-twap",
      [Cl.principal(poolA), Cl.uint(10001)],
      address1
    );
    expect(r2).toBeErr(Cl.uint(6003)); // ERR_INVALID_PERIOD
  });

  it("returns error for pool with insufficient history", () => {
    // Authorize poolB and add only one observation
    simnet.callPublicFn(
      "twap-oracle",
      "authorize-pool",
      [Cl.principal(poolB)],
      address1
    );

    simnet.callPublicFn(
      "twap-oracle",
      "record-observation",
      [
        Cl.principal(poolB),
        Cl.uint(100000),
        Cl.uint(50000),
        Cl.uint(1000),
        Cl.uint(2000)
      ],
      poolB
    );

    const { result } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-twap",
      [Cl.principal(poolB), Cl.uint(10)],
      address1
    );

    expect(result).toBeErr(Cl.uint(6002)); // ERR_INSUFFICIENT_HISTORY
  });
});

describe("TWAP Oracle: Price Manipulation Detection", () => {
  beforeEach(() => {
    // Setup poolA with stable price history
    simnet.callPublicFn(
      "twap-oracle",
      "authorize-pool",
      [Cl.principal(poolA)],
      address1
    );

    // Build up stable price history (10 observations)
    for (let i = 0; i < 10; i++) {
      simnet.callPublicFn(
        "twap-oracle",
        "record-observation",
        [
          Cl.principal(poolA),
          Cl.uint(100000),  // Stable reserves
          Cl.uint(50000),
          Cl.uint(i * 500),    // Steady cumulative price growth
          Cl.uint(i * 2000)
        ],
        poolA
      );
      simnet.mineEmptyBlock();
    }
  });

  it("detects price divergence between spot and TWAP", () => {
    // Simulate sudden price manipulation (large trade)
    simnet.callPublicFn(
      "twap-oracle",
      "record-observation",
      [
        Cl.principal(poolA),
        Cl.uint(150000),  // Large increase in reserve-a (50% change)
        Cl.uint(35000),   // Large decrease in reserve-b (30% change)
        Cl.uint(5500),
        Cl.uint(22000)
      ],
      poolA
    );

    const { result } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-price-with-twap",
      [Cl.principal(poolA), Cl.uint(5)], // 5 block TWAP period
      address1
    );

    expect(result).toBeOk(Cl.tuple({
      'spot-price-a': Cl.uint(233333),   // Current manipulated price
      'spot-price-b': Cl.uint(4285714),  // Current manipulated price
      'twap-price-a': Cl.uint(200),      // Historical average
      'twap-price-b': Cl.uint(800),      // Historical average
      'divergence-a': Cl.uint(1666),     // ~16.66% divergence
      'divergence-b': Cl.uint(4357),     // ~43.57% divergence
    }));
  });

  it("shows minimal divergence for stable prices", () => {
    // Add one more observation with stable price
    simnet.callPublicFn(
      "twap-oracle",
      "record-observation",
      [
        Cl.principal(poolA),
        Cl.uint(100500),  // Minimal change
        Cl.uint(49750),   // Minimal change
        Cl.uint(5000),
        Cl.uint(20000)
      ],
      poolA
    );

    const { result } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-price-with-twap",
      [Cl.principal(poolA), Cl.uint(5)],
      address1
    );

    const value = result.value as any;
    expect(value.type).toBe(Cl.ClarityType.ResponseOk);

    // Divergence should be minimal (close to 0)
    expect(value.value['divergence-a'].value).toBeLessThan(100n); // Less than 1%
    expect(value.value['divergence-b'].value).toBeLessThan(100n); // Less than 1%
  });
});

describe("TWAP Oracle: Helper Functions", () => {
  beforeEach(() => {
    // Setup poolA with some observations
    simnet.callPublicFn(
      "twap-oracle",
      "authorize-pool",
      [Cl.principal(poolA)],
      address1
    );

    for (let i = 0; i < 5; i++) {
      simnet.callPublicFn(
        "twap-oracle",
        "record-observation",
        [
          Cl.principal(poolA),
          Cl.uint(100000 + i * 1000),
          Cl.uint(50000 - i * 500),
          Cl.uint(i * 500),
          Cl.uint(i * 2000)
        ],
        poolA
      );
      simnet.mineEmptyBlock();
    }
  });

  it("gets specific observation by index", () => {
    const { result } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-observation",
      [Cl.principal(poolA), Cl.uint(3)],
      address1
    );

    const obs = result.value as any;
    expect(obs.some.value['reserve-a'].value).toBe(102000n);
    expect(obs.some.value['reserve-b'].value).toBe(48500n);
    expect(obs.some.value['price-a-cumulative'].value).toBe(1000n);
    expect(obs.some.value['price-b-cumulative'].value).toBe(4000n);
  });

  it("gets latest observation", () => {
    const { result } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-latest-observation",
      [Cl.principal(poolA)],
      address1
    );

    const obs = result.value as any;
    expect(obs.some.value['reserve-a'].value).toBe(104000n);
    expect(obs.some.value['reserve-b'].value).toBe(48000n);
  });

  it("calculates safe TWAP period", () => {
    const { result } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-safe-twap-period",
      [Cl.principal(poolA)],
      address1
    );

    expect(result).toBeOk(Cl.tuple({
      'max-safe-period': Cl.uint(4), // We have 5 observations, so 4 blocks of history
      'total-observations': Cl.uint(5),
      'oldest-timestamp': Cl.uint(0),
      'current-time': Cl.uint(4)
    }));
  });

  it("returns none for observation that doesn't exist", () => {
    const { result } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-observation",
      [Cl.principal(poolA), Cl.uint(99)], // Index not yet written
      address1
    );

    expect((result.value as any).type).toBe(Cl.ClarityType.OptionalNone);
  });
});

describe("TWAP Oracle: Edge Cases", () => {
  it("handles pool with exactly MAX_OBSERVATIONS", () => {
    // Authorize poolA
    simnet.callPublicFn(
      "twap-oracle",
      "authorize-pool",
      [Cl.principal(poolA)],
      address1
    );

    // Record exactly 100 observations
    for (let i = 0; i < 100; i++) {
      simnet.callPublicFn(
        "twap-oracle",
        "record-observation",
        [
          Cl.principal(poolA),
          Cl.uint(100000 + i),
          Cl.uint(50000 + i),
          Cl.uint(i * 100),
          Cl.uint(i * 200)
        ],
        poolA
      );
      if (i < 99) simnet.mineEmptyBlock();
    }

    const { result: stateResult } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-pool-state",
      [Cl.principal(poolA)],
      address1
    );

    const state = stateResult.value as any;
    expect(state.some.value.cardinality.value).toBe(100n);
    expect(state.some.value['current-index'].value).toBe(99n);
  });

  it("handles TWAP calculation with zero price change", () => {
    // Authorize poolA
    simnet.callPublicFn(
      "twap-oracle",
      "authorize-pool",
      [Cl.principal(poolA)],
      address1
    );

    // Record observations with same cumulative prices (no change)
    for (let i = 0; i < 3; i++) {
      simnet.callPublicFn(
        "twap-oracle",
        "record-observation",
        [
          Cl.principal(poolA),
          Cl.uint(100000),
          Cl.uint(50000),
          Cl.uint(1000),  // Same cumulative price
          Cl.uint(2000)   // Same cumulative price
        ],
        poolA
      );
      simnet.mineEmptyBlock();
    }

    const { result } = simnet.callReadOnlyFn(
      "twap-oracle",
      "get-twap",
      [Cl.principal(poolA), Cl.uint(2)],
      address1
    );

    expect(result).toBeOk(Cl.tuple({
      'twap-price-a': Cl.uint(0),  // No price change
      'twap-price-b': Cl.uint(0),  // No price change
      'time-range': Cl.uint(2),
      'observations-used': Cl.uint(2)
    }));
  });

  it("handles ownership transfer", () => {
    // Transfer ownership to address2
    const { result: transferResult } = simnet.callPublicFn(
      "twap-oracle",
      "set-owner",
      [Cl.principal(address2)],
      address1
    );
    expect(transferResult).toBeOk(Cl.bool(true));

    // Old owner can no longer authorize pools
    const { result: authResult1 } = simnet.callPublicFn(
      "twap-oracle",
      "authorize-pool",
      [Cl.principal(poolA)],
      address1
    );
    expect(authResult1).toBeErr(Cl.uint(6005)); // ERR_NOT_AUTHORIZED

    // New owner can authorize pools
    const { result: authResult2 } = simnet.callPublicFn(
      "twap-oracle",
      "authorize-pool",
      [Cl.principal(poolA)],
      address2
    );
    expect(authResult2).toBeOk(Cl.bool(true));
  });
});