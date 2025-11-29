/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTRACT_ADDRESS?: string;
  readonly VITE_SEPOLIA_RPC_URL?: string;
  readonly VITE_SEPOLIA_CHAIN_ID?: string;
  readonly VITE_DEPLOY_BLOCK?: string;
  readonly VITE_FHE_ACL_ADDRESS?: string;
  readonly VITE_FHE_KMS_ADDRESS?: string;
  readonly VITE_FHE_INPUT_VERIFIER_ADDRESS?: string;
  readonly VITE_FHE_DECRYPTION_CONTRACT_ADDRESS?: string;
  readonly VITE_FHE_INPUT_VERIFICATION_CONTRACT_ADDRESS?: string;
  readonly VITE_FHE_GATEWAY_CHAIN_ID?: string;
  readonly VITE_FHE_CHAIN_ID?: string;
  readonly VITE_FHE_RELAYER_URL?: string;
  readonly VITE_FHE_NETWORK_RPC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
