import { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSoundAlerts } from '@/hooks/useSoundAlerts';
import { toast } from 'sonner';
import { useSimTrade } from '@/contexts/SimTradeContext';
interface ConnectionStatusProps {
  assetId?: string;
}
interface MarketMovement {
  symbol: string;
  change: number;
  isPositive: boolean;
}

const SIGNIFICANT_MOVEMENT_THRESHOLD = 3;
export const ConnectionStatus = ({
  assetId
}: ConnectionStatusProps) => {
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('');
  const [recentMovement, setRecentMovement] = useState<MarketMovement | null>(null);
  const previousPricesRef = useRef<Map<string, {
    price: number;
    symbol: string;
  }>>(new Map());
  const {
    playMarketMovementSound,
    soundEnabled
  } = useSoundAlerts();
  const { prices } = useSimTrade();
  useEffect(() => {
    const symbols = Object.keys(prices || {});
    if (symbols.length === 0) return;
    const targetSymbol = assetId && prices[assetId] !== undefined ? assetId : symbols[0];
    const currentPrice = prices[targetSymbol];
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) return;
    const now = new Date();
    setLastUpdate(now);
    setIsConnected(true);
    const previousData = previousPricesRef.current.get(targetSymbol);
    if (previousData && previousData.price > 0) {
      const changePercent = (currentPrice - previousData.price) / previousData.price * 100;
      if (Math.abs(changePercent) >= SIGNIFICANT_MOVEMENT_THRESHOLD) {
        const isPositive = changePercent > 0;
        if (soundEnabled) {
          playMarketMovementSound(isPositive);
        }
        setRecentMovement({
          symbol: targetSymbol,
          change: changePercent,
          isPositive
        });
        toast(isPositive ? 'Significant Price Increase!' : 'Significant Price Drop!', {
          description: `${targetSymbol} ${isPositive ? '📈' : '📉'} ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
          duration: 5000
        });
        setTimeout(() => setRecentMovement(null), 5000);
      }
    }
    previousPricesRef.current.set(targetSymbol, {
      price: currentPrice,
      symbol: targetSymbol
    });
  }, [prices, assetId, playMarketMovementSound, soundEnabled]);

  // Update time since last update every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdate) {
        const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
        if (seconds < 60) {
          setTimeSinceUpdate(`${seconds}s ago`);
        } else if (seconds < 3600) {
          setTimeSinceUpdate(`${Math.floor(seconds / 60)}m ago`);
        } else {
          setTimeSinceUpdate(`${Math.floor(seconds / 3600)}h ago`);
        }

        // Mark as disconnected if no update for 2+ minutes
        if (seconds > 120) {
          setIsConnected(false);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);
  return <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs ${isConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
              {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span>{isConnected ? 'Live prices' : 'No live prices'}</span>
              {timeSinceUpdate && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-1">
                  <Clock className="h-3 w-3" />
                  {timeSinceUpdate}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isConnected ? 'Connected to real-time price feed' : 'Connection lost - prices may be stale'}
            </p>
            {lastUpdate && <p className="text-xs text-muted-foreground">
                Last update: {lastUpdate.toLocaleTimeString()}
              </p>}
          </TooltipContent>
        </Tooltip>

        {recentMovement && <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs animate-pulse ${recentMovement.isPositive ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'}`}>
            {recentMovement.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span className="font-medium">
              {recentMovement.symbol} {recentMovement.change > 0 ? '+' : ''}{recentMovement.change.toFixed(1)}%
            </span>
          </div>}
      </div>
    </TooltipProvider>;
};
