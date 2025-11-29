/**
 * FHEVM 0.9 React Hooks
 * Encryption and Decryption utilities for Time Marketplace
 */

import { useState, useCallback, useEffect } from 'react';
import { getFHEInstance, initializeFHE, type FheInstance } from '@/lib/fhe';
import { getAddress } from 'ethers';

/**
 * Main FHE hook - manages SDK instance
 */
export function useFHE() {
  const [fhe, setFhe] = useState<FheInstance | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const initialize = useCallback(async () => {
    if (fhe) return; // Already initialized

    setIsInitializing(true);
    setError(null);

    try {
      const instance = await initializeFHE();
      setFhe(instance);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('FHE initialization failed');
      setError(error);
      console.error('[useFHE] Initialization error:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [fhe]);

  return {
    fhe,
    initialize,
    isInitializing,
    error,
    isReady: !!fhe,
  };
}

/**
 * FHEVM 0.9: Encryption Hook
 * Encrypts values for contract submission
 */
export function useEncrypt() {
  const [isEncrypting, setIsEncrypting] = useState(false);

  /**
   * Encrypt a single value
   * @param contractAddress - Contract address (will be checksummed)
   * @param userAddress - User address
   * @param value - Value to encrypt
   * @param type - Encryption type
   */
  const encryptValue = useCallback(async (
    contractAddress: string,
    userAddress: string,
    value: number | bigint,
    type: 'uint8' | 'uint16' | 'uint32' | 'uint64'
  ): Promise<{ handle: string; proof: string }> => {
    setIsEncrypting(true);

    try {
      // Get FHE instance
      const fhe = await getFHEInstance();

      // â­ FHEVM 0.9: Address must be checksummed
      const contractAddr = getAddress(contractAddress) as `0x${string}`;

      // Create encrypted input
      const input = fhe.createEncryptedInput(contractAddr, userAddress);

      // Add value based on type
      switch (type) {
        case 'uint8':
          input.add8(Number(value));
          break;
        case 'uint16':
          input.add16(Number(value));
          break;
        case 'uint32':
          input.add32(Number(value));
          break;
        case 'uint64':
          input.add64(BigInt(value));
          break;
      }

      // â­ FHEVM 0.9: Encrypt and get handles + proof
      const { handles, inputProof } = await input.encrypt();

      return {
        handle: handles[0],
        proof: inputProof,
      };
    } catch (error) {
      console.error('[useEncrypt] Encryption failed:', error);
      throw error;
    } finally {
      setIsEncrypting(false);
    }
  }, []);

  /**
   * Encrypt multiple values (shared proof)
   * â­ FHEVM 0.9: All values share the same inputProof
   */
  const encryptBatch = useCallback(async (
    contractAddress: string,
    userAddress: string,
    values: Array<{ value: number | bigint; type: 'uint8' | 'uint16' | 'uint32' | 'uint64' }>
  ): Promise<{ handles: string[]; proof: string }> => {
    setIsEncrypting(true);

    try {
      const fhe = await getFHEInstance();
      const contractAddr = getAddress(contractAddress) as `0x${string}`;

      // Create single input for all values
      const input = fhe.createEncryptedInput(contractAddr, userAddress);

      // Add all values in order
      for (const { value, type } of values) {
        switch (type) {
          case 'uint8':
            input.add8(Number(value));
            break;
          case 'uint16':
            input.add16(Number(value));
            break;
          case 'uint32':
            input.add32(Number(value));
            break;
          case 'uint64':
            input.add64(BigInt(value));
            break;
        }
      }

      // Encrypt once - all handles share the same proof
      const { handles, inputProof } = await input.encrypt();

      return {
        handles,
        proof: inputProof,
      };
    } catch (error) {
      console.error('[useEncrypt] Batch encryption failed:', error);
      throw error;
    } finally {
      setIsEncrypting(false);
    }
  }, []);

  return {
    encryptValue,
    encryptBatch,
    isEncrypting,
  };
}

/**
 * FHEVM 0.9: Decryption Hook
 * Handles public decryption workflow
 */
export function useDecrypt() {
  const [isDecrypting, setIsDecrypting] = useState(false);

  /**
   * â­ FHEVM 0.9: Public Decryption
   * Used after FHE.makePubliclyDecryptable() is called in contract
   */
  const decryptMultiple = useCallback(async (
    contractAddress: string,
    signer: any,
    handles: string[]
  ): Promise<{
    clearValues: Record<string, any>;
    cleartexts: string;
    decryptionProof: string;
    values: any[];
  }> => {
    setIsDecrypting(true);

    try {
      const fhe = await getFHEInstance();

      // â­ FHEVM 0.9: Use relayer SDK's publicDecrypt
      // This internally calls the Zama KMS to decrypt
      const result = await (fhe as any).publicDecrypt(handles);

      // Extract values in order
      const values = handles.map(handle => result.clearValues[handle]);

      return {
        clearValues: result.clearValues,
        cleartexts: result.cleartexts,
        decryptionProof: result.decryptionProof,
        values,
      };
    } catch (error) {
      console.error('[useDecrypt] Decryption failed:', error);
      throw error;
    } finally {
      setIsDecrypting(false);
    }
  }, []);

  /**
   * User-specific decryption (no event required)
   * Used when contract grants permission via FHE.allow()
   */
  const userDecrypt = useCallback(async (
    contractAddress: string,
    handle: string
  ): Promise<bigint> => {
    setIsDecrypting(true);

    try {
      const fhe = await getFHEInstance();

      // â­ FHEVM 0.9: User decryption (simpler than public)
      const value = await (fhe as any).decrypt(contractAddress, handle);

      return BigInt(value);
    } catch (error) {
      console.error('[useDecrypt] User decryption failed:', error);
      throw error;
    } finally {
      setIsDecrypting(false);
    }
  }, []);

  return {
    decryptMultiple,
    userDecrypt,
    isDecrypting,
  };
}

/**
 * Hook for lazy FHE initialization (on-demand)
 * Use this in components that don't need FHE immediately
 */
export function useLazyFHE() {
  const [fhe, setFhe] = useState<FheInstance | null>(null);

  const ensureInitialized = useCallback(async () => {
    if (fhe) return fhe;

    const instance = await initializeFHE();
    setFhe(instance);
    return instance;
  }, [fhe]);

  return { ensureInitialized };
}
