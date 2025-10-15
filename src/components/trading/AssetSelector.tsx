import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface AssetSelectorProps {
  assets: any[];
  selectedAsset: any;
  onSelectAsset: (asset: any) => void;
}

const AssetSelector = ({ assets, selectedAsset, onSelectAsset }: AssetSelectorProps) => {
  return (
    <Card className="p-4 overflow-x-auto">
      <div className="flex gap-3">
        {assets.map((asset) => {
          const isPositive = Number(asset.price_change_24h) >= 0;
          const isSelected = selectedAsset?.id === asset.id;

          return (
            <button
              key={asset.id}
              onClick={() => onSelectAsset(asset)}
              className={cn(
                "flex-shrink-0 px-4 py-3 rounded-lg transition-all",
                "hover:scale-105 active:scale-95",
                isSelected
                  ? "bg-primary/20 border-2 border-primary"
                  : "bg-secondary/50 border border-border hover:bg-secondary"
              )}
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{asset.symbol}</span>
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4 text-success" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-left">
                    {asset.name}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="font-mono font-semibold">
                    ${Number(asset.current_price).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                  <p className={cn(
                    "text-xs font-medium",
                    isPositive ? "text-success" : "text-destructive"
                  )}>
                    {isPositive ? "+" : ""}
                    {Number(asset.price_change_24h).toFixed(2)}%
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

export default AssetSelector;
