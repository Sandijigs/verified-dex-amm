# Verified DEX - Quick Start Guide

Get your Verified DEX frontend up and running in 5 minutes!

## ⚡ Prerequisites

1. **Node.js** >= 18.0
   - Check: `node --version`
   - Install: https://nodejs.org/

2. **Stacks Wallet** (for testing)
   - Hiro Wallet: https://wallet.hiro.so/
   - Leather Wallet: https://leather.io/

3. **Testnet STX** (free)
   - Faucet: https://explorer.hiro.so/sandbox/faucet?chain=testnet

## 🚀 Installation (2 minutes)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# This will install:
# - Next.js 14
# - React 18
# - Stacks libraries
# - UI components
# - ~200MB total
```

## 🏃 Run Development Server (30 seconds)

```bash
# Start the dev server
npm run dev

# You should see:
# ✓ Ready in 2.5s
# ○ Local: http://localhost:3000
```

## 🌐 Open the App

Open your browser to:
**http://localhost:3000**

You'll see:
- ✅ Beautiful landing page
- ✅ Navigation header
- ✅ Feature showcase
- ✅ Clarity 4 examples

## 🔗 Connect Your Wallet

1. Click **"Connect Wallet"** in the header
2. Choose your wallet (Hiro or Leather)
3. Approve the connection
4. Your address will appear in the header

## 💱 Test a Swap

1. Go to **Swap** page (or click "Start Trading")
2. Select tokens:
   - From: STX
   - To: TEST
3. Enter amount (e.g., 10 STX)
4. Review price and fees
5. Click **"Swap"** button
6. Approve transaction in wallet
7. Wait for confirmation (~2 minutes)

## 🏊 Add Liquidity

1. Go to **Pools** page
2. Click **"Add Liquidity"**
3. Enter amounts for both tokens
4. Review pool share
5. Click **"Add Liquidity"**
6. Approve transaction
7. You're now a liquidity provider!

## 📊 View Analytics

1. Go to **Analytics** page
2. See live metrics:
   - Total Value Locked
   - Trading volume
   - Fees generated
   - User count
   - Chainhooks status

## 🛠️ Other Commands

```bash
# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Lint code
npm run lint
```

## 🐛 Troubleshooting

### "Cannot find module"
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### "Port 3000 already in use"
```bash
# Use a different port
PORT=3001 npm run dev
```

### Wallet won't connect
- Ensure you're on testnet in wallet settings
- Try refreshing the page
- Check browser console for errors

### Transactions failing
- Ensure you have testnet STX
- Check slippage tolerance (try 1-2%)
- Verify wallet is connected to testnet

## 📱 Mobile Testing

The app is fully responsive! Test on mobile:

```bash
# Find your local IP
ipconfig getifaddr en0  # Mac
# or
hostname -I  # Linux

# Access from mobile on same network
http://YOUR_IP:3000
```

## 🧪 Run Tests

```bash
# Backend integration tests (from project root)
cd ../tests/onchain
npm test

# Frontend type checking
cd ../../frontend
npm run type-check
```

## 📚 Learn More

- **Frontend README**: [frontend/README.md](frontend/README.md)
- **Project Status**: [PROJECT_STATUS.md](PROJECT_STATUS.md)
- **Deployment Guide**: [TESTNET_DEPLOYMENT.md](TESTNET_DEPLOYMENT.md)
- **Chainhooks**: [chainhooks/README.md](chainhooks/README.md)

## 🎯 Next Steps

After getting familiar with the UI:

1. **Customize**
   - Update colors in `tailwind.config.ts`
   - Modify components in `components/`
   - Add your own features

2. **Deploy**
   - Build: `npm run build`
   - Deploy to Vercel: `vercel deploy`
   - Or Netlify, AWS, etc.

3. **Integrate Real Data**
   - Connect to Chainhooks for live metrics
   - Implement real pool queries
   - Add transaction history

4. **Expand Features**
   - Add more token pairs
   - Create governance interface
   - Implement staking

## 💡 Pro Tips

1. **Use the Analytics Page** to monitor Chainhooks activity
2. **Check the Footer** for quick links to contracts
3. **Open DevTools** to see transaction logs
4. **Try Different Wallets** to test compatibility
5. **Test on Mobile** for responsive design

## 🎨 Customization

### Change Theme Colors

Edit `frontend/app/globals.css`:

```css
:root {
  --primary: YOUR_COLOR;
  --secondary: YOUR_COLOR;
}
```

### Update Contract Addresses

Edit `frontend/lib/contracts/addresses.ts`:

```typescript
export const DEPLOYER_ADDRESS = 'YOUR_ADDRESS'
```

## 🚢 Production Deployment

```bash
# Build
npm run build

# Deploy to Vercel
npm i -g vercel
vercel deploy --prod

# Or deploy to Netlify, Cloudflare Pages, etc.
```

## ❓ Need Help?

- **Documentation**: Check all the README files
- **Code Examples**: Look in the hooks/ directory
- **Stacks Docs**: https://docs.stacks.co
- **Discord**: Join Stacks Discord for support

## ✅ Success Checklist

- [ ] Node.js installed
- [ ] Dependencies installed (`npm install`)
- [ ] Dev server running (`npm run dev`)
- [ ] App opens in browser
- [ ] Wallet connected
- [ ] Test swap executed
- [ ] Liquidity added
- [ ] Analytics page viewed

Once all checked, you're good to go! 🎉

---

**Time to Complete**: ~5 minutes
**Difficulty**: Easy
**Result**: Fully functional DEX frontend

Happy trading! 🚀
