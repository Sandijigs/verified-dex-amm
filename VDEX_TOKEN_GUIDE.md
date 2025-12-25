# VDEX Token - Quick Start Guide

## 🎯 Overview

The VDEX token is now implemented and ready for deployment! This governance and rewards token will power the farming system for Verified DEX.

---

## ✅ What's Been Created

1. **Smart Contract** - [contracts/tokens/vdex-token.clar](contracts/tokens/vdex-token.clar)
   - Full SIP-010 implementation
   - 1 billion max supply (6 decimals)
   - Controlled minting for farming rewards
   - Burn functionality

2. **Test Suite** - [tests/vdex-token_test.clar](tests/vdex-token_test.clar)
   - 18 comprehensive tests
   - Covers all functionality
   - Edge cases and security tests

3. **Documentation** - [contracts/tokens/README.md](contracts/tokens/README.md)
   - Complete API reference
   - Usage examples
   - Integration guides

---

## 🚀 Quick Deploy

### 1. Add to Clarinet Configuration

Edit `Clarinet.toml`:

```toml
[contracts.vdex-token]
path = "contracts/tokens/vdex-token.clar"
depends_on = []
```

### 2. Deploy to Testnet

```bash
clarinet deployments generate --testnet
clarinet deployments apply -p deployments/default.testnet.yaml
```

### 3. Initialize the Token

After deployment, run:

```clarity
(contract-call? .vdex-token initialize 'ST1YOUR_TREASURY_ADDRESS)
```

This will:
- Mint 300M VDEX to treasury
- Mint 50M VDEX to deployer (for initial liquidity)
- Lock the initialization

---

## 🧪 Run Tests

```bash
# Run all VDEX token tests
clarinet test tests/vdex-token_test.clar

# Or run specific test
clarinet console
>>> (contract-call? .vdex-token-test test-initialization)
```

---

## 📊 Token Distribution

| Allocation | Amount | Recipient | When |
|------------|--------|-----------|------|
| Treasury | 300M (30%) | Treasury address | At initialization |
| Initial Liquidity | 50M (5%) | Deployer | At initialization |
| Farming Rewards | 400M (40%) | Farmers | Minted on-demand via staking |
| Team | 150M (15%) | Reserved | Future (vesting contract) |
| Airdrops | 100M (10%) | Reserved | Future (campaigns) |

---

## 🔧 Integration with Farming

Once the LP staking contract is deployed:

### 1. Authorize Staking Contract

```clarity
(contract-call? .vdex-token set-minter .lp-staking)
```

### 2. Staking Contract Can Mint Rewards

```clarity
;; In lp-staking.clar
(contract-call? .vdex-token mint reward-amount farmer-address)
```

### 3. Check Remaining Farming Budget

```clarity
(contract-call? .vdex-token get-remaining-farm-supply)
;; Returns: u400000000000000 (400M initial)
```

---

## 💡 Usage Examples

### For Users

```clarity
;; Check balance (returns micro-VDEX)
(contract-call? .vdex-token get-balance tx-sender)

;; Transfer 100 VDEX to friend
(contract-call? .vdex-token transfer
  u100000000  ;; 100 VDEX (100M micro-VDEX)
  tx-sender
  'ST2FRIEND_ADDRESS
  none)

;; Burn 10 VDEX (deflationary!)
(contract-call? .vdex-token burn u10000000)
```

### For Developers

```typescript
// Frontend integration with WalletConnect
import { useWalletConnect } from '@/providers/WalletConnectProvider';
import { Cl } from '@stacks/transactions';

const { callContract } = useWalletConnect();

// Transfer VDEX
await callContract({
  contractAddress: process.env.NEXT_PUBLIC_VDEX_CONTRACT!.split('.')[0],
  contractName: 'vdex-token',
  functionName: 'transfer',
  functionArgs: [
    Cl.uint(100000000), // 100 VDEX
    Cl.principal(senderAddress),
    Cl.principal(recipientAddress),
    Cl.none()
  ]
});

// Check balance
const balance = await fetch(
  `${STACKS_API}/extended/v1/address/${address}/balances`
);
```

---

## 🔐 Security Checklist

Before mainnet deployment:

- [ ] Treasury address verified
- [ ] Initial liquidity amount confirmed
- [ ] Minter authorization tested
- [ ] Farming cap enforcement verified
- [ ] Transfer functionality tested
- [ ] Burn function tested
- [ ] All tests passing
- [ ] Contract audited (if possible)

---

## 📈 Next Steps

1. **Deploy sBTC Pool Contract**
   - Specialized AMM for STX/sBTC
   - Uses VDEX for governance

2. **Deploy LP Staking Contract**
   - Stake LP tokens
   - Earn VDEX rewards
   - Multiple pool support

3. **Build Farm UI**
   - Stake/unstake interface
   - Reward claiming
   - APR display

4. **Create Farming API**
   - Real-time APR calculation
   - TVL tracking
   - User statistics

---

## 🤔 FAQs

**Q: Can I mint more than 400M VDEX for farming?**
A: No, the farming allocation is hard-capped at 400M VDEX to maintain tokenomics.

**Q: What happens if I initialize twice?**
A: The second call will fail with error `u404`. Initialization is one-time only.

**Q: Can burned tokens be recovered?**
A: No, burning permanently reduces total supply. Use with caution.

**Q: Who can mint VDEX?**
A: Only authorized minters (set by owner). Typically the LP staking contract.

**Q: How are farming rewards distributed?**
A: The LP staking contract mints VDEX on-demand when users claim rewards.

**Q: What's the emission rate?**
A: Configurable, but planned at ~100 VDEX per block (~52M VDEX/year).

---

## 📞 Support

- **Documentation:** [contracts/tokens/README.md](contracts/tokens/README.md)
- **Tests:** [tests/vdex-token_test.clar](tests/vdex-token_test.clar)
- **Phase 1 Plan:** [PHASE1_PLAN.md](PHASE1_PLAN.md)

---

**Status:** ✅ Complete and Ready for Testing
**Next:** sBTC Pool Contract
**Version:** 1.0.0
