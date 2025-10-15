import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface OrderBookProps {
  asset: any;
}

const OrderBook = ({ asset }: OrderBookProps) => {
  const [bids, setBids] = useState<any[]>([]);
  const [asks, setAsks] = useState<any[]>([]);

  useEffect(() => {
    if (!asset) return;

    // Generate mock order book data
    const basePrice = Number(asset.current_price);
    const newBids = [];
    const newAsks = [];

    for (let i = 0; i < 10; i++) {
      const bidPrice = basePrice - (i + 1) * (basePrice * 0.001);
      const askPrice = basePrice + (i + 1) * (basePrice * 0.001);
      const bidSize = Math.random() * 2 + 0.5;
      const askSize = Math.random() * 2 + 0.5;

      newBids.push({
        price: bidPrice,
        size: bidSize,
        total: bidPrice * bidSize,
      });

      newAsks.push({
        price: askPrice,
        size: askSize,
        total: askPrice * askSize,
      });
    }

    setBids(newBids);
    setAsks(newAsks.reverse());
  }, [asset]);

  if (!asset) return null;

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Order Book</h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground font-medium pb-2 border-b border-border">
          <div className="text-left">Price (USDT)</div>
          <div className="text-right">Size ({asset.symbol})</div>
          <div className="text-right">Total (USDT)</div>
        </div>

        <div className="space-y-1">
          {asks.map((ask, idx) => (
            <div key={`ask-${idx}`} className="grid grid-cols-3 gap-2 text-xs font-mono hover:bg-destructive/10 rounded p-1 transition-colors">
              <div className="text-destructive font-semibold">
                {ask.price.toFixed(2)}
              </div>
              <div className="text-right text-foreground">
                {ask.size.toFixed(4)}
              </div>
              <div className="text-right text-muted-foreground">
                {ask.total.toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <div className="py-3 text-center border-y border-border">
          <p className="text-xl font-bold font-mono text-primary">
            ${Number(asset.current_price).toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">Last Price</p>
        </div>

        <div className="space-y-1">
          {bids.map((bid, idx) => (
            <div key={`bid-${idx}`} className="grid grid-cols-3 gap-2 text-xs font-mono hover:bg-success/10 rounded p-1 transition-colors">
              <div className="text-success font-semibold">
                {bid.price.toFixed(2)}
              </div>
              <div className="text-right text-foreground">
                {bid.size.toFixed(4)}
              </div>
              <div className="text-right text-muted-foreground">
                {bid.total.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default OrderBook;
