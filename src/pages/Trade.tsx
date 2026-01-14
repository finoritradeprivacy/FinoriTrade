import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSimTrade } from "@/contexts/SimTradeContext";
import Header from "@/components/trading/Header";
import AssetSelector from "@/components/trading/AssetSelector";
import { TradingChart } from "@/components/trading/TradingChart";

import OrderForm from "@/components/trading/OrderForm";
import Portfolio from "@/components/trading/Portfolio";
import OpenOrders from "@/components/trading/OpenOrders";
import TradeHistory from "@/components/trading/TradeHistory";
import NewsFeed from "@/components/trading/NewsFeed";
import PlayerProfile from "@/components/trading/PlayerProfile";
import { PriceAlerts } from "@/components/trading/PriceAlerts";
import { ConnectionStatus } from "@/components/trading/ConnectionStatus";
import MarketTicker from "@/components/trading/MarketTicker";

interface AssetLite {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number | null;
  category: "crypto" | "stocks" | "forex";
  dividend_yield?: number;
}

const Trade = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { prices } = useSimTrade();
  const [selectedAsset, setSelectedAsset] = useState<AssetLite | null>(null);
  const [assets, setAssets] = useState<AssetLite[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTradeSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const base: Omit<AssetLite, "current_price" | "price_change_24h">[] = [
      { id: "BTC", symbol: "BTC", name: "Bitcoin", category: "crypto" },
      { id: "ETH", symbol: "ETH", name: "Ethereum", category: "crypto" },
      { id: "SOL", symbol: "SOL", name: "Solana", category: "crypto" },
      { id: "BNB", symbol: "BNB", name: "BNB", category: "crypto" },
      { id: "XRP", symbol: "XRP", name: "XRP", category: "crypto" },
      { id: "DOGE", symbol: "DOGE", name: "Dogecoin", category: "crypto" },
      { id: "ADA", symbol: "ADA", name: "Cardano", category: "crypto" },
    ];
    const withPrices: AssetLite[] = base.map(a => ({
      ...a,
      current_price: prices[a.symbol] || 0,
      price_change_24h: null,
    }));
    setAssets(withPrices);
    setSelectedAsset(withPrices[0]);
  }, [prices]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <AssetSelector
            assets={assets}
            selectedAsset={selectedAsset}
            onSelectAsset={setSelectedAsset}
          />
          <ConnectionStatus assetId={selectedAsset?.id} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-9 space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-2">
                <TradingChart asset={selectedAsset} />
              </div>
              <div className="xl:col-span-1">
                <NewsFeed />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <OpenOrders refreshTrigger={refreshTrigger} />
              <TradeHistory refreshTrigger={refreshTrigger} />
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <PlayerProfile />
            <PriceAlerts assets={assets} selectedAsset={selectedAsset} />
            <OrderForm asset={selectedAsset} onTradeSuccess={handleTradeSuccess} />
            <Portfolio refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>
      
      <MarketTicker />
    </div>
  );
};

export default Trade;
