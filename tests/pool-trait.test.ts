import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.8.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

/**
 * Test Suite for Pool Trait
 *
 * These tests verify that:
 * 1. The pool trait is properly defined
 * 2. A pool contract can implement the trait
 * 3. All required functions are defined with correct signatures
 */

Clarinet.test({
    name: "Pool trait is properly defined and can be referenced",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        // Deploy a test pool that implements the trait
        let deployTx = chain.deployContract(
            'test-pool',
            `
            (impl-trait .pool-trait.pool-trait)

            ;; Error constants
            (define-constant ERR_NOT_INITIALIZED (err u1000))
            (define-constant ERR_INVALID_LIQUIDITY (err u1001))
            (define-constant ERR_SLIPPAGE (err u1002))

            ;; Pool state
            (define-data-var reserve-a uint u0)
            (define-data-var reserve-b uint u0)
            (define-data-var fee-bps uint u30) ;; 0.3% fee
            (define-data-var token-a principal tx-sender)
            (define-data-var token-b principal tx-sender)
            (define-data-var total-supply uint u0)

            ;; Implement add-liquidity
            (define-public (add-liquidity (token-a-desired uint) (token-b-desired uint) (deadline uint))
                (ok (tuple
                    (lp-tokens u100)
                    (token-a-used token-a-desired)
                    (token-b-used token-b-desired)
                ))
            )

            ;; Implement remove-liquidity
            (define-public (remove-liquidity (lp-tokens uint) (min-token-a uint) (min-token-b uint))
                (ok (tuple
                    (token-a min-token-a)
                    (token-b min-token-b)
                ))
            )

            ;; Implement swap-a-for-b
            (define-public (swap-a-for-b (amount-in uint) (min-amount-out uint))
                (ok min-amount-out)
            )

            ;; Implement swap-b-for-a
            (define-public (swap-b-for-a (amount-in uint) (min-amount-out uint))
                (ok min-amount-out)
            )

            ;; Implement get-reserves
            (define-read-only (get-reserves)
                (ok (tuple
                    (reserve-a (var-get reserve-a))
                    (reserve-b (var-get reserve-b))
                ))
            )

            ;; Implement get-fee
            (define-read-only (get-fee)
                (ok (var-get fee-bps))
            )

            ;; Implement get-tokens
            (define-read-only (get-tokens)
                (ok (tuple
                    (token-a (var-get token-a))
                    (token-b (var-get token-b))
                ))
            )
            `,
            deployer
        );

        // The deployment should succeed if the trait is properly defined
        assertEquals(deployTx.success, true, "Test pool implementing pool trait should deploy successfully");
    }
});

Clarinet.test({
    name: "Pool implementing pool-trait has all required functions callable",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;

        // Deploy the test pool
        chain.deployContract(
            'test-pool',
            `
            (impl-trait .pool-trait.pool-trait)

            ;; Pool state with initial values
            (define-data-var reserve-a uint u1000000)
            (define-data-var reserve-b uint u2000000)
            (define-data-var fee-bps uint u30)
            (define-data-var token-a principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)
            (define-data-var token-b principal 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5)
            (define-data-var total-supply uint u0)

            (define-public (add-liquidity (token-a-desired uint) (token-b-desired uint) (deadline uint))
                (ok (tuple
                    (lp-tokens u100)
                    (token-a-used token-a-desired)
                    (token-b-used token-b-desired)
                ))
            )

            (define-public (remove-liquidity (lp-tokens uint) (min-token-a uint) (min-token-b uint))
                (ok (tuple
                    (token-a (+ min-token-a u10))
                    (token-b (+ min-token-b u20))
                ))
            )

            (define-public (swap-a-for-b (amount-in uint) (min-amount-out uint))
                (ok (+ min-amount-out u5))
            )

            (define-public (swap-b-for-a (amount-in uint) (min-amount-out uint))
                (ok (+ min-amount-out u10))
            )

            (define-read-only (get-reserves)
                (ok (tuple
                    (reserve-a (var-get reserve-a))
                    (reserve-b (var-get reserve-b))
                ))
            )

            (define-read-only (get-fee)
                (ok (var-get fee-bps))
            )

            (define-read-only (get-tokens)
                (ok (tuple
                    (token-a (var-get token-a))
                    (token-b (var-get token-b))
                ))
            )
            `,
            deployer
        );

        let block = chain.mineBlock([
            // Test get-reserves
            Tx.contractCall('test-pool', 'get-reserves', [], wallet1.address),

            // Test get-fee
            Tx.contractCall('test-pool', 'get-fee', [], wallet1.address),

            // Test get-tokens
            Tx.contractCall('test-pool', 'get-tokens', [], wallet1.address),

            // Test add-liquidity
            Tx.contractCall('test-pool', 'add-liquidity', [
                types.uint(1000),
                types.uint(2000),
                types.uint(100000)
            ], wallet1.address),

            // Test remove-liquidity
            Tx.contractCall('test-pool', 'remove-liquidity', [
                types.uint(50),
                types.uint(100),
                types.uint(200)
            ], wallet1.address),

            // Test swap-a-for-b
            Tx.contractCall('test-pool', 'swap-a-for-b', [
                types.uint(100),
                types.uint(95)
            ], wallet1.address),

            // Test swap-b-for-a
            Tx.contractCall('test-pool', 'swap-b-for-a', [
                types.uint(200),
                types.uint(95)
            ], wallet1.address),
        ]);

        // Verify all functions are callable and return expected values
        assertEquals(block.receipts[0].result.expectOk(),
            types.tuple({
                'reserve-a': types.uint(1000000),
                'reserve-b': types.uint(2000000)
            })
        );

        assertEquals(block.receipts[1].result, types.ok(types.uint(30)));

        assertEquals(block.receipts[2].result.expectOk().data['token-a'],
            types.principal('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM')
        );

        assertEquals(block.receipts[3].result.expectOk(),
            types.tuple({
                'lp-tokens': types.uint(100),
                'token-a-used': types.uint(1000),
                'token-b-used': types.uint(2000)
            })
        );

        assertEquals(block.receipts[4].result.expectOk(),
            types.tuple({
                'token-a': types.uint(110),
                'token-b': types.uint(220)
            })
        );

        assertEquals(block.receipts[5].result, types.ok(types.uint(100)));
        assertEquals(block.receipts[6].result, types.ok(types.uint(105)));
    }
});

Clarinet.test({
    name: "Pool trait enforces correct function signatures",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;

        // Try to deploy a pool with incorrect function signature
        let deployTx = chain.deployContract(
            'bad-pool',
            `
            (impl-trait .pool-trait.pool-trait)

            ;; Wrong signature for add-liquidity (missing deadline parameter)
            (define-public (add-liquidity (token-a-desired uint) (token-b-desired uint))
                (ok (tuple
                    (lp-tokens u100)
                    (token-a-used u100)
                    (token-b-used u100)
                ))
            )

            ;; Correct signatures for other functions
            (define-public (remove-liquidity (lp-tokens uint) (min-token-a uint) (min-token-b uint))
                (ok (tuple (token-a u0) (token-b u0)))
            )

            (define-public (swap-a-for-b (amount-in uint) (min-amount-out uint))
                (ok u0)
            )

            (define-public (swap-b-for-a (amount-in uint) (min-amount-out uint))
                (ok u0)
            )

            (define-read-only (get-reserves)
                (ok (tuple (reserve-a u0) (reserve-b u0)))
            )

            (define-read-only (get-fee)
                (ok u0)
            )

            (define-read-only (get-tokens)
                (ok (tuple (token-a tx-sender) (token-b tx-sender)))
            )
            `,
            deployer
        );

        // This should fail because add-liquidity has wrong signature
        assertEquals(deployTx.success, false, "Pool with incorrect trait implementation should fail to deploy");
    }
});