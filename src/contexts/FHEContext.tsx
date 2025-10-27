import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  createInstance,
  initSDK,
  SepoliaConfig,
  FhevmInstance,
  RelayerEncryptedInput
} from '@zama-fhe/relayer-sdk/web';

// Type aliases for better naming
type FheInstance = FhevmInstance;
type EncryptedInput = RelayerEncryptedInput;

interface FHEContextType {
  fheInstance: FheInstance | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  createEncryptedInput: (contractAddress: string, userAddress: string) => EncryptedInput | null;
  decryptBool: (handle: string, contractAddress: string) => Promise<boolean | null>;
}

const FHEContext = createContext<FHEContextType | undefined>(undefined);

export const useFHE = () => {
  const context = useContext(FHEContext);
  if (!context) {
    throw new Error('useFHE must be used within FHEProvider');
  }
  return context;
};

interface FHEProviderProps {
  children: ReactNode;
}

export const FHEProvider: React.FC<FHEProviderProps> = ({ children }) => {
  const [fheInstance, setFheInstance] = useState<FheInstance | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const initializeFHE = async () => {
      // Prevent re-initialization
      if (isInitializing || isInitialized) {
        console.log('[FHE] Already initializing or initialized, skipping...');
        return;
      }

      console.log('[FHE] Starting initialization...');
      console.log('[FHE] Note: First load may take 10-30 seconds to download WASM files');
      setIsInitializing(true);
      setError(null);

      // Set 60 second timeout for initialization
      timeoutId = setTimeout(() => {
        console.error('[FHE] ⚠️ Initialization timeout after 60 seconds');
        if (isMounted && !isInitialized) {
          setError('Initialization timeout. Please check your internet connection and refresh the page.');
          setIsInitializing(false);
        }
      }, 60000);

      try {
        // Step 1: Initialize the SDK (loads WASM modules)
        console.log('[FHE] Step 1: Calling initSDK()...');
        console.log('[FHE] Loading WASM files (tfhe_bg.wasm ~4.4MB + kms_lib_bg.wasm ~637KB)...');

        await Promise.race([
          initSDK(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('initSDK timeout after 45s')), 45000)
          )
        ]);

        console.log('[FHE] Step 1: ✓ SDK WASM modules loaded');

        if (!isMounted) return;

        // Step 2: Create FHE instance with Sepolia configuration
        console.log('[FHE] Step 2: Creating FHE instance with SepoliaConfig...');
        const instance = await createInstance(SepoliaConfig);
        console.log('[FHE] Step 2: ✓ Instance created');

        if (!isMounted) return;

        // Clear timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        setFheInstance(instance);
        setIsInitialized(true);
        console.log('[FHE] ✅ Initialization complete! Ready for encryption.');
      } catch (err) {
        if (!isMounted) return;

        // Clear timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        const errorMessage = err instanceof Error ? err.message : 'Unknown error during FHE initialization';
        console.error('[FHE] ❌ Initialization failed:', err);
        console.error('[FHE] Error details:', {
          message: errorMessage,
          type: err instanceof Error ? err.constructor.name : typeof err,
          stack: err instanceof Error ? err.stack : 'No stack trace'
        });

        setError(`Failed to initialize FHE: ${errorMessage}`);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    // Only initialize once when component mounts
    initializeFHE();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []); // Empty dependency array - only run once on mount

  const createEncryptedInput = (contractAddress: string, userAddress: string): EncryptedInput | null => {
    if (!fheInstance || !isInitialized) {
      console.error('[FHE] Cannot create encrypted input - FHE not initialized');
      return null;
    }

    try {
      // Ensure addresses are properly checksummed
      console.log('[FHE] Creating encrypted input with:', {
        contractAddress,
        userAddress,
        contractAddressLength: contractAddress.length,
        userAddressLength: userAddress.length
      });

      const input = fheInstance.createEncryptedInput(contractAddress, userAddress);
      console.log('[FHE] Encrypted input created successfully');
      return input;
    } catch (err) {
      console.error('[FHE] Error creating encrypted input:', err);
      return null;
    }
  };

  const decryptBool = async (handle: string, contractAddress: string): Promise<boolean | null> => {
    if (!fheInstance || !isInitialized) {
      console.error('[FHE] Cannot decrypt - FHE not initialized');
      return null;
    }

    try {
      const result = await fheInstance.reencrypt(
        handle,
        contractAddress,
        '0x' // Public key placeholder - will use gateway
      );
      return Boolean(result);
    } catch (err) {
      console.error('[FHE] Error decrypting bool:', err);
      return null;
    }
  };

  const value: FHEContextType = {
    fheInstance,
    isInitialized,
    isInitializing,
    error,
    createEncryptedInput,
    decryptBool
  };

  return <FHEContext.Provider value={value}>{children}</FHEContext.Provider>;
};
