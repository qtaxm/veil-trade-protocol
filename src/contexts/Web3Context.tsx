import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BrowserProvider, Contract, JsonRpcSigner } from 'ethers';

interface Web3ContextType {
  account: string | null;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  contract: Contract | null;
  contractVersion: string | null;
  isCorrectNetwork: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

// BlindBarter Contract ABI - Based on contracts/index.sol
const CONTRACT_ABI = [
  // Meta
  "function version() external pure returns (string)",

  // Core functions
  "function createBarter(address counterparty, uint16 tolBps) external returns (uint256 id)",
  "function submitValuation(uint256 id, bytes32 valExt, bytes calldata proof) external",
  "function computeFairness(uint256 id) public returns (bytes32 fairCt)",
  "function submitAndCompute(uint256 id, bytes32 valExt, bytes calldata proof) external returns (bytes32 fairCt)",
  "function cancel(uint256 id) external",

  // View functions
  "function getBarterInfo(uint256 id) external view returns (address partyA, address partyB, uint16 tolBps, bool hasA, bool hasB, bool hasResult, bool canceled)",
  "function getResultHandle(uint256 id) external view returns (bytes32)",

  // Public state
  "function barterCount() public view returns (uint256)",
  "function MAX_TOL_BPS() public view returns (uint16)",
  "function ONE_BPS() public view returns (uint64)",

  // Events
  "event BarterCreated(uint256 indexed id, address indexed partyA, address indexed partyB, uint16 tolBps)",
  "event ValuationSubmitted(uint256 indexed id, address indexed party)",
  "event FairnessComputed(uint256 indexed id, bytes32 resultHandle)",
  "event BarterCanceled(uint256 indexed id)"
];

// Get contract address from environment or use placeholder
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 in decimal

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [contractVersion, setContractVersion] = useState<string | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);

  const checkNetwork = async (provider: BrowserProvider) => {
    const network = await provider.getNetwork();
    const chainId = `0x${network.chainId.toString(16)}`;
    setIsCorrectNetwork(chainId === SEPOLIA_CHAIN_ID);
    return chainId === SEPOLIA_CHAIN_ID;
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to use this application');
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      
      const isCorrect = await checkNetwork(provider);
      
      if (!isCorrect) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });
        } catch (error) {
          console.error('Failed to switch network:', error);
          return;
        }
      }

      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      setProvider(provider);
      setSigner(signer);
      setAccount(accounts[0]);
      setContract(contract);

      // Persist connection state for auto-reconnect
      localStorage.setItem('walletConnected', 'true');

      // Get contract version
      try {
        const version = await contract.version();
        setContractVersion(version);
      } catch (error) {
        console.error('Failed to get contract version:', error);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setContract(null);
    setContractVersion(null);
    setIsCorrectNetwork(false);
    // Clear persisted connection state
    localStorage.removeItem('walletConnected');
  };

  // Auto-reconnect on page load if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      // Check if wallet was previously connected
      const wasConnected = localStorage.getItem('walletConnected');

      if (wasConnected === 'true' && window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          // Check if already connected (eth_accounts doesn't prompt)
          const accounts = await provider.send("eth_accounts", []);

          if (accounts.length > 0) {
            const isCorrect = await checkNetwork(provider);

            if (!isCorrect) {
              // Don't auto-switch network, just mark as incorrect
              setIsCorrectNetwork(false);
              return;
            }

            const signer = await provider.getSigner();
            const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

            setProvider(provider);
            setSigner(signer);
            setAccount(accounts[0]);
            setContract(contract);
            setIsCorrectNetwork(true);

            // Get contract version
            try {
              const version = await contract.version();
              setContractVersion(version);
            } catch (error) {
              console.error('Failed to get contract version:', error);
            }
          } else {
            // No accounts available, clear persisted state
            localStorage.removeItem('walletConnected');
          }
        } catch (error) {
          console.error('Failed to auto-connect wallet:', error);
          localStorage.removeItem('walletConnected');
        }
      }
    };

    autoConnect();
  }, []);

  // Listen for account and network changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
          // Reconnect with new account
          connectWallet();
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        signer,
        contract,
        contractVersion,
        isCorrectNetwork,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

declare global {
  interface Window {
    ethereum?: any;
  }
}
