import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Marketplace from "./pages/Marketplace";
import CreateOffer from "./pages/CreateOffer";
import OfferDetail from "./pages/OfferDetail";
import MyOffers from "./pages/MyOffers";
import MyPurchases from "./pages/MyPurchases";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { WalletProvider } from "@/hooks/use-wallet";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <WalletProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Marketplace />} />
              <Route path="/create" element={<CreateOffer />} />
              <Route path="/offer/:id" element={<OfferDetail />} />
              <Route path="/my-offers" element={<MyOffers />} />
              <Route path="/my-purchases" element={<MyPurchases />} />
              <Route path="/dashboard" element={<Dashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </WalletProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
