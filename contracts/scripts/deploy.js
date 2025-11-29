const { ethers } = require("hardhat");

async function main() {
  console.log("========================================");
  console.log(" TimeMarketplaceFHE Deployment (FHEVM 0.9)");
  console.log("========================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  if (balance < ethers.parseEther("0.1")) {
    console.warn("Warning: balance is below 0.1 ETH. Deployment may fail.");
  }

  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  console.log("Treasury address:", treasury);

  console.log("\nDeploying TimeMarketplaceFHE...");
  const Factory = await ethers.getContractFactory(
    "contracts/TimeMarketplaceFHE.sol:TimeMarketplaceFHE"
  );
  const contract = await Factory.deploy(treasury);

  console.log("Waiting for deployment to finalize...");
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("\nContract deployed successfully at:", contractAddress);
  console.log("========================================\n");

  console.log("Verifying initial state...");
  const owner = await contract.owner();
  const treasuryOnChain = await contract.treasury();
  const platformFee = await contract.platformFee();

  console.log("Owner:", owner);
  console.log("Treasury (on chain):", treasuryOnChain);
  console.log(
    "Platform fee:",
    platformFee.toString(),
    "/ 10000 =",
    (Number(platformFee) / 100).toFixed(2) + "%"
  );

  console.log("\nNext steps:");
  console.log("1. Update the frontend with CONTRACT_ADDRESS =", contractAddress);
  console.log("2. Export VITE_CONTRACT_ADDRESS in the frontend .env");
  console.log("3. (Optional) Verify the contract:");
  console.log(
    "   npx hardhat verify --network sepolia",
    contractAddress,
    treasury
  );
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
