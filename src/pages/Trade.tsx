import { useEffect, useRef, useState } from "react";
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

import { ASSETS } from "@/data/assets";

const STATIC_BASE_PRICES: Record<string, number> = {
  BTC: 45000,
  ETH: 2500,
  SOL: 100,
  BNB: 600,
  XRP: 0.55,
  DOGE: 0.08,
  ADA: 0.5,
  AAPL: 175,
  MSFT: 380,
  GOOGL: 140,
  TSLA: 250,
  AMZN: 155,
  "EUR/USD": 1.09,
  "GBP/USD": 1.27,
  "USD/JPY": 149,
  "AUD/USD": 0.65,
  "USD/CAD": 1.36,
};

const Trade = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { prices } = useSimTrade();
  const [selectedAsset, setSelectedAsset] = useState<AssetLite | null>(null);
  const [assets, setAssets] = useState<AssetLite[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const initialPricesRef = useRef<Record<string, number>>({});

  const handleTradeSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    Object.entries(prices).forEach(([symbol, price]) => {
      if (price > 0 && initialPricesRef.current[symbol] == null) {
        initialPricesRef.current[symbol] = price;
      }
    });

    const withPrices: AssetLite[] = ASSETS.map(a => {
      const fromContext = prices[a.symbol];
      const fallback = STATIC_BASE_PRICES[a.symbol] ?? 0;
      const current = fromContext ?? fallback;
      const baseline = initialPricesRef.current[a.symbol] ?? current;
      const change = baseline > 0 && current > 0 ? (current - baseline) / baseline : 0;
      return {
        ...a,
        current_price: current,
        price_change_24h: change,
      };
    });

    setAssets(withPrices);
    setSelectedAsset(prev => {
      if (prev) {
        const found = withPrices.find(a => a.id === prev.id);
        return found || withPrices[0] || null;
      }
      return withPrices[0] || null;
    });
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
