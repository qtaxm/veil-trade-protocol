# Veil Trade Protocol - Deployment & Development Guide

Complete guide for deploying and running the Veil Trade Protocol (BlindBarter) with Zama FHE.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Smart Contract Deployment](#smart-contract-deployment)
4. [Frontend Configuration](#frontend-configuration)
5. [Development Workflow](#development-workflow)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js**: v18+ (recommended: v20)
- **npm** or **bun**: Latest version
- **MetaMask**: Browser extension
- **Git**: For version control

### Required Accounts
- **Ethereum Sepolia testnet account** with test ETH
  - Get test ETH from faucets:
    - https://sepoliafaucet.com/
    - https://www.alchemy.com/faucets/ethereum-sepolia
    - https://cloud.google.com/application/web3/faucet/ethereum/sepolia

### Required Knowledge
- Basic Solidity and Ethereum development
- React/TypeScript
- FHE concepts (see FHE_COMPLETE_GUIDE_FULL_CN.md)

---

## Environment Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd veil-trade-protocol-main

# Install dependencies
npm install

# Or use bun
bun install
```

### 2. Verify FHE SDK Installation

```bash
# Check that @zama-fhe/relayer-sdk is installed
npm list @zama-fhe/relayer-sdk

# Should output: @zama-fhe/relayer-sdk@0.2.0
```

### 3. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` with your values:
```env
VITE_CONTRACT_ADDRESS=<your-deployed-contract-address>
VITE_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_SEPOLIA_CHAIN_ID=11155111
VITE_DEBUG_MODE=true
```

---

## Smart Contract Deployment

### Option 1: Using Hardhat (Recommended)

#### Step 1: Setup Hardhat Project

```bash
# Create a hardhat directory if not exists
mkdir -p hardhat
cd hardhat

# Initialize Hardhat
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @fhevm/solidity@^0.8.0 @fhevm/hardhat-plugin@^0.1.0
npx hardhat init
```

#### Step 2: Configure Hardhat

Create `hardhat/hardhat.config.ts`:

```typescript
import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
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
  },
  paths: {
    sources: "../contracts"
  }
};

export default config;
```

Create `hardhat/.env`:
```env
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
PRIVATE_KEY=your_private_key_here
```

#### Step 3: Deploy the Contract

```bash
cd hardhat

# Compile
npx hardhat compile

# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia
```

Create `hardhat/scripts/deploy.ts`:

```typescript
import { ethers } from "hardhat";

async function main() {
  console.log("Deploying BlindBarter contract...");

  const BlindBarter = await ethers.getContractFactory("BlindBarter");
  const blindBarter = await BlindBarter.deploy();

  await blindBarter.waitForDeployment();

  const address = await blindBarter.getAddress();
  console.log("✅ BlindBarter deployed to:", address);

  // Verify the deployment
  const version = await blindBarter.version();
  console.log("📦 Contract version:", version);

  console.log("\n🔧 Update your .env file:");
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

#### Step 4: Copy Contract Address

After deployment, copy the contract address and update your `.env`:

```env
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

### Option 2: Using Remix IDE

1. Go to https://remix.ethereum.org/
2. Create a new file `BlindBarter.sol`
3. Copy the contract code from `contracts/index.sol`
4. Install Zama plugin in Remix
5. Compile with Solidity 0.8.24
6. Deploy to Sepolia using MetaMask
7. Copy the deployed address to `.env`

---

## Frontend Configuration

### 1. Update Environment Variables

Ensure `.env` has the correct contract address:

```env
VITE_CONTRACT_ADDRESS=0xYourActualDeployedAddress
```

### 2. Verify FHE Context

The FHE SDK is automatically initialized on app load. Check browser console for:

```
[FHE] Initializing SDK...
[FHE] Creating instance with SepoliaConfig...
[FHE] Initialization complete!
```

### 3. Configure MetaMask

Add Sepolia network to MetaMask:
- **Network Name**: Sepolia Test Network
- **RPC URL**: https://ethereum-sepolia-rpc.publicnode.com
- **Chain ID**: 11155111
- **Currency Symbol**: ETH
- **Block Explorer**: https://sepolia.etherscan.io

---

## Development Workflow

### Start Development Server

```bash
npm run dev
```

The app will be available at http://localhost:5173

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

## Testing

### Manual Testing Workflow

#### 1. Connect Wallet
- Open the app
- Click "Connect Wallet"
- Approve MetaMask connection
- Ensure you're on Sepolia network

#### 2. Create a Barter
- Navigate to "Create Barter"
- Enter counterparty address (can use another account you control)
- Set tolerance (e.g., 100 bps = 1%)
- Submit transaction
- Note the Barter ID

#### 3. Submit Valuations

**As Party A:**
- Navigate to the barter detail page
- Enter your valuation (e.g., 1000)
- Click "Submit Valuation"
- Wait for FHE encryption (~3-5 seconds)
- Confirm MetaMask transaction
- Wait for transaction confirmation

**As Party B:**
- Switch to second MetaMask account
- Navigate to same barter (share the URL)
- Submit your valuation (e.g., 1020)
- Follow same process

#### 4. Compute Fairness
- Once both valuations are submitted
- Click "Compute Fairness"
- Wait for computation
- Result will be displayed (Fair/Not Fair)

#### 5. View Result
- Result is encrypted on-chain
- Frontend automatically decrypts using FHE SDK
- Both parties see the same result

### Expected Gas Costs (Sepolia)

- Create Barter: ~150,000 gas
- Submit Valuation: ~250,000 gas (due to ZK proof verification)
- Compute Fairness: ~400,000 gas (FHE operations)
- Cancel: ~50,000 gas

---

## Troubleshooting

### Common Issues

#### 1. "FHE SDK is not initialized"

**Problem**: FHE context didn't load properly

**Solution**:
```bash
# Check browser console for errors
# Verify @zama-fhe/relayer-sdk is installed
npm list @zama-fhe/relayer-sdk

# Reinstall if needed
npm uninstall @zama-fhe/relayer-sdk
npm install @zama-fhe/relayer-sdk@0.2.0

# Clear browser cache and reload
```

#### 2. "Transaction Reverted" on submitValuation

**Problem**: Proof verification failed

**Possible causes**:
- Wrong contract address in encrypted input
- Network mismatch
- Invalid proof format

**Solution**:
```typescript
// Verify contract address matches
const contractAddress = await contract.getAddress();
console.log("Contract:", contractAddress);

// Ensure using correct account
console.log("User:", account);

// Check handle format
console.log("Handle:", handle);
console.log("Proof length:", inputProof.length);
```

#### 3. Contract Call Fails

**Problem**: ABI mismatch or network issue

**Solution**:
- Verify contract address in `.env`
- Check you're on Sepolia network
- Ensure contract is deployed at that address:
  ```bash
  # Check on Etherscan
  open https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS
  ```

#### 4. "Insufficient Funds"

**Problem**: Not enough test ETH for gas

**Solution**:
- Get more test ETH from faucets
- Each transaction costs ~0.001-0.002 ETH on Sepolia

#### 5. Decryption Fails

**Problem**: Cannot decrypt fairness result

**Possible causes**:
- Not authorized (ACL issue)
- Gateway timeout
- Wrong result handle

**Solution**:
```typescript
// Check if result exists
const hasResult = await contract.getBarterInfo(id);
console.log("Has result:", hasResult[5]);

// Check result handle
const handle = await contract.getResultHandle(id);
console.log("Result handle:", handle);

// Verify you're a participant
const info = await contract.getBarterInfo(id);
console.log("Party A:", info[0]);
console.log("Party B:", info[1]);
console.log("Your address:", account);
```

### Debug Mode

Enable debug logging in `.env`:
```env
VITE_DEBUG_MODE=true
```

This will output detailed logs to browser console.

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│           Frontend (React + Vite)            │
│  ┌────────────────────────────────────────┐ │
│  │  FHE Context (SDK Initialization)      │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │  Web3 Context (Contract Interaction)   │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │  UI Components (Pages/Components)      │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│         Zama FHE SDK (@zama-fhe)             │
│  - Encryption (euint64)                      │
│  - Zero-knowledge proof generation           │
│  - Decryption via Gateway                    │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│      Smart Contract (Sepolia Testnet)       │
│  - BlindBarter.sol                           │
│  - FHE operations (compare, select, etc)     │
│  - Access control (ACL)                      │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│         Zama Coprocessor Network             │
│  - FHE computation execution                 │
│  - Decryption with proofs                    │
│  - Gateway callback                          │
└─────────────────────────────────────────────┘
```

---

## File Structure

```
veil-trade-protocol-main/
├── contracts/
│   └── index.sol              # BlindBarter smart contract
├── src/
│   ├── contexts/
│   │   ├── FHEContext.tsx     # FHE SDK initialization
│   │   └── Web3Context.tsx    # Web3 provider
│   ├── lib/
│   │   ├── fheUtils.ts        # FHE helper functions
│   │   └── utils.ts           # General utilities
│   ├── pages/
│   │   ├── Welcome.tsx        # Landing page
│   │   ├── CreateBarter.tsx   # Create new barter
│   │   ├── MyBarters.tsx      # List user's barters
│   │   └── BarterDetail.tsx   # Barter detail/actions
│   └── components/
│       └── layout/Header.tsx  # Navigation header
├── .env                       # Environment variables
├── .env.example              # Environment template
├── package.json              # Dependencies
├── FHE_COMPLETE_GUIDE_FULL_CN.md  # FHE development guide
└── DEPLOYMENT_GUIDE.md       # This file
```

---

## Support & Resources

- **FHE Guide**: See `FHE_COMPLETE_GUIDE_FULL_CN.md` for detailed FHE concepts
- **Zama Docs**: https://docs.zama.ai/
- **fhEVM Docs**: https://docs.zama.ai/fhevm
- **SDK Reference**: https://docs.zama.ai/fhevm/references/sdk

---

## License

MIT License - See LICENSE file for details
