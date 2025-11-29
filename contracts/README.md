# TimeMarketplaceFHE Hardhat Project

Use this package to compile, test, and deploy the FHE-enabled smart contract.

## 1. Install dependencies

```bash
cd contracts
npm install
```

## 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in:

- `SEPOLIA_RPC_URL`: HTTPS RPC endpoint (default is a public RPC).
- `PRIVATE_KEY`: Deployer wallet private key (without the `0x` prefix).
- `TREASURY_ADDRESS` (optional): Treasury wallet; defaults to the deployer.
- `ETHERSCAN_API_KEY` (optional): Enables contract verification.

## 3. Compile and test

```bash
npx hardhat compile
npx hardhat test
```

## 4. Deploy to Sepolia

```bash
npm run deploy:sepolia
```

The script reports the deployed address and reminders for updating the frontend.

## 5. Verify (optional)

```bash
npm run verify:sepolia -- <deployed_address> <treasury_address>
```
