import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Users, DollarSign, Clock, TrendingUp, PowerOff, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatEther } from "ethers";
import { useWallet } from "@/hooks/use-wallet";
import { fetchOffersByCreator, getContractWithSigner } from "@/lib/contract-client";
import type { Offer } from "@/types/contract";

const formatDate = (value: bigint) => {
  if (!value || value === 0n) return "N/A";
  const date = new Date(Number(value) * 1000);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
};

const hasEncryptedData = (offer: Offer) =>
  !!offer.encryptedPrice && offer.encryptedPrice !== "0x" && offer.encryptedPrice !== "0x00";

export default function MyOffers() {
  const { toast } = useToast();
  const { account, provider, connectWallet, isConnecting } = useWallet();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<bigint | null>(null);

  const loadOffers = useCallback(async () => {
    if (!account) {
      setOffers([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const creatorOffers = await fetchOffersByCreator(account);
      setOffers(creatorOffers);
    } catch (err: any) {
      setError(err?.message || "Failed to load your offers.");
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const stats = useMemo(() => {
    const totalRevenueWei = offers.reduce((sum, offer) => {
      const soldSlots = offer.slots > offer.availableSlots ? offer.slots - offer.availableSlots : 0n;
      return sum + offer.publicPrice * soldSlots;
    }, 0n);

    const totalSold = offers.reduce((sum, offer) => {
      const soldSlots = offer.slots > offer.availableSlots ? offer.slots - offer.availableSlots : 0n;
      return sum + soldSlots;
    }, 0n);

    const activeOffers = offers.filter((offer) => offer.isActive).length;

    return {
      totalRevenueEth: formatEther(totalRevenueWei),
      totalSoldSlots: Number(totalSold),
      activeOffers,
      totalOffers: offers.length,
    };
  }, [offers]);

  const handleDeactivate = async (offerId: bigint) => {
    if (!provider) {
      await connectWallet();
      return;
    }

    setDeactivatingId(offerId);
    try {
      const contract = await getContractWithSigner(provider);
      const tx = await contract.deactivateOffer(offerId);
      toast({
        title: "Transaction Submitted",
        description: `Deactivating offer... TX: ${tx.hash.slice(0, 10)}...`,
      });
      await tx.wait();
      toast({
        title: "Offer Deactivated",
        description: `Offer #${offerId.toString()} is now inactive.`,
      });
      await loadOffers();
    } catch (error: any) {
      toast({
        title: "Failed to deactivate offer",
        description: error?.message || "Unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setDeactivatingId(null);
    }
  };

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground">Connect your wallet to manage your offers.</p>
        <Button onClick={connectWallet} disabled={isConnecting}>
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-cyber bg-clip-text text-transparent">
            My Offers
          </h1>
          <p className="text-muted-foreground">
            Manage your created offers and track performance using on-chain data.
          </p>
        </div>
        <Button variant="outline" onClick={loadOffers} disabled={isLoading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-card backdrop-blur border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">{Number(stats.totalRevenueEth).toFixed(4)} ETH</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card backdrop-blur border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Slots Sold</p>
              <p className="text-2xl font-bold">{stats.totalSoldSlots}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card backdrop-blur border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyber-pink/20">
              <TrendingUp className="h-5 w-5 text-cyber-pink" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Offers</p>
              <p className="text-2xl font-bold">{stats.activeOffers}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card backdrop-blur border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Offers</p>
              <p className="text-2xl font-bold">{stats.totalOffers}</p>
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
        <h2 className="text-2xl font-bold">Your Offers</h2>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading offers...</p>
        ) : offers.length === 0 ? (
          <Card className="p-6 text-muted-foreground border-dashed border-border/60">
            You have not created any offers yet.
          </Card>
        ) : (
          offers.map((offer) => {
            const soldSlots =
              offer.slots > offer.availableSlots ? offer.slots - offer.availableSlots : 0n;
            const sellRate =
              Number(offer.slots) > 0
                ? Math.round((Number(soldSlots) / Number(offer.slots)) * 100)
                : 0;

            return (
              <Card
                key={offer.id.toString()}
                className="p-6 bg-gradient-card backdrop-blur border-border/40"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold">{offer.title}</h3>
                          {hasEncryptedData(offer) && (
                            <Badge variant="cyber">
                              <Lock className="h-3 w-3 mr-1" />
                              FHE
                            </Badge>
                          )}
                          <Badge variant={offer.isActive ? "default" : "secondary"}>
                            {offer.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span>Price: {Number(formatEther(offer.publicPrice)).toFixed(4)} ETH</span>
                          <span>•</span>
                          <span>
                            Remaining: {Number(offer.availableSlots)}/{Number(offer.slots)}
                          </span>
                          <span>•</span>
                          <span>Expires: {formatDate(offer.expiresAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-border/40">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Sold</p>
                        <p className="text-lg font-bold text-accent">{Number(soldSlots)} slots</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                        <p className="text-lg font-bold text-primary">
                          {Number(
                            formatEther(offer.publicPrice * (soldSlots > 0n ? soldSlots : 0n)),
                          ).toFixed(4)}{" "}
                          ETH
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Sell Rate</p>
                        <p className="text-lg font-bold">{sellRate}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleDeactivate(offer.id)}
                      className="w-full lg:w-40"
                      disabled={!offer.isActive || deactivatingId === offer.id}
                    >
                      {deactivatingId === offer.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deactivating...
                        </>
                      ) : (
                        <>
                          <PowerOff className="h-4 w-4 mr-2" />
                          Deactivate
                        </>
                      )}
                    </Button>
                    <Button variant="outline" className="w-full lg:w-40" asChild>
                      <a href={`/offer/${offer.id.toString()}`} className="text-center">
                        View Details
                      </a>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
