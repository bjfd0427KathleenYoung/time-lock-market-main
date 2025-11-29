import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  DollarSign,
  Users,
  Shield,
  Settings,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { formatEther } from "ethers";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/use-wallet";
import {
  fetchContractStats,
  fetchPlatformSettings,
  getContractWithSigner,
} from "@/lib/contract-client";
import type { ContractStats } from "@/types/contract";

const formatBigInt = (value: bigint) => Number(value);

export default function Dashboard() {
  const { toast } = useToast();
  const { provider, account, connectWallet, isConnecting } = useWallet();
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [settings, setSettings] = useState<{
    platformFeeBp: bigint;
    treasury: string;
    owner: string;
  } | null>(null);
  const [platformFeeInput, setPlatformFeeInput] = useState<string>("0");
  const [treasuryInput, setTreasuryInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOwner = useMemo(() => {
    if (!settings?.owner || !account) return false;
    return settings.owner.toLowerCase() === account.toLowerCase();
  }, [settings, account]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [contractStats, platformSettings] = await Promise.all([
        fetchContractStats(),
        fetchPlatformSettings(),
      ]);
      setStats(contractStats);
      setSettings(platformSettings);
      setPlatformFeeInput((Number(platformSettings.platformFee) / 100).toString());
      setTreasuryInput(platformSettings.treasury);
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateFee = async () => {
    if (!provider) {
      await connectWallet();
      return;
    }
    const percent = Number(platformFeeInput);
    if (!Number.isFinite(percent) || percent < 0) {
      toast({
        title: "Invalid fee",
        description: "Enter a valid percentage (e.g., 5 for 5%).",
        variant: "destructive",
      });
      return;
    }

    const basisPoints = Math.round(percent * 100);

    setActionLoading("fee");
    try {
      const contract = await getContractWithSigner(provider);
      const tx = await contract.updatePlatformFee(BigInt(basisPoints));
      toast({
        title: "Transaction Submitted",
        description: `Updating platform fee... TX: ${tx.hash.slice(0, 10)}...`,
      });
      await tx.wait();
      toast({
        title: "Platform Fee Updated",
        description: `New platform fee is ${percent.toFixed(2)}%.`,
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Failed to update platform fee",
        description: error?.message || "Unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateTreasury = async () => {
    if (!provider) {
      await connectWallet();
      return;
    }
    if (!treasuryInput || !treasuryInput.startsWith("0x") || treasuryInput.length !== 42) {
      toast({
        title: "Invalid treasury",
        description: "Enter a valid Ethereum address.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading("treasury");
    try {
      const contract = await getContractWithSigner(provider);
      const tx = await contract.updateTreasury(treasuryInput);
      toast({
        title: "Transaction Submitted",
        description: `Updating treasury... TX: ${tx.hash.slice(0, 10)}...`,
      });
      await tx.wait();
      toast({
        title: "Treasury Updated",
        description: `Treasury address updated to ${treasuryInput}.`,
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Failed to update treasury",
        description: error?.message || "Unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEmergencyWithdraw = async () => {
    if (!provider) {
      await connectWallet();
      return;
    }
    setActionLoading("withdraw");
    try {
      const contract = await getContractWithSigner(provider);
      const tx = await contract.emergencyWithdraw();
      toast({
        title: "Transaction Submitted",
        description: `Withdrawing funds... TX: ${tx.hash.slice(0, 10)}...`,
      });
      await tx.wait();
      toast({
        title: "Emergency Withdrawal Completed",
        description: "Funds have been transferred to the owner.",
      });
    } catch (error: any) {
      toast({
        title: "Withdrawal failed",
        description: error?.message || "Unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-cyber bg-clip-text text-transparent">
            Contract Dashboard
          </h1>
          <p className="text-muted-foreground">
            View contract statistics and manage platform settings.
          </p>
        </div>
        <div className="flex gap-2">
          {!account && (
            <Button onClick={connectWallet} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
          <Button variant="outline" onClick={loadData} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-destructive/40 bg-destructive/10 text-sm text-destructive">
          {error}
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-card backdrop-blur border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Offers</p>
              <p className="text-2xl font-bold">
                {stats ? formatBigInt(stats.totalOffersCreated) : "--"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-card backdrop-blur border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Offers</p>
              <p className="text-2xl font-bold">
                {stats ? formatBigInt(stats.activeOffersCount) : "--"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-card backdrop-blur border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyber-pink/20">
              <Users className="h-5 w-5 text-cyber-pink" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Purchases</p>
              <p className="text-2xl font-bold">
                {stats ? formatBigInt(stats.totalPurchases) : "--"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-card backdrop-blur border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Volume</p>
              <p className="text-2xl font-bold">
                {stats ? `${Number(formatEther(stats.totalVolume)).toFixed(4)} ETH` : "--"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-gradient-card backdrop-blur border-border/40">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Platform Settings</h2>
        </div>
        {settings ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Platform Fee</p>
              <p className="text-xl font-bold">
                {(Number(settings.platformFeeBp) / 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Treasury Address</p>
              <code className="text-sm bg-background/50 px-2 py-1 rounded block">
                {settings.treasury}
              </code>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Owner</p>
              <code className="text-sm bg-background/50 px-2 py-1 rounded block">
                {settings.owner}
              </code>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Loading platform settings...</p>
        )}
      </Card>

      {isOwner ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-cyber-pink" />
            <h2 className="text-2xl font-bold">Owner Controls</h2>
            <Badge variant="destructive" className="ml-2">
              Owner Only
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 bg-gradient-card backdrop-blur border-border/40 space-y-4">
              <h3 className="font-semibold text-lg">Update Platform Fee</h3>
              <Label htmlFor="platform-fee">Fee Percentage (%)</Label>
              <Input
                id="platform-fee"
                type="number"
                min="0"
                step="0.01"
                value={platformFeeInput}
                onChange={(e) => setPlatformFeeInput(e.target.value)}
              />
              <Button onClick={handleUpdateFee} disabled={actionLoading === "fee"}>
                {actionLoading === "fee" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Fee
              </Button>
            </Card>

            <Card className="p-6 bg-gradient-card backdrop-blur border-border/40 space-y-4">
              <h3 className="font-semibold text-lg">Update Treasury Address</h3>
              <Label htmlFor="treasury">Treasury Address</Label>
              <Input
                id="treasury"
                value={treasuryInput}
                onChange={(e) => setTreasuryInput(e.target.value)}
              />
              <Button onClick={handleUpdateTreasury} disabled={actionLoading === "treasury"}>
                {actionLoading === "treasury" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Treasury
              </Button>
            </Card>
          </div>

          <Card className="p-6 bg-gradient-card backdrop-blur border-border/40 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              Emergency Withdrawal
              <Badge variant="destructive">Danger</Badge>
            </h3>
            <p className="text-sm text-muted-foreground">
              Withdraw all contract funds to your wallet. Use only in emergencies.
            </p>
            <Button
              variant="destructive"
              onClick={handleEmergencyWithdraw}
              disabled={actionLoading === "withdraw"}
            >
              {actionLoading === "withdraw" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Emergency Withdraw
            </Button>
          </Card>
        </div>
      ) : (
        <Card className="p-4 text-sm text-muted-foreground border-border/40">
          Connect with the owner wallet to access admin controls.
        </Card>
      )}
    </div>
  );
}
