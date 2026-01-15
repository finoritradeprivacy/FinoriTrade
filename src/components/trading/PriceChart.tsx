import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Asset } from "@/contexts/SimTradeContext";

interface PriceChartProps {
  asset: any;
}

const PriceChart = ({ asset }: PriceChartProps) => {
  const [chartData, setChartData] = useState<{ time: string; price: number }[]>([]);

  useEffect(() => {
    if (!asset) return;

    // Generate mock price data for demonstration
    const basePrice = Number(asset.current_price);
    const data = [];
    const now = Date.now();
    
    for (let i = 24; i >= 0; i--) {
      const time = new Date(now - i * 3600000);
      const volatility = basePrice * 0.02;
      const price = basePrice + (Math.random() - 0.5) * volatility;
      
      data.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        price: price,
      });
    }
    
    setChartData(data);
  }, [asset]);

  if (!asset) return null;

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{asset.symbol}/USDT</h3>
        <div className="flex items-baseline gap-3">
          <p className="text-3xl font-bold font-mono">
            ${Number(asset.current_price).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
          <p className={Number(asset.price_change_24h) >= 0 ? "text-success" : "text-destructive"}>
            {Number(asset.price_change_24h) >= 0 ? "+" : ""}
            {Number(asset.price_change_24h).toFixed(2)}%
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="time" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default PriceChart;
