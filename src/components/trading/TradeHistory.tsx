import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSimTrade } from "@/contexts/SimTradeContext";
import { ChevronDown, ChevronUp } from "lucide-react";

const TradeHistory = ({ refreshTrigger }: { refreshTrigger: number }) => {
  const { user } = useAuth();
  const { trades } = useSimTrade();
  const [visibleTrades, setVisibleTrades] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;
    setVisibleTrades(trades.slice(0, 50));
  }, [user, trades, refreshTrigger]);

  const displayedTrades = isExpanded ? visibleTrades : visibleTrades.slice(0, 3);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Trades</h3>
        {visibleTrades.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-primary hover:text-primary/80 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      
      {visibleTrades.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No trades yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedTrades.map((trade: any) => (
            <div
              key={trade.id}
              className="p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{trade.symbol}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      trade.side === "buy" 
                        ? "bg-success/20 text-success" 
                        : "bg-destructive/20 text-destructive"
                    }`}>
                      {trade.side.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(trade.createdAt || trade.created_at || Date.now()).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-mono font-semibold">
                    ${Number(trade.price).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="font-mono font-semibold">
                    {Number(trade.quantity).toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default TradeHistory;
