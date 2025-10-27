import hre from "hardhat";

async function main() {
  console.log("==========================================");
  console.log("  BlindBarter Deployment Script");
  console.log("==========================================\n");

  // Get ethers from HRE
  const ethers = hre.ethers;

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying from account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️  Warning: Low balance. You may need more ETH for deployment.");
    console.warn("   Get test ETH from: https://sepoliafaucet.com/\n");
  }

  // Deploy BlindBarter
  console.log("🚀 Deploying BlindBarter contract...");
  const BlindBarter = await ethers.getContractFactory("BlindBarter");

  console.log("⏳ Sending deployment transaction...");
  const blindBarter = await BlindBarter.deploy();

  console.log("⏳ Waiting for deployment confirmation...");
  await blindBarter.waitForDeployment();

  const address = await blindBarter.getAddress();
  console.log("✅ BlindBarter deployed successfully!");
  console.log("📍 Contract address:", address);

  // Verify deployment by calling a view function
  try {
    const version = await blindBarter.version();
    console.log("📦 Contract version:", version);

    const maxTolBps = await blindBarter.MAX_TOL_BPS();
    console.log("🔧 Max tolerance BPS:", maxTolBps.toString());

    const barterCount = await blindBarter.barterCount();
    console.log("📊 Initial barter count:", barterCount.toString());
  } catch (error) {
    console.error("❌ Error verifying deployment:", error);
  }

  // Output configuration
  console.log("\n==========================================");
  console.log("  Configuration");
  console.log("==========================================\n");
  console.log("🔧 Update your frontend .env file with:");
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);
  console.log("\n📋 Contract details:");
  console.log(`- Network: Sepolia Testnet`);
  console.log(`- Chain ID: 11155111`);
  console.log(`- Explorer: https://sepolia.etherscan.io/address/${address}`);
  console.log("\n✨ Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
