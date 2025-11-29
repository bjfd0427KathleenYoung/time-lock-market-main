import { Contract, Interface, JsonRpcProvider } from "ethers";
import type { BrowserProvider } from "ethers";
import type { ContractStats, Offer, Purchase } from "@/types/contract";
import contractArtifact from "../../contracts/artifacts/contracts/TimeMarketplaceFHE.sol/TimeMarketplaceFHE.json";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
const DEFAULT_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const RPC_URL = import.meta.env.VITE_SEPOLIA_RPC_URL || DEFAULT_RPC;
const CHAIN_ID = Number(import.meta.env.VITE_SEPOLIA_CHAIN_ID || 11155111);
const DEPLOY_BLOCK = import.meta.env.VITE_DEPLOY_BLOCK
  ? BigInt(import.meta.env.VITE_DEPLOY_BLOCK)
  : 0n;

const { abi } = contractArtifact as { abi: any };

export const readOnlyProvider = new JsonRpcProvider(RPC_URL, CHAIN_ID);
export const contractAddress = CONTRACT_ADDRESS;
const marketplaceInterface = new Interface(abi);

const requireContractAddress = () => {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Missing VITE_CONTRACT_ADDRESS environment variable");
  }
  return CONTRACT_ADDRESS;
};

const getMarketplaceContract = () =>
  new Contract(requireContractAddress(), abi, readOnlyProvider);

export async function getContractWithSigner(provider: BrowserProvider) {
  const signer = await provider.getSigner();
  return new Contract(requireContractAddress(), abi, signer);
}

export async function fetchPlatformSettings() {
  const marketplaceContract = getMarketplaceContract();
  const [platformFee, treasury, ownerAddress] = await Promise.all([
    marketplaceContract.getPlatformFee(),
    marketplaceContract.getTreasury(),
    marketplaceContract.owner(),
  ]);

  return {
    platformFee: toBigInt(platformFee),
    treasury,
    owner: ownerAddress as string,
  };
}

const toBigInt = (value: any): bigint => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  if (value && typeof value.toString === "function") {
    return BigInt(value.toString());
  }
  return 0n;
};

const toHandleString = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "bigint") return `0x${value.toString(16)}`;
  if (typeof value === "object") {
    if (typeof value.toHexString === "function") {
      return value.toHexString();
    }
    if ("ciphertext" in value && typeof value.ciphertext === "string") {
      return value.ciphertext;
    }
  }
  return String(value);
};

const mapOfferStruct = (raw: any): Offer => ({
  id: toBigInt(raw?.id ?? raw?.[0] ?? 0n),
  creator: raw?.creator ?? raw?.[1] ?? "",
  title: raw?.title ?? raw?.[2] ?? "",
  description: raw?.description ?? raw?.[3] ?? "",
  publicPrice: toBigInt(raw?.publicPrice ?? raw?.[4] ?? 0n),
  duration: toBigInt(raw?.duration ?? raw?.[5] ?? 0n),
  slots: toBigInt(raw?.slots ?? raw?.[6] ?? 0n),
  availableSlots: toBigInt(raw?.availableSlots ?? raw?.[7] ?? 0n),
  isActive: Boolean(raw?.isActive ?? raw?.[8] ?? false),
  createdAt: toBigInt(raw?.createdAt ?? raw?.[9] ?? 0n),
  expiresAt: toBigInt(raw?.expiresAt ?? raw?.[10] ?? 0n),
  encryptedPrice: toHandleString(raw?.encryptedPrice ?? raw?.[11]),
  encryptedDuration: toHandleString(raw?.encryptedDuration ?? raw?.[12]),
  encryptedSlots: toHandleString(raw?.encryptedSlots ?? raw?.[13]),
});

const mapPurchaseStruct = (raw: any): Purchase => ({
  offerId: toBigInt(raw?.offerId ?? raw?.[0] ?? 0n),
  buyer: raw?.buyer ?? raw?.[1] ?? "",
  slots: toBigInt(raw?.slots ?? raw?.[2] ?? 0n),
  totalPrice: toBigInt(raw?.totalPrice ?? raw?.[3] ?? 0n),
  timestamp: toBigInt(raw?.timestamp ?? raw?.[4] ?? 0n),
});

export async function fetchContractStats(): Promise<ContractStats> {
  const marketplaceContract = getMarketplaceContract();
  const [totalOffersCreated, totalPurchases, totalVolume, activeOffersCount] =
    await marketplaceContract.getContractStats();

  return {
    totalOffersCreated: toBigInt(totalOffersCreated),
    totalPurchases: toBigInt(totalPurchases),
    totalVolume: toBigInt(totalVolume),
    activeOffersCount: toBigInt(activeOffersCount),
  };
}

export async function fetchOfferById(id: bigint | number | string): Promise<Offer | null> {
  const offerId = typeof id === "bigint" ? id : BigInt(id);
  const marketplaceContract = getMarketplaceContract();
  const raw = await marketplaceContract.offers(offerId);
  const offer = mapOfferStruct(raw);
  if (offer.id === 0n) {
    return null;
  }
  return offer;
}

export async function fetchActiveOffers(): Promise<Offer[]> {
  const marketplaceContract = getMarketplaceContract();
  const ids: bigint[] = await marketplaceContract.getActiveOfferIds();
  if (!ids.length) return [];
  const offers = await Promise.all(ids.map((id) => marketplaceContract.offers(id)));
  return offers
    .map(mapOfferStruct)
    .filter((offer) => offer.id !== 0n);
}

export async function fetchOffersByCreator(address: string): Promise<Offer[]> {
  const marketplaceContract = getMarketplaceContract();
  const ids: bigint[] = await marketplaceContract.getUserOffers(address);
  if (!ids.length) return [];
  const offers = await Promise.all(ids.map((id) => marketplaceContract.offers(id)));
  return offers
    .map(mapOfferStruct)
    .filter((offer) => offer.id !== 0n);
}

export async function fetchEncryptedHandles(offerId: bigint | number | string) {
  const normalizedId = typeof offerId === "bigint" ? offerId : BigInt(offerId);
  const marketplaceContract = getMarketplaceContract();
  const [price, duration, slots] = await marketplaceContract.getEncryptedOfferData(normalizedId);
  return {
    price: toHandleString(price),
    duration: toHandleString(duration),
    slots: toHandleString(slots),
  };
}

const buildPurchaseKey = (offerId: bigint, slots: bigint, totalPrice: bigint, timestamp: bigint) =>
  `${offerId}-${slots}-${totalPrice}-${timestamp}`;

export type PurchaseHistoryItem = Purchase & {
  id: bigint;
  txHash?: string | null;
  offer?: Offer;
};

export async function fetchPurchaseHistory(address: string): Promise<PurchaseHistoryItem[]> {
  const marketplaceContract = getMarketplaceContract();
  const ids: bigint[] = await marketplaceContract.getUserPurchases(address);
  if (!ids.length) {
    return [];
  }

  const purchaseStructs = await Promise.all(
    ids.map(async (id) => {
      const raw = await marketplaceContract.purchases(id);
      return { id, purchase: mapPurchaseStruct(raw) };
    }),
  );

  const offerIds = Array.from(new Set(purchaseStructs.map(({ purchase }) => purchase.offerId)));
  const offersEntries = await Promise.all(
    offerIds.map(async (offerId) => {
      const raw = await marketplaceContract.offers(offerId);
      return { offerId, offer: mapOfferStruct(raw) };
    }),
  );
  const offersMap = new Map(offersEntries.map(({ offerId, offer }) => [offerId, offer]));

  const filter = marketplaceContract.filters.OfferPurchased(null, address);
  const logs = await readOnlyProvider.getLogs({
    address: requireContractAddress(),
    topics: filter.topics ?? [],
    fromBlock: DEPLOY_BLOCK,
    toBlock: "latest",
  });

  const blocks = await Promise.all(logs.map((log) => readOnlyProvider.getBlock(log.blockNumber)));
  const eventMap = new Map<string, string>();
  logs.forEach((log, index) => {
    try {
      const parsed = marketplaceInterface.parseLog(log);
      const offerId = toBigInt(parsed.args.offerId);
      const slots = toBigInt(parsed.args.slots);
      const totalPrice = toBigInt(parsed.args.totalPrice);
      const timestamp = toBigInt(blocks[index]?.timestamp ?? 0);
      const key = buildPurchaseKey(offerId, slots, totalPrice, timestamp);
      eventMap.set(key, log.transactionHash);
    } catch {
      /* ignore parse errors */
    }
  });

  return purchaseStructs.map(({ id, purchase }) => {
    const key = buildPurchaseKey(
      purchase.offerId,
      purchase.slots,
      purchase.totalPrice,
      purchase.timestamp,
    );
    return {
      ...purchase,
      id,
      txHash: eventMap.get(key),
      offer: offersMap.get(purchase.offerId),
    };
  });
}
