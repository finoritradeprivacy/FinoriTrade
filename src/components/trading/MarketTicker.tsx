import { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Asset {
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number | null;
}

const SCROLL_SPEED = 60; // Pixels per second

const MarketTicker = () => {
  const [assets, setAssets] = useState<Asset[]>([
    { symbol: 'BTC', name: 'Bitcoin', current_price: 0, price_change_24h: null },
    { symbol: 'ETH', name: 'Ethereum', current_price: 0, price_change_24h: null },
    { symbol: 'SOL', name: 'Solana', current_price: 0, price_change_24h: null },
    { symbol: 'BNB', name: 'BNB', current_price: 0, price_change_24h: null },
    { symbol: 'XRP', name: 'XRP', current_price: 0, price_change_24h: null },
    { symbol: 'DOGE', name: 'Dogecoin', current_price: 0, price_change_24h: null },
    { symbol: 'ADA', name: 'Cardano', current_price: 0, price_change_24h: null },
  ]);
  const [wsPrices, setWsPrices] = useState<Record<string, number>>({});
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const baselineRef = useRef<Record<string, number>>({});

  // Initialize and subscribe to updates
  useEffect(() => {
    const cryptoSymbols = ['BTC','ETH','SOL','BNB','XRP','DOGE','ADA'];
    const binanceStreams = cryptoSymbols.map(s => `${s.toLowerCase()}usdt@miniTicker`).join('/');
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${binanceStreams}`);
    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      const p = data?.data;
      if (!p || !p.s || !p.c) return;
      const sym = String(p.s).toUpperCase().replace('USDT','');
      const price = Number(p.c);
      setWsPrices(prev => ({ ...prev, [sym]: price }));
      if (price > 0 && baselineRef.current[sym] == null) {
        baselineRef.current[sym] = price;
      }
      const baseline = baselineRef.current[sym] ?? price;
      const change = baseline > 0 ? (price - baseline) / baseline : 0;
      setAssets(prev => prev.map(a => a.symbol === sym ? { ...a, current_price: price, price_change_24h: change } : a));
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, []);

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
          const price = wsPrices[asset.symbol] ?? asset.current_price;
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
