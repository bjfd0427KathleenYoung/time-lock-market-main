import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Download, Clock, DollarSign, RefreshCw, Users } from "lucide-react";
import { formatEther } from "ethers";
import { useWallet } from "@/hooks/use-wallet";
import { fetchPurchaseHistory, type PurchaseHistoryItem } from "@/lib/contract-client";

const formatTimestamp = (value: bigint) => {
  if (!value || value === 0n) return "N/A";
  const date = new Date(Number(value) * 1000);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
};

export default function MyPurchases() {
  const { account, connectWallet, isConnecting } = useWallet();
  const [purchases, setPurchases] = useState<PurchaseHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPurchases = useCallback(async () => {
    if (!account) {
      setPurchases([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const history = await fetchPurchaseHistory(account);
      setPurchases(history);
    } catch (err: any) {
      setError(err?.message || "Failed to load purchase history.");
      setPurchases([]);
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const stats = useMemo(() => {
    const totalSpentWei = purchases.reduce((sum, purchase) => sum + purchase.totalPrice, 0n);
    const totalSlots = purchases.reduce((sum, purchase) => sum + purchase.slots, 0n);
    return {
      totalSpentEth: formatEther(totalSpentWei),
      totalSlots: Number(totalSlots),
      totalPurchases: purchases.length,
    };
  }, [purchases]);

  const handleExport = () => {
    if (!purchases.length) {
      return;
    }

    const rows = [
      ["Offer Title", "Quantity", "PricePerSlot(ETH)", "TotalPaid(ETH)", "Timestamp", "TxHash"].join(
        ",",
      ),
      ...purchases.map((purchase) => {
        const title = purchase.offer?.title ?? `Offer #${purchase.offerId.toString()}`;
        const quantity = Number(purchase.slots);
        const pricePerSlot = purchase.offer
          ? Number(formatEther(purchase.offer.publicPrice)).toFixed(6)
          : "N/A";
        const totalPaid = Number(formatEther(purchase.totalPrice)).toFixed(6);
        const timestamp = formatTimestamp(purchase.timestamp);
        const txHash = purchase.txHash ?? "";
        return [title, quantity, pricePerSlot, totalPaid, timestamp, txHash]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",");
      }),
    ];

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `purchases-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground">Connect your wallet to view your purchases.</p>
        <Button onClick={connectWallet} disabled={isConnecting}>
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-cyber bg-clip-text text-transparent">
            My Purchases
          </h1>
          <p className="text-muted-foreground">View your purchase history and transaction details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!purchases.length}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button variant="outline" onClick={loadPurchases} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-card backdrop-blur border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-bold">{Number(stats.totalSpentEth).toFixed(4)} ETH</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-card backdrop-blur border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20">
              <Clock className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Purchases</p>
              <p className="text-2xl font-bold">{stats.totalPurchases}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-card backdrop-blur border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyber-pink/20">
              <Users className="h-5 w-5 text-cyber-pink" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Slots Purchased</p>
              <p className="text-2xl font-bold">{stats.totalSlots}</p>
            </div>
          </div>
        </Card>
      </div>

      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/10 text-sm text-destructive">
          {error}
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Purchase History</h2>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading purchases...</p>
        ) : purchases.length === 0 ? (
          <Card className="p-6 text-muted-foreground border-dashed border-border/60">
            You have not purchased any offers yet.
          </Card>
        ) : (
          <div className="space-y-3">
            {purchases.map((purchase) => {
              const title = purchase.offer?.title ?? `Offer #${purchase.offerId.toString()}`;
              const txHash = purchase.txHash;
              return (
                <Card
                  key={`${purchase.id.toString()}-${purchase.offerId.toString()}`}
                  className="p-6 bg-gradient-card backdrop-blur border-border/40 hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatTimestamp(purchase.timestamp)}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                          <p className="text-lg font-bold text-accent">
                            {Number(purchase.slots)} slots
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Price per Slot</p>
                          <p className="text-lg font-bold">
                            {purchase.offer
                              ? `${Number(formatEther(purchase.offer.publicPrice)).toFixed(4)} ETH`
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
                          <p className="text-lg font-bold text-primary">
                            {Number(formatEther(purchase.totalPrice)).toFixed(4)} ETH
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/40">
                        <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
                        <code className="text-xs bg-background/50 px-2 py-1 rounded block overflow-x-auto">
                          {txHash ?? "Not available"}
                        </code>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 lg:w-48">
                      <Badge variant="default" className="justify-center">
                        Completed
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={!txHash}
                        onClick={() =>
                          txHash &&
                          window.open(`https://sepolia.etherscan.io/tx/${txHash}`, "_blank")
                        }
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on Etherscan
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
