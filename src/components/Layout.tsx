import { Link, useLocation } from "react-router-dom";
import { Shield, Wallet, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { formatAccount, useWallet } from "@/hooks/use-wallet";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { account, connectWallet, isConnecting } = useWallet();
  
  const navItems = [
    { path: "/", label: "Marketplace" },
    { path: "/create", label: "Create Offer" },
    { path: "/my-offers", label: "My Offers" },
    { path: "/my-purchases", label: "My Purchases" },
    { path: "/dashboard", label: "Dashboard" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Shield className="h-8 w-8 text-primary transition-all group-hover:scale-110" />
              <div className="absolute inset-0 blur-lg bg-primary/30 group-hover:bg-primary/50 transition-all" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              ChronoShield
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === item.path
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="cyber"
              size="sm"
              className="hidden md:flex"
              onClick={connectWallet}
              disabled={isConnecting}
            >
              <Wallet className="h-4 w-4 mr-2" />
              {account
                ? formatAccount(account)
                : isConnecting
                ? "Connecting..."
                : "Connect Wallet"}
            </Button>
            
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur">
            <div className="container px-4 py-4 flex flex-col gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    location.pathname === item.path
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Button
                variant="cyber"
                size="sm"
                className="w-full"
                onClick={async () => {
                  await connectWallet();
                  setMobileMenuOpen(false);
                }}
                disabled={isConnecting}
              >
                <Wallet className="h-4 w-4 mr-2" />
                {account
                  ? formatAccount(account)
                  : isConnecting
                  ? "Connecting..."
                  : "Connect Wallet"}
              </Button>
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="container px-4 py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/50 backdrop-blur mt-auto">
        <div className="container px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                © 2024 ChronoShield. Secure time-based marketplace.
              </span>
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">
                Docs
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                Discord
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
