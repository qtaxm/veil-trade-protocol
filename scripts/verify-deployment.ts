import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.VITE_CONTRACT_ADDRESS;

  if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
    console.error("❌ Error: Contract address not set in environment");
    console.error("   Please set VITE_CONTRACT_ADDRESS in your .env file");
    process.exit(1);
  }

  console.log("==========================================");
  console.log("  BlindBarter Verification Script");
  console.log("==========================================\n");
  console.log("📍 Contract address:", contractAddress);

  try {
    // Get contract instance
    const BlindBarter = await ethers.getContractFactory("BlindBarter");
    const blindBarter = BlindBarter.attach(contractAddress);

    // Verify contract is deployed
    const code = await ethers.provider.getCode(contractAddress);
    if (code === "0x") {
      console.error("❌ No contract found at this address");
      process.exit(1);
    }
    console.log("✅ Contract code verified\n");

    // Check version
    const version = await blindBarter.version();
    console.log("📦 Contract version:", version);

    // Check constants
    const maxTolBps = await blindBarter.MAX_TOL_BPS();
    const oneBps = await blindBarter.ONE_BPS();
    console.log("🔧 MAX_TOL_BPS:", maxTolBps.toString());
    console.log("🔧 ONE_BPS:", oneBps.toString());

    // Check barter count
    const barterCount = await blindBarter.barterCount();
    console.log("📊 Total barters:", barterCount.toString());

    // If there are barters, show the first one
    if (barterCount > 0n) {
      console.log("\n📋 Sample barter (ID: 1):");
      const info = await blindBarter.getBarterInfo(1);
      console.log("  - Party A:", info[0]);
      console.log("  - Party B:", info[1]);
      console.log("  - Tolerance:", info[2].toString(), "bps");
      console.log("  - Has A:", info[3]);
      console.log("  - Has B:", info[4]);
      console.log("  - Has Result:", info[5]);
      console.log("  - Canceled:", info[6]);
    }

    console.log("\n✅ Contract verification complete!");
    console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}\n`);

  } catch (error) {
    console.error("\n❌ Verification failed:");
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
