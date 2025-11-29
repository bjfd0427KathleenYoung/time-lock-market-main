import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Clock, Users, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { formatEther } from "ethers";
import type { Offer, ContractStats } from "@/types/contract";
import { fetchActiveOffers, fetchContractStats } from "@/lib/contract-client";

export default function Marketplace() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [activeOffers, contractStats] = await Promise.all([
          fetchActiveOffers(),
          fetchContractStats(),
        ]);

        if (!active) return;
        setOffers(activeOffers);
        setStats(contractStats);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "Failed to load marketplace data.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const filteredOffers = useMemo(
    () =>
      offers.filter(
        (offer) =>
          offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          offer.description.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [offers, searchQuery],
  );

  const totalOffers = stats ? Number(stats.totalOffersCreated) : offers.length;
  const activeOffers = stats ? Number(stats.activeOffersCount) : offers.length;
  const totalVolume = stats ? formatEther(stats.totalVolume) : "0";
  const formatDate = (value: bigint) => {
    if (!value) return "N/A";
    const date = new Date(Number(value) * 1000);
    return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-card backdrop-blur p-8 md:p-12">
        <div className="absolute inset-0 bg-gradient-primary opacity-10" />
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-cyber bg-clip-text text-transparent">
            ChronoShield Marketplace
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Discover and purchase time-based offers with blockchain security and optional FHE encryption
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search offers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50 border-border/60"
            />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-card backdrop-blur border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Offers</p>
              <p className="text-2xl font-bold">{totalOffers}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card backdrop-blur border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Offers</p>
              <p className="text-2xl font-bold">{activeOffers}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-card backdrop-blur border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyber-pink/20">
              <Shield className="h-5 w-5 text-cyber-pink" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Volume (ETH)</p>
              <p className="text-2xl font-bold">{Number(totalVolume).toFixed(2)}</p>
            </div>
          </div>
        </Card>
      </div>

      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/10 text-sm text-destructive">
          {error}
        </Card>
      )}

      {/* Offers Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Active Offers</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading offers...</p>
        ) : filteredOffers.length === 0 ? (
          <Card className="p-6 border-dashed border-border/60 text-muted-foreground">
            No offers available. Check back soon.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffers.map((offer) => (
              <Card
                key={offer.id.toString()}
                className="group relative overflow-hidden border-border/40 bg-gradient-card backdrop-blur hover:shadow-glow transition-all duration-300"
              >
                <div className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                      {offer.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {offer.description}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-primary">
                      {formatEther(offer.publicPrice)} ETH
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-accent" />
                        <span className="font-semibold">
                          {Number(offer.availableSlots)}/{Number(offer.slots)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Expires</p>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {formatDate(offer.expiresAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link to={`/offer/${offer.id.toString()}`}>
                    <Button variant="cyber" className="w-full">
                      View Details
                    </Button>
                  </Link>

                  {/* Creator */}
                  <p className="text-xs text-muted-foreground break-all">
                    By {offer.creator}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
