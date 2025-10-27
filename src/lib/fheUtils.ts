import { RelayerEncryptedInput } from '@zama-fhe/relayer-sdk/web';

// Type alias for better naming
type EncryptedInput = RelayerEncryptedInput;

/**
 * FHE Encryption Utilities
 * Based on Zama FHE Complete Guide (FHE_COMPLETE_GUIDE_FULL_CN.md)
 */

export interface EncryptedValuation {
  handle: string;
  inputProof: string;
}

/**
 * Encrypt a valuation amount (euint64)
 * @param input - EncryptedInput instance from FHE context
 * @param amount - The valuation amount to encrypt (as bigint or number)
 * @returns Object containing handle and inputProof for contract call
 */
export async function encryptValuation(
  input: EncryptedInput,
  amount: bigint | number
): Promise<EncryptedValuation> {
  try {
    // Add the amount as euint64 (recommended for token balances and valuations)
    input.add64(BigInt(amount));

    // Generate the encrypted handle and zero-knowledge proof
    const encryptResult = await input.encrypt();

    if (!encryptResult || !encryptResult.handles || !encryptResult.inputProof) {
      throw new Error('Encryption failed: invalid result');
    }

    // Convert Uint8Array to hex string for ethers.js compatibility
    const handleBytes = encryptResult.handles[0];
    const proofBytes = encryptResult.inputProof;

    // Helper function to convert Uint8Array to hex string
    const toHexString = (bytes: Uint8Array | string): string => {
      if (typeof bytes === 'string') return bytes;
      return '0x' + Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    };

    return {
      handle: toHexString(handleBytes),
      inputProof: toHexString(proofBytes)
    };
  } catch (error) {
    console.error('[FHE Utils] Encryption error:', error);
    throw new Error(`Failed to encrypt valuation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encrypt multiple valuations in a batch (shares the same proof)
 * @param input - EncryptedInput instance
 * @param amounts - Array of amounts to encrypt
 * @returns Object with handles array and shared inputProof
 */
export async function encryptMultipleValuations(
  input: EncryptedInput,
  amounts: (bigint | number)[]
): Promise<{ handles: string[]; inputProof: string }> {
  try {
    // Add all amounts to the same input (they will share the proof)
    for (const amount of amounts) {
      input.add64(BigInt(amount));
    }

    const encryptResult = await input.encrypt();

    if (!encryptResult || !encryptResult.handles || !encryptResult.inputProof) {
      throw new Error('Batch encryption failed: invalid result');
    }

    return {
      handles: encryptResult.handles,
      inputProof: encryptResult.inputProof
    };
  } catch (error) {
    console.error('[FHE Utils] Batch encryption error:', error);
    throw new Error(`Failed to encrypt multiple valuations: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert a number string to bigint safely
 * Handles common input formats and validates ranges
 */
export function parseValuationInput(input: string): bigint {
  if (!input || input.trim() === '') {
    throw new Error('Valuation input cannot be empty');
  }

  try {
    // Remove any commas or spaces
    const cleaned = input.replace(/[,\s]/g, '');

    // Check if it's a valid number
    if (!/^\d+$/.test(cleaned)) {
      throw new Error('Valuation must be a positive integer');
    }

    const value = BigInt(cleaned);

    // euint64 max value: 2^64 - 1 = 18,446,744,073,709,551,615
    const MAX_UINT64 = BigInt('18446744073709551615');

    if (value < 0n) {
      throw new Error('Valuation cannot be negative');
    }

    if (value > MAX_UINT64) {
      throw new Error('Valuation exceeds euint64 maximum (18.4 quintillion)');
    }

    return value;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Invalid valuation input format');
  }
}

/**
 * Format a bigint value for display
 */
export function formatValuation(value: bigint | number): string {
  return value.toLocaleString();
}

/**
 * Validate contract address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate tolerance basis points (0-10000)
 */
export function isValidToleranceBps(bps: number): boolean {
  return Number.isInteger(bps) && bps >= 0 && bps <= 10000;
}

/**
 * Convert basis points to percentage string
 */
export function bpsToPercentage(bps: number): string {
  return (bps / 100).toFixed(2) + '%';
}

/**
 * Error messages for common FHE issues
 */
export const FHE_ERRORS = {
  NOT_INITIALIZED: 'FHE SDK is not initialized. Please wait or refresh the page.',
  ENCRYPTION_FAILED: 'Failed to encrypt valuation. Please try again.',
  INVALID_INPUT: 'Invalid valuation input. Please enter a positive number.',
  PROOF_GENERATION_FAILED: 'Failed to generate zero-knowledge proof.',
  NETWORK_MISMATCH: 'Please connect to Sepolia testnet.',
  WALLET_NOT_CONNECTED: 'Please connect your wallet first.',
  CONTRACT_ERROR: 'Contract call failed. Please check the transaction.',
  DECRYPTION_FAILED: 'Failed to decrypt result. Please try again later.'
} as const;
