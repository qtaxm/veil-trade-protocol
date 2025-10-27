# Veil Trade Protocol (VeilSwap)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-orange.svg)
![FHE](https://img.shields.io/badge/FHE-Zama-green.svg)
![Network](https://img.shields.io/badge/Network-Sepolia-purple.svg)

**Private peer-to-peer value matching using Fully Homomorphic Encryption (FHE)**

VeilSwap enables two parties to compare their valuations of an asset **without revealing the actual values to each other**. Using Zama's fhEVM, all computations happen on encrypted data, preserving complete privacy while determining if the valuations are within an acceptable tolerance.

---

## 🌟 Features

- **🔒 Complete Privacy**: Valuations remain encrypted end-to-end
- **⚖️ Fair Matching**: Automated fairness computation on encrypted data
- **🤝 Peer-to-Peer**: Direct interaction between two parties
- **🔐 Zero-Knowledge Proofs**: Cryptographic verification without data exposure
- **🌐 On-Chain**: All logic executed on Ethereum (Sepolia testnet)
- **🎯 Customizable Tolerance**: Adjustable acceptable difference (in basis points)

---

## 🎯 Use Cases

- **NFT Trading**: Compare offer valuations privately before revealing
- **Real Estate**: Anonymous property value assessments
- **Business Acquisitions**: Confidential company valuation matching
- **Salary Negotiations**: Private compensation range verification
- **Asset Swaps**: Fair exchange determination without disclosure

---

## 🛠️ Technology Stack

### Frontend
- **React 18.3** - UI framework
- **TypeScript 5.8** - Type safety
- **Vite 5.4** - Build tool
- **Tailwind CSS 3.4** - Styling
- **shadcn/ui** - Component library
- **ethers.js 6.15** - Web3 integration
- **Zama FHE SDK 0.2.0** - Encryption library

### Smart Contracts
- **Solidity 0.8.24** - Contract language
- **Zama fhEVM** - FHE blockchain operations
- **Hardhat** - Development framework
- **@fhevm/solidity 0.8.0+** - FHE types and operations

### Network
- **Sepolia Testnet** - Ethereum test network
- **Zama Coprocessor** - FHE computation engine
- **Zama Gateway** - Decryption service

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ ([download](https://nodejs.org/))
- MetaMask browser extension ([install](https://metamask.io/))
- Sepolia test ETH ([get from faucet](https://sepoliafaucet.com/))

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/veil-trade-protocol.git
cd veil-trade-protocol

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your contract address

# Start development server
npm run dev
```

Visit http://localhost:5173

---

## 📖 How It Works

### The Fairness Formula

VeilSwap checks if two valuations (A and B) are "fair" based on a tolerance:

```
Fair = max(A, B) × 10,000 ≤ min(A, B) × (10,000 + tolerance_bps)
```

**Example:**
- Party A values at: 1,000
- Party B values at: 1,020
- Tolerance: 100 bps (1%)
- Result: **Fair** ✓ (difference is only 2%)

### Workflow

```
1. Create Barter
   └─> Party A specifies counterparty and tolerance

2. Submit Valuations (Encrypted)
   ├─> Party A: Submit encrypted valuation
   └─> Party B: Submit encrypted valuation

3. Compute Fairness
   └─> Smart contract compares encrypted values
       └─> Returns encrypted boolean (Fair/Not Fair)

4. View Result
   └─> Both parties decrypt result
       └─> Only boolean shown, values stay hidden
```

### Privacy Guarantee

- ✅ **Valuations never leave encryption**
- ✅ **Only fairness result is revealed (encrypted boolean)**
- ✅ **Even the smart contract doesn't see raw values**
- ✅ **Zero-knowledge proofs verify authenticity**

---

## 📂 Project Structure

```
veil-trade-protocol/
├── contracts/
│   └── index.sol                 # BlindBarter smart contract
├── src/
│   ├── contexts/
│   │   ├── FHEContext.tsx        # FHE SDK initialization
│   │   └── Web3Context.tsx       # Web3 connection management
│   ├── pages/
│   │   ├── Welcome.tsx           # Landing page
│   │   ├── CreateBarter.tsx      # Create new barter
│   │   ├── MyBarters.tsx         # Dashboard
│   │   └── BarterDetail.tsx      # Barter interaction
│   ├── lib/
│   │   ├── fheUtils.ts          # FHE encryption utilities
│   │   └── utils.ts             # General helpers
│   └── components/              # UI components
├── scripts/
│   ├── deploy.ts                # Contract deployment
│   └── verify-deployment.ts     # Verification script
├── hardhat.config.ts            # Hardhat configuration
├── .env.example                 # Environment template
├── DEPLOYMENT_GUIDE.md          # Full deployment guide
└── FHE_COMPLETE_GUIDE_FULL_CN.md # FHE development reference
```

---

## 🔐 Smart Contract API

### Core Functions

```solidity
// Create a new barter session
function createBarter(address counterparty, uint16 tolBps)
    returns (uint256 id)

// Submit your encrypted valuation
function submitValuation(
    uint256 id,
    externalEuint64 valExt,
    bytes calldata proof
) external

// Compute fairness result
function computeFairness(uint256 id)
    returns (ebool fairCt)

// Combined: submit and compute if both ready
function submitAndCompute(
    uint256 id,
    externalEuint64 valExt,
    bytes calldata proof
) external returns (ebool fairCt)

// Cancel before computation
function cancel(uint256 id) external
```

### View Functions

```solidity
// Get barter information
function getBarterInfo(uint256 id)
    returns (
        address partyA,
        address partyB,
        uint16 tolBps,
        bool hasA,
        bool hasB,
        bool hasResult,
        bool canceled
    )

// Get encrypted result handle
function getResultHandle(uint256 id)
    returns (bytes32)
```

---

## 🧪 Development

### Run Tests

```bash
npm run test
```

### Build for Production

```bash
npm run build
```

### Deploy Contract

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete instructions.

Quick deploy:
```bash
# Install Hardhat dependencies
npm install --save-dev hardhat @fhevm/solidity @fhevm/hardhat-plugin

# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia

# Verify deployment
npx hardhat run scripts/verify-deployment.ts --network sepolia
```

---

## 📊 Gas Estimates (Sepolia)

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| Create Barter | ~150k | Simple storage |
| Submit Valuation | ~250k | ZK proof verification |
| Compute Fairness | ~400k | FHE operations |
| Cancel | ~50k | State update |

**Total cost per complete barter:** ~0.002 ETH (on Sepolia)

---

## 🔒 Security

### Audits
⚠️ **Not audited** - This is an educational/experimental project. Do not use in production without professional audit.

### Security Features
- ✅ Access control (only participants can act)
- ✅ Reentrancy protection (CEI pattern)
- ✅ Input validation (address, tolerance checks)
- ✅ State machine enforcement (can't submit after computation)
- ✅ Zero-knowledge proof verification

### Known Limitations
- Gateway dependency for decryption
- Higher gas costs due to FHE operations
- Sepolia testnet only (not production-ready)

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript/Solidity best practices
- Add tests for new features
- Update documentation
- Maintain code formatting (run `npm run lint`)

---

## 📚 Resources

- **FHE Development Guide**: [FHE_COMPLETE_GUIDE_FULL_CN.md](./FHE_COMPLETE_GUIDE_FULL_CN.md)
- **Deployment Guide**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Zama Documentation**: https://docs.zama.ai/
- **fhEVM Reference**: https://docs.zama.ai/fhevm
- **Sepolia Faucet**: https://sepoliafaucet.com/

---

## 🐛 Troubleshooting

### "FHE SDK not initialized"
```bash
# Reinstall FHE SDK
npm uninstall @zama-fhe/relayer-sdk
npm install @zama-fhe/relayer-sdk@0.2.0
```

### "Transaction reverted"
- Check you're on Sepolia network
- Verify contract address is correct
- Ensure sufficient test ETH for gas

### "Cannot decrypt result"
- Verify you're a participant (Party A or B)
- Check result exists (`hasResult = true`)
- Wait for Gateway (can take 30-60 seconds)

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md#troubleshooting) for more solutions.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Zama** - For the amazing FHE technology and fhEVM
- **Ethereum Foundation** - For the Sepolia testnet
- **shadcn/ui** - For the beautiful component library

---

## 📧 Contact

- **Issues**: [GitHub Issues](https://github.com/your-username/veil-trade-protocol/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/veil-trade-protocol/discussions)

---

<div align="center">

**Built with ❤️ using Zama FHE**

[🌟 Star on GitHub](https://github.com/your-username/veil-trade-protocol) • [📖 Documentation](./DEPLOYMENT_GUIDE.md) • [🐛 Report Bug](https://github.com/your-username/veil-trade-protocol/issues)

</div>
