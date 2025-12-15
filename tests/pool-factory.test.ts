import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

/**
 * Test Suite for Pool Factory Contract
 *
 * Tests the factory for deploying new pools using verified templates:
 * 1. Registry integration for pool verification
 * 2. Pool creation with unique token pairs
 * 3. Token pair ordering consistency
 * 4. Access control for admin functions
 * 5. Pool enumeration and lookup
 */

describe("Pool Factory: Admin Functions", () => {
  it("allows owner to set registry", () => {
    const registryAddress = Cl.principal(wallet1);

    const { result } = simnet.callPublicFn(
      "pool-factory",
      "set-registry",
      [registryAddress],
      deployer
    );

    expect(result).toBeOk(Cl.bool(true));

    // Verify registry was set
    const registry = simnet.callReadOnlyFn(
      "pool-factory",
      "get-registry",
      [],
      deployer
    );

    expect(registry.result).toEqual(registryAddress);
  });

  it("prevents non-owner from setting registry", () => {
    const { result } = simnet.callPublicFn(
      "pool-factory",
      "set-registry",
      [Cl.principal(wallet2)],
      wallet1 // Not the owner
    );

    expect(result).toBeErr(Cl.uint(4001)); // ERR_NOT_OWNER
  });

  it("prevents setting invalid registry address", () => {
    const { result } = simnet.callPublicFn(
      "pool-factory",
      "set-registry",
      [Cl.principal(deployer)], // Same as tx-sender
      deployer
    );

    expect(result).toBeErr(Cl.uint(4008)); // ERR_ZERO_ADDRESS
  });

  it("allows owner transfer", () => {
    const newOwner = wallet1;

    const { result } = simnet.callPublicFn(
      "pool-factory",
      "set-owner",
      [Cl.principal(newOwner)],
      deployer
    );

    expect(result).toBeOk(Cl.bool(true));

    // Verify new owner
    const owner = simnet.callReadOnlyFn(
      "pool-factory",
      "get-owner",
      [],
      deployer
    );

    expect(owner.result).toEqual(Cl.principal(newOwner));
  });
});

describe("Pool Factory: Pool Creation", () => {
  beforeEach(() => {
    // Set up registry
    simnet.callPublicFn(
      "pool-factory",
      "set-registry",
      [Cl.principal(deployer)], // Use deployer as registry for testing
      deployer
    );

    // Add an approved template to registry
    const templateHash = Cl.bufferFromHex("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
    simnet.callPublicFn(
      "pool-registry",
      "add-template",
      [
        templateHash,
        Cl.stringAscii("Test Pool Template"),
        Cl.uint(1)
      ],
      deployer
    );
  });

  it("creates pool for new token pair", () => {
    const tokenA = Cl.principal(wallet1);
    const tokenB = Cl.principal(wallet2);
    const poolAddress = Cl.principal(wallet3);
    const templateHash = Cl.bufferFromHex("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");

    const { result } = simnet.callPublicFn(
      "pool-factory",
      "create-pool",
      [tokenA, tokenB, poolAddress, templateHash],
      deployer
    );

    expect(result).toBeOk();
    const response = result.value as any;
    expect(response.data['pool-address']).toEqual(poolAddress);
    expect(response.data['pool-id']).toEqual(Cl.uint(1));

    // Verify pool was stored
    const pool = simnet.callReadOnlyFn(
      "pool-factory",
      "get-pool",
      [tokenA, tokenB],
      deployer
    );

    expect(pool.result).toBeSome(poolAddress);

    // Verify pool count incremented
    const count = simnet.callReadOnlyFn(
      "pool-factory",
      "get-pool-count",
      [],
      deployer
    );

    expect(count.result).toEqual(Cl.uint(1));
  });

  it("prevents creating pool for same token", () => {
    const sameToken = Cl.principal(wallet1);
    const poolAddress = Cl.principal(wallet3);
    const templateHash = Cl.bufferFromHex("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");

    const { result } = simnet.callPublicFn(
      "pool-factory",
      "create-pool",
      [sameToken, sameToken, poolAddress, templateHash],
      deployer
    );

    expect(result).toBeErr(Cl.uint(4003)); // ERR_SAME_TOKEN
  });

  it("prevents creating duplicate pool", () => {
    const tokenA = Cl.principal(wallet1);
    const tokenB = Cl.principal(wallet2);
    const poolAddress1 = Cl.principal(wallet3);
    const poolAddress2 = Cl.principal(deployer);
    const templateHash = Cl.bufferFromHex("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");

    // Create first pool
    simnet.callPublicFn(
      "pool-factory",
      "create-pool",
      [tokenA, tokenB, poolAddress1, templateHash],
      deployer
    );

    // Try to create duplicate pool
    const { result } = simnet.callPublicFn(
      "pool-factory",
      "create-pool",
      [tokenA, tokenB, poolAddress2, templateHash],
      deployer
    );

    expect(result).toBeErr(Cl.uint(4002)); // ERR_POOL_EXISTS
  });

  it("prevents creating pool with reversed token order", () => {
    const tokenA = Cl.principal(wallet1);
    const tokenB = Cl.principal(wallet2);
    const poolAddress1 = Cl.principal(wallet3);
    const poolAddress2 = Cl.principal(deployer);
    const templateHash = Cl.bufferFromHex("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");

    // Create pool with A-B order
    simnet.callPublicFn(
      "pool-factory",
      "create-pool",
      [tokenA, tokenB, poolAddress1, templateHash],
      deployer
    );

    // Try to create pool with B-A order
    const { result } = simnet.callPublicFn(
      "pool-factory",
      "create-pool",
      [tokenB, tokenA, poolAddress2, templateHash],
      deployer
    );

    expect(result).toBeErr(Cl.uint(4002)); // ERR_POOL_EXISTS
  });

  it("requires registry to be set", () => {
    // Deploy a new factory without registry set
    simnet.deployContract(
      "test-factory",
      simnet.getContractSource("pool-factory"),
      deployer
    );

    const tokenA = Cl.principal(wallet1);
    const tokenB = Cl.principal(wallet2);
    const poolAddress = Cl.principal(wallet3);
    const templateHash = Cl.bufferFromHex("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");

    const { result } = simnet.callPublicFn(
      "test-factory",
      "create-pool",
      [tokenA, tokenB, poolAddress, templateHash],
      deployer
    );

    expect(result).toBeErr(Cl.uint(4004)); // ERR_REGISTRY_NOT_SET
  });
});

describe("Pool Factory: Pool Lookup", () => {
  beforeEach(() => {
    // Set up registry and create some pools
    simnet.callPublicFn(
      "pool-factory",
      "set-registry",
      [Cl.principal(deployer)],
      deployer
    );

    const templateHash = Cl.bufferFromHex("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
    simnet.callPublicFn(
      "pool-registry",
      "add-template",
      [
        templateHash,
        Cl.stringAscii("Test Template"),
        Cl.uint(1)
      ],
      deployer
    );

    // Create multiple pools
    simnet.callPublicFn(
      "pool-factory",
      "create-pool",
      [
        Cl.principal(wallet1),
        Cl.principal(wallet2),
        Cl.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"),
        templateHash
      ],
      deployer
    );

    simnet.callPublicFn(
      "pool-factory",
      "create-pool",
      [
        Cl.principal(wallet2),
        Cl.principal(wallet3),
        Cl.principal("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5"),
        templateHash
      ],
      deployer
    );
  });

  it("retrieves pool by token pair", () => {
    const pool = simnet.callReadOnlyFn(
      "pool-factory",
      "get-pool",
      [
        Cl.principal(wallet1),
        Cl.principal(wallet2)
      ],
      deployer
    );

    expect(pool.result).toBeSome(Cl.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"));
  });

  it("retrieves pool with reversed token order", () => {
    const pool = simnet.callReadOnlyFn(
      "pool-factory",
      "get-pool",
      [
        Cl.principal(wallet2),
        Cl.principal(wallet1)
      ],
      deployer
    );

    expect(pool.result).toBeSome(Cl.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"));
  });

  it("returns none for non-existent pool", () => {
    const pool = simnet.callReadOnlyFn(
      "pool-factory",
      "get-pool",
      [
        Cl.principal(wallet1),
        Cl.principal(wallet3)
      ],
      deployer
    );

    expect(pool.result).toBeNone();
  });

  it("retrieves pool by ID", () => {
    const pool = simnet.callReadOnlyFn(
      "pool-factory",
      "get-pool-by-id",
      [Cl.uint(1)],
      deployer
    );

    expect(pool.result).toBeSome(Cl.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"));

    const pool2 = simnet.callReadOnlyFn(
      "pool-factory",
      "get-pool-by-id",
      [Cl.uint(2)],
      deployer
    );

    expect(pool2.result).toBeSome(Cl.principal("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5"));
  });

  it("returns none for invalid pool ID", () => {
    const pool = simnet.callReadOnlyFn(
      "pool-factory",
      "get-pool-by-id",
      [Cl.uint(999)],
      deployer
    );

    expect(pool.result).toBeNone();
  });

  it("returns correct pool count", () => {
    const count = simnet.callReadOnlyFn(
      "pool-factory",
      "get-pool-count",
      [],
      deployer
    );

    expect(count.result).toEqual(Cl.uint(2));
  });

  it("checks if pool exists", () => {
    const exists = simnet.callReadOnlyFn(
      "pool-factory",
      "pool-exists",
      [
        Cl.principal(wallet1),
        Cl.principal(wallet2)
      ],
      deployer
    );

    expect(exists.result).toBe(Cl.bool(true));

    const notExists = simnet.callReadOnlyFn(
      "pool-factory",
      "pool-exists",
      [
        Cl.principal(wallet1),
        Cl.principal(wallet3)
      ],
      deployer
    );

    expect(notExists.result).toBe(Cl.bool(false));
  });
});

describe("Pool Factory: Pool Metadata", () => {
  beforeEach(() => {
    // Set up registry and create a pool
    simnet.callPublicFn(
      "pool-factory",
      "set-registry",
      [Cl.principal(deployer)],
      deployer
    );

    const templateHash = Cl.bufferFromHex("0xaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd");
    simnet.callPublicFn(
      "pool-registry",
      "add-template",
      [
        templateHash,
        Cl.stringAscii("Metadata Test Template"),
        Cl.uint(1)
      ],
      deployer
    );

    simnet.callPublicFn(
      "pool-factory",
      "create-pool",
      [
        Cl.principal(wallet1),
        Cl.principal(wallet2),
        Cl.principal(wallet3),
        templateHash
      ],
      deployer
    );
  });

  it("retrieves pool metadata", () => {
    const { result } = simnet.callReadOnlyFn(
      "pool-factory",
      "get-pool-metadata",
      [Cl.principal(wallet3)],
      deployer
    );

    expect(result).toBeSome();
    const metadata = result.value as any;
    expect(metadata.data.id).toEqual(Cl.uint(1));
    expect(metadata.data['token-a']).toEqual(Cl.principal(wallet1));
    expect(metadata.data['token-b']).toEqual(Cl.principal(wallet2));
    expect(metadata.data['created-by']).toEqual(Cl.principal(deployer));
    expect(metadata.data['template-used']).toEqual(
      Cl.bufferFromHex("0xaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd")
    );
  });

  it("retrieves pool creation info", () => {
    const { result } = simnet.callReadOnlyFn(
      "pool-factory",
      "get-pool-creation-info",
      [Cl.principal(wallet3)],
      deployer
    );

    expect(result).toBeOk();
    const info = result.value as any;
    expect(info.data['created-by']).toEqual(Cl.principal(deployer));
    expect(info.data['template-hash']).toEqual(
      Cl.bufferFromHex("0xaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd")
    );
  });

  it("returns error for non-existent pool metadata", () => {
    const { result } = simnet.callReadOnlyFn(
      "pool-factory",
      "get-pool-creation-info",
      [Cl.principal(deployer)], // Non-existent pool
      deployer
    );

    expect(result).toBeErr(Cl.uint(4006)); // ERR_POOL_NOT_FOUND
  });

  it("retrieves pool details with verification status", () => {
    const { result } = simnet.callReadOnlyFn(
      "pool-factory",
      "get-pool-details",
      [Cl.principal(wallet3)],
      deployer
    );

    expect(result).toBeSome();
    const details = result.value as any;
    expect(details.data.id).toEqual(Cl.uint(1));
    expect(details.data['token-a']).toEqual(Cl.principal(wallet1));
    expect(details.data['token-b']).toEqual(Cl.principal(wallet2));
    expect(details.data['is-verified']).toEqual(Cl.bool(true));
  });
});

describe("Pool Factory: Helper Functions", () => {
  it("provides pool enumeration helper", () => {
    const { result } = simnet.callReadOnlyFn(
      "pool-factory",
      "get-pools-for-token",
      [
        Cl.principal(wallet1),
        Cl.uint(0),
        Cl.uint(10)
      ],
      deployer
    );

    expect(result).toBeDefined();
    expect(result.data['pools-checked']).toEqual(Cl.uint(10));
    expect(result.data['message']).toEqual(Cl.stringAscii("Use get-pool-by-id to retrieve specific pools"));
  });

  it("returns correct registry address", () => {
    const registryAddress = Cl.principal(wallet2);

    simnet.callPublicFn(
      "pool-factory",
      "set-registry",
      [registryAddress],
      deployer
    );

    const { result } = simnet.callReadOnlyFn(
      "pool-factory",
      "get-registry",
      [],
      deployer
    );

    expect(result).toEqual(registryAddress);
  });
});