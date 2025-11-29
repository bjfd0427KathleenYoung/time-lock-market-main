/**
 * FHEVM 0.9 Time Marketplace Deployment Script
 * Network: Sepolia Testnet
 */

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("========================================");
  console.log("FHEVM 0.9 Time Marketplace Deployment");
  console.log("========================================");
  console.log("Deployer address:", deployer.address);

  // Get deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  if (balance < ethers.parseEther("0.1")) {
    console.warn("â ï¸  Warning: Low balance. You may need more ETH for deployment.");
  }

  // Treasury address (can be different from deployer)
  const treasury = deployer.address; // Change this if needed
  console.log("Treasury address:", treasury);

  console.log("\nð§ Deploying TimeMarketplaceFHE...");

  // Deploy contract
  const TimeMarketplace = await ethers.getContractFactory("TimeMarketplaceFHE");
  const contract = await TimeMarketplace.deploy(treasury);

  console.log("â³ Waiting for deployment...");

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("â
 Contract deployed successfully!");
  console.log("========================================");
  console.log("Contract Address:", contractAddress);
  console.log("========================================");

  // Verify initial state
  console.log("\nð Verifying deployment...");

  const owner = await contract.owner();
  const treasuryAddr = await contract.treasury();
  const platformFee = await contract.platformFee();

  console.log("Owner:", owner);
  console.log("Treasury:", treasuryAddr);
  console.log("Platform Fee:", platformFee.toString(), "/ 10000 =", (Number(platformFee) / 100).toFixed(2) + "%");

  console.log("\nð Next Steps:");
  console.log("1. Update CONTRACT_ADDRESS in src/components/CreateOfferFHE.tsx");
  console.log("2. Update .env with VITE_CONTRACT_ADDRESS=" + contractAddress);
  console.log("3. Verify contract on Etherscan (optional):");
  console.log("   npx hardhat verify --network sepolia", contractAddress, treasury);

  console.log("\nð Ready to use!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nâ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
