# VDEX Governance Token

**Contract:** `vdex-token.clar`
**Standard:** SIP-010 Fungible Token
**Purpose:** Governance and farming rewards for Verified DEX

---

## 📊 Token Economics

### Total Supply
- **Maximum:** 1,000,000,000 VDEX (1 billion)
- **Decimals:** 6
- **Smallest Unit:** 0.000001 VDEX (1 micro-VDEX)

### Distribution

| Allocation | Amount | Percentage | Status |
|------------|--------|------------|--------|
| **Farming Rewards** | 400,000,000 | 40% | Minted on-demand via staking contract |
| **Treasury** | 300,000,000 | 30% | Minted at initialization |
| **Team** | 150,000,000 | 15% | Reserved (future vesting contract) |
| **Airdrops** | 100,000,000 | 10% | Reserved (future campaigns) |
| **Initial Liquidity** | 50,000,000 | 5% | Minted to deployer at initialization |

---

## 🔑 Key Features

### 1. SIP-010 Compliance
Full implementation of the Stacks fungible token standard:
- ✅ `transfer` - Transfer tokens between accounts
- ✅ `get-balance` - Check account balance
- ✅ `get-total-supply` - Query circulating supply
- ✅ `get-name` - Returns "Verified DEX Token"
- ✅ `get-symbol` - Returns "VDEX"
- ✅ `get-decimals` - Returns 6
- ✅ `get-token-uri` - Metadata URI

### 2. Controlled Minting
- Only authorized minters can mint new tokens
- Minting capped at 400M (farming allocation)
- Tracks total farming tokens minted
- Prevents exceeding allocation

### 3. Multi-Minter Support
- Primary minter (usually farming contract)
- Additional authorized minters via map
- Owner can authorize/deauthorize minters
- Flexible for future expansion

### 4. Burn Functionality
- Any holder can burn their own tokens
- Reduces total supply permanently
- Useful for deflationary mechanics

### 5. Metadata Support
- Token URI for off-chain metadata
- Owner can update URI
- Links to token logo, description, etc.

---

## 📋 Contract Interface

### Initialization

```clarity
(initialize (treasury-address principal))
```

**One-time setup that:**
- Mints 300M VDEX to treasury
- Mints 50M VDEX to deployer
- Marks contract as initialized
- Can only be called once by owner

**Example:**
```clarity
(contract-call? .vdex-token initialize 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)
```

### SIP-010 Functions

#### Transfer Tokens

```clarity
(transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
```

**Example:**
```clarity
;; Transfer 100 VDEX (100,000,000 micro-VDEX)
(contract-call? .vdex-token transfer u100000000 tx-sender 'ST2... none)
```

#### Get Balance

```clarity
(get-balance (account principal))
```

**Returns:** Balance in micro-VDEX

**Example:**
```clarity
(contract-call? .vdex-token get-balance 'ST1...)
;; Returns: (ok u50000000000000) = 50M VDEX
```

### Minting Functions

#### Mint Farming Rewards

```clarity
(mint (amount uint) (recipient principal))
```

**Requirements:**
- Caller must be authorized minter
- Amount + existing farming-minted <= 400M
- Contract must be initialized

**Example:**
```clarity
;; Mint 1000 VDEX as farming reward
(contract-call? .vdex-token mint u1000000000 'ST2...)
```

#### Set Primary Minter

```clarity
(set-minter (new-minter principal))
```

**Owner only.** Sets the primary minter (usually staking contract).

**Example:**
```clarity
(contract-call? .vdex-token set-minter .lp-staking)
```

#### Authorize Additional Minter

```clarity
(authorize-minter (minter-address principal) (authorized bool))
```

**Owner only.** Add or remove authorized minters.

**Example:**
```clarity
;; Authorize
(contract-call? .vdex-token authorize-minter 'ST3... true)

;; Revoke
(contract-call? .vdex-token authorize-minter 'ST3... false)
```

### Burn Function

```clarity
(burn (amount uint))
```

**Anyone can burn their own tokens.**

**Example:**
```clarity
;; Burn 100 VDEX
(contract-call? .vdex-token burn u100000000)
```

### Read-Only Functions

#### Check Minter Authorization

```clarity
(is-authorized-minter (account principal))
```

**Returns:** `true` if account can mint, `false` otherwise

#### Get Remaining Farm Supply

```clarity
(get-remaining-farm-supply)
```

**Returns:** How many farming tokens can still be minted

**Example:**
```clarity
(contract-call? .vdex-token get-remaining-farm-supply)
;; Returns: u400000000000000 (400M if none minted yet)
```

#### Get Farming Minted

```clarity
(get-farming-minted)
```

**Returns:** Total farming tokens minted so far

#### Get Allocation Info

```clarity
(get-allocation-info)
```

**Returns:** Tuple with all allocations

**Example response:**
```clarity
{
  farming: u400000000000000,
  treasury: u300000000000000,
  team: u150000000000000,
  airdrop: u100000000000000,
  liquidity: u50000000000000,
  total-max: u1000000000000000
}
```

---

## 🔐 Security Features

### 1. Access Control
- **Owner only:**
  - `set-minter`
  - `authorize-minter`
  - `set-token-uri`
- **Authorized minters only:**
  - `mint`
- **Anyone:**
  - `transfer` (own tokens)
  - `burn` (own tokens)

### 2. Initialization Guard
- `initialize` can only be called once
- Prevents re-initialization attacks
- Locks in treasury address

### 3. Farming Cap
- Minting limited to 400M farming allocation
- Tracks farming-minted separately
- Prevents inflation beyond tokenomics

### 4. Transfer Safety
- SIP-010 compliant transfers
- Only token owner can transfer their tokens
- Memo field for transaction notes

---

## 📝 Usage Examples

### For DEX Users

```clarity
;; Check your balance
(contract-call? .vdex-token get-balance tx-sender)

;; Transfer to another user
(contract-call? .vdex-token transfer
  u50000000          ;; 50 VDEX
  tx-sender
  'ST2...
  none)

;; Burn tokens (deflationary)
(contract-call? .vdex-token burn u10000000) ;; Burn 10 VDEX
```

### For Farming Contract

```clarity
;; Mint rewards to farmer
(contract-call? .vdex-token mint
  u5000000           ;; 5 VDEX reward
  farmer-address)

;; Check remaining farming budget
(contract-call? .vdex-token get-remaining-farm-supply)
```

### For Governance

```clarity
;; Authorize new farming pool
(contract-call? .vdex-token authorize-minter
  .new-farming-pool
  true)

;; Update token metadata
(contract-call? .vdex-token set-token-uri
  u"https://verified-dex.io/token/vdex-v2.json")
```

---

## 🧪 Testing

### Run Tests

```bash
clarinet test tests/vdex-token_test.clar
```

### Test Coverage

- ✅ Initialization (single & double)
- ✅ SIP-010 functions (transfer, balance, etc.)
- ✅ Authorized minting
- ✅ Unauthorized minting (should fail)
- ✅ Farming cap enforcement
- ✅ Incremental minting
- ✅ Burn functionality
- ✅ Admin functions
- ✅ Helper read-only functions

---

## 🚀 Deployment

### Step 1: Deploy Contract

```bash
clarinet deploy --testnet
```

### Step 2: Initialize

```clarity
;; Initialize with treasury address
(contract-call? .vdex-token initialize 'ST1TREASURY...)
```

### Step 3: Authorize Farming Contract

```clarity
;; After deploying lp-staking contract
(contract-call? .vdex-token set-minter .lp-staking)
```

### Step 4: Verify

```clarity
;; Check initialization
(contract-call? .vdex-token is-initialized-check)
;; Should return: true

;; Check treasury balance
(contract-call? .vdex-token get-balance 'ST1TREASURY...)
;; Should return: (ok u300000000000000)

;; Check total supply
(contract-call? .vdex-token get-total-supply)
;; Should return: (ok u350000000000000)
```

---

## 📊 Token Utility

### 1. Farming Rewards
- Earn VDEX by staking LP tokens
- Distributed via lp-staking contract
- ~100 VDEX per block emission

### 2. Governance (Future)
- Vote on protocol parameters
- Propose new features
- Treasury management

### 3. Fee Discounts (Future)
- Reduced swap fees for VDEX holders
- VIP tier system
- Rebates on trading volume

### 4. Liquidity Incentives
- Bootstrap new pools with VDEX rewards
- Migration incentives
- Campaign rewards

---

## 🔄 Integration with Other Contracts

### LP Staking Contract
```clarity
;; Staking contract mints rewards
(contract-call? .vdex-token mint reward-amount farmer)
```

### DEX Router (Future)
```clarity
;; Fee rebates for VDEX holders
(let ((user-vdex-balance (unwrap-panic (contract-call? .vdex-token get-balance tx-sender))))
  (if (>= user-vdex-balance u1000000000) ;; 1000 VDEX
    (apply-fee-discount)
    (apply-standard-fee)))
```

### Treasury (Future)
```clarity
;; Governance controlled spending
(contract-call? .vdex-token transfer
  treasury-amount
  treasury-address
  grant-recipient
  none)
```

---

## ⚠️ Important Notes

1. **Irreversible Initialization**
   - Can only initialize once
   - Choose treasury address carefully
   - Cannot change after initialization

2. **Farming Cap is Hard Limit**
   - Maximum 400M VDEX for farming
   - Plan emission schedule accordingly
   - Cannot exceed even with owner privileges

3. **Minter Authorization**
   - Only authorized contracts can mint
   - Review minter contracts carefully
   - Can revoke authorization if needed

4. **Burns are Permanent**
   - Burned tokens reduce total supply
   - Cannot be recovered
   - Use with caution

---

## 📚 References

- [SIP-010 Standard](https://github.com/stacksgov/sips/blob/main/sips/sip-010/sip-010-fungible-token-standard.md)
- [Clarity Language Reference](https://docs.stacks.co/clarity/)
- [Verified DEX Documentation](../../README.md)

---

**Contract Author:** Verified DEX Team
**License:** MIT
**Version:** 1.0.0
**Last Updated:** December 25, 2025
