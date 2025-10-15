import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { X } from "lucide-react";
import { toast } from "sonner";

const OpenOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select(`
          *,
          assets (*)
        `)
        .eq("user_id", user.id)
        .in("status", ["pending", "partially_filled"])
        .order("created_at", { ascending: false });

      if (data) {
        setOrders(data);
      }
    };

    fetchOrders();

    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleCancelOrder = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to cancel order");
    } else {
      toast.success("Order cancelled");
    }
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Open Orders</h3>
      
      {orders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No open orders</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order: any) => (
            <div
              key={order.id}
              className="p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{order.assets.symbol}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      order.side === "buy" 
                        ? "bg-success/20 text-success" 
                        : "bg-destructive/20 text-destructive"
                    }`}>
                      {order.side.toUpperCase()}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                      {order.order_type.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCancelOrder(order.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-mono font-semibold">
                    ${Number(order.price || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="font-mono font-semibold">
                    {Number(order.quantity).toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Filled</p>
                  <p className="font-mono font-semibold">
                    {Number(order.filled_quantity).toFixed(4)}
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

export default OpenOrders;
