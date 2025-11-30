import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Users,
  Shield,
  Lock,
  ArrowLeft,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Offer } from "@/types/contract";
import { fetchOfferById, fetchEncryptedHandles } from "@/lib/contract-client";
import { formatEther } from "ethers";

export default function OfferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [encryptedHandles, setEncryptedHandles] = useState<{
    price: string;
    duration: string;
    slots: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;

    const loadOffer = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const fetchedOffer = await fetchOfferById(id);
        if (!active) return;

        if (!fetchedOffer) {
          setError("Offer not found on the contract.");
          setOffer(null);
          return;
        }

        setOffer(fetchedOffer);

        fetchEncryptedHandles(id)
          .then((handles) => {
            if (active) {
              setEncryptedHandles(handles);
            }
          })
          .catch(() => {
            /* ignore encrypted fetch errors */
          });
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "Failed to load offer.");
        setOffer(null);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadOffer();
    return () => {
      active = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Clock className="h-10 w-10 text-muted-foreground animate-spin" />
        <p className="text-muted-foreground">Loading offer details...</p>
      </div>
    );
  }

  if (!offer || error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">{error ?? "Offer Not Found"}</h2>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Button>
      </div>
    );
  }

  const handlePurchase = () => {
    setIsPurchasing(true);

    // Simulate purchase transaction
    setTimeout(() => {
      setIsPurchasing(false);
      toast({
        title: "Purchase Successful!",
        description: (
          <div className="space-y-2">
            <p>You've successfully purchased {quantity} slot(s).</p>
            <a
              href="https://sepolia.etherscan.io/tx/0x..."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-accent hover:underline text-sm"
            >
              View on Etherscan
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ),
      });
    }, 3000);
  };

  const pricePerSlot = formatEther(offer.publicPrice);
  const totalPriceWei = offer.publicPrice * BigInt(quantity);
  const totalPrice = formatEther(totalPriceWei);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate("/")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Marketplace
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <Card className="p-6 bg-gradient-card backdrop-blur border-border/40">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{offer.title}</h1>
                  <p className="text-sm text-muted-foreground">
                    Created by {offer.creator}
                  </p>
                </div>
                <Badge variant="cyber" className="text-base px-4 py-2">
                  <Lock className="h-4 w-4 mr-2" />
                  FHE Enabled
                </Badge>
              </div>

              <div className="h-px bg-border/40" />

              <p className="text-muted-foreground leading-relaxed">
                {offer.description}
              </p>
            </div>
          </Card>

          {/* Stats Card */}
          <Card className="p-6 bg-gradient-card backdrop-blur border-border/40">
            <h3 className="font-semibold text-lg mb-4">Offer Details</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price per Slot</p>
                    <p className="text-xl font-bold text-primary">{pricePerSlot} ETH</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/20">
                    <Users className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Remaining Slots</p>
                    <p className="text-xl font-bold">
                      {Number(offer.availableSlots)} / {Number(offer.slots)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expiry Date</p>
                    <p className="text-xl font-bold">
                      {new Date(Number(offer.expiresAt) * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* FHE Info Card */}
          {encryptedHandles && (
            <Card className="p-6 bg-cyber-pink/5 border-cyber-pink/20">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-cyber-pink shrink-0 mt-1" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-cyber-pink">
                    FHE Encrypted Fields
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Encrypted Price: </span>
                      <code className="text-xs bg-background/50 px-2 py-1 rounded">
                        {encryptedHandles.price}
                      </code>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Encrypted Duration: </span>
                      <code className="text-xs bg-background/50 px-2 py-1 rounded">
                        {encryptedHandles.duration}
                      </code>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Encrypted Slots: </span>
                      <code className="text-xs bg-background/50 px-2 py-1 rounded">
                        {encryptedHandles.slots}
                      </code>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    These values are encrypted on-chain and will be decrypted after purchase.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Purchase Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-6 bg-gradient-card backdrop-blur border-border/40 sticky top-20">
            <h3 className="font-semibold text-lg mb-4">Purchase Slots</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={offer.remainingSlots}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="bg-background/50"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum: {offer.remainingSlots} slots available
                </p>
              </div>

              <div className="h-px bg-border/40" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price per slot</span>
                  <span className="font-medium">
                    {offer.isEncrypted ? " Encrypted" : `${offer.price} ETH`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-medium">{quantity}</span>
                </div>
                <div className="h-px bg-border/40" />
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">
                    {offer.isEncrypted ? "" : `${totalPrice} ETH`}
                  </span>
                </div>
              </div>

              <Button
                variant="cyber"
                className="w-full"
                onClick={handlePurchase}
                disabled={isPurchasing || offer.remainingSlots === 0}
              >
                {isPurchasing
                  ? "Processing..."
                  : offer.remainingSlots === 0
                  ? "Sold Out"
                  : "Purchase Now"}
              </Button>

              {!offer.isEncrypted && (
                <p className="text-xs text-muted-foreground text-center">
                  Excess ETH will be automatically refunded
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
