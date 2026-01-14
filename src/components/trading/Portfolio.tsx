import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useSimTrade } from "@/contexts/SimTradeContext";

interface PositionItem {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  avgBuyPrice: number;
  quantity: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  isProfit: boolean;
}

const Portfolio = ({ refreshTrigger }: { refreshTrigger: number }) => {
  const { holdings, prices } = useSimTrade();
  const positions: PositionItem[] = Object.entries(holdings)
    .filter(([, h]) => h.quantity > 0)
    .map(([symbol, h]) => {
      const currentPrice = Number(prices[symbol] ?? h.averageBuyPrice ?? 0);
      const quantity = Number(h.quantity);
      const avgBuyPrice = Number(h.averageBuyPrice ?? 0);
      const currentValue = currentPrice * quantity;
      const invested = avgBuyPrice * quantity;
      const pnl = currentValue - invested;
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
      const isProfit = pnl >= 0;
      return {
        id: symbol,
        symbol,
        name: symbol,
        currentPrice,
        avgBuyPrice,
        quantity,
        currentValue,
        pnl,
        pnlPercent,
        isProfit
      };
    });

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Portfolio</h3>
      
      {positions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No positions yet</p>
          <p className="text-sm mt-1">Start trading to build your portfolio</p>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((position) => {
            return (
              <div
                key={position.id}
                className="p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{position.symbol}</span>
                      {position.isProfit ? (
                        <TrendingUp className="w-3 h-3 text-success" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-destructive" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {position.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold">
                      {position.quantity.toFixed(4)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${position.currentValue.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground">Avg: </span>
                    <span className="font-mono">${position.avgBuyPrice.toFixed(2)}</span>
                  </div>
                  <div className={position.isProfit ? "text-success" : "text-destructive"}>
                    <span className="font-mono font-semibold">
                      {position.isProfit ? "+" : ""}${position.pnl.toFixed(2)}
                    </span>
                    <span className="ml-1">
                      ({position.isProfit ? "+" : ""}{position.pnlPercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default Portfolio;
