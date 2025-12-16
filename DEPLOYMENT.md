# Verified DEX/AMM - Deployment Guide

## 📋 Pre-Deployment Checklist

### Code Quality
- ✅ All 12 contracts compile successfully
- ✅ All unit tests written and passing
- ✅ All integration tests written and passing
- ✅ Security review completed (self-review documented)
- ✅ No critical errors or warnings

### Configuration
- ✅ `.env` file configured with correct network
- ✅ Deployer address set: `ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV`
- ⚠️ **IMPORTANT**: Mnemonic phrase set in `.env` (keep secure!)
- ✅ Deployment plan created: `deployments/default.testnet.yaml`

### Documentation
- ✅ PROJECT_SUMMARY.md complete
- ✅ PROJECT_SETUP.md available
- ✅ All contracts have inline comments
- ✅ Test documentation complete

---

## 🚀 Testnet Deployment

### Step 1: Verify Environment

```bash
# Check Clarinet version
clarinet --version

# Verify all contracts compile
clarinet check

# Check deployer address has testnet STX
# Visit: https://explorer.hiro.so/address/ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV?chain=testnet

# Get testnet STX from faucet if needed
# Visit: https://explorer.hiro.so/sandbox/faucet?chain=testnet
```

### Step 2: Review Deployment Plan

The deployment will proceed in 7 batches:

1. **Batch 0**: Traits (sip-010-trait, pool-trait)
2. **Batch 1**: Utilities (math-lib)
3. **Batch 2**: Core - Registry (pool-registry)
4. **Batch 3**: Core - Pool Template (pool-template)
5. **Batch 4**: Core - Factory & Router (pool-factory, router)
6. **Batch 5**: Core - TWAP Oracle (twap-oracle)
7. **Batch 6**: Test Token (test-token)

**Total Contracts**: 8 primary contracts (excluding legacy contracts)

### Step 3: Deploy to Testnet

```bash
# Deploy all contracts to testnet
clarinet deployments apply -p deployments/default.testnet.yaml

# This will:
# - Connect to Stacks testnet API
# - Deploy contracts in order
# - Wait for confirmations
# - Output deployed contract addresses
```

**Expected Output**:
```
✓ Batch 0: Deployed sip-010-trait
✓ Batch 0: Deployed pool-trait
✓ Batch 1: Deployed math-lib
✓ Batch 2: Deployed pool-registry
✓ Batch 3: Deployed pool-template
✓ Batch 4: Deployed pool-factory
✓ Batch 4: Deployed router
✓ Batch 5: Deployed twap-oracle
✓ Batch 6: Deployed test-token
```

### Step 4: Verify Deployment

```bash
# Check each contract on Stacks Explorer
# Template URL: https://explorer.hiro.so/txid/[TX_ID]?chain=testnet

# Verify contracts are callable
clarinet console --testnet
```

In the console, verify each contract:
```clarity
;; Check sip-010-trait
(contract-call? .sip-010-trait get-name)

;; Check pool-registry
(contract-call? .pool-registry get-verified-pool-count)

;; Check router
(contract-call? .router get-config)

;; Check twap-oracle
(contract-call? .twap-oracle get-config)

;; Check test-token
(contract-call? .test-token get-name)
```

### Step 5: Initialize Contracts

After deployment, initialize the contracts:

#### 5.1: Initialize Router
```clarity
;; Connect router to registry and factory
(contract-call? .router initialize
  .pool-registry
  .pool-factory)
```

#### 5.2: Add Pool Template to Registry
```clarity
;; First, get the hash of pool-template contract
;; You'll need to calculate this using contract-hash?

;; Add template to registry
(contract-call? .pool-registry add-template
  0x[POOL_TEMPLATE_HASH]
  "Standard AMM Pool v1"
  u1)
```

#### 5.3: Create Test Pool
```clarity
;; Create a pool using the factory
(contract-call? .pool-factory create-pool
  .test-token        ;; token-a
  .test-token        ;; token-b (would be different in production)
  .pool-template     ;; pool contract
  0x[TEMPLATE_HASH]) ;; template hash
```

#### 5.4: Authorize Pool in TWAP Oracle
```clarity
;; Allow pool to record observations
(contract-call? .twap-oracle authorize-pool .pool-template)
```

#### 5.5: Mint Test Tokens
```clarity
;; Mint tokens for testing
(contract-call? .test-token mint u100000000 tx-sender)
```

### Step 6: Test Live on Testnet

Execute a complete user flow:

1. **Check Balances**:
```clarity
(contract-call? .test-token get-balance tx-sender)
```

2. **Add Liquidity**:
```clarity
(contract-call? .router add-liquidity
  .test-token      ;; token-a
  .test-token      ;; token-b
  u10000000        ;; amount-a (10 tokens)
  u10000000        ;; amount-b (10 tokens)
  u9500000         ;; min-a (5% slippage)
  u9500000         ;; min-b (5% slippage)
  tx-sender        ;; to
  u1000000)        ;; deadline (block height)
```

3. **Execute Swap**:
```clarity
(contract-call? .router swap-exact-tokens-for-tokens
  u1000000         ;; amount-in (1 token)
  u900000          ;; min-amount-out (10% slippage)
  (list .test-token .test-token)  ;; path
  tx-sender        ;; to
  u1000000)        ;; deadline
```

4. **Check TWAP**:
```clarity
(contract-call? .twap-oracle get-spot-price .pool-template)
```

5. **Remove Liquidity**:
```clarity
(contract-call? .router remove-liquidity
  .test-token      ;; token-a
  .test-token      ;; token-b
  u5000000         ;; liquidity to remove
  u4500000         ;; min-a
  u4500000         ;; min-b
  tx-sender        ;; to
  u1000000)        ;; deadline
```

### Step 7: Document Deployed Addresses

After deployment, create a file with all deployed addresses:

```bash
# Create deployment record
cat > DEPLOYED_ADDRESSES.testnet.md << 'EOF'
# Testnet Deployment Addresses

Deployed: [DATE]
Network: Stacks Testnet
Deployer: ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV

## Contracts

### Traits
- sip-010-trait: ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV.sip-010-trait
- pool-trait: ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV.pool-trait

### Utilities
- math-lib: ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV.math-lib

### Core Contracts
- pool-registry: ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV.pool-registry
- pool-template: ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV.pool-template
- pool-factory: ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV.pool-factory
- router: ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV.router
- twap-oracle: ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV.twap-oracle

### Tokens
- test-token: ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV.test-token

## Explorer Links

### Contracts
- [sip-010-trait](https://explorer.hiro.so/txid/[TX_ID]?chain=testnet)
- [pool-trait](https://explorer.hiro.so/txid/[TX_ID]?chain=testnet)
- [math-lib](https://explorer.hiro.so/txid/[TX_ID]?chain=testnet)
- [pool-registry](https://explorer.hiro.so/txid/[TX_ID]?chain=testnet)
- [pool-template](https://explorer.hiro.so/txid/[TX_ID]?chain=testnet)
- [pool-factory](https://explorer.hiro.so/txid/[TX_ID]?chain=testnet)
- [router](https://explorer.hiro.so/txid/[TX_ID]?chain=testnet)
- [twap-oracle](https://explorer.hiro.so/txid/[TX_ID]?chain=testnet)
- [test-token](https://explorer.hiro.so/txid/[TX_ID]?chain=testnet)

## Initialization Status

- [x] Router initialized with registry and factory
- [x] Pool template added to registry
- [x] Test pool created
- [x] TWAP oracle authorized for pool
- [x] Test tokens minted
- [x] Test swap executed successfully
- [x] TWAP data verified

## Testing Status

- [x] All contracts callable
- [x] Liquidity provision works
- [x] Swaps execute correctly
- [x] TWAP oracle records observations
- [x] Balances update correctly
- [x] Events emit properly

EOF
```

---

## 🔐 Security Considerations

### Before Mainnet

1. **Security Audit**: Consider professional audit for production
2. **Extended Testing**: Run testnet for at least 1-2 weeks
3. **Bug Bounty**: Consider bug bounty program
4. **Insurance**: Look into DeFi insurance options
5. **Multisig**: Consider multisig for admin functions
6. **Time Locks**: Consider adding time locks for critical operations
7. **Rate Limiting**: Monitor for unusual activity
8. **Circuit Breakers**: Consider emergency pause functionality

### Monitoring

- Monitor pool reserves
- Track TWAP divergence
- Watch for large trades
- Monitor gas usage
- Track failed transactions
- Set up alerts for anomalies

---

## 🌐 Mainnet Deployment

### Prerequisites

- ✅ Testnet deployment successful
- ✅ All testnet tests passed
- ✅ Security audit complete (or thorough self-review)
- ✅ At least 2 weeks of testnet operation
- ✅ Community testing completed
- ✅ Documentation finalized
- ✅ Frontend tested (if applicable)
- ✅ Sufficient STX for deployment (~10-20 STX)

### Mainnet Configuration

1. **Update `.env`**:
```bash
NETWORK=mainnet
DEPLOYER_ADDRESS=SP[YOUR_MAINNET_ADDRESS]
MNEMONIC=[YOUR_24_WORD_PHRASE]
```

2. **Create Mainnet Deployment Plan**:
```bash
cp deployments/default.testnet.yaml deployments/default.mainnet.yaml

# Update all addresses in the file:
# ST... -> SP...
```

3. **Deploy to Mainnet**:
```bash
# Double-check everything!
clarinet check

# Deploy
clarinet deployments apply -p deployments/default.mainnet.yaml

# Verify each transaction
# Monitor on explorer
```

4. **Initialize Mainnet Contracts**:
- Follow same initialization steps as testnet
- Use production token addresses
- Set appropriate parameters
- Test with small amounts first

5. **Document Mainnet Addresses**:
```bash
# Create mainnet address record
cp DEPLOYED_ADDRESSES.testnet.md DEPLOYED_ADDRESSES.mainnet.md

# Update with mainnet addresses
# Update explorer links (remove ?chain=testnet)
```

---

## 🎯 Post-Deployment

### Immediate Actions
1. Verify all contracts on explorer
2. Test basic functionality
3. Announce deployment to community
4. Monitor for first 24 hours
5. Set up monitoring/alerts

### Ongoing Maintenance
1. Monitor pool health
2. Track TWAP accuracy
3. Review transactions regularly
4. Respond to community feedback
5. Plan upgrades if needed

---

## 📊 Deployment Costs (Estimated)

### Testnet
- **Cost**: FREE (testnet STX from faucet)
- **Contracts**: 8
- **Transactions**: ~8-10
- **Time**: ~30-60 minutes

### Mainnet
- **Contract Deployment**: ~1-2 STX per contract
- **Total Estimated**: 10-20 STX
- **Initialization**: ~1-2 STX
- **Testing**: ~1-2 STX
- **Total**: ~15-25 STX

*Costs vary based on network congestion and contract size*

---

## 🆘 Troubleshooting

### Deployment Fails
- **Check STX balance**: Ensure sufficient STX for fees
- **Check network**: Verify testnet/mainnet connectivity
- **Check syntax**: Run `clarinet check` before deploying
- **Check dependencies**: Ensure all dependencies deployed first
- **Check nonce**: May need to wait if previous tx pending

### Initialization Fails
- **Check ownership**: Ensure deployer is caller
- **Check addresses**: Verify contract addresses correct
- **Check parameters**: Ensure valid parameter values
- **Check state**: Some functions can only be called once

### Function Calls Fail
- **Check authorization**: Ensure caller has permission
- **Check balances**: Ensure sufficient token balances
- **Check allowances**: May need token approvals
- **Check pool state**: Pool may need initialization
- **Check deadlines**: May have expired

---

## 📞 Support

### Resources
- [Clarinet Documentation](https://docs.hiro.so/clarinet)
- [Stacks Explorer](https://explorer.hiro.so)
- [Stacks Discord](https://discord.gg/stacks)
- [GitHub Issues](https://github.com/[your-repo]/issues)

### Community
- Post in Stacks Discord #dev-help
- Create GitHub issue for bugs
- Share testnet feedback

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Security review complete
- [ ] Documentation updated
- [ ] `.env` configured
- [ ] Deployment plan created
- [ ] Sufficient STX in wallet

### Deployment
- [ ] Deploy traits
- [ ] Deploy utilities
- [ ] Deploy core contracts
- [ ] Deploy tokens
- [ ] Verify on explorer

### Initialization
- [ ] Initialize router
- [ ] Add pool templates
- [ ] Create test pools
- [ ] Authorize TWAP oracle
- [ ] Mint test tokens

### Testing
- [ ] Test liquidity provision
- [ ] Test swaps
- [ ] Test TWAP oracle
- [ ] Test multi-hop swaps
- [ ] Test edge cases

### Documentation
- [ ] Document deployed addresses
- [ ] Update README
- [ ] Create usage guide
- [ ] Announce to community

---

**Good luck with your deployment! 🚀**

*Remember: Test thoroughly on testnet before mainnet deployment!*