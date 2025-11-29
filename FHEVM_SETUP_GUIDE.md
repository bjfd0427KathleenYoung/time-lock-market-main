# FHEVM 0.9 Time Marketplace - Setup Guide

> **Based on**: Zama FHEVM 0.9.1 + Relayer SDK 0.3.0-5
> **Date**: 2025-11-19
> **Network**: Sepolia Testnet

## ð Overview

This project implements a **Time Marketplace** with **Fully Homomorphic Encryption (FHE)** using Zama's FHEVM 0.9. Sensitive data (price, duration, slots) is encrypted on-chain and can only be decrypted with proper authorization.

## â­ Key Features

- â **End-to-end encryption** for offer pricing
- â **Event-driven decryption** (FHEVM 0.9 pattern)
- â **Multi-value encryption** with shared proof
- â **Vite optimized** for WASM and CommonJS compatibility
- â **Type-safe** TypeScript implementation

---

## ð¦ Installation

### 1. Install Dependencies

```bash
npm install
```

**Critical packages installed:**
- `@zama-fhe/relayer-sdk@^0.3.0-5` - FHEVM 0.9 SDK
- `ethers@^6.13.0` - Web3 interactions

### 2. Environment Variables

Create `.env` file:

```bash
# Contract address (deploy first)
VITE_CONTRACT_ADDRESS=0xYourContractAddress

# Sepolia RPC
VITE_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_SEPOLIA_CHAIN_ID=11155111
```

---

## ð§ª Deploy Contract

### 1. Install Hardhat Dependencies

```bash
cd contracts
npm init -y
npm install --save-dev hardhat @fhevm/solidity@^0.9.1 @fhevm/hardhat-plugin@^0.1.0
```

### 2. Create Hardhat Config

Create `hardhat.config.js`:

```javascript
require("@fhevm/hardhat-plugin");
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "cancun"
    }
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111
    }
  }
};
```

### 3. Deploy Script

Create `scripts/deploy.js`:

```javascript
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const treasury = deployer.address; // Or set a different treasury

  const TimeMarketplace = await ethers.getContractFactory("TimeMarketplaceFHE");
  const contract = await TimeMarketplace.deploy(treasury);

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("TimeMarketplaceFHE deployed to:", address);
  console.log("Treasury set to:", treasury);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### 4. Deploy

```bash
# Set your private key
export PRIVATE_KEY=your_private_key_here

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia
```

**Update** `src/components/CreateOfferFHE.tsx` with your contract address!

---

## ð» Frontend Development

### 1. Start Dev Server

```bash
npm run dev
```

Server runs on: `http://localhost:8080`

### 2. Project Structure

```
src/
âââ lib/
â   âââ fhe.ts                 # â­ FHE SDK initialization
âââ hooks/
â   âââ useFHE.ts              # â­ Encryption/decryption hooks
âââ components/
    âââ CreateOfferFHE.tsx     # â­ Example component
```

---

## ð Code Examples

### Initialize FHE (Once at App Startup)

```typescript
import { initializeFHE } from '@/lib/fhe';

// In your App.tsx or main component
useEffect(() => {
  initializeFHE().then(() => {
    console.log('FHE ready!');
  });
}, []);
```

### Encrypt Data (Frontend)

```typescript
import { useEncrypt } from '@/hooks/useFHE';

function MyComponent() {
  const { encryptBatch } = useEncrypt();

  const handleCreate = async () => {
    const userAddress = await signer.getAddress();

    // â­ Encrypt multiple values with shared proof
    const { handles, proof } = await encryptBatch(
      CONTRACT_ADDRESS,
      userAddress,
      [
        { value: parseEther("0.1"), type: 'uint64' },  // price
        { value: 30, type: 'uint32' },                 // duration
        { value: 5, type: 'uint32' }                   // slots
      ]
    );

    // â­ Call contract with encrypted data
    await contract.createOfferWithFHE(
      "My Offer",
      "Description",
      parseEther("0.1"),  // public display price
      30,                 // public duration
      5,                  // public slots
      handles[0],         // encrypted price
      handles[1],         // encrypted duration
      handles[2],         // encrypted slots
      proof               // shared proof
    );
  };
}
```

### Contract Side (Solidity)

```solidity
function createOfferWithFHE(
    string memory _title,
    string memory _description,
    uint256 _publicPrice,
    uint256 _duration,
    uint256 _slots,
    externalEuint64 _encryptedPrice,
    externalEuint32 _encryptedDuration,
    externalEuint32 _encryptedSlots,
    bytes calldata inputProof
) external {
    // â­ FHEVM 0.9: Import and verify
    euint64 price = FHE.fromExternal(_encryptedPrice, inputProof);
    euint32 duration = FHE.fromExternal(_encryptedDuration, inputProof);
    euint32 slots = FHE.fromExternal(_encryptedSlots, inputProof);

    // â­ Grant permissions
    FHE.allowThis(price);
    FHE.allowThis(duration);
    FHE.allowThis(slots);

    // ... store encrypted values
}
```

---

## ð Decryption Workflow (FHEVM 0.9)

### 1. Request Decryption (Contract)

```solidity
function requestOfferReveal(uint256 _offerId) external {
    Offer storage offer = offers[_offerId];

    // â­ Mark as publicly decryptable
    offer.encryptedPrice = FHE.makePubliclyDecryptable(offer.encryptedPrice);
    offer.encryptedSlots = FHE.makePubliclyDecryptable(offer.encryptedSlots);

    // â­ Emit event with handles
    bytes32 priceHandle = FHE.toBytes32(offer.encryptedPrice);
    bytes32 slotsHandle = FHE.toBytes32(offer.encryptedSlots);

    emit TallyRevealRequested(_offerId, priceHandle, slotsHandle);
}
```

### 2. Listen & Decrypt (Frontend)

```typescript
import { useDecrypt } from '@/hooks/useFHE';

const { decryptMultiple } = useDecrypt();

// Listen for event
const filter = contract.filters.TallyRevealRequested(offerId);
const events = await contract.queryFilter(filter);
const event = events[0];

const { priceHandle, slotsHandle } = event.args;

// â­ Decrypt using Relayer SDK
const { values, cleartexts, decryptionProof } = await decryptMultiple(
  CONTRACT_ADDRESS,
  signer,
  [priceHandle, slotsHandle]
);

console.log('Decrypted price:', values[0]);
console.log('Decrypted slots:', values[1]);
```

### 3. Submit Callback (Frontend)

```typescript
// â­ Submit decrypted values back to contract
await contract.resolveOfferCallback(
  offerId,
  cleartexts,       // ABI-encoded cleartext
  decryptionProof   // Proof from KMS
);
```

### 4. Verify & Use (Contract)

```solidity
function resolveOfferCallback(
    uint256 _offerId,
    bytes memory cleartexts,
    bytes memory decryptionProof
) external {
    Offer storage offer = offers[_offerId];

    bytes32[] memory handlesList = new bytes32[](2);
    handlesList[0] = FHE.toBytes32(offer.encryptedPrice);
    handlesList[1] = FHE.toBytes32(offer.encryptedSlots);

    // â­ Verify proof
    require(
        FHE.verifySignatures(handlesList, cleartexts, decryptionProof),
        "Invalid proof"
    );

    // â­ Decode and use
    (uint64 price, uint32 slots) = abi.decode(cleartexts, (uint64, uint32));

    offer.publicPrice = price;
    offer.slots = slots;
}
```

---

## â ï¸ Common Errors & Solutions

### Error 1: "Cannot read properties of undefined (reading 'initSDK')"

**Cause**: Using wrong import path

**Solution**:
```typescript
// â Wrong
import { createInstance } from '@zama-fhe/relayer-sdk';

// â Correct for Vite
import { createInstance } from '@zama-fhe/relayer-sdk/web';
```

### Error 2: "The requested module does not provide an export named 'default'"

**Cause**: CommonJS/ESM module issue with `keccak`

**Solution**: Already fixed in `vite.config.ts` with custom plugin!

### Error 3: "Invalid proof"

**Cause**: Multiple separate `encrypt()` calls

**Solution**: Use single `encryptBatch()` for shared proof:
```typescript
// â Wrong
const {handles: h1, inputProof: p1} = await encrypt(value1);
const {handles: h2, inputProof: p2} = await encrypt(value2);

// â Correct
const {handles, inputProof} = await encryptBatch([value1, value2]);
```

### Error 4: "FHE library not initialized"

**Cause**: Forgot to call `initSDK()`

**Solution**: Call `initializeFHE()` once at app startup

---

## ð FHEVM 0.9 Key Points

| Feature | FHEVM 0.9 Implementation |
|---------|-------------------------|
| **SDK Version** | `@zama-fhe/relayer-sdk@0.3.0-5` |
| **Import Path** | `/web` for Vite projects |
| **Contract Version** | Solidity 0.8.24 |
| **Decryption** | Event-driven + callback pattern |
| **Proof Sharing** | Single proof for multiple values |
| **Verification** | `FHE.verifySignatures()` |

---

## ð§ Testing Checklist

- [ ] FHE SDK initializes without errors
- [ ] Encryption generates valid handles + proof
- [ ] Contract accepts encrypted parameters
- [ ] ACL permissions granted correctly
- [ ] Events emitted with correct handles
- [ ] Decryption returns expected values
- [ ] Callback verification succeeds

---

## ð Resources

- **Documentation**: See `FHE_COMPLETE_GUIDE_FULL_CN.md`
- **Zama Docs**: https://docs.zama.ai/fhevm
- **SDK Reference**: https://github.com/zama-ai/fhevm-sdk
- **Sepolia Faucet**: https://sepoliafaucet.com

---

## ð License

MIT

---

**Built with FHEVM 0.9.1** ð | **Powered by Zama** â­
