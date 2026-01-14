import { useState, useEffect } from 'react';
import { useSimTrade } from '@/contexts/SimTradeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  TrendingUp, TrendingDown, Pause, Play, RefreshCw, Plus, Trash2,
  DollarSign, Settings, Eye, XCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface Asset {
  id: string;
  symbol: string;
  name: string;
  category: string;
  current_price: number;
  price_change_24h: number | null;
  is_active: boolean;
}

interface OpenPosition {
  id: string;
  user_nickname: string;
  user_id: string;
  asset_symbol: string;
  asset_id: string;
  quantity: number;
  average_buy_price: number;
  current_value: number;
  unrealized_pnl: number;
}

interface Trade {
  id: string;
  user_nickname: string;
  asset_symbol: string;
  side: string;
  quantity: number;
  price: number;
  total_value: number;
  created_at: string;
}

export const AdminTrading = () => {
  const { holdings, trades, prices } = useSimTrade();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [marketsEnabled, setMarketsEnabled] = useState({ crypto: true, stocks: true, forex: true });
  const [showAddAssetDialog, setShowAddAssetDialog] = useState(false);
  const [showPriceOverrideDialog, setShowPriceOverrideDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [newAsset, setNewAsset] = useState({ symbol: '', name: '', category: 'crypto', current_price: '' });
  const [priceFeedPaused, setPriceFeedPaused] = useState(false);

  const fetchData = () => {
    // Since we are using context, we can just force a re-render or toast
    toast.success('Data refreshed from simulation context');
  };

  useEffect(() => {
    const baseAssets: Asset[] = [
      { id: 'BTC', symbol: 'BTC', name: 'Bitcoin', category: 'crypto', current_price: prices.BTC || 0, price_change_24h: null, is_active: true },
      { id: 'ETH', symbol: 'ETH', name: 'Ethereum', category: 'crypto', current_price: prices.ETH || 0, price_change_24h: null, is_active: true },
      { id: 'SOL', symbol: 'SOL', name: 'Solana', category: 'crypto', current_price: prices.SOL || 0, price_change_24h: null, is_active: true },
      { id: 'BNB', symbol: 'BNB', name: 'BNB', category: 'crypto', current_price: prices.BNB || 0, price_change_24h: null, is_active: true },
      { id: 'XRP', symbol: 'XRP', name: 'XRP', category: 'crypto', current_price: prices.XRP || 0, price_change_24h: null, is_active: true },
      { id: 'DOGE', symbol: 'DOGE', name: 'Dogecoin', category: 'crypto', current_price: prices.DOGE || 0, price_change_24h: null, is_active: true },
      { id: 'ADA', symbol: 'ADA', name: 'Cardano', category: 'crypto', current_price: prices.ADA || 0, price_change_24h: null, is_active: true },
    ];
    setAssets(baseAssets);
    const positions: OpenPosition[] = Object.entries(holdings).map(([symbol, h]) => {
      const price = prices[symbol] || 0;
      return {
        id: symbol,
        user_nickname: 'You',
        user_id: 'local',
        asset_symbol: symbol,
        asset_id: symbol,
        quantity: h.quantity,
        average_buy_price: h.averageBuyPrice,
        current_value: h.quantity * price,
        unrealized_pnl: (price - h.averageBuyPrice) * h.quantity,
      };
    });
    setOpenPositions(positions);
    const mappedTrades: Trade[] = trades.slice(0, 50).map(t => ({
      id: t.id,
      user_nickname: 'You',
      asset_symbol: t.symbol,
      side: t.side,
      quantity: t.quantity,
      price: t.price,
      total_value: t.totalValue,
      created_at: new Date(t.createdAt).toISOString(),
    }));
    setRecentTrades(mappedTrades);
    setLoading(false);
  }, [holdings, trades, prices]);

  const handleToggleMarket = async (market: 'crypto' | 'stocks' | 'forex') => {
    const newSettings = { ...marketsEnabled, [market]: !marketsEnabled[market] };
    
    try {
      setMarketsEnabled(newSettings);
      toast.success(`${market} market ${newSettings[market] ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to toggle market');
    }
  };

  const handleToggleAsset = async (asset: Asset) => {
    try {
      setAssets(prev =>
        prev.map(a => (a.id === asset.id ? { ...a, is_active: !a.is_active } : a)),
      );
      toast.success(`${asset.symbol} ${!asset.is_active ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error('Failed to toggle asset');
    }
  };

  const handlePriceOverride = async () => {
    if (!selectedAsset || !newPrice) return;

    try {
      const price = parseFloat(newPrice);
      if (!Number.isFinite(price) || price <= 0) {
        toast.error('Invalid price');
        return;
      }
      setAssets(prev =>
        prev.map(a => (a.id === selectedAsset.id ? { ...a, current_price: price } : a)),
      );
      toast.success(`Price updated for ${selectedAsset.symbol}`);
      setShowPriceOverrideDialog(false);
      setNewPrice('');
    } catch (error) {
      toast.error('Failed to override price');
    }
  };

  const handleForceClosePosition = async (position: OpenPosition) => {
    try {
      toast.info('Force close is not available in local simulation.');
    } catch (error) {
      toast.error('Failed to force close position');
    }
  };

  const handleAddAsset = async () => {
    if (!newAsset.symbol || !newAsset.name || !newAsset.current_price) return;

    try {
      const price = parseFloat(newAsset.current_price);
      if (!Number.isFinite(price) || price <= 0) {
        toast.error('Invalid price');
        return;
      }
      const id = newAsset.symbol.toUpperCase();
      setAssets(prev => [
        ...prev,
        {
          id,
          symbol: id,
          name: newAsset.name,
          category: newAsset.category,
          current_price: price,
          price_change_24h: null,
          is_active: true,
        },
      ]);
      toast.success(`Asset ${newAsset.symbol} added`);
      setShowAddAssetDialog(false);
      setNewAsset({ symbol: '', name: '', category: 'crypto', current_price: '' });
    } catch (error) {
      toast.error('Failed to add asset');
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="markets" className="w-full">
        <TabsList>
          <TabsTrigger value="markets">Markets & Assets</TabsTrigger>
          <TabsTrigger value="positions">Open Positions</TabsTrigger>
          <TabsTrigger value="trades">Trade History</TabsTrigger>
        </TabsList>

        <TabsContent value="markets" className="space-y-6">
          {/* Market Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Market Controls</span>
                <Button variant="outline" size="sm" onClick={() => setShowAddAssetDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Asset
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-yellow-500" />
                    <span>Crypto</span>
                  </div>
                  <Switch 
                    checked={marketsEnabled.crypto} 
                    onCheckedChange={() => handleToggleMarket('crypto')}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <span>Stocks</span>
                  </div>
                  <Switch 
                    checked={marketsEnabled.stocks} 
                    onCheckedChange={() => handleToggleMarket('stocks')}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-green-500" />
                    <span>Forex</span>
                  </div>
                  <Switch 
                    checked={marketsEnabled.forex} 
                    onCheckedChange={() => handleToggleMarket('forex')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assets List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Assets ({assets.length})</span>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>24h Change</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-mono font-bold">{asset.symbol}</TableCell>
                        <TableCell>{asset.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{asset.category}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          ${asset.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </TableCell>
                        <TableCell className={asset.price_change_24h && asset.price_change_24h >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {asset.price_change_24h?.toFixed(2) || 0}%
                        </TableCell>
                        <TableCell>
                          <Badge variant={asset.is_active ? 'default' : 'secondary'}>
                            {asset.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => { setSelectedAsset(asset); setShowPriceOverrideDialog(true); }}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleToggleAsset(asset)}
                            >
                              {asset.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Open Positions ({openPositions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Avg Price</TableHead>
                      <TableHead>Current Value</TableHead>
                      <TableHead>Unrealized P/L</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openPositions.map((position) => (
                      <TableRow key={position.id}>
                        <TableCell className="font-medium">{position.user_nickname}</TableCell>
                        <TableCell className="font-mono">{position.asset_symbol}</TableCell>
                        <TableCell>{position.quantity.toFixed(4)}</TableCell>
                        <TableCell className="font-mono">${position.average_buy_price.toLocaleString()}</TableCell>
                        <TableCell className="font-mono">${position.current_value.toLocaleString()}</TableCell>
                        <TableCell className={position.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                          ${position.unrealized_pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleForceClosePosition(position)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Force Close
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {openPositions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No open positions
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trades" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTrades.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(trade.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium">{trade.user_nickname}</TableCell>
                        <TableCell className="font-mono">{trade.asset_symbol}</TableCell>
                        <TableCell>
                          <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'}>
                            {trade.side.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{trade.quantity.toFixed(4)}</TableCell>
                        <TableCell className="font-mono">${trade.price.toLocaleString()}</TableCell>
                        <TableCell className="font-mono">${trade.total_value.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Asset Dialog */}
      <Dialog open={showAddAssetDialog} onOpenChange={setShowAddAssetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Symbol</label>
              <Input 
                value={newAsset.symbol} 
                onChange={(e) => setNewAsset({ ...newAsset, symbol: e.target.value })}
                placeholder="BTC, AAPL, EUR/USD..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input 
                value={newAsset.name} 
                onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                placeholder="Bitcoin, Apple Inc..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <select 
                value={newAsset.category}
                onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
                className="w-full p-2 rounded border bg-background"
              >
                <option value="crypto">Crypto</option>
                <option value="stocks">Stocks</option>
                <option value="forex">Forex</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Initial Price</label>
              <Input 
                type="number"
                value={newAsset.current_price} 
                onChange={(e) => setNewAsset({ ...newAsset, current_price: e.target.value })}
                placeholder="100.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAssetDialog(false)}>Cancel</Button>
            <Button onClick={handleAddAsset}>Add Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Override Dialog */}
      <Dialog open={showPriceOverrideDialog} onOpenChange={setShowPriceOverrideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Price: {selectedAsset?.symbol}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current Price</label>
              <p className="font-mono text-lg">${selectedAsset?.current_price.toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium">New Price</label>
              <Input 
                type="number"
                value={newPrice} 
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Enter new price..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPriceOverrideDialog(false)}>Cancel</Button>
            <Button onClick={handlePriceOverride}>Update Price</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
