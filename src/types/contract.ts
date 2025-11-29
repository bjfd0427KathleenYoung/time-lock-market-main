/**
 * FHEVM 0.9 Contract Type Definitions
 * Time Marketplace Contract Types
 */

export interface Offer {
  id: bigint;
  creator: string;
  title: string;
  description: string;
  publicPrice: bigint;
  duration: bigint;
  slots: bigint;
  availableSlots: bigint;
  isActive: boolean;
  createdAt: bigint;
  expiresAt: bigint;
  // Encrypted fields are handles (bytes32)
  encryptedPrice: string;
  encryptedDuration: string;
  encryptedSlots: string;
}

export interface Purchase {
  offerId: bigint;
  buyer: string;
  slots: bigint;
  totalPrice: bigint;
  timestamp: bigint;
}

export interface ContractStats {
  totalOffersCreated: bigint;
  totalPurchases: bigint;
  totalVolume: bigint;
  activeOffersCount: bigint;
}

// Event types
export interface OfferCreatedEvent {
  offerId: bigint;
  creator: string;
  title: string;
  publicPrice: bigint;
  duration: bigint;
  slots: bigint;
}

export interface OfferPurchasedEvent {
  offerId: bigint;
  buyer: string;
  slots: bigint;
  totalPrice: bigint;
  slotsLeft: bigint;
}

export interface TallyRevealRequestedEvent {
  offerId: bigint;
  priceHandle: string;
  slotsHandle: string;
}

// Form data types
export interface CreateOfferFormData {
  title: string;
  description: string;
  price: string;
  duration: string;
  slots: string;
}

// Encryption result types
export interface EncryptionResult {
  handles: string[];
  proof: string;
}

export interface DecryptionResult {
  clearValues: Record<string, any>;
  cleartexts: string;
  decryptionProof: string;
  values: any[];
}
