import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

/**
 * Test Token Contract Test Suite
 *
 * Tests the SIP-010 compliant test token implementation
 * including minting, burning, transfers, and ownership
 */

describe("Test Token: Initialization and Metadata", () => {
  it("initializes with correct metadata", () => {
    // Get token name
    const { result: nameResult } = simnet.callReadOnlyFn(
      "test-token",
      "get-name",
      [],
      wallet1
    );
    expect(nameResult).toBeOk(Cl.stringAscii("Test Token"));

    // Get token symbol
    const { result: symbolResult } = simnet.callReadOnlyFn(
      "test-token",
      "get-symbol",
      [],
      wallet1
    );
    expect(symbolResult).toBeOk(Cl.stringAscii("TEST"));

    // Get decimals
    const { result: decimalsResult } = simnet.callReadOnlyFn(
      "test-token",
      "get-decimals",
      [],
      wallet1
    );
    expect(decimalsResult).toBeOk(Cl.uint(6));

    // Get initial supply (should be 0)
    const { result: supplyResult } = simnet.callReadOnlyFn(
      "test-token",
      "get-total-supply",
      [],
      wallet1
    );
    expect(supplyResult).toBeOk(Cl.uint(0));

    // Get token URI (should be none initially)
    const { result: uriResult } = simnet.callReadOnlyFn(
      "test-token",
      "get-token-uri",
      [],
      wallet1
    );
    expect(uriResult).toBeOk(Cl.none());
  });

  it("returns correct contract info", () => {
    const { result } = simnet.callReadOnlyFn(
      "test-token",
      "get-contract-info",
      [],
      wallet1
    );

    const info = result.value as any;
    expect(info.name.value).toBe("Test Token");
    expect(info.symbol.value).toBe("TEST");
    expect(info.decimals.value).toBe(6n);
    expect(info['total-supply'].value).toBe(0n);
    expect(info.owner.value).toBe(deployer);
    expect(info.uri.type).toBe(Cl.ClarityType.OptionalNone);
  });

  it("allows owner to set token URI", () => {
    const newUri = "https://example.com/token-metadata.json";

    // Set URI as owner
    const { result } = simnet.callPublicFn(
      "test-token",
      "set-token-uri",
      [Cl.some(Cl.stringUtf8(newUri))],
      deployer
    );
    expect(result).toBeOk(Cl.bool(true));

    // Verify URI was set
    const { result: uriResult } = simnet.callReadOnlyFn(
      "test-token",
      "get-token-uri",
      [],
      wallet1
    );
    expect(uriResult).toBeOk(Cl.some(Cl.stringUtf8(newUri)));
  });

  it("prevents non-owner from setting token URI", () => {
    const { result } = simnet.callPublicFn(
      "test-token",
      "set-token-uri",
      [Cl.some(Cl.stringUtf8("unauthorized"))],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(7001)); // ERR_NOT_OWNER
  });
});

describe("Test Token: Minting", () => {
  it("allows owner to mint tokens", () => {
    const mintAmount = 1000000; // 1 token with 6 decimals

    const { result, events } = simnet.callPublicFn(
      "test-token",
      "mint",
      [Cl.uint(mintAmount), Cl.principal(wallet1)],
      deployer
    );

    expect(result).toBeOk(Cl.bool(true));

    // Check balance
    const { result: balanceResult } = simnet.callReadOnlyFn(
      "test-token",
      "get-balance",
      [Cl.principal(wallet1)],
      wallet1
    );
    expect(balanceResult).toBeOk(Cl.uint(mintAmount));

    // Check total supply
    const { result: supplyResult } = simnet.callReadOnlyFn(
      "test-token",
      "get-total-supply",
      [],
      wallet1
    );
    expect(supplyResult).toBeOk(Cl.uint(mintAmount));

    // Check events
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("ft_mint_event");
  });

  it("prevents non-owner from minting", () => {
    const { result } = simnet.callPublicFn(
      "test-token",
      "mint",
      [Cl.uint(1000), Cl.principal(wallet2)],
      wallet1 // Not the owner
    );

    expect(result).toBeErr(Cl.uint(7001)); // ERR_NOT_OWNER
  });

  it("rejects minting zero tokens", () => {
    const { result } = simnet.callPublicFn(
      "test-token",
      "mint",
      [Cl.uint(0), Cl.principal(wallet1)],
      deployer
    );

    expect(result).toBeErr(Cl.uint(7004)); // ERR_INVALID_AMOUNT
  });

  it("allows batch minting to multiple recipients", () => {
    const recipients = [
      { to: wallet1, amount: 1000000 },
      { to: wallet2, amount: 2000000 },
      { to: wallet3, amount: 3000000 }
    ];

    const { result } = simnet.callPublicFn(
      "test-token",
      "mint-many",
      [Cl.list(recipients.map(r => Cl.tuple({
        to: Cl.principal(r.to),
        amount: Cl.uint(r.amount)
      })))],
      deployer
    );

    expect(result).toBeOk(Cl.list([
      Cl.bool(true),
      Cl.bool(true),
      Cl.bool(true)
    ]));

    // Verify balances
    recipients.forEach(recipient => {
      const { result: balanceResult } = simnet.callReadOnlyFn(
        "test-token",
        "get-balance",
        [Cl.principal(recipient.to)],
        wallet1
      );
      expect(balanceResult).toBeOk(Cl.uint(recipient.amount));
    });

    // Check total supply
    const { result: supplyResult } = simnet.callReadOnlyFn(
      "test-token",
      "get-total-supply",
      [],
      wallet1
    );
    expect(supplyResult).toBeOk(Cl.uint(6000000)); // Sum of all mints
  });

  it("allows initializing supply once", () => {
    const initialHolders = [
      { to: wallet1, amount: 5000000 },
      { to: wallet2, amount: 3000000 }
    ];

    // First initialization should succeed
    const { result } = simnet.callPublicFn(
      "test-token",
      "initialize-supply",
      [Cl.list(initialHolders.map(h => Cl.tuple({
        to: Cl.principal(h.to),
        amount: Cl.uint(h.amount)
      })))],
      deployer
    );

    expect(result).toBeOk(Cl.list([
      Cl.bool(true),
      Cl.bool(true)
    ]));

    // Second initialization should fail (supply > 0)
    const { result: secondResult } = simnet.callPublicFn(
      "test-token",
      "initialize-supply",
      [Cl.list([Cl.tuple({
        to: Cl.principal(wallet3),
        amount: Cl.uint(1000000)
      })])],
      deployer
    );

    expect(secondResult).toBeErr(Cl.uint(7003)); // ERR_NOT_AUTHORIZED
  });
});

describe("Test Token: Burning", () => {
  beforeEach(() => {
    // Mint tokens to wallet1 for burn tests
    simnet.callPublicFn(
      "test-token",
      "mint",
      [Cl.uint(10000000), Cl.principal(wallet1)],
      deployer
    );
  });

  it("allows holders to burn their tokens", () => {
    const burnAmount = 2000000;

    const { result, events } = simnet.callPublicFn(
      "test-token",
      "burn",
      [Cl.uint(burnAmount)],
      wallet1
    );

    expect(result).toBeOk(Cl.bool(true));

    // Check balance decreased
    const { result: balanceResult } = simnet.callReadOnlyFn(
      "test-token",
      "get-balance",
      [Cl.principal(wallet1)],
      wallet1
    );
    expect(balanceResult).toBeOk(Cl.uint(8000000)); // 10M - 2M

    // Check total supply decreased
    const { result: supplyResult } = simnet.callReadOnlyFn(
      "test-token",
      "get-total-supply",
      [],
      wallet1
    );
    expect(supplyResult).toBeOk(Cl.uint(8000000));

    // Check burn event
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("ft_burn_event");
  });

  it("prevents burning more than balance", () => {
    const { result } = simnet.callPublicFn(
      "test-token",
      "burn",
      [Cl.uint(20000000)], // More than balance
      wallet1
    );

    expect(result).toBeErr(Cl.uint(7002)); // ERR_INSUFFICIENT_BALANCE
  });

  it("prevents burning zero tokens", () => {
    const { result } = simnet.callPublicFn(
      "test-token",
      "burn",
      [Cl.uint(0)],
      wallet1
    );

    expect(result).toBeErr(Cl.uint(7004)); // ERR_INVALID_AMOUNT
  });

  it("allows burning entire balance", () => {
    const { result } = simnet.callPublicFn(
      "test-token",
      "burn",
      [Cl.uint(10000000)], // Entire balance
      wallet1
    );

    expect(result).toBeOk(Cl.bool(true));

    // Balance should be 0
    const { result: balanceResult } = simnet.callReadOnlyFn(
      "test-token",
      "get-balance",
      [Cl.principal(wallet1)],
      wallet1
    );
    expect(balanceResult).toBeOk(Cl.uint(0));
  });
});

describe("Test Token: Transfers", () => {
  beforeEach(() => {
    // Mint tokens to wallet1 for transfer tests
    simnet.callPublicFn(
      "test-token",
      "mint",
      [Cl.uint(10000000), Cl.principal(wallet1)],
      deployer
    );
  });

  it("allows successful transfer with sufficient balance", () => {
    const transferAmount = 3000000;
    const memo = Cl.buff(Buffer.from("Test transfer"));

    const { result, events } = simnet.callPublicFn(
      "test-token",
      "transfer",
      [
        Cl.uint(transferAmount),
        Cl.principal(wallet1),
        Cl.principal(wallet2),
        Cl.some(memo)
      ],
      wallet1
    );

    expect(result).toBeOk(Cl.bool(true));

    // Check sender balance decreased
    const { result: senderBalance } = simnet.callReadOnlyFn(
      "test-token",
      "get-balance",
      [Cl.principal(wallet1)],
      wallet1
    );
    expect(senderBalance).toBeOk(Cl.uint(7000000));

    // Check recipient balance increased
    const { result: recipientBalance } = simnet.callReadOnlyFn(
      "test-token",
      "get-balance",
      [Cl.principal(wallet2)],
      wallet1
    );
    expect(recipientBalance).toBeOk(Cl.uint(3000000));

    // Check transfer event
    expect(events.length).toBeGreaterThan(0);
    const transferEvent = events.find(e => e.type === "ft_transfer_event");
    expect(transferEvent).toBeDefined();
  });

  it("allows transfer without memo", () => {
    const { result } = simnet.callPublicFn(
      "test-token",
      "transfer",
      [
        Cl.uint(1000000),
        Cl.principal(wallet1),
        Cl.principal(wallet2),
        Cl.none()
      ],
      wallet1
    );

    expect(result).toBeOk(Cl.bool(true));
  });

  it("prevents transfer with insufficient balance", () => {
    const { result } = simnet.callPublicFn(
      "test-token",
      "transfer",
      [
        Cl.uint(20000000), // More than balance
        Cl.principal(wallet1),
        Cl.principal(wallet2),
        Cl.none()
      ],
      wallet1
    );

    expect(result).toBeErr(Cl.uint(7002)); // ERR_INSUFFICIENT_BALANCE
  });

  it("prevents transfer of zero amount", () => {
    const { result } = simnet.callPublicFn(
      "test-token",
      "transfer",
      [
        Cl.uint(0),
        Cl.principal(wallet1),
        Cl.principal(wallet2),
        Cl.none()
      ],
      wallet1
    );

    expect(result).toBeErr(Cl.uint(7004)); // ERR_INVALID_AMOUNT
  });

  it("prevents transfer when sender is not tx-sender", () => {
    const { result } = simnet.callPublicFn(
      "test-token",
      "transfer",
      [
        Cl.uint(1000000),
        Cl.principal(wallet1), // Trying to transfer from wallet1
        Cl.principal(wallet2),
        Cl.none()
      ],
      wallet2 // But wallet2 is calling
    );

    expect(result).toBeErr(Cl.uint(7003)); // ERR_NOT_AUTHORIZED
  });

  it("allows self-transfer", () => {
    const { result } = simnet.callPublicFn(
      "test-token",
      "transfer",
      [
        Cl.uint(1000000),
        Cl.principal(wallet1),
        Cl.principal(wallet1), // Same as sender
        Cl.none()
      ],
      wallet1
    );

    expect(result).toBeOk(Cl.bool(true));

    // Balance should remain the same
    const { result: balanceResult } = simnet.callReadOnlyFn(
      "test-token",
      "get-balance",
      [Cl.principal(wallet1)],
      wallet1
    );
    expect(balanceResult).toBeOk(Cl.uint(10000000));
  });

  it("handles multiple consecutive transfers", () => {
    // Transfer 1: wallet1 -> wallet2
    simnet.callPublicFn(
      "test-token",
      "transfer",
      [
        Cl.uint(3000000),
        Cl.principal(wallet1),
        Cl.principal(wallet2),
        Cl.none()
      ],
      wallet1
    );

    // Transfer 2: wallet1 -> wallet3
    simnet.callPublicFn(
      "test-token",
      "transfer",
      [
        Cl.uint(2000000),
        Cl.principal(wallet1),
        Cl.principal(wallet3),
        Cl.none()
      ],
      wallet1
    );

    // Check final balances
    const { result: balance1 } = simnet.callReadOnlyFn(
      "test-token",
      "get-balance",
      [Cl.principal(wallet1)],
      wallet1
    );
    expect(balance1).toBeOk(Cl.uint(5000000)); // 10M - 3M - 2M

    const { result: balance2 } = simnet.callReadOnlyFn(
      "test-token",
      "get-balance",
      [Cl.principal(wallet2)],
      wallet1
    );
    expect(balance2).toBeOk(Cl.uint(3000000));

    const { result: balance3 } = simnet.callReadOnlyFn(
      "test-token",
      "get-balance",
      [Cl.principal(wallet3)],
      wallet1
    );
    expect(balance3).toBeOk(Cl.uint(2000000));

    // Total supply should remain unchanged
    const { result: supplyResult } = simnet.callReadOnlyFn(
      "test-token",
      "get-total-supply",
      [],
      wallet1
    );
    expect(supplyResult).toBeOk(Cl.uint(10000000));
  });
});

describe("Test Token: Ownership", () => {
  it("initializes with deployer as owner", () => {
    const { result } = simnet.callReadOnlyFn(
      "test-token",
      "get-owner",
      [],
      wallet1
    );
    expect(result).toBeOk(Cl.principal(deployer));
  });

  it("allows owner to transfer ownership", () => {
    const { result } = simnet.callPublicFn(
      "test-token",
      "set-owner",
      [Cl.principal(wallet1)],
      deployer
    );
    expect(result).toBeOk(Cl.bool(true));

    // Verify ownership changed
    const { result: ownerResult } = simnet.callReadOnlyFn(
      "test-token",
      "get-owner",
      [],
      wallet2
    );
    expect(ownerResult).toBeOk(Cl.principal(wallet1));

    // New owner can mint
    const { result: mintResult } = simnet.callPublicFn(
      "test-token",
      "mint",
      [Cl.uint(1000), Cl.principal(wallet2)],
      wallet1
    );
    expect(mintResult).toBeOk(Cl.bool(true));

    // Old owner cannot mint
    const { result: failedMint } = simnet.callPublicFn(
      "test-token",
      "mint",
      [Cl.uint(1000), Cl.principal(wallet2)],
      deployer
    );
    expect(failedMint).toBeErr(Cl.uint(7001)); // ERR_NOT_OWNER
  });

  it("prevents non-owner from transferring ownership", () => {
    const { result } = simnet.callPublicFn(
      "test-token",
      "set-owner",
      [Cl.principal(wallet2)],
      wallet1 // Not the owner
    );
    expect(result).toBeErr(Cl.uint(7001)); // ERR_NOT_OWNER
  });
});

describe("Test Token: Read-Only Functions", () => {
  beforeEach(() => {
    // Setup: Mint tokens to different wallets
    simnet.callPublicFn(
      "test-token",
      "mint",
      [Cl.uint(5000000), Cl.principal(wallet1)],
      deployer
    );
    simnet.callPublicFn(
      "test-token",
      "mint",
      [Cl.uint(3000000), Cl.principal(wallet2)],
      deployer
    );
  });

  it("returns correct balance for each account", () => {
    const { result: balance1 } = simnet.callReadOnlyFn(
      "test-token",
      "get-balance",
      [Cl.principal(wallet1)],
      wallet3
    );
    expect(balance1).toBeOk(Cl.uint(5000000));

    const { result: balance2 } = simnet.callReadOnlyFn(
      "test-token",
      "get-balance",
      [Cl.principal(wallet2)],
      wallet3
    );
    expect(balance2).toBeOk(Cl.uint(3000000));

    const { result: balance3 } = simnet.callReadOnlyFn(
      "test-token",
      "get-balance",
      [Cl.principal(wallet3)],
      wallet3
    );
    expect(balance3).toBeOk(Cl.uint(0));
  });

  it("returns correct total supply", () => {
    const { result } = simnet.callReadOnlyFn(
      "test-token",
      "get-total-supply",
      [],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(8000000)); // 5M + 3M
  });

  it("all metadata functions return ok responses", () => {
    const functions = ["get-name", "get-symbol", "get-decimals", "get-total-supply", "get-token-uri"];

    functions.forEach(fn => {
      const { result } = simnet.callReadOnlyFn(
        "test-token",
        fn,
        [],
        wallet1
      );
      expect(result.type).toBe(Cl.ClarityType.ResponseOk);
    });
  });
});

describe("Test Token: Edge Cases", () => {
  it("handles maximum supply correctly", () => {
    // Mint a very large amount (near u128 max)
    const largeAmount = "340282366920938463463374607431768211455"; // u128 max

    const { result } = simnet.callPublicFn(
      "test-token",
      "mint",
      [Cl.uint(largeAmount), Cl.principal(wallet1)],
      deployer
    );

    expect(result).toBeOk(Cl.bool(true));

    // Check balance
    const { result: balanceResult } = simnet.callReadOnlyFn(
      "test-token",
      "get-balance",
      [Cl.principal(wallet1)],
      wallet1
    );
    expect(balanceResult).toBeOk(Cl.uint(largeAmount));
  });

  it("handles memo edge cases", () => {
    // Mint tokens first
    simnet.callPublicFn(
      "test-token",
      "mint",
      [Cl.uint(1000000), Cl.principal(wallet1)],
      deployer
    );

    // Test with maximum length memo (34 bytes)
    const maxMemo = Cl.buff(Buffer.alloc(34, 'a'));
    const { result } = simnet.callPublicFn(
      "test-token",
      "transfer",
      [
        Cl.uint(100),
        Cl.principal(wallet1),
        Cl.principal(wallet2),
        Cl.some(maxMemo)
      ],
      wallet1
    );

    expect(result).toBeOk(Cl.bool(true));
  });
});