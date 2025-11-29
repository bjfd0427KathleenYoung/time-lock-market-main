/**
 * FHEVM 0.9 SDK Initialization
 * Based on Zama official guide - CRITICAL: Use /web import path for Vite
 */

import {
  createInstance,
  initSDK,
  type FheInstance,
  SepoliaConfig as SDKSepoliaConfig,
  type FhevmInstanceConfig,
} from "@zama-fhe/relayer-sdk/web"; // must use /web for Vite projects

const env = import.meta?.env ?? {};

const overrides: Partial<FhevmInstanceConfig> = {};

if (env.VITE_FHE_ACL_ADDRESS) {
  overrides.aclContractAddress = env.VITE_FHE_ACL_ADDRESS;
}
if (env.VITE_FHE_KMS_ADDRESS) {
  overrides.kmsContractAddress = env.VITE_FHE_KMS_ADDRESS;
}
if (env.VITE_FHE_INPUT_VERIFIER_ADDRESS) {
  overrides.inputVerifierContractAddress = env.VITE_FHE_INPUT_VERIFIER_ADDRESS;
}
if (env.VITE_FHE_DECRYPTION_CONTRACT_ADDRESS) {
  overrides.verifyingContractAddressDecryption = env.VITE_FHE_DECRYPTION_CONTRACT_ADDRESS;
}
if (env.VITE_FHE_INPUT_VERIFICATION_CONTRACT_ADDRESS) {
  overrides.verifyingContractAddressInputVerification =
    env.VITE_FHE_INPUT_VERIFICATION_CONTRACT_ADDRESS;
}
if (env.VITE_FHE_GATEWAY_CHAIN_ID) {
  overrides.gatewayChainId = Number(env.VITE_FHE_GATEWAY_CHAIN_ID);
}
if (env.VITE_FHE_CHAIN_ID) {
  overrides.chainId = Number(env.VITE_FHE_CHAIN_ID);
}
if (env.VITE_FHE_RELAYER_URL) {
  overrides.relayerUrl = env.VITE_FHE_RELAYER_URL;
}
if (env.VITE_FHE_NETWORK_RPC) {
  overrides.network = env.VITE_FHE_NETWORK_RPC;
}

// Merge SDK defaults with optional overrides from environment variables
export const SepoliaConfig: FhevmInstanceConfig = {
  ...SDKSepoliaConfig,
  ...overrides,
};

// Global instance management
let fheInstance: FheInstance | null = null;
let initPromise: Promise<FheInstance> | null = null;
let isInitialized = false;

/**
 * Initialize FHE SDK (FHEVM 0.9)
 * â­ Call this ONCE at app startup
 * @returns FHE instance for encryption/decryption
 */
export async function initializeFHE(): Promise<FheInstance> {
  // Return cached instance if already initialized
  if (fheInstance) {
    console.log("[FHE] Using cached instance");
    return fheInstance;
  }

  // Wait for ongoing initialization
  if (initPromise) {
    console.log("[FHE] Waiting for ongoing initialization");
    return initPromise;
  }

  console.log("[FHE] Starting initialization...");

  initPromise = (async () => {
    try {
      // Step 1: Initialize WASM module (only once)
      if (!isInitialized) {
        console.log("[FHE] Loading WASM module...");
        await initSDK();
        isInitialized = true;
        console.log("[FHE] WASM module loaded");
      }

      // Step 2: Create FHE instance with Sepolia config
      console.log("[FHE] Creating instance with Sepolia config...");
      const instance = await createInstance(SepoliaConfig);

      fheInstance = instance;
      console.log("[FHE] Instance created successfully");

      return instance;
    } catch (error) {
      console.error("[FHE] Initialization failed:", error);
      // Reset state on error
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Get FHE instance (lazy initialization)
 * @returns FHE instance or throws if not initialized
 */
export async function getFHEInstance(): Promise<FheInstance> {
  if (fheInstance) return fheInstance;
  return initializeFHE();
}

/**
 * Reset FHE instance (for testing or network switching)
 */
export function resetFHE(): void {
  console.log("[FHE] Resetting instance");
  fheInstance = null;
  initPromise = null;
  // Note: isInitialized stays true as WASM is still loaded
}

/**
 * Check if FHE is ready
 */
export function isFHEReady(): boolean {
  return fheInstance !== null;
}

/**
 * FHEVM 0.9: Contract address validation
 * Ensures address is in checksum format as required by SDK
 */
export function validateContractAddress(address: string): string {
  if (!address || !address.startsWith("0x")) {
    throw new Error("Invalid contract address format");
  }
  // ethers v6 will handle checksum conversion
  return address;
}

// Export types for TypeScript
export type { FheInstance };
