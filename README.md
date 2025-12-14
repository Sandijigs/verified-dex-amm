# Verified DEX/AMM - Clarity 4 Starter Project

A decentralized exchange (DEX) and automated market maker (AMM) built on Stacks blockchain, showcasing Clarity 4's advanced features for the Talent Protocol Builder Challenge.

## 🚀 Project Overview

This starter project demonstrates a secure DEX implementation where liquidity pools must match verified contract templates before accepting liquidity. This architecture prevents rug pulls and ensures pool integrity using Clarity 4's new security features.

## 📁 Project Structure

```
verified-dex-amm/
├── contracts/          # Smart contracts
│   ├── registry.clar       # Pool verification system
│   ├── dex-core.clar       # Main DEX logic
│   ├── twap-oracle.clar    # Time-weighted pricing
│   ├── standard-pool.clar  # AMM pool template
│   └── math-lib.clar       # Utility functions
├── tests/             # Test files
├── settings/          # Network configurations
├── .vscode/           # VSCode settings
└── Clarinet.toml      # Project configuration
```

## 🛠️ Prerequisites

- [Clarinet](https://github.com/hirosystems/clarinet) >= 2.0
- [Node.js](https://nodejs.org/) >= 18.0

## 🔧 Setup & Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Check contract syntax:**
```bash
clarinet check
```

3. **Run tests:**
```bash
npm test
```

## 💻 Development

### Start Local Devnet
```bash
clarinet devnet start
```

### Deploy Contracts
```bash
clarinet deployments apply -p deployments/default.devnet-plan.yaml
```

### Interactive Console
```bash
clarinet console
```

## 🎯 Clarity 4 Features to Implement

This starter project is designed to showcase these Clarity 4 features:

1. **`contract-hash?`** - Verify pool contracts against approved templates (registry.clar)
2. **`restrict-assets?`** - Protect assets during external contract calls (dex-core.clar)
3. **`stacks-block-time`** - Enable time-weighted average pricing (twap-oracle.clar)
4. **`to-ascii?`** - Generate readable transaction receipts (all contracts)

## 📋 Contract Overview

### registry.clar
- Manages approved contract templates
- Verifies pool contracts using `contract-hash?`
- Maintains whitelist of safe contracts

### dex-core.clar
- Main DEX routing logic
- Implements `restrict-assets?` for asset protection
- Handles swap execution and fee collection

### twap-oracle.clar
- Time-weighted average price oracle
- Uses `stacks-block-time` for accurate timestamps
- Prevents price manipulation

### standard-pool.clar
- Basic constant product (x*y=k) AMM
- Template for verified pools
- LP token management

### math-lib.clar
- Common mathematical functions
- Safe arithmetic operations
- Utility functions for other contracts

## 🧪 Testing

Run all tests:
```bash
npm test
```

Run specific test:
```bash
npm test registry
```

## 📖 Documentation

- [Clarity Documentation](https://docs.stacks.co/clarity/)
- [Clarinet Guide](https://docs.hiro.so/clarinet/)
- [Stacks.js SDK](https://github.com/hirosystems/stacks.js)

## 🤝 Contributing

This is a starter project for the Talent Protocol Builder Challenge. Feel free to build upon it!

## 📄 License

MIT

---

**Built for the Talent Protocol Builder Challenge** 🏆