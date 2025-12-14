import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.8.0/index.ts';
import { assertEquals, assertExists } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

/**
 * Test Suite for SIP-010 Fungible Token Trait
 *
 * These tests verify that:
 * 1. The trait is properly defined and can be referenced
 * 2. A token contract can implement the trait
 * 3. All required functions are defined with correct signatures
 */

Clarinet.test({
    name: "SIP-010 trait is properly defined and can be referenced",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        // Since traits don't have runtime code, we'll deploy a simple test token
        // that implements the trait to verify it's properly defined

        // First, let's deploy a test token that implements the trait
        let deployTx = chain.deployContract(
            'test-token',
            `
            (impl-trait .sip-010-trait.sip-010-trait)

            ;; Token name, symbol, and decimals
            (define-constant TOKEN_NAME "Test Token")
            (define-constant TOKEN_SYMBOL "TEST")
            (define-constant TOKEN_DECIMALS u6)
            (define-constant TOKEN_URI (some u"https://test.token"))

            ;; Error constants
            (define-constant ERR_OWNER_ONLY (err u100))
            (define-constant ERR_NOT_TOKEN_OWNER (err u101))
            (define-constant ERR_INSUFFICIENT_BALANCE (err u102))

            ;; Token balances
            (define-fungible-token test-token)

            ;; Initialize contract owner
            (define-data-var contract-owner principal tx-sender)

            ;; Transfer function implementation
            (define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
                (begin
                    (try! (ft-transfer? test-token amount sender recipient))
                    (ok true)
                )
            )

            ;; Get name
            (define-read-only (get-name)
                (ok TOKEN_NAME)
            )

            ;; Get symbol
            (define-read-only (get-symbol)
                (ok TOKEN_SYMBOL)
            )

            ;; Get decimals
            (define-read-only (get-decimals)
                (ok TOKEN_DECIMALS)
            )

            ;; Get balance
            (define-read-only (get-balance (account principal))
                (ok (ft-get-balance test-token account))
            )

            ;; Get total supply
            (define-read-only (get-total-supply)
                (ok (ft-get-supply test-token))
            )

            ;; Get token URI
            (define-read-only (get-token-uri)
                (ok TOKEN_URI)
            )

            ;; Mint function for testing
            (define-public (mint (amount uint) (recipient principal))
                (begin
                    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_OWNER_ONLY)
                    (ft-mint? test-token amount recipient)
                )
            )
            `,
            accounts.get('deployer')!
        );

        // The deployment should succeed if the trait is properly defined
        assertEquals(deployTx.success, true, "Test token implementing SIP-010 trait should deploy successfully");
    }
});

Clarinet.test({
    name: "Token implementing SIP-010 trait has all required functions callable",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;

        // Deploy the test token
        let deployTx = chain.deployContract(
            'test-token',
            `
            (impl-trait .sip-010-trait.sip-010-trait)

            (define-constant TOKEN_NAME "Test Token")
            (define-constant TOKEN_SYMBOL "TEST")
            (define-constant TOKEN_DECIMALS u6)
            (define-constant TOKEN_URI (some u"https://test.token"))
            (define-constant ERR_OWNER_ONLY (err u100))
            (define-constant ERR_INSUFFICIENT_BALANCE (err u102))

            (define-fungible-token test-token)
            (define-data-var contract-owner principal tx-sender)

            (define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
                (begin
                    (try! (ft-transfer? test-token amount sender recipient))
                    (ok true)
                )
            )

            (define-read-only (get-name)
                (ok TOKEN_NAME)
            )

            (define-read-only (get-symbol)
                (ok TOKEN_SYMBOL)
            )

            (define-read-only (get-decimals)
                (ok TOKEN_DECIMALS)
            )

            (define-read-only (get-balance (account principal))
                (ok (ft-get-balance test-token account))
            )

            (define-read-only (get-total-supply)
                (ok (ft-get-supply test-token))
            )

            (define-read-only (get-token-uri)
                (ok TOKEN_URI)
            )

            (define-public (mint (amount uint) (recipient principal))
                (begin
                    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_OWNER_ONLY)
                    (ft-mint? test-token amount recipient)
                )
            )
            `,
            deployer
        );

        let block = chain.mineBlock([
            // Test get-name
            Tx.contractCall('test-token', 'get-name', [], wallet1.address),

            // Test get-symbol
            Tx.contractCall('test-token', 'get-symbol', [], wallet1.address),

            // Test get-decimals
            Tx.contractCall('test-token', 'get-decimals', [], wallet1.address),

            // Test get-balance
            Tx.contractCall('test-token', 'get-balance', [types.principal(wallet1.address)], wallet1.address),

            // Test get-total-supply
            Tx.contractCall('test-token', 'get-total-supply', [], wallet1.address),

            // Test get-token-uri
            Tx.contractCall('test-token', 'get-token-uri', [], wallet1.address),

            // Mint some tokens for transfer test
            Tx.contractCall('test-token', 'mint', [
                types.uint(1000000),
                types.principal(wallet1.address)
            ], deployer.address),

            // Test transfer
            Tx.contractCall('test-token', 'transfer', [
                types.uint(100000),
                types.principal(wallet1.address),
                types.principal(wallet2.address),
                types.some(types.buff(Buffer.from("Test transfer")))
            ], wallet1.address),
        ]);

        // Verify all trait functions are callable
        assertEquals(block.receipts[0].result, types.ok(types.ascii("Test Token")));
        assertEquals(block.receipts[1].result, types.ok(types.ascii("TEST")));
        assertEquals(block.receipts[2].result, types.ok(types.uint(6)));
        assertEquals(block.receipts[3].result, types.ok(types.uint(0)));
        assertEquals(block.receipts[4].result, types.ok(types.uint(0)));
        assertEquals(block.receipts[5].result, types.ok(types.some(types.utf8("https://test.token"))));
        assertEquals(block.receipts[6].result, types.ok(types.uint(1000000)));
        assertEquals(block.receipts[7].result, types.ok(types.bool(true)));

        // Verify balances after transfer
        let block2 = chain.mineBlock([
            Tx.contractCall('test-token', 'get-balance', [types.principal(wallet1.address)], wallet1.address),
            Tx.contractCall('test-token', 'get-balance', [types.principal(wallet2.address)], wallet1.address),
            Tx.contractCall('test-token', 'get-total-supply', [], wallet1.address),
        ]);

        assertEquals(block2.receipts[0].result, types.ok(types.uint(900000)));
        assertEquals(block2.receipts[1].result, types.ok(types.uint(100000)));
        assertEquals(block2.receipts[2].result, types.ok(types.uint(1000000)));
    }
});

Clarinet.test({
    name: "SIP-010 trait enforces correct function signatures",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        // Try to deploy a token with incorrect function signature
        // This should fail at deployment
        let deployTx = chain.deployContract(
            'bad-token',
            `
            (impl-trait .sip-010-trait.sip-010-trait)

            ;; Intentionally wrong signature for transfer (missing memo parameter)
            (define-public (transfer (amount uint) (sender principal) (recipient principal))
                (ok true)
            )

            ;; Other functions with correct signatures
            (define-read-only (get-name)
                (ok "Bad Token")
            )

            (define-read-only (get-symbol)
                (ok "BAD")
            )

            (define-read-only (get-decimals)
                (ok u6)
            )

            (define-read-only (get-balance (account principal))
                (ok u0)
            )

            (define-read-only (get-total-supply)
                (ok u0)
            )

            (define-read-only (get-token-uri)
                (ok none)
            )
            `,
            deployer
        );

        // This should fail because the transfer function has wrong signature
        assertEquals(deployTx.success, false, "Token with incorrect trait implementation should fail to deploy");
    }
});