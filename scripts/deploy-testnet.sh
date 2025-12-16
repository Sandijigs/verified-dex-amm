#!/bin/bash

# Verified DEX/AMM - Testnet Deployment Script
# This script automates the testnet deployment process

set -e  # Exit on error

echo "=================================================="
echo "  Verified DEX/AMM - Testnet Deployment"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create .env file with your configuration."
    exit 1
fi

# Source environment variables
source .env

# Check if network is testnet
if [ "$NETWORK" != "testnet" ]; then
    echo -e "${YELLOW}Warning: NETWORK in .env is not set to 'testnet'${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if mnemonic is set
if [ -z "$MNEMONIC" ]; then
    echo -e "${RED}Error: MNEMONIC not set in .env${NC}"
    echo "Please add your 24-word recovery phrase to .env"
    exit 1
fi

echo -e "${GREEN}✓ Environment configured${NC}"
echo "  Network: $NETWORK"
echo "  Deployer: $DEPLOYER_ADDRESS"
echo ""

# Step 1: Verify contracts compile
echo "Step 1: Verifying contracts compile..."
if clarinet check > /dev/null 2>&1; then
    CONTRACTS=$(clarinet check 2>&1 | grep "contracts checked" | awk '{print $2}')
    echo -e "${GREEN}✓ All $CONTRACTS contracts compile successfully${NC}"
else
    echo -e "${RED}✗ Contract compilation failed${NC}"
    echo "Run 'clarinet check' to see errors"
    exit 1
fi
echo ""

# Step 2: Check deployment plan exists
echo "Step 2: Checking deployment plan..."
if [ ! -f deployments/default.testnet.yaml ]; then
    echo -e "${RED}Error: Deployment plan not found!${NC}"
    echo "Expected: deployments/default.testnet.yaml"
    exit 1
fi
echo -e "${GREEN}✓ Deployment plan found${NC}"
echo ""

# Step 3: Confirm deployment
echo "=================================================="
echo "  DEPLOYMENT CONFIRMATION"
echo "=================================================="
echo ""
echo "This will deploy the following contracts to TESTNET:"
echo "  1. sip-010-trait"
echo "  2. pool-trait"
echo "  3. math-lib"
echo "  4. pool-registry"
echo "  5. pool-template"
echo "  6. pool-factory"
echo "  7. router"
echo "  8. twap-oracle"
echo "  9. test-token"
echo ""
echo -e "${YELLOW}Note: This requires testnet STX for transaction fees${NC}"
echo ""
read -p "Do you want to proceed with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi
echo ""

# Step 4: Deploy contracts
echo "Step 4: Deploying contracts to testnet..."
echo "This may take several minutes..."
echo ""

if clarinet deployments apply -p deployments/default.testnet.yaml; then
    echo ""
    echo -e "${GREEN}✓ Deployment successful!${NC}"
else
    echo ""
    echo -e "${RED}✗ Deployment failed${NC}"
    echo "Check the output above for errors"
    exit 1
fi
echo ""

# Step 5: Next steps
echo "=================================================="
echo "  DEPLOYMENT COMPLETE!"
echo "=================================================="
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo "1. Verify contracts on Stacks Explorer:"
echo "   https://explorer.hiro.so/address/$DEPLOYER_ADDRESS?chain=testnet"
echo ""
echo "2. Initialize contracts (see DEPLOYMENT.md):"
echo "   - Initialize router with registry and factory"
echo "   - Add pool template to registry"
echo "   - Create test pool"
echo "   - Authorize pool in TWAP oracle"
echo "   - Mint test tokens"
echo ""
echo "3. Test the deployment:"
echo "   - Add liquidity"
echo "   - Execute swaps"
echo "   - Verify TWAP updates"
echo ""
echo "4. Document deployed addresses:"
echo "   - Update DEPLOYED_ADDRESSES.testnet.md"
echo "   - Add transaction IDs from explorer"
echo ""
echo "See DEPLOYMENT.md for detailed instructions"
echo ""
echo -e "${GREEN}Happy testing! 🚀${NC}"
echo ""