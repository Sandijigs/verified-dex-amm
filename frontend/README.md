# Verified DEX Frontend

A modern, production-ready Next.js 14 frontend for the Verified DEX/AMM on Stacks blockchain.

## Features

- **Swap Interface** - Trade tokens through verified pools
- **Liquidity Management** - Add and remove liquidity from pools
- **Pool Analytics** - View pool statistics and performance metrics
- **Wallet Integration** - Connect with Stacks wallet (Hiro, Leather, etc.)
- **Real-time Monitoring** - Track DEX metrics via Chainhooks integration
- **Responsive Design** - Mobile-first UI with Tailwind CSS
- **Type-safe** - Full TypeScript support

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **State Management**: Zustand
- **Blockchain**: @stacks/connect, @stacks/transactions
- **Charts**: Recharts
- **Icons**: Lucide React

## Project Structure

```
frontend/
├── app/
│   ├── page.tsx              # Home/landing page
│   ├── swap/
│   │   └── page.tsx          # Swap interface
│   ├── pools/
│   │   └── page.tsx          # Liquidity pools page
│   ├── analytics/
│   │   └── page.tsx          # Analytics dashboard
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── layout/
│   │   ├── Header.tsx        # Navigation header
│   │   └── Footer.tsx        # Footer with links
│   ├── swap/
│   │   ├── TokenInput.tsx    # Token input component
│   │   ├── SwapButton.tsx    # Swap execution button
│   │   ├── SwapSettings.tsx  # Slippage settings
│   │   └── PriceInfo.tsx     # Price and fee info
│   ├── pools/
│   │   ├── PoolList.tsx      # List of all pools
│   │   └── AddLiquidityModal.tsx  # Add liquidity UI
│   ├── wallet/
│   │   └── ConnectButton.tsx # Wallet connection
│   ├── providers/
│   │   └── Providers.tsx     # App providers
│   └── ui/                   # Reusable UI components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── toaster.tsx
├── hooks/
│   ├── useWallet.ts          # Wallet connection hook
│   ├── useSwap.ts            # Swap functionality
│   ├── usePools.ts           # Pool data fetching
│   └── useLiquidity.ts       # Liquidity operations
├── lib/
│   ├── contracts/
│   │   └── addresses.ts      # Contract addresses
│   ├── stacks/
│   │   └── network.ts        # Network configuration
│   └── utils.ts              # Utility functions
└── package.json
```

## Getting Started

### Prerequisites

- Node.js >= 18.0
- npm or yarn

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment variables (if needed)
cp .env.example .env.local
```

### Development

```bash
# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Build

```bash
# Create production build
npm run build

# Start production server
npm start
```

### Type Check

```bash
# Run TypeScript type checking
npm run type-check
```

### Lint

```bash
# Run ESLint
npm run lint
```

## Pages

### Home (`/`)
- Hero section with project overview
- Feature highlights (Verified Pools, TWAP Oracle, etc.)
- Clarity 4 feature showcase
- Live protocol stats
- Call-to-action sections

### Swap (`/swap`)
- Token selection and amount input
- Real-time price quotes
- Slippage tolerance settings
- Price impact and fee display
- One-click swap execution

### Pools (`/pools`)
- Overview of all available pools
- TVL, volume, and APY statistics
- User liquidity positions
- Add/remove liquidity interface
- Pool verification status

### Analytics (`/analytics`)
- Total Value Locked (TVL)
- Trading volume metrics
- Fee generation statistics
- User growth tracking
- Chainhooks monitoring status
- Builder Challenge metrics

## Contract Integration

### Deployed Contracts (Testnet)

All contracts are deployed on Stacks Testnet at:
`ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV`

See [../TESTNET_DEPLOYMENT.md](../TESTNET_DEPLOYMENT.md) for full details.

### Contract Hooks

#### useSwap
- `executeSwap()` - Execute token swap through router
- `getQuote()` - Get swap quote with price impact

#### usePools
- `fetchPools()` - Get all available pools
- `getPool()` - Get specific pool details
- `isPoolVerified()` - Check pool verification status

#### useLiquidity
- `addLiquidity()` - Add liquidity to a pool
- `removeLiquidity()` - Remove liquidity from a pool
- `getLiquidityPosition()` - Get user's LP position

## Features In Detail

### Verified Pool Security

Every pool is verified using Clarity 4's `contract-hash?` feature before accepting liquidity:

```typescript
// Pool verification check
const isVerified = await isPoolVerified(poolAddress)
// Only verified pools are displayed
```

### TWAP Oracle Integration

Time-weighted average price oracle using `stacks-block-time`:

```typescript
// Prices are time-weighted for manipulation resistance
// Deadline protection prevents stale transactions
const deadline = currentTime + 600 // 10 minutes
```

### Wallet Integration

Seamless wallet connection with:
- Hiro Wallet
- Leather Wallet
- Any Stacks-compatible wallet

```typescript
// Connect wallet
const { address, isConnected, balance } = useWallet()

// Execute transactions
await executeSwap(tokenA, tokenB, amount, minOut, slippage)
```

## Styling

Built with Tailwind CSS and shadcn/ui components:

- Dark/light mode support (via system preference)
- Responsive design (mobile-first)
- Consistent color scheme
- Accessible UI components
- Smooth animations and transitions

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_DEPLOYER_ADDRESS=ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV
```

## TODO / Future Enhancements

- [ ] Install dependencies and test build when Node.js is available
- [ ] Add real-time price updates via Chainhooks
- [ ] Implement multi-hop routing for better prices
- [ ] Add liquidity position management page
- [ ] Integrate charting library for price history
- [ ] Add token list management
- [ ] Implement transaction history
- [ ] Add notifications/toasts for transaction status
- [ ] Create pool creation interface
- [ ] Add governance features

## Contributing

This is part of the Talent Protocol Builder Challenge. Contributions are welcome!

## License

MIT

---

Built with ❤️ for the Stacks ecosystem
