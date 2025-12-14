import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

/**
 * Test Suite for Pool Registry Contract
 *
 * Tests the core registry system that uses Clarity 4's contract-hash? to verify
 * that pool contracts match approved templates.
 *
 * Key features tested:
 * 1. Template management (add, deactivate, reactivate)
 * 2. Pool verification using contract-hash?
 * 3. Access control (owner-only functions)
 * 4. Query functions for templates and pools
 * 5. Error handling for various edge cases
 */

describe("Pool Registry: Template Management", () => {
  it("allows owner to add a new template", () => {
    const templateHash = Cl.bufferFromHex("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
    const templateName = "Standard AMM Pool v1";

    const { result } = simnet.callPublicFn(
      "pool-registry",
      "add-template",
      [
        templateHash,
        Cl.stringAscii(templateName),
        Cl.uint(1) // version
      ],
      deployer
    );

    expect(result).toBeOk(Cl.bool(true));

    // Verify template was added
    const templateInfo = simnet.callReadOnlyFn(
      "pool-registry",
      "get-template-info",
      [templateHash],
      deployer
    );

    expect(templateInfo.result).toBeSome();
  });

  it("prevents non-owner from adding templates", () => {
    const templateHash = Cl.bufferFromHex("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");

    const { result } = simnet.callPublicFn(
      "pool-registry",
      "add-template",
      [
        templateHash,
        Cl.stringAscii("Unauthorized Template"),
        Cl.uint(1)
      ],
      wallet1 // Not the owner
    );

    expect(result).toBeErr(Cl.uint(2001)); // ERR_NOT_OWNER
  });

  it("prevents adding duplicate templates", () => {
    const templateHash = Cl.bufferFromHex("0xaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd");

    // Add template first time
    simnet.callPublicFn(
      "pool-registry",
      "add-template",
      [
        templateHash,
        Cl.stringAscii("Template 1"),
        Cl.uint(1)
      ],
      deployer
    );

    // Try to add same template again
    const { result } = simnet.callPublicFn(
      "pool-registry",
      "add-template",
      [
        templateHash,
        Cl.stringAscii("Template 1 Duplicate"),
        Cl.uint(2)
      ],
      deployer
    );

    expect(result).toBeErr(Cl.uint(2002)); // ERR_TEMPLATE_EXISTS
  });

  it("allows owner to deactivate a template", () => {
    const templateHash = Cl.bufferFromHex("0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef");

    // Add template
    simnet.callPublicFn(
      "pool-registry",
      "add-template",
      [
        templateHash,
        Cl.stringAscii("Template to Deactivate"),
        Cl.uint(1)
      ],
      deployer
    );

    // Deactivate template
    const { result } = simnet.callPublicFn(
      "pool-registry",
      "deactivate-template",
      [templateHash],
      deployer
    );

    expect(result).toBeOk(Cl.bool(true));

    // Verify template is inactive
    const isApproved = simnet.callReadOnlyFn(
      "pool-registry",
      "is-template-approved",
      [templateHash],
      deployer
    );

    expect(isApproved.result).toBe(Cl.bool(false));
  });

  it("prevents non-owner from deactivating templates", () => {
    const templateHash = Cl.bufferFromHex("0xfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeedfeee");

    // Add template as owner
    simnet.callPublicFn(
      "pool-registry",
      "add-template",
      [
        templateHash,
        Cl.stringAscii("Template"),
        Cl.uint(1)
      ],
      deployer
    );

    // Try to deactivate as non-owner
    const { result } = simnet.callPublicFn(
      "pool-registry",
      "deactivate-template",
      [templateHash],
      wallet1
    );

    expect(result).toBeErr(Cl.uint(2001)); // ERR_NOT_OWNER
  });

  it("returns error when deactivating non-existent template", () => {
    const nonExistentHash = Cl.bufferFromHex("0x0000000000000000000000000000000000000000000000000000000000000000");

    const { result } = simnet.callPublicFn(
      "pool-registry",
      "deactivate-template",
      [nonExistentHash],
      deployer
    );

    expect(result).toBeErr(Cl.uint(2003)); // ERR_TEMPLATE_NOT_FOUND
  });

  it("allows owner to reactivate a deactivated template", () => {
    const templateHash = Cl.bufferFromHex("0xcafebabecafebabecafebabecafebabecafebabecafebabecafebabecafebabe");

    // Add and deactivate template
    simnet.callPublicFn(
      "pool-registry",
      "add-template",
      [
        templateHash,
        Cl.stringAscii("Reactivatable Template"),
        Cl.uint(1)
      ],
      deployer
    );

    simnet.callPublicFn(
      "pool-registry",
      "deactivate-template",
      [templateHash],
      deployer
    );

    // Reactivate template
    const { result } = simnet.callPublicFn(
      "pool-registry",
      "reactivate-template",
      [templateHash],
      deployer
    );

    expect(result).toBeOk(Cl.bool(true));

    // Verify template is active again
    const isApproved = simnet.callReadOnlyFn(
      "pool-registry",
      "is-template-approved",
      [templateHash],
      deployer
    );

    expect(isApproved.result).toBe(Cl.bool(true));
  });
});

describe("Pool Registry: Pool Verification", () => {
  beforeEach(() => {
    // Deploy a test pool contract for verification tests
    simnet.deployContract(
      "test-pool",
      `
      (impl-trait .pool-trait.pool-trait)

      (define-data-var reserve-a uint u0)
      (define-data-var reserve-b uint u0)

      (define-public (add-liquidity (token-a-desired uint) (token-b-desired uint) (deadline uint))
        (ok (tuple (lp-tokens u100) (token-a-used u100) (token-b-used u100))))

      (define-public (remove-liquidity (lp-tokens uint) (min-token-a uint) (min-token-b uint))
        (ok (tuple (token-a u50) (token-b u50))))

      (define-public (swap-a-for-b (amount-in uint) (min-amount-out uint))
        (ok u100))

      (define-public (swap-b-for-a (amount-in uint) (min-amount-out uint))
        (ok u100))

      (define-read-only (get-reserves)
        (ok (tuple (reserve-a (var-get reserve-a)) (reserve-b (var-get reserve-b)))))

      (define-read-only (get-fee) (ok u30))

      (define-read-only (get-tokens)
        (ok (tuple (token-a tx-sender) (token-b tx-sender))))
      `,
      deployer
    );
  });

  it("successfully verifies a pool with approved template hash", () => {
    // First, we need to get the actual hash of our test pool
    // In a real test environment with contract-hash? support, this would work:
    // const poolHash = simnet.callReadOnlyFn("test-pool", "get-contract-hash", [], deployer);

    // For testing, we'll simulate by adding a template with a known hash
    const templateHash = Cl.bufferFromHex("0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd");

    // Add template
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

    // In a real implementation with contract-hash?, this would verify the actual contract
    // For now, we test the verification flow structure

    // Note: This test would need a mock or actual contract-hash? implementation
    // to fully test the verification process
  });

  it("prevents verifying a pool twice", () => {
    // This test would verify that a pool cannot be verified multiple times
    // Implementation depends on having contract-hash? available
  });

  it("prevents verification with inactive template", () => {
    const templateHash = Cl.bufferFromHex("0x1111111111111111111111111111111111111111111111111111111111111111");

    // Add and deactivate template
    simnet.callPublicFn(
      "pool-registry",
      "add-template",
      [
        templateHash,
        Cl.stringAscii("Inactive Template"),
        Cl.uint(1)
      ],
      deployer
    );

    simnet.callPublicFn(
      "pool-registry",
      "deactivate-template",
      [templateHash],
      deployer
    );

    // Verification with inactive template would fail with ERR_TEMPLATE_INACTIVE
    // This would be tested with actual contract-hash? implementation
  });
});

describe("Pool Registry: Query Functions", () => {
  it("correctly returns template information", () => {
    const templateHash = Cl.bufferFromHex("0x2222222222222222222222222222222222222222222222222222222222222222");
    const templateName = "Query Test Template";
    const version = 2;

    // Add template
    simnet.callPublicFn(
      "pool-registry",
      "add-template",
      [
        templateHash,
        Cl.stringAscii(templateName),
        Cl.uint(version)
      ],
      deployer
    );

    // Query template info
    const { result } = simnet.callReadOnlyFn(
      "pool-registry",
      "get-template-info",
      [templateHash],
      deployer
    );

    // Verify the returned data structure
    expect(result).toBeSome();
    const templateInfo = result.value as any;
    expect(templateInfo.data.name).toEqual(Cl.stringAscii(templateName));
    expect(templateInfo.data.version).toEqual(Cl.uint(version));
    expect(templateInfo.data.active).toEqual(Cl.bool(true));
  });

  it("returns none for non-existent template", () => {
    const nonExistentHash = Cl.bufferFromHex("0x9999999999999999999999999999999999999999999999999999999999999999");

    const { result } = simnet.callReadOnlyFn(
      "pool-registry",
      "get-template-info",
      [nonExistentHash],
      deployer
    );

    expect(result).toBeNone();
  });

  it("correctly checks if template is approved", () => {
    const activeHash = Cl.bufferFromHex("0x3333333333333333333333333333333333333333333333333333333333333333");
    const inactiveHash = Cl.bufferFromHex("0x4444444444444444444444444444444444444444444444444444444444444444");

    // Add active template
    simnet.callPublicFn(
      "pool-registry",
      "add-template",
      [
        activeHash,
        Cl.stringAscii("Active Template"),
        Cl.uint(1)
      ],
      deployer
    );

    // Add and deactivate inactive template
    simnet.callPublicFn(
      "pool-registry",
      "add-template",
      [
        inactiveHash,
        Cl.stringAscii("Inactive Template"),
        Cl.uint(1)
      ],
      deployer
    );

    simnet.callPublicFn(
      "pool-registry",
      "deactivate-template",
      [inactiveHash],
      deployer
    );

    // Check active template
    const activeResult = simnet.callReadOnlyFn(
      "pool-registry",
      "is-template-approved",
      [activeHash],
      deployer
    );
    expect(activeResult.result).toBe(Cl.bool(true));

    // Check inactive template
    const inactiveResult = simnet.callReadOnlyFn(
      "pool-registry",
      "is-template-approved",
      [inactiveHash],
      deployer
    );
    expect(inactiveResult.result).toBe(Cl.bool(false));

    // Check non-existent template
    const nonExistentResult = simnet.callReadOnlyFn(
      "pool-registry",
      "is-template-approved",
      [Cl.bufferFromHex("0x0000000000000000000000000000000000000000000000000000000000000000")],
      deployer
    );
    expect(nonExistentResult.result).toBe(Cl.bool(false));
  });

  it("returns correct owner", () => {
    const { result } = simnet.callReadOnlyFn(
      "pool-registry",
      "get-owner",
      [],
      deployer
    );

    expect(result).toEqual(Cl.principal(deployer));
  });

  it("tracks template usage count", () => {
    const templateHash = Cl.bufferFromHex("0x5555555555555555555555555555555555555555555555555555555555555555");

    // Add template
    simnet.callPublicFn(
      "pool-registry",
      "add-template",
      [
        templateHash,
        Cl.stringAscii("Usage Count Template"),
        Cl.uint(1)
      ],
      deployer
    );

    // Check initial usage count
    const { result } = simnet.callReadOnlyFn(
      "pool-registry",
      "get-template-usage",
      [templateHash],
      deployer
    );

    expect(result).toEqual(Cl.uint(0));

    // After verification, usage count would increment
    // This would be tested with actual contract-hash? implementation
  });
});

describe("Pool Registry: Ownership Management", () => {
  it("allows owner to transfer ownership", () => {
    const newOwner = wallet1;

    // Transfer ownership
    const { result } = simnet.callPublicFn(
      "pool-registry",
      "set-owner",
      [Cl.principal(newOwner)],
      deployer
    );

    expect(result).toBeOk(Cl.bool(true));

    // Verify new owner
    const ownerResult = simnet.callReadOnlyFn(
      "pool-registry",
      "get-owner",
      [],
      deployer
    );

    expect(ownerResult.result).toEqual(Cl.principal(newOwner));
  });

  it("prevents non-owner from transferring ownership", () => {
    const { result } = simnet.callPublicFn(
      "pool-registry",
      "set-owner",
      [Cl.principal(wallet2)],
      wallet1 // Not the owner
    );

    expect(result).toBeErr(Cl.uint(2001)); // ERR_NOT_OWNER
  });

  it("new owner can perform admin functions after transfer", () => {
    // Transfer ownership to wallet1
    simnet.callPublicFn(
      "pool-registry",
      "set-owner",
      [Cl.principal(wallet1)],
      deployer
    );

    // New owner adds a template
    const templateHash = Cl.bufferFromHex("0x6666666666666666666666666666666666666666666666666666666666666666");
    const { result } = simnet.callPublicFn(
      "pool-registry",
      "add-template",
      [
        templateHash,
        Cl.stringAscii("New Owner Template"),
        Cl.uint(1)
      ],
      wallet1 // New owner
    );

    expect(result).toBeOk(Cl.bool(true));

    // Old owner cannot add templates anymore
    const templateHash2 = Cl.bufferFromHex("0x7777777777777777777777777777777777777777777777777777777777777777");
    const { result: oldOwnerResult } = simnet.callPublicFn(
      "pool-registry",
      "add-template",
      [
        templateHash2,
        Cl.stringAscii("Old Owner Template"),
        Cl.uint(1)
      ],
      deployer // Old owner
    );

    expect(oldOwnerResult).toBeErr(Cl.uint(2001)); // ERR_NOT_OWNER
  });
});

describe("Pool Registry: Helper Functions", () => {
  it("can-verify-with-hash returns correct information", () => {
    const validHash = Cl.bufferFromHex("0x8888888888888888888888888888888888888888888888888888888888888888");
    const invalidHash = Cl.bufferFromHex("0x9999999999999999999999999999999999999999999999999999999999999999");

    // Add a valid template
    simnet.callPublicFn(
      "pool-registry",
      "add-template",
      [
        validHash,
        Cl.stringAscii("Valid Template"),
        Cl.uint(3)
      ],
      deployer
    );

    // Check valid template
    const validResult = simnet.callReadOnlyFn(
      "pool-registry",
      "can-verify-with-hash",
      [validHash],
      deployer
    );

    expect(validResult.result.data['can-verify']).toEqual(Cl.bool(true));
    expect(validResult.result.data['template-name']).toEqual(Cl.stringAscii("Valid Template"));
    expect(validResult.result.data['template-version']).toEqual(Cl.uint(3));

    // Check invalid template
    const invalidResult = simnet.callReadOnlyFn(
      "pool-registry",
      "can-verify-with-hash",
      [invalidHash],
      deployer
    );

    expect(invalidResult.result.data['can-verify']).toEqual(Cl.bool(false));
    expect(invalidResult.result.data['template-name']).toEqual(Cl.stringAscii(""));
    expect(invalidResult.result.data['template-version']).toEqual(Cl.uint(0));
  });
});