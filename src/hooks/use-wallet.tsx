import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BrowserProvider } from "ethers";
import { useToast } from "@/hooks/use-toast";

type WalletContextValue = {
  account: string | null;
  isConnecting: boolean;
  hasProvider: boolean;
  provider: BrowserProvider | null;
  connectWallet: () => Promise<string | null>;
};

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const getEthereum = () =>
  typeof window !== "undefined"
    ? ((window as typeof window & { ethereum?: any }).ethereum ?? null)
    : null;

export const formatAccount = (value: string) =>
  `${value.slice(0, 6)}...${value.slice(-4)}`;

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async (): Promise<string | null> => {
    const ethereum = getEthereum();

    if (!ethereum?.request) {
      toast({
        title: "Wallet not detected",
        description: "Install MetaMask or an EVM-compatible wallet to continue.",
        variant: "destructive",
      });
      return null;
    }

    setIsConnecting(true);
    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });

      if (!accounts?.length) {
        toast({
          title: "No accounts available",
          description: "Unlock your wallet and try again.",
          variant: "destructive",
        });
        return null;
      }

      setAccount(accounts[0]);
      toast({
        title: "Wallet connected",
        description: formatAccount(accounts[0]),
      });
      return accounts[0];
    } catch (error: any) {
      const message =
        error?.code === 4001
          ? "Connection request rejected."
          : error?.message || "Failed to connect wallet.";

      toast({
        title: "Unable to connect",
        description: message,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    const ethereum = getEthereum();

    if (!ethereum?.request) {
      return;
    }

    setProvider(new BrowserProvider(ethereum));

    ethereum
      .request({ method: "eth_accounts" })
      .then((accounts: string[]) => {
        if (accounts?.length) {
          setAccount(accounts[0]);
        }
      })
      .catch(() => {
        /* ignore */
      });

    const handleAccountsChanged = (accounts: string[]) => {
      setAccount(accounts?.length ? accounts[0] : null);
    };

    const handleDisconnect = () => setAccount(null);

    ethereum.on?.("accountsChanged", handleAccountsChanged);
    ethereum.on?.("disconnect", handleDisconnect);

    return () => {
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      ethereum.removeListener?.("disconnect", handleDisconnect);
    };
  }, []);

  const value = useMemo(
    () => ({
      account,
      isConnecting,
      hasProvider: !!provider,
      provider,
      connectWallet,
    }),
    [account, isConnecting, provider],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }

  return context;
}
