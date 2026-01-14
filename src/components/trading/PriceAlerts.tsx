import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSimTrade } from '@/contexts/SimTradeContext';
import { Bell, BellRing, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSoundAlerts } from '@/hooks/useSoundAlerts';
import { SoundToggle } from './SoundToggle';

interface PriceAlert {
  id: string;
  asset_id: string;
  target_price: number;
  condition: 'above' | 'below';
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
  asset?: {
    symbol: string;
    current_price: number;
  };
}

interface AssetLite {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
}

interface PriceAlertsProps {
  assets: AssetLite[];
  selectedAsset?: AssetLite;
}

export const PriceAlerts = ({ assets, selectedAsset }: PriceAlertsProps) => {
  const { user } = useAuth();
  const { alerts, createAlert: ctxCreateAlert, deleteAlert: ctxDeleteAlert } = useSimTrade();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({
    asset_id: '',
    target_price: '',
    condition: 'above' as 'above' | 'below'
  });
  const { soundEnabled, setSoundEnabled, playPriceAlertSound } = useSoundAlerts();
  const previousTriggeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    alerts.forEach(a => {
      if (!a.isActive && a.triggeredAt && !previousTriggeredRef.current.has(a.id)) {
        previousTriggeredRef.current.add(a.id);
        playPriceAlertSound();
        const asset = assets.find(x => x.id === a.assetId || x.symbol === a.assetId);
        toast.success(`Price Alert Triggered!`, {
          description: `${asset?.symbol || a.assetId} hit $${Number(a.targetPrice).toFixed(2)}`
        });
      }
    });
  }, [user, alerts, assets, playPriceAlertSound]);

  useEffect(() => {
    if (selectedAsset && dialogOpen) {
      setNewAlert(prev => ({ ...prev, asset_id: selectedAsset.id }));
    }
  }, [selectedAsset, dialogOpen]);

  const createAlert = async () => {
    if (!user || !newAlert.asset_id || !newAlert.target_price) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    const res = ctxCreateAlert(
      newAlert.asset_id,
      parseFloat(newAlert.target_price),
      newAlert.condition
    );

    setLoading(false);

    if (!res.ok) {
      toast.error('Failed to create alert');
    } else {
      toast.success('Price alert created');
      setDialogOpen(false);
      setNewAlert({ asset_id: '', target_price: '', condition: 'above' });
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      ctxDeleteAlert(id);
      toast.success('Alert deleted');
    } catch {
      toast.error('Failed to delete alert');
    }
  };

  const enrichedAlerts = alerts.map(a => {
    const asset = assets.find(x => x.id === a.assetId || x.symbol === a.assetId);
    return {
      ...a,
      asset: asset ? { symbol: asset.symbol, current_price: asset.current_price } : undefined
    };
  });
  const activeAlerts = enrichedAlerts.filter(a => a.isActive);
  const triggeredAlerts = enrichedAlerts.filter(a => !a.isActive);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Price Alerts</h3>
          {activeAlerts.length > 0 && (
            <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
              {activeAlerts.length} active
            </span>
          )}
          <SoundToggle soundEnabled={soundEnabled} onToggle={setSoundEnabled} />
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Add Alert
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Price Alert</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Asset</Label>
                <Select 
                  value={newAlert.asset_id} 
                  onValueChange={(v) => setNewAlert(prev => ({ ...prev, asset_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.symbol} - ${Number(asset.current_price).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Condition</Label>
                <Select 
                  value={newAlert.condition} 
                  onValueChange={(v: 'above' | 'below') => setNewAlert(prev => ({ ...prev, condition: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-profit" />
                        Price goes above
                      </div>
                    </SelectItem>
                    <SelectItem value="below">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-loss" />
                        Price goes below
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Price (USDT)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newAlert.target_price}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, target_price: e.target.value }))}
                />
              </div>

              <Button onClick={createAlert} disabled={loading} className="w-full">
                {loading ? 'Creating...' : 'Create Alert'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {activeAlerts.length === 0 && triggeredAlerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No price alerts set. Create one to get notified when prices hit your targets.
          </p>
        ) : (
          <>
            {activeAlerts.map(alert => (
              <div 
                key={alert.id} 
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2">
                  {alert.condition === 'above' ? (
                    <TrendingUp className="h-4 w-4 text-profit" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-loss" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {alert.asset?.symbol || 'Unknown'} {alert.condition} ${Number(alert.targetPrice).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Current: ${alert.asset?.current_price?.toFixed(2) || '-'}
                    </p>
                  </div>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-loss"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {triggeredAlerts.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground mt-3 mb-1">Recently Triggered</p>
                {triggeredAlerts.slice(0, 3).map(alert => (
                  <div 
                    key={alert.id} 
                    className="flex items-center justify-between p-2 rounded-lg bg-profit/10 border border-profit/20"
                  >
                    <div className="flex items-center gap-2">
                      <BellRing className="h-4 w-4 text-profit" />
                      <div>
                        <p className="text-sm font-medium">
                          {alert.asset?.symbol || 'Unknown'} hit ${Number(alert.targetPrice).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleString() : '-'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-loss"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </Card>
  );
};
