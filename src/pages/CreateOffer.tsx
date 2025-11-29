import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Lock, DollarSign, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseEther } from "ethers";
import { contractAddress, getContractWithSigner } from "@/lib/contract-client";
import { useEncrypt } from "@/hooks/useFHE";
import { useWallet } from "@/hooks/use-wallet";

export default function CreateOffer() {
  const { toast } = useToast();
  const { provider, account, connectWallet } = useWallet();
  const { encryptBatch, isEncrypting } = useEncrypt();
  const [isStandardSubmitting, setIsStandardSubmitting] = useState(false);
  const [isFheSubmitting, setIsFheSubmitting] = useState(false);

  const ensureWallet = async () => {
    if (!provider) {
      throw new Error("Wallet provider unavailable. Please install MetaMask.");
    }

    let userAccount = account;
    if (!userAccount) {
      userAccount = await connectWallet();
    }

    if (!userAccount) {
      throw new Error("Please connect your wallet to continue.");
    }

    return { provider, account: userAccount };
  };

  const validatePositiveNumber = (value: string, field: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`${field} must be greater than zero.`);
    }
    return parsed;
  };

  const handleStandardSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;

    try {
      setIsStandardSubmitting(true);
      const { provider } = await ensureWallet();
      const formData = new FormData(form);

      const title = String(formData.get("title") ?? "").trim();
      const description = String(formData.get("description") ?? "").trim();
      const price = String(formData.get("price") ?? "0");
      validatePositiveNumber(price, "Price");
      const slots = validatePositiveNumber(String(formData.get("slots") ?? "0"), "Slots");
      const durationDays = validatePositiveNumber(
        String(formData.get("duration") ?? "0"),
        "Duration",
      );

      if (!title || !description) {
        throw new Error("Title and description are required.");
      }

      if (!contractAddress) {
        throw new Error("Contract address is not configured. Please set VITE_CONTRACT_ADDRESS.");
      }

      const priceWei = parseEther(price);
      const contract = await getContractWithSigner(provider);

      const tx = await contract.createOffer(
        title,
        description,
        priceWei,
        BigInt(Math.ceil(durationDays)),
        BigInt(Math.ceil(slots)),
      );

      toast({
        title: "Transaction Submitted",
        description: `Creating offer... TX: ${tx.hash.slice(0, 10)}...`,
      });

      await tx.wait();

      toast({
        title: "Offer Created Successfully!",
        description: "Your offer is now live on the marketplace.",
      });

      form.reset();
    } catch (error: any) {
      toast({
        title: "Failed to create offer",
        description: error?.message || "Unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsStandardSubmitting(false);
    }
  };

  const handleFHESubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;

    try {
      setIsFheSubmitting(true);
      const { provider, account } = await ensureWallet();
      const formData = new FormData(form);

      const title = String(formData.get("fhe-title") ?? "").trim();
      const description = String(formData.get("fhe-description") ?? "").trim();
      const price = String(formData.get("fhe-price") ?? "0");
      validatePositiveNumber(price, "Price");
      const slots = validatePositiveNumber(String(formData.get("fhe-slots") ?? "0"), "Slots");
      const durationDays = validatePositiveNumber(
        String(formData.get("fhe-duration") ?? "0"),
        "Duration",
      );

      if (!title || !description) {
        throw new Error("Title and description are required.");
      }

      const priceWei = parseEther(price);
      const slotsCount = BigInt(Math.ceil(slots));
      const duration = BigInt(Math.ceil(durationDays));

      const { handles, proof } = await encryptBatch(contractAddress, account, [
        { value: priceWei, type: "uint64" },
        { value: duration, type: "uint32" },
        { value: slotsCount, type: "uint32" },
      ]);

      if (handles.length < 3) {
        throw new Error("Encryption failed to produce all required handles.");
      }

      const contract = await getContractWithSigner(provider);
      const tx = await contract.createOfferWithFHE(
        title,
        description,
        priceWei,
        duration,
        slotsCount,
        handles[0],
        handles[1],
        handles[2],
        proof,
      );

      toast({
        title: "Transaction Submitted",
        description: `Submitting encrypted offer... TX: ${tx.hash.slice(0, 10)}...`,
      });

      await tx.wait();

      toast({
        title: "FHE Offer Created!",
        description: "Your encrypted offer has been published with full privacy protection.",
      });

      form.reset();
    } catch (error: any) {
      toast({
        title: "Failed to create encrypted offer",
        description: error?.message || "Unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsFheSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-4 bg-gradient-cyber bg-clip-text text-transparent">
          Create New Offer
        </h1>
        <p className="text-muted-foreground">
          Create time-based offers with standard pricing or FHE encryption for maximum privacy
        </p>
      </div>

      {/* Form Tabs */}
      <Tabs defaultValue="standard" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="standard" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Standard Offer
          </TabsTrigger>
          <TabsTrigger value="fhe" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            FHE Encrypted
          </TabsTrigger>
        </TabsList>

        {/* Standard Offer Form */}
        <TabsContent value="standard">
          <Card className="p-6 bg-gradient-card backdrop-blur border-border/40">
            <form onSubmit={handleStandardSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Offer Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Premium Time Slots Q1 2024"
                  required
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe your offer in detail..."
                  rows={4}
                  required
                  className="bg-background/50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="price" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Price (ETH)
                  </Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.001"
                    placeholder="0.5"
                    required
                    className="bg-background/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slots" className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-accent" />
                    Total Slots
                  </Label>
                  <Input
                    id="slots"
                    name="slots"
                    type="number"
                    placeholder="50"
                    required
                    className="bg-background/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration" className="flex items-center gap-2">
                  Duration (days)
                </Label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  placeholder="30"
                  min="1"
                  required
                  className="bg-background/50"
                />
              </div>

              <Button
                type="submit"
                variant="cyber"
                className="w-full"
                disabled={isStandardSubmitting}
              >
                {isStandardSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Offer...
                  </span>
                ) : (
                  "Create Standard Offer"
                )}
              </Button>
            </form>
          </Card>
        </TabsContent>

        {/* FHE Encrypted Form */}
        <TabsContent value="fhe">
          <Card className="p-6 bg-gradient-card backdrop-blur border-border/40">
            <div className="mb-6 p-4 bg-cyber-pink/10 border border-cyber-pink/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-cyber-pink shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-cyber-pink">
                    Fully Homomorphic Encryption (FHE)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Price, duration, and slot count will be encrypted on-chain. Only authorized
                    buyers can decrypt after purchase.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleFHESubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fhe-title">Offer Title</Label>
                <Input
                  id="fhe-title"
                  name="fhe-title"
                  placeholder="Enterprise Privacy Package"
                  required
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fhe-description">Description</Label>
                <Textarea
                  id="fhe-description"
                  name="fhe-description"
                  placeholder="Describe your encrypted offer..."
                  rows={4}
                  required
                  className="bg-background/50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fhe-price" className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-cyber-pink" />
                    Encrypted Price (ETH)
                  </Label>
                  <Input
                    id="fhe-price"
                    name="fhe-price"
                    type="number"
                    step="0.001"
                    placeholder="0.5"
                    required
                    className="bg-background/50 border-cyber-pink/30"
                  />
                  <p className="text-xs text-muted-foreground">
                    Will be encrypted before submission
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fhe-slots" className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-cyber-pink" />
                    Encrypted Slots
                  </Label>
                  <Input
                    id="fhe-slots"
                    name="fhe-slots"
                    type="number"
                    placeholder="20"
                    required
                    className="bg-background/50 border-cyber-pink/30"
                  />
                  <p className="text-xs text-muted-foreground">
                    Will be encrypted before submission
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fhe-duration" className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-cyber-pink" />
                  Encrypted Duration (days)
                </Label>
                <Input
                  id="fhe-duration"
                  name="fhe-duration"
                  type="number"
                  placeholder="30"
                  min="1"
                  required
                  className="bg-background/50 border-cyber-pink/30"
                />
                <p className="text-xs text-muted-foreground">
                  Will be encrypted before submission
                </p>
              </div>

              <Button
                type="submit"
                variant="cyber"
                className="w-full"
                disabled={isFheSubmitting || isEncrypting}
              >
                {isFheSubmitting || isEncrypting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Encrypting & Publishing...
                  </span>
                ) : (
                  "Create FHE Offer"
                )}
              </Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
