import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log("==========================================");
  console.log("  BlindBarter Deployment Script");
  console.log("==========================================\n");

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("📝 Deploying from account:", wallet.address);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

  if (balance < ethers.parseEther("0.01")) {
    console.warn("⚠️  Warning: Low balance. You may need more ETH for deployment.");
    console.warn("   Get test ETH from: https://sepoliafaucet.com/\n");
  }

  // Read compiled contract
  const artifactPath = join(__dirname, '../artifacts/contracts/index.sol/BlindBarter.json');
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));

  console.log("🚀 Deploying BlindBarter contract...");

  // Create contract factory
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  console.log("⏳ Sending deployment transaction...");
  const contract = await factory.deploy();

  console.log("⏳ Waiting for deployment confirmation...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ BlindBarter deployed successfully!");
  console.log("📍 Contract address:", address);

  // Verify deployment
  try {
    const version = await contract.version();
    console.log("📦 Contract version:", version);

    const maxTolBps = await contract.MAX_TOL_BPS();
    console.log("🔧 Max tolerance BPS:", maxTolBps.toString());

    const barterCount = await contract.barterCount();
    console.log("📊 Initial barter count:", barterCount.toString());
  } catch (error) {
    console.error("❌ Error verifying deployment:", error.message);
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
