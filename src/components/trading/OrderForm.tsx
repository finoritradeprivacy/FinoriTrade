import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useSimTrade } from "@/contexts/SimTradeContext";
import { toast } from "sonner";
import { z } from "zod";
import { AlertTriangle, Mail } from "lucide-react";

const orderSchema = z.object({
  quantity: z.number()
    .positive({ message: "Quantity must be positive" })
    .max(1000000, { message: "Quantity exceeds maximum limit" })
    .finite({ message: "Quantity must be a valid number" }),
  price: z.number()
    .positive({ message: "Price must be positive" })
    .max(1000000, { message: "Price exceeds maximum limit" })
    .finite({ message: "Price must be a valid number" })
    .optional(),
  stopPrice: z.number()
    .positive({ message: "Stop price must be positive" })
    .max(1000000, { message: "Stop price exceeds maximum limit" })
    .finite({ message: "Stop price must be a valid number" })
    .optional()
});

interface OrderFormProps {
  asset: any;
  onTradeSuccess: () => void;
}

const OrderForm = ({ asset, onTradeSuccess }: OrderFormProps) => {
  const { user, isEmailVerified, isAdmin, resendVerificationEmail } = useAuth();
  const [orderType, setOrderType] = useState("market");
  const [orderSubtype, setOrderSubtype] = useState("standard");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [ownedQuantity, setOwnedQuantity] = useState<number | null>(null);
  const { prices, placeMarketOrder, placeLimitOrder, placeStopOrder } = useSimTrade();

  useEffect(() => {
    const key = `sim_holding_${user?.id}_${asset?.symbol}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setOwnedQuantity(Number(parsed?.quantity) || 0);
      } catch {
        setOwnedQuantity(null);
      }
    } else {
      setOwnedQuantity(null);
    }
  }, [user?.id, asset?.symbol]);

  const handleResendEmail = async () => {
    setSendingEmail(true);
    const { error } = await resendVerificationEmail();
    setSendingEmail(false);
    
    if (error) {
      toast.error(error.message || "Failed to send verification email");
    } else {
      toast.success("Verification email sent! Check your inbox.");
    }
  };

  const handleSubmitOrder = async () => {
    if (!user || !asset) return;

    // Block trading if email not verified (except admins)
    if (!isEmailVerified && !isAdmin) {
      toast.error("Please verify your email before trading");
      return;
    }

    setLoading(true);

    try {
      // Validate inputs with Zod schema
      const validationResult = orderSchema.safeParse({
        quantity: Number(quantity),
        price: (orderType === "limit" || orderType === "stop") ? Number(price) : undefined,
        stopPrice: orderType === "stop" ? Number(stopPrice) : undefined
      });

      if (!validationResult.success) {
        toast.error(validationResult.error.errors[0].message);
        setLoading(false);
        return;
      }

      const current = prices[asset.symbol] || Number(asset.current_price) || 0;
      const orderPrice = orderType === "market" ? current : Number(price);
      const orderQuantity = validationResult.data.quantity;

      if (orderType === "market") {
        if (side === "sell") {
          if (ownedQuantity !== null && ownedQuantity < orderQuantity) {
            toast.error("You don't own enough of this asset to sell");
            setLoading(false);
            return;
          }
        }
        const res = placeMarketOrder(asset.symbol, side, orderQuantity, orderPrice);
        if (!res.ok) {
          toast.error(res.error || "Order failed");
          setLoading(false);
          return;
        }
        toast.success(`${side === "buy" ? "Bought" : "Sold"} ${orderQuantity} ${asset.symbol}`);
        onTradeSuccess();
      } else {
        if (side === "sell") {
          if (ownedQuantity !== null && ownedQuantity < orderQuantity) {
            toast.error("You don't own enough of this asset to sell");
            setLoading(false);
            return;
          }
        }
        if (orderType === "limit") {
          const res = placeLimitOrder(asset.symbol, side, orderQuantity, orderPrice);
          if (!res.ok) {
            toast.error(res.error || "Order failed");
            setLoading(false);
            return;
          }
        } else {
          const res = placeStopOrder(asset.symbol, side, orderQuantity, Number(stopPrice), orderPrice);
          if (!res.ok) {
            toast.error(res.error || "Order failed");
            setLoading(false);
            return;
          }
        }

        const orderTypeLabel = orderType === "stop" ? "Stop" : orderSubtype === "ioc" ? "IOC" : orderSubtype === "fok" ? "FOK" : "Limit";
        toast.success(`${orderTypeLabel} order placed successfully`);
        onTradeSuccess();
      }

      setQuantity("");
      setPrice("");
      setStopPrice("");
    } catch (error: any) {
      toast.error(error.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  if (!asset) return null;

  // Show warning if email not verified
  if (!isEmailVerified && !isAdmin) {
    return (
      <Card className="p-4">
        <div className="bg-warning/20 border border-warning/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-warning">Email Verification Required</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please verify your email to start trading. Check your inbox for the verification link.
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleResendEmail}
                disabled={sendingEmail}
                className="mt-3 border-warning/50 text-warning hover:bg-warning/10"
              >
                <Mail className="w-4 h-4 mr-2" />
                {sendingEmail ? "Sending..." : "Resend Email"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <Tabs value={side} onValueChange={(v) => setSide(v as "buy" | "sell")}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="buy" className="data-[state=active]:bg-success">
            Buy
          </TabsTrigger>
          <TabsTrigger value="sell" className="data-[state=active]:bg-destructive">
            Sell
          </TabsTrigger>
        </TabsList>

        <TabsContent value={side} className="space-y-4">
          <div className="space-y-2">
            <Label>Order Type</Label>
            <Select value={orderType} onValueChange={setOrderType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="limit">Limit</SelectItem>
                <SelectItem value="stop">Stop</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {orderType === "limit" && (
            <div className="space-y-2">
              <Label>Order Execution</Label>
              <Select value={orderSubtype} onValueChange={setOrderSubtype}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="ioc">IOC (Immediate or Cancel)</SelectItem>
                  <SelectItem value="fok">FOK (Fill or Kill)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {(orderType === "limit" || orderType === "stop") && (
            <div className="space-y-2">
              <Label>Price (USDT)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                step="0.01"
              />
            </div>
          )}

          {orderType === "stop" && (
            <div className="space-y-2">
              <Label>Stop Price (USDT)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                step="0.01"
              />
              <p className="text-xs text-muted-foreground">
                Order triggers when price reaches this level
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Quantity ({asset.symbol})</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              step="0.0001"
            />
          </div>

          <div className="p-3 bg-secondary rounded-lg space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-mono font-semibold">
                {quantity && (orderType === "market" || price)
                  ? `${(Number(quantity) * (orderType === "market" ? Number(asset.current_price) : Number(price))).toFixed(2)} USDT`
                  : "0.00 USDT"}
              </span>
            </div>
          </div>

          <Button
            onClick={handleSubmitOrder}
            disabled={loading}
            className={`w-full ${
              side === "buy" 
                ? "bg-success hover:bg-success/90" 
                : "bg-destructive hover:bg-destructive/90"
            }`}
          >
            {loading ? "Processing..." : `${side === "buy" ? "Buy" : "Sell"} ${asset.symbol}`}
          </Button>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default OrderForm;
