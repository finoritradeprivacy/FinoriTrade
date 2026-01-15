import { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useSimTrade } from "@/contexts/SimTradeContext";
import { ASSETS } from "@/data/assets";

interface Asset {
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number | null;
}

const SCROLL_SPEED = 60; // Pixels per second

const MarketTicker = () => {
  const { prices } = useSimTrade();
  const [assets, setAssets] = useState<Asset[]>(
    ASSETS.map(a => ({
      symbol: a.symbol,
      name: a.name,
      current_price: 0,
      price_change_24h: null
    }))
  );
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const baselineRef = useRef<Record<string, number>>({});

  // Update prices from context
  useEffect(() => {
    setAssets(prev => prev.map(a => {
      const newPrice = prices[a.symbol];
      if (!newPrice) return a;
      
      if (baselineRef.current[a.symbol] == null) {
        baselineRef.current[a.symbol] = newPrice;
      }
      
      const baseline = baselineRef.current[a.symbol] ?? newPrice;
      const change = baseline > 0 ? (newPrice - baseline) / baseline : 0;
      
      return {
        ...a,
        current_price: newPrice,
        price_change_24h: change
      };
    }));
  }, [prices]);

  // Simple CSS-based animation with scroll position tracking
  useEffect(() => {
    if (assets.length === 0) return;

    const animate = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }
      
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;
      
      const movement = SCROLL_SPEED * deltaTime;
      const contentWidth = contentRef.current?.scrollWidth || 0;
      const halfWidth = contentWidth / 2;

      setScrollPosition(prev => {
        const newPos = prev + movement;
        // Reset when we've scrolled past the first set of items
        if (newPos >= halfWidth) {
          return newPos - halfWidth;
        }
        return newPos;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [assets.length]);

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(2);
    return price.toFixed(4);
  };

  const formatChange = (change: number | null) => {
    if (change === null) return "0.00%";
    const percentValue = change * 100; // Convert from decimal (0.0014) to percent (0.14)
    const sign = percentValue >= 0 ? "+" : "";
    return `${sign}${percentValue.toFixed(2)}%`;
  };

  if (assets.length === 0) {
    return null;
  }

  // Duplicate items for seamless loop
  const tickerItems = [...assets, ...assets];

  return (
    <div 
      ref={containerRef}
      className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 overflow-hidden"
    >
      <div 
        ref={contentRef}
        className="flex whitespace-nowrap"
        style={{ 
          transform: `translateX(-${scrollPosition}px)`,
          willChange: 'transform',
        }}
      >
        {tickerItems.map((asset, index) => {
          const isPositive = (asset.price_change_24h || 0) >= 0;
          const price = asset.current_price;
          return (
            <div
              key={`${asset.symbol}-${index}`}
              className="flex items-center gap-2 px-6 py-2 border-r border-border/50"
            >
              <span className="font-semibold text-foreground">{asset.symbol}</span>
              <span className="text-muted-foreground">${formatPrice(price)}</span>
              <span className={`flex items-center gap-1 font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {formatChange(asset.price_change_24h)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MarketTicker;
