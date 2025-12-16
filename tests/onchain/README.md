# On-Chain Integration Tests

Comprehensive test suite for the Verified DEX/AMM deployed on Stacks Testnet.

## Overview

This directory contains integration tests that verify all deployed contracts are working correctly on-chain. The tests use actual testnet data and check contract functionality without requiring transactions (read-only calls).

## Deployed Contracts

All contracts are deployed at: `ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV`

| Contract | Status |
|----------|--------|
| sip-010-trait | ✅ Deployed |
| pool-trait | ✅ Deployed |
| math-lib | ✅ Deployed |
| pool-registry | ✅ Deployed |
| pool-template | ✅ Deployed |
| pool-factory | ✅ Deployed |
| router | ✅ Deployed |
| twap-oracle | ✅ Deployed |
| test-token | ✅ Deployed |

See [TESTNET_DEPLOYMENT.md](../../TESTNET_DEPLOYMENT.md) for full deployment details.

## Test Methods

We provide two testing methods:

### Method 1: Bash Script (Recommended - No Dependencies)

The bash script uses curl to make API calls directly to the Stacks Testnet API.

**Advantages:**
- No dependencies required
- Fast execution
- Easy to read output
- Works on any Unix-like system

**Usage:**

```bash
# Make script executable (first time only)
chmod +x tests/onchain/test-onchain.sh

# Run tests
./tests/onchain/test-onchain.sh
```

### Method 2: TypeScript/Node.js Script

The TypeScript script uses the official Stacks.js libraries for more comprehensive testing.

**Advantages:**
- Type-safe
- Uses official Stacks libraries
- Can be extended for write operations
- JSON output support

**Prerequisites:**

```bash
cd tests/onchain
npm install
```

**Usage:**

```bash
# Run tests
npm test

# Or directly with ts-node
ts-node testnet-integration.ts
```

## Test Coverage

### 1. Contract Deployment Verification
- ✅ Checks all 9 contracts are deployed and accessible
- ✅ Verifies contract interfaces are available

### 2. Math Library Tests
- ✅ Tests `sqrt` function
- ✅ Tests `mul-div` function
- ✅ Verifies safe math operations

### 3. Test Token (SIP-010) Tests
- ✅ Reads token name
- ✅ Reads token symbol
- ✅ Reads token decimals
- ✅ Reads total supply
- ✅ Verifies SIP-010 compliance

### 4. Pool Registry Tests (Clarity 4 `contract-hash?`)
- ✅ Reads template count
- ✅ Checks template verification status
- ✅ Demonstrates Clarity 4 `contract-hash?` feature

### 5. TWAP Oracle Tests (Clarity 4 `stacks-block-time`)
- ✅ Reads current block time
- ✅ Checks observation state
- ✅ Demonstrates Clarity 4 `stacks-block-time` feature

### 6. Router Contract Tests
- ✅ Reads router registry configuration
- ✅ Reads router factory configuration
- ✅ Verifies router state

### 7. Pool Factory Tests
- ✅ Reads pool count
- ✅ Checks factory registry
- ✅ Verifies factory configuration

## Sample Output

```
╔════════════════════════════════════════════════════════════╗
║   VERIFIED DEX/AMM - ON-CHAIN INTEGRATION TESTS          ║
╚════════════════════════════════════════════════════════════╝

Network: Stacks Testnet
API URL: https://api.testnet.hiro.so
Deployer: ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV

╔════════════════════════════════════════════════════════════╗
║  TEST 1: Verify Contract Deployments
╚════════════════════════════════════════════════════════════╝

▶ Test: Checking if sip-010-trait is deployed
✅ PASS: Contract sip-010-trait is deployed and accessible

▶ Test: Checking if pool-trait is deployed
✅ PASS: Contract pool-trait is deployed and accessible

...

╔════════════════════════════════════════════════════════════╗
║                      TEST SUMMARY                          ║
╚════════════════════════════════════════════════════════════╝

Total Tests Run: 20
✅ Passed: 20
❌ Failed: 0

╔════════════════════════════════════════════════════════════╗
║           ALL TESTS PASSED! 🎉                             ║
╚════════════════════════════════════════════════════════════╝
```

## Clarity 4 Features Tested

This test suite specifically validates the following Clarity 4 features:

### 1. `contract-hash?`
**Location:** [pool-registry.clar](../../contracts/core/pool-registry.clar)

Used for verifying pool templates by their hash:
```clarity
(contract-hash? pool-template)
```

**Test:** Checks if pool template verification works correctly

### 2. `stacks-block-time`
**Location:** [twap-oracle.clar](../../contracts/core/twap-oracle.clar), [router.clar](../../contracts/core/router.clar)

Used for timestamp-based operations:
```clarity
(define-read-only (get-current-time)
  stacks-block-time)
```

**Tests:**
- TWAP oracle time tracking
- Router deadline protection

## API Endpoints Used

All tests use read-only endpoints, so they don't require a wallet or STX:

- **Contract Interface:** `GET /v2/contracts/interface/{address}/{contract}`
- **Call Read-Only:** `POST /v2/contracts/call-read/{address}/{contract}/{function}`

## Troubleshooting

### Test Fails: "Contract not found"

**Cause:** Contract might not be deployed yet or network issue.

**Solution:**
1. Check deployment status: https://explorer.hiro.so/?chain=testnet
2. Search for address: `ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV`
3. Verify network is testnet

### Test Fails: "Connection timeout"

**Cause:** Network connectivity or API downtime.

**Solution:**
1. Check internet connection
2. Verify Hiro API status: https://status.hiro.so/
3. Try again in a few minutes

### TypeScript Tests: "Cannot find module"

**Cause:** Dependencies not installed.

**Solution:**
```bash
cd tests/onchain
npm install
```

## Extending the Tests

### Adding Write Operations (Transactions)

To test write operations (requires STX for fees):

1. Set up your private key in `.env`:
```bash
PRIVATE_KEY=your_private_key_here
```

2. Use the `broadcastTx` function in [testnet-integration.ts](testnet-integration.ts):
```typescript
const txId = await broadcastTx(
  'test-token',
  'mint',
  [uintCV(1000000), principalCV(DEPLOYER_ADDRESS)],
  process.env.PRIVATE_KEY!
);
```

3. Wait for confirmation:
```typescript
const confirmed = await waitForTx(txId);
```

### Adding New Test Cases

1. **Bash script:** Add a new test function in [test-onchain.sh](test-onchain.sh)
2. **TypeScript:** Add a new test function in [testnet-integration.ts](testnet-integration.ts)
3. Update test counters and summary

## Next Steps

After verifying contracts are deployed and working:

1. **Initialize contracts** - Set up registry and factory relationships
2. **Create pools** - Deploy actual trading pools
3. **Add liquidity** - Fund pools with test tokens
4. **Test swaps** - Execute token swaps
5. **Monitor TWAP** - Verify oracle price tracking

## Resources

- [Stacks Explorer (Testnet)](https://explorer.hiro.so/?chain=testnet)
- [Hiro API Documentation](https://docs.hiro.so/stacks-blockchain-api)
- [Clarity Documentation](https://docs.stacks.co/clarity)
- [Stacks.js Documentation](https://stacks.js.org/)

## License

MIT
