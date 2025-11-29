# ð§ FHEVM 0.9 Troubleshooting Guide

> Quick fixes for common issues

---

## ð§ª Quick Diagnostics

### Run in Browser Console
```javascript
// Check if FHE SDK loaded
window.fheTests.runAllTests();
```

---

## â ï¸ Common Errors & Solutions

### 1. "Cannot read properties of undefined (reading 'initSDK')"

**Error Message**:
```
TypeError: Cannot read properties of undefined (reading 'initSDK')
```

**Cause**: Wrong import path in Vite project

**Solution**:
```typescript
// â WRONG
import { initSDK } from '@zama-fhe/relayer-sdk';

// â CORRECT
import { initSDK } from '@zama-fhe/relayer-sdk/web';
```

**Files to Check**:
- `src/lib/fhe.ts`
- `src/hooks/useFHE.ts`

---

### 2. "The requested module does not provide an export named 'default'"

**Error Message**:
```
Uncaught SyntaxError: The requested module '/node_modules/keccak/js.js'
does not provide an export named 'default'
```

**Cause**: CommonJS module compatibility issue

**Solution**: Already fixed in `vite.config.ts`!

**Verify Fix**:
```typescript
// Check vite.config.ts has fixCommonJSImports plugin
const fixCommonJSImports = () => ({
  name: 'fix-commonjs-imports',
  // ...
});
```

**If still broken**:
```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Reinstall
npm install

# Restart dev server
npm run dev
```

---

### 3. "Invalid proof"

**Error Message**:
```
Error: Invalid proof
```

**Cause**: Using separate `encrypt()` calls for multiple values

**Wrong Code**:
```typescript
const {handles: h1, inputProof: p1} = await encryptValue(..., value1);
const {handles: h2, inputProof: p2} = await encryptValue(..., value2);
await contract.create(h1[0], h2[0], p1); // p1 can't verify h2!
```

**Correct Code**:
```typescript
const {handles, inputProof} = await encryptBatch(
  contractAddress,
  userAddress,
  [
    { value: value1, type: 'uint64' },
    { value: value2, type: 'uint32' }
  ]
);
await contract.create(handles[0], handles[1], inputProof); // Works!
```

---

### 4. "FHE library not initialized"

**Error Message**:
```
Error: FHE library not initialized
```

**Cause**: `initSDK()` not called before `createInstance()`

**Solution**:
```typescript
// Ensure this order
await initSDK();           // Step 1: Load WASM
const fhe = await createInstance(config);  // Step 2: Create instance
```

**Best Practice**: Call `initializeFHE()` once at app startup:
```typescript
// In App.tsx or main component
useEffect(() => {
  initializeFHE();
}, []);
```

---

### 5. "Network mismatch"

**Error Message**:
```
Error: Network mismatch. Expected 11155111, got 1
```

**Cause**: MetaMask on wrong network

**Solution**:
```javascript
// Switch to Sepolia
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0xaa36a7' }], // Sepolia = 11155111 = 0xaa36a7
});
```

---

### 6. "Contract not deployed at address"

**Error Message**:
```
Error: Contract not deployed at address 0x...
```

**Cause**: Contract address not set or wrong address

**Solutions**:

**A. Deploy Contract**:
```bash
cd contracts
npm install
npx hardhat run deploy.example.js --network sepolia
```

**B. Update Address**:
```typescript
// In src/components/CreateOfferFHE.tsx
const CONTRACT_ADDRESS = "0xYourActualAddress";
```

**C. Verify on Etherscan**:
https://sepolia.etherscan.io/address/0xYourAddress

---

### 7. "Transaction Failed"

**Error Message**:
```
Error: transaction failed (execution reverted)
```

**Common Causes & Fixes**:

**A. Insufficient Gas**:
```typescript
// Add gas limit
const tx = await contract.createOfferWithFHE(..., {
  gasLimit: 500000
});
```

**B. Wrong Parameter Types**:
```solidity
// Check contract expects externalEuintXX
function create(
    externalEuint64 price,  // â Must match frontend encryption
    bytes calldata proof
) external
```

**C. ACL Permission Error**:
```solidity
// Ensure allowThis() is called
euint64 value = FHE.fromExternal(encrypted, proof);
FHE.allowThis(value);  // â MUST call this
```

---

### 8. "MetaMask: User rejected transaction"

**Error Message**:
```
Error: MetaMask Tx Signature: User denied transaction signature.
```

**Cause**: User clicked "Reject" in MetaMask

**Solution**: This is normal - user just needs to try again and click "Confirm"

---

### 9. "Insufficient funds for gas"

**Error Message**:
```
Error: insufficient funds for gas * price + value
```

**Cause**: Not enough ETH in wallet

**Solution**:
1. Get Sepolia ETH from faucet: https://sepoliafaucet.com
2. Wait for faucet transaction to confirm
3. Try again

**Check Balance**:
```javascript
const balance = await provider.getBalance(userAddress);
console.log(ethers.formatEther(balance), "ETH");
```

---

### 10. "Cannot find module '@/lib/fhe'"

**Error Message**:
```
Error: Cannot find module '@/lib/fhe'
```

**Cause**: TypeScript path alias not working

**Solutions**:

**A. Check tsconfig.json**:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**B. Check vite.config.ts**:
```typescript
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
}
```

**C. Restart Dev Server**:
```bash
npm run dev
```

---

## ð§° Developer Tools

### Check FHE Initialization

```javascript
// In browser console
import { isFHEReady } from '@/lib/fhe';
console.log('FHE Ready:', isFHEReady());
```

### Test Encryption

```javascript
// In browser console
const test = await window.fheTests.testEncryption();
console.log('Encryption test:', test ? 'PASS' : 'FAIL');
```

### Check Contract

```javascript
// In browser console
const provider = new ethers.BrowserProvider(window.ethereum);
const code = await provider.getCode(CONTRACT_ADDRESS);
console.log('Contract deployed:', code !== '0x');
```

---

## ð Clear Cache & Restart

If all else fails:

```bash
# 1. Clear Vite cache
rm -rf node_modules/.vite

# 2. Clear browser cache
# Chrome: DevTools > Application > Clear storage

# 3. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 4. Restart dev server
npm run dev
```

---

## ð¬ Still Stuck?

### Check These Files

1. **vite.config.ts** - Should have `fixCommonJSImports` plugin
2. **package.json** - Should have `@zama-fhe/relayer-sdk@^0.3.0-5`
3. **src/lib/fhe.ts** - Should import from `/web`
4. **Browser console** - Check for error messages

### Useful Console Commands

```javascript
// Check SDK version
console.log(window.fheTests);

// Check MetaMask
console.log(window.ethereum);

// Check network
const provider = new ethers.BrowserProvider(window.ethereum);
const network = await provider.getNetwork();
console.log('Network:', network.chainId);
```

### Get Help

- **Zama Discord**: https://discord.zama.ai
- **GitHub Issues**: Create an issue with error logs
- **Documentation**: Re-read FHEVM_SETUP_GUIDE.md

---

## â Checklist Before Asking for Help

- [ ] Cleared Vite cache (`rm -rf node_modules/.vite`)
- [ ] Reinstalled dependencies (`npm install`)
- [ ] Checked import paths use `/web`
- [ ] Verified contract is deployed
- [ ] Confirmed on Sepolia network
- [ ] Checked browser console for errors
- [ ] Ran `window.fheTests.runAllTests()`
- [ ] Read QUICKSTART.md
- [ ] Read FHEVM_SETUP_GUIDE.md

---

## ð Most Common Mistake

**95% of issues are caused by**:

```typescript
// â THIS WRONG IMPORT
import { createInstance } from '@zama-fhe/relayer-sdk';

// â USE THIS INSTEAD
import { createInstance } from '@zama-fhe/relayer-sdk/web';
```

**Check all imports in**:
- `src/lib/fhe.ts`
- `src/hooks/useFHE.ts`

---

**Last Updated**: 2025-11-19
**FHEVM Version**: 0.9.1
