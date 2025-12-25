# Phase 1: sBTC Integration + Yield Farming
## Implementation Plan

**Timeline:** Weeks 1-2
**Status:** 🚧 In Progress

---

## 📋 Prerequisites (Completed)

- ✅ Week 1: Verified DEX smart contracts
- ✅ Week 2: Chainhook analytics backend
- ✅ Week 3: WalletConnect-enabled frontend
- ✅ WalletConnect Project ID: `973aec75d9c96397c8ccd94d62bada81`

---

## 🎯 Phase 1 Deliverables

| Component | Description | Status |
|-----------|-------------|--------|
| VDEX Token | SIP-010 governance token with farming allocation | 🔄 Planning |
| sBTC Pool | Specialized STX/sBTC trading pool | 🔄 Planning |
| LP Staking | Stake LP tokens to earn VDEX rewards | 🔄 Planning |
| Farm UI | Dashboard for staking and rewards | 🔄 Planning |
| Analytics | APR calculations and tracking | 🔄 Planning |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 1 ADDITIONS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SMART CONTRACTS (Clarity)                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ VDEX Token  │  │  sBTC Pool  │  │ LP Staking  │         │
│  │  (SIP-010)  │  │  STX/sBTC   │  │   Contract  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                   │
│  FRONTEND (Next.js)      │                                   │
│  ┌─────────────┐  ┌──────┴──────┐  ┌─────────────┐         │
│  │  Farm Page  │  │  sBTC Swap  │  │  Analytics  │         │
│  │   + Cards   │  │   Widget    │  │  Dashboard  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  BACKEND (Node.js)                                          │
│  ┌─────────────┐  ┌─────────────┐                          │
│  │   Farming   │  │     APR     │                          │
│  │     API     │  │  Calculator │                          │
│  └─────────────┘  └─────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📄 Smart Contracts

### 1. VDEX Governance Token (`vdex-token.clar`)

**Location:** `contracts/tokens/vdex-token.clar`

**Features:**
- SIP-010 fungible token standard
- 1 billion max supply (6 decimals)
- Token distribution:
  - 40% (400M) - Farming rewards
  - 30% (300M) - Treasury
  - 15% (150M) - Team (vested)
  - 10% (100M) - Airdrops/incentives
  - 5% (50M) - Initial liquidity
- Authorized minter system for farming
- Burn functionality
- URI metadata support

**Key Functions:**
- `initialize(treasury-address)` - One-time setup
- `mint(amount, recipient)` - Mint farming rewards
- `transfer(amount, sender, recipient)` - SIP-010 transfer
- `burn(amount)` - Burn tokens
- `set-minter(new-minter)` - Update minter contract

### 2. sBTC Trading Pool (`sbtc-pool.clar`)

**Location:** `contracts/core/sbtc-pool.clar`

**Features:**
- Specialized AMM for STX/sBTC pairs
- Constant product formula (x*y=k)
- 0.3% swap fee (configurable)
- 0.05% protocol fee
- TWAP oracle integration
- LP token management
- Slippage protection
- Deadline enforcement

**Key Functions:**
- `initialize(initial-stx, initial-sbtc)` - Create pool
- `add-liquidity(stx-amount, sbtc-amount, min-lp)` - Add liquidity
- `remove-liquidity(lp-tokens, min-stx, min-sbtc)` - Remove liquidity
- `swap-stx-for-sbtc(stx-in, min-sbtc-out, deadline)` - Swap STX→sBTC
- `swap-sbtc-for-stx(sbtc-in, min-stx-out, deadline)` - Swap sBTC→STX
- `get-price-stx-per-sbtc()` - Current price
- `get-amount-out(amount-in, is-stx-in)` - Quote swap

### 3. LP Staking Contract (`lp-staking.clar`)

**Location:** `contracts/farming/lp-staking.clar`

**Features:**
- Multi-pool staking support
- Proportional reward distribution
- Allocation points per pool
- Accumulated rewards per share
- Pending rewards tracking
- 100 VDEX per block (configurable)
- APR calculation helpers

**Key Functions:**
- `add-pool(lp-token, allocation-points)` - Add farming pool
- `stake(lp-token, amount)` - Stake LP tokens
- `unstake(lp-token, amount)` - Unstake and claim
- `claim-rewards(lp-token)` - Claim without unstaking
- `get-pending-rewards(user, lp-token)` - View pending
- `get-pool-apr(lp-token)` - Calculate APR

---

## 🖥️ Frontend Components

### Farm Page (`/farm`)

**Location:** `frontend/app/farm/page.tsx`

**Features:**
- Global farming stats (TVL, VDEX price, total rewards)
- Pool list with APR display
- User position summary
- Connect wallet prompt

**Components:**
- `FarmPoolCard` - Individual pool with stake/unstake UI
- `FarmStats` - User's overall farming statistics
- `sBTCSwapWidget` - Quick swap interface

### Farm Pool Card Component

**Location:** `frontend/components/farm/FarmPoolCard.tsx`

**Features:**
- Pool info (tokens, APR, TVL)
- User position (staked amount, pending rewards)
- Stake/unstake tabs
- Claim rewards button
- Real-time APR updates
- Expandable details

### sBTC Swap Widget

**Location:** `frontend/components/sbtc/sBTCSwapWidget.tsx`

**Features:**
- Swap STX ↔ sBTC
- Price display
- Slippage settings
- Transaction status
- Integrated with WalletConnect

---

## 🔌 Backend API

### Farming API Endpoints

**Base URL:** `http://localhost:3001/api/farming`

**Endpoints:**

1. `GET /pools` - List all farming pools
```json
{
  "pools": [
    {
      "lpToken": "ST...pool-contract",
      "name": "STX/sBTC LP",
      "tokenA": "STX",
      "tokenB": "sBTC",
      "totalStaked": "1000000000",
      "apr": 125.5,
      "tvl": 50000,
      "allocationPoints": 100
    }
  ],
  "totalTVL": 50000,
  "vdexPrice": 0.05
}
```

2. `GET /pools/:lpToken/user/:address` - User pool data
```json
{
  "userStaked": "500000000",
  "pendingRewards": "1234567890",
  "stakeBlock": 12345
}
```

3. `GET /apr/:lpToken` - Real-time APR calculation
```json
{
  "apr": 125.5,
  "dailyRewards": 10.5,
  "yearlyRewards": 3832.5
}
```

4. `GET /stats` - Global farming statistics
```json
{
  "totalVDEXDistributed": "50000000000",
  "totalValueLocked": 150000,
  "activeStakers": 42,
  "vdexPerBlock": "100000000"
}
```

---

## 📊 Token Economics

### VDEX Distribution

| Allocation | Amount | Percentage | Purpose |
|------------|--------|------------|---------|
| Farming Rewards | 400M | 40% | LP staking rewards over time |
| Treasury | 300M | 30% | Protocol development & governance |
| Team | 150M | 15% | Team allocation (vested) |
| Airdrops | 100M | 10% | User incentives & growth |
| Initial Liquidity | 50M | 5% | Bootstrap DEX liquidity |
| **TOTAL** | **1B** | **100%** | Max supply |

### Reward Schedule

- **Initial Rate:** 100 VDEX per block (~10 min blocks)
- **Blocks per Year:** ~52,560
- **Annual Emission:** ~5.26M VDEX/year
- **Emission Duration:** ~76 years (if constant rate)

### Pool Allocation Points

| Pool | Allocation Points | % of Rewards |
|------|------------------|--------------|
| STX/sBTC | 100 | 50% |
| STX/TEST | 50 | 25% |
| Future Pools | 50 | 25% |

---

## 🧪 Testing Strategy

### Smart Contract Tests

1. **VDEX Token Tests**
   - Initialization and minting
   - Transfer functionality
   - Minter authorization
   - Burn mechanism
   - Supply cap enforcement

2. **sBTC Pool Tests**
   - Pool initialization
   - Add/remove liquidity
   - Swap execution
   - TWAP updates
   - Fee distribution
   - K invariant validation

3. **LP Staking Tests**
   - Pool creation
   - Stake/unstake flow
   - Reward calculation
   - Multi-pool scenarios
   - APR accuracy

### Frontend Tests

1. **Farm Page**
   - Pool list rendering
   - Wallet connection flow
   - Stake/unstake forms
   - Claim rewards button

2. **Integration Tests**
   - End-to-end stake flow
   - Reward accrual over blocks
   - Multiple pool interactions

---

## 📦 Deployment Plan

### Phase 1A: Contracts (Week 1)

1. Deploy VDEX token
2. Initialize with treasury address
3. Deploy sBTC pool
4. Initialize with initial liquidity
5. Deploy LP staking contract
6. Authorize staking contract as VDEX minter
7. Add sBTC pool to farming

### Phase 1B: Frontend (Week 1-2)

1. Build farm page
2. Implement pool cards
3. Add sBTC swap widget
4. Integrate with WalletConnect
5. Test on testnet

### Phase 1C: Backend (Week 2)

1. Create farming API
2. APR calculation service
3. Price feed integration
4. Real-time stats updates

---

## 🔐 Security Considerations

1. **VDEX Token**
   - Only authorized minters can mint
   - Minting capped at farming allocation
   - Owner-only admin functions

2. **sBTC Pool**
   - K invariant validation on swaps
   - Slippage protection
   - Deadline enforcement
   - Minimum liquidity lock

3. **LP Staking**
   - Accurate reward calculations
   - No reward duplication
   - Safe math operations
   - Pool authorization checks

---

## 📈 Success Metrics

| Metric | Target | Tracking |
|--------|--------|----------|
| Total Value Locked | $100k+ | API endpoint |
| Active Stakers | 50+ users | Chainhooks events |
| sBTC Trading Volume | $50k+ | Pool events |
| VDEX Price Stability | >$0.03 | Price oracle |
| Average APR | 80-150% | APR calculator |

---

## 🚀 Next Steps

### Immediate (Now)
1. ✅ Create contract directories
2. 🔄 Write VDEX token contract
3. 🔄 Write sBTC pool contract
4. 🔄 Write LP staking contract

### Week 1
1. Deploy contracts to testnet
2. Build farm UI components
3. Integrate with WalletConnect
4. Create farming API

### Week 2
1. Test end-to-end flows
2. Calculate real APRs
3. Monitor for bugs
4. Prepare mainnet deployment

---

## 📚 Resources

- [SIP-010 Token Standard](https://github.com/stacksgov/sips/blob/main/sips/sip-010/sip-010-fungible-token-standard.md)
- [sBTC Documentation](https://docs.stacks.co/sbtc)
- [Uniswap V2 Whitepaper](https://uniswap.org/whitepaper.pdf) (AMM reference)
- [MasterChef Farming](https://github.com/sushiswap/sushiswap/blob/master/contracts/MasterChef.sol) (Farming reference)

---

**Last Updated:** December 25, 2025
**Phase:** Planning & Implementation
**Est. Completion:** 2 weeks
