#!/bin/bash

# FHEVM 0.9 Time Marketplace - Quick Start Script
# Run this to get started immediately

echo "========================================"
echo "ð FHEVM 0.9 Time Marketplace"
echo "========================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "ð¦ Installing dependencies..."
    npm install
    echo "â
 Dependencies installed!"
    echo ""
else
    echo "â
 Dependencies already installed"
    echo ""
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "âï¸  Creating .env file..."
    cat > .env << 'EOF'
# FHEVM 0.9 Configuration
VITE_CONTRACT_ADDRESS=0xYourContractAddressHere
VITE_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_SEPOLIA_CHAIN_ID=11155111
EOF
    echo "â
 .env file created"
    echo "   â ï¸  Remember to update VITE_CONTRACT_ADDRESS after deployment!"
    echo ""
fi

echo "ð Documentation Available:"
echo "   1. QUICKSTART.md - 5-minute guide"
echo "   2. FHEVM_SETUP_GUIDE.md - Complete setup"
echo "   3. README_FHEVM.md - Project overview"
echo ""

echo "ð§ª Next Steps:"
echo "   1. Deploy contract: cd contracts && npm install && npx hardhat run deploy.example.js --network sepolia"
echo "   2. Update .env with contract address"
echo "   3. Start dev server: npm run dev"
echo "   4. Open http://localhost:8080"
echo ""

echo "ð Starting development server..."
echo ""

npm run dev
