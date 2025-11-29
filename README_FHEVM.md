# ð Time Marketplace with FHEVM 0.9

> **Fully Homomorphic Encryption** for Private Time-Based Offers

[![FHEVM](https://img.shields.io/badge/FHEVM-0.9.1-blue)](https://docs.zama.ai/fhevm)
[![Zama](https://img.shields.io/badge/Powered%20by-Zama-green)](https://zama.ai)
[![Sepolia](https://img.shields.io/badge/Network-Sepolia-orange)](https://sepolia.etherscan.io)

---

## â¨ Features

- ð **Encrypted Pricing** - Offer prices hidden on-chain
- ð **Private Duration** - Time periods kept confidential
- ð¢ **Secret Slots** - Availability encrypted
- ð **Event-Driven Decryption** - FHEVM 0.9 callback pattern
- â¡ **Multi-Value Encryption** - Single proof for all data
- ð **Type-Safe** - Full TypeScript support

---

## ð Architecture

```
âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
â                    FRONTEND                          â
â  React + Vite + @zama-fhe/relayer-sdk@0.3.0-5      â
âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
                      â
                      â Encrypt (price, duration, slots)
                      â Single shared proof
                      â
âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
â               SMART CONTRACT                         â
â  Solidity 0.8.24 + @fhevm/solidity@0.9.1            â
â  - FHE.fromExternal() - Import encrypted data       â
â  - FHE.allowThis() - Grant permissions              â
â  - FHE.add/sub/mul - Homomorphic operations         â
âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
                      â
                      â Request decryption
                      â
âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
â                 ZAMA KMS                             â
â  Gateway: https://gateway.sepolia.zama.ai           â
â  - Decrypt with proof                                â
â  - Return cleartext + signature                     â
âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
                      â
                      â Callback with proof
                      â
âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
â            CONTRACT VERIFICATION                     â
â  FHE.verifySignatures() - Verify KMS proof          â
â  Use decrypted values securely                      â
âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
```

---

## ð Quick Start

### 1ï¸â£ Install Dependencies

```bash
npm install
```

**Key packages:**
- `@zama-fhe/relayer-sdk@^0.3.0-5` â­ FHEVM 0.9 SDK
- `ethers@^6.13.0` - Web3 library

### 2ï¸â£ Start Development

```bash
npm run dev
```

Open: http://localhost:8080

### 3ï¸â£ Deploy Contract (Optional)

```bash
cd contracts
npm install
npx hardhat run deploy.example.js --network sepolia
```

**See full guide**: [QUICKSTART.md](./QUICKSTART.md)

---

## ð Example Usage

### Create Encrypted Offer

```typescript
import { useEncrypt } from '@/hooks/useFHE';

function CreateOffer() {
  const { encryptBatch } = useEncrypt();

  const handleCreate = async () => {
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

    // â­ Submit to contract
    await contract.createOfferWithFHE(
      "My Offer",
      "Description",
      parseEther("0.1"),  // public display
      30,                 // public duration
      5,                  // public slots
      handles[0],         // â­ encrypted price
      handles[1],         // â­ encrypted duration
      handles[2],         // â­ encrypted slots
      proof               // â­ shared ZK proof
    );
  };
}
```

### Smart Contract

```solidity
import { FHE, euint64, euint32, externalEuint64, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { EthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract TimeMarketplace is EthereumConfig {
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
        // â­ Import and verify
        euint64 price = FHE.fromExternal(_encryptedPrice, inputProof);
        euint32 duration = FHE.fromExternal(_encryptedDuration, inputProof);
        euint32 slots = FHE.fromExternal(_encryptedSlots, inputProof);

        // â­ Grant permissions
        FHE.allowThis(price);
        FHE.allowThis(duration);
        FHE.allowThis(slots);

        // Store encrypted values
        offers[id] = Offer({
            encryptedPrice: price,
            encryptedDuration: duration,
            encryptedSlots: slots,
            // ...
        });
    }
}
```

---

## ð File Structure

```
.
âââ src/
â   âââ lib/
â   â   âââ fhe.ts                  # â­ FHE SDK initialization
â   âââ hooks/
â   â   âââ useFHE.ts               # â­ Encryption/decryption hooks
â   âââ components/
â   â   âââ CreateOfferFHE.tsx      # â­ Example component
â   âââ types/
â       âââ contract.ts             # TypeScript types
âââ contracts/
â   âââ TimeMarketplaceFHE.sol      # â­ FHEVM 0.9 contract
â   âââ hardhat.config.example.js   # Hardhat configuration
â   âââ deploy.example.js           # Deployment script
âââ vite.config.ts                  # â­ Vite + FHEVM fixes
âââ package.json                    # Dependencies
âââ QUICKSTART.md                   # 5-minute guide
âââ FHEVM_SETUP_GUIDE.md            # Full documentation
âââ FHE_COMPLETE_GUIDE_FULL_CN.md  # Chinese guide (original)
```

---

## ð Key Technologies

| Component | Version | Purpose |
|-----------|---------|---------|
| **FHEVM Solidity** | 0.9.1 | Smart contract FHE operations |
| **Relayer SDK** | 0.3.0-5 | Frontend encryption/decryption |
| **Solidity** | 0.8.24 | Contract language |
| **Ethers.js** | 6.13.0 | Web3 interactions |
| **React** | 18.3.1 | UI framework |
| **Vite** | 5.4.19 | Build tool |
| **TypeScript** | 5.8.3 | Type safety |

---

## â ï¸ Important Notes

### â MUST Use Correct Import Path

```typescript
// â WRONG - Will cause module errors
import { createInstance } from '@zama-fhe/relayer-sdk';

// â CORRECT - Use /web for Vite
import { createInstance } from '@zama-fhe/relayer-sdk/web';
```

### â Shared Proof Pattern

```typescript
// â WRONG - Separate encryptions = different proofs
const {handles: h1, inputProof: p1} = await encrypt(value1);
const {handles: h2, inputProof: p2} = await encrypt(value2);
await contract.create(h1[0], h2[0], p1); // p1 can't verify h2!

// â CORRECT - Single encryption = shared proof
const {handles, inputProof} = await encryptBatch([value1, value2]);
await contract.create(handles[0], handles[1], inputProof); // Works!
```

### â Contract Parameter Types

```solidity
// â WRONG - Use bytes or uint256
function create(bytes memory encryptedPrice, bytes proof) external

// â CORRECT - Use externalEuintXX
function create(externalEuint64 encryptedPrice, bytes calldata proof) external
```

---

## ð Documentation

- **Quick Start**: [QUICKSTART.md](./QUICKSTART.md) - 5 minutes
- **Full Setup**: [FHEVM_SETUP_GUIDE.md](./FHEVM_SETUP_GUIDE.md) - Complete guide
- **Chinese Guide**: [FHE_COMPLETE_GUIDE_FULL_CN.md](./FHE_COMPLETE_GUIDE_FULL_CN.md) - Original reference
- **Zama Docs**: https://docs.zama.ai/fhevm

---

## ð§ª Testing

### Browser Console Tests

```javascript
// Run in browser console after app loads
window.fheTests.runAllTests();
```

### Manual Test Flow

1. â Create encrypted offer
2. â View offer (encrypted data hidden)
3. â Request reveal (owner only)
4. â Decrypt via KMS
5. â Verify callback proof
6. â Use decrypted values

---

## ð License

MIT

---

## ð¤ Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch
3. Follow FHEVM 0.9 patterns
4. Test thoroughly
5. Submit pull request

---

## ð¬ Support

- **Issues**: GitHub Issues
- **Zama Discord**: https://discord.zama.ai
- **Documentation**: See guides above

---

**Built with â¡ FHEVM 0.9** | **Powered by Zama** â­

---

## ð Next Steps

1. â Run `npm install`
2. â Read [QUICKSTART.md](./QUICKSTART.md)
3. â Deploy contract or use testnet
4. â Create your first encrypted offer!

**Happy Encrypting!** ðâ¨
