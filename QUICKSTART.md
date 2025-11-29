# ð FHEVM 0.9 Time Marketplace - Quick Start

> **5 Minutes to Running Demo** â±ï¸

## ð§ Prerequisites

- Node.js 18+
- MetaMask wallet
- Sepolia ETH ([Get from faucet](https://sepoliafaucet.com))

---

## ð¥ Quick Setup

### 1. Install Frontend Dependencies

```bash
npm install
```

This installs:
- â `@zama-fhe/relayer-sdk@0.3.0-5` (FHEVM 0.9 SDK)
- â `ethers@6.13.0` (Web3 library)
- â All React dependencies

### 2. Start Development Server

```bash
npm run dev
```

â¡ **Server running on**: http://localhost:8080

---

## ð Smart Contract Deployment

### Option A: Use Pre-deployed Contract (Fastest)

Skip deployment and use our testnet contract:

```bash
# Update in src/components/CreateOfferFHE.tsx
CONTRACT_ADDRESS = "0xYourPreDeployedContract"
```

### Option B: Deploy Your Own

```bash
# 1. Navigate to contracts directory
cd contracts

# 2. Install Hardhat dependencies
npm install

# 3. Create .env file
cp .env.example .env

# 4. Edit .env with your private key
PRIVATE_KEY=your_sepolia_private_key_here

# 5. Deploy to Sepolia
npx hardhat run deploy.example.js --network sepolia

# 6. Copy the deployed address to frontend
# Update CONTRACT_ADDRESS in src/components/CreateOfferFHE.tsx
```

---

## ð¨ Test the App

### 1. Connect Wallet

- Open http://localhost:8080
- Connect MetaMask
- Switch to Sepolia network

### 2. Create Encrypted Offer

Fill in the form:
- **Title**: "1 Hour Consultation"
- **Description**: "Expert advice on blockchain"
- **Price**: `0.01` ETH
- **Duration**: `30` days
- **Slots**: `5`

Click **"Create Encrypted Offer"**

### 3. What Happens

1. ð **Encryption** (5-10s)
   - Price encrypted: `0.01 ETH` â `handles[0]`
   - Duration encrypted: `30` â `handles[1]`
   - Slots encrypted: `5` â `handles[2]`
   - Single proof generated

2. ð€ **Blockchain Submission**
   - MetaMask pops up
   - Approve transaction
   - Wait for confirmation

3. â **Success!**
   - Offer created on-chain
   - All sensitive data encrypted
   - Only you can decrypt (with proper ACL)

---

## ð§ª Verify Encryption

### Check Browser Console

```
[FHE] Starting initialization...
[FHE] Loading WASM module...
[FHE] WASM module loaded â
[FHE] Creating instance with Sepolia config...
[FHE] Instance created successfully â
[CreateOffer] Starting encryption...
[CreateOffer] Encryption complete â
[CreateOffer] Handles: ["0x1a2b...", "0x3c4d...", "0x5e6f..."]
[CreateOffer] Transaction sent: 0xabcd...
[CreateOffer] Transaction confirmed â
```

### Check Contract State

```javascript
// In browser console
const provider = new ethers.BrowserProvider(window.ethereum);
const contract = new ethers.Contract(
  "0xYourContractAddress",
  ABI,
  provider
);

// Get offer (encrypted values won't be visible!)
const offer = await contract.offers(1);
console.log(offer);
```

You'll see encrypted handles like `0x1a2b3c4d...` instead of actual values!

---

## ð¡ Understanding the Flow

### Frontend â¡ï¸ Contract

```typescript
// 1. User inputs plaintext
price = 0.01 ETH

// 2. Frontend encrypts
const { handles, proof } = await encryptBatch([
  { value: parseEther("0.01"), type: 'uint64' }
]);
// handles[0] = "0x1a2b3c4d..." (256-bit encrypted handle)

// 3. Submit to contract
await contract.createOfferWithFHE(
  ...,
  handles[0],  // externalEuint64
  proof        // bytes (ZK proof)
);
```

### Contract Processing

```solidity
// 4. Contract receives encrypted data
function createOfferWithFHE(
    externalEuint64 _encryptedPrice,
    bytes calldata inputProof
) external {
    // 5. Verify and import
    euint64 price = FHE.fromExternal(_encryptedPrice, inputProof);

    // 6. Grant permissions
    FHE.allowThis(price);

    // 7. Store encrypted (never reveals plaintext!)
    offers[id].encryptedPrice = price;
}
```

---

## â ï¸ Common Issues

### Issue 1: "FHE library not initialized"

**Cause**: Page refreshed during encryption

**Fix**: Refresh page and try again

### Issue 2: "Transaction failed"

**Cause**: Insufficient gas or wrong network

**Fix**:
```bash
# Check you're on Sepolia
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0xaa36a7' }], // Sepolia
});
```

### Issue 3: "Cannot read properties of undefined"

**Cause**: Wrong SDK import path

**Fix**: Already fixed in `vite.config.ts`! Make sure you have:
```typescript
import { createInstance } from '@zama-fhe/relayer-sdk/web';
```

---

## ð Next Steps

1. **Read Full Guide**: See [FHEVM_SETUP_GUIDE.md](./FHEVM_SETUP_GUIDE.md)

2. **Explore Decryption**: Implement the reveal workflow
   - Request reveal in contract
   - Listen to events
   - Decrypt and submit callback

3. **Add Features**:
   - Purchase offers
   - User dashboard
   - Encrypted reviews

4. **Deploy to Production**:
   - Test on mainnet fork
   - Audit contract
   - Deploy to Ethereum mainnet

---

## ð Resources

- **Full Documentation**: [FHE_COMPLETE_GUIDE_FULL_CN.md](./FHE_COMPLETE_GUIDE_FULL_CN.md)
- **Zama Docs**: https://docs.zama.ai/fhevm
- **Sepolia Explorer**: https://sepolia.etherscan.io
- **Get Testnet ETH**: https://sepoliafaucet.com

---

## ð¬ Need Help?

**Check these files**:
- `src/lib/fhe.ts` - SDK initialization
- `src/hooks/useFHE.ts` - Encryption hooks
- `src/components/CreateOfferFHE.tsx` - Example usage
- `contracts/TimeMarketplaceFHE.sol` - Smart contract

**Common fixes**:
1. Clear browser cache
2. Delete `node_modules/.vite`
3. Run `npm install` again
4. Check console for errors

---

**Happy Encrypting! ðâ¨**

Built with FHEVM 0.9 | Powered by Zama
