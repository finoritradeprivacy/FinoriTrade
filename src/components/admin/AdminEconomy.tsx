import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSimTrade } from '@/contexts/SimTradeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  DollarSign, Settings, Trophy, RefreshCw, Plus, Minus, Zap, TrendingUp, Percent
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface TradingSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string;
}

interface TopTrader {
  id: string;
  nickname: string;
  total_profit_loss: number;
  total_trades: number;
  win_rate: number;
  level: number;
}

interface StockAsset {
  id: string;
  symbol: string;
  name: string;
  dividend_yield: number;
  current_price: number;
}

export const AdminEconomy = () => {
  const { user } = useAuth();
  const { modifyBalance, usdtBalance, processDividendsForStocks } = useSimTrade();
  const [settings, setSettings] = useState<TradingSetting[]>([]);
  const [topTraders, setTopTraders] = useState<TopTrader[]>([]);
  const [stockAssets, setStockAssets] = useState<StockAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModifyBalanceDialog, setShowModifyBalanceDialog] = useState(false);
  const [showModifyLevelDialog, setShowModifyLevelDialog] = useState(false);
  const [showDividendDialog, setShowDividendDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedStock, setSelectedStock] = useState<StockAsset | null>(null);
  const [dividendYield, setDividendYield] = useState(4.8);
  const [modifyAmount, setModifyAmount] = useState('');
  const [modifyType, setModifyType] = useState<'add' | 'remove'>('add');
  const [users, setUsers] = useState<{ id: string; nickname: string; balance: number; level: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockSearchTerm, setStockSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [user, usdtBalance]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Mock trading settings
      const mockSettings: TradingSetting[] = [
        { id: '1', setting_key: 'trading_enabled', setting_value: true, description: 'Enable/Disable Trading' },
        { id: '2', setting_key: 'max_leverage', setting_value: 100, description: 'Maximum Leverage' },
        { id: '3', setting_key: 'market_fee', setting_value: 0.001, description: 'Market Order Fee' },
      ];
      setSettings(mockSettings);

      // Mock stock assets
      const mockStocks: StockAsset[] = [
        { id: 'AAPL', symbol: 'AAPL', name: 'Apple Inc.', dividend_yield: 0.5, current_price: 150 },
        { id: 'MSFT', symbol: 'MSFT', name: 'Microsoft Corp.', dividend_yield: 0.8, current_price: 300 },
        { id: 'GOOGL', symbol: 'GOOGL', name: 'Alphabet Inc.', dividend_yield: 0, current_price: 2800 },
      ];
      setStockAssets(mockStocks);

      // Mock top traders
      const mockTraders: TopTrader[] = [
        { id: 't1', nickname: 'CryptoKing', total_profit_loss: 50000, total_trades: 120, win_rate: 65, level: 10 },
        { id: 't2', nickname: 'HodlerPro', total_profit_loss: 25000, total_trades: 80, win_rate: 55, level: 8 },
        { id: user?.id || 'local', nickname: 'You', total_profit_loss: 0, total_trades: 0, win_rate: 0, level: 1 },
      ];
      setTopTraders(mockTraders);

      // Mock users list
      const mockUsers = [
        { id: user?.id || 'local', nickname: 'You', balance: usdtBalance, level: 1 },
        { id: 'u2', nickname: 'Alice', balance: 5000, level: 2 },
        { id: 'u3', nickname: 'Bob', balance: 1000, level: 1 },
      ];
      setUsers(mockUsers);

    } catch (error) {
      console.error('Error fetching economy data:', error);
      toast.error('Failed to fetch economy data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (setting: TradingSetting, newValue: any) => {
    try {
      setSettings(prev => prev.map(s => s.id === setting.id ? { ...s, setting_value: newValue } : s));
      toast.success(`Setting "${setting.setting_key}" updated (Simulated)`);
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
    }
  };

  const handleModifyBalance = async () => {
    if (!selectedUserId || !modifyAmount) return;

    try {
      const amount = parseFloat(modifyAmount);
      const change = modifyType === 'add' ? amount : -amount;

      if (selectedUserId === user?.id || selectedUserId === 'local') {
        modifyBalance(change);
        toast.success(`Balance ${modifyType === 'add' ? 'increased' : 'decreased'} by $${amount.toLocaleString()}`);
      } else {
        toast.success(`Balance modified for user ${selectedUserId} (Simulated)`);
        setUsers(prev => prev.map(u => u.id === selectedUserId ? { ...u, balance: Math.max(0, u.balance + change) } : u));
      }

      setShowModifyBalanceDialog(false);
      setModifyAmount('');
    } catch (error) {
      console.error('Error modifying balance:', error);
      toast.error('Failed to modify balance');
    }
  };

  const handleModifyLevel = async () => {
    if (!selectedUserId || !modifyAmount) return;

    try {
      const amount = parseInt(modifyAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid positive number');
        return;
      }
      
      const change = modifyType === 'add' ? amount : -amount;

      toast.success(`Level modified for user ${selectedUserId} (Simulated)`);
      setUsers(prev => prev.map(u => u.id === selectedUserId ? { ...u, level: Math.max(1, u.level + change) } : u));
      
      setShowModifyLevelDialog(false);
      setModifyAmount('');
    } catch (error) {
      console.error('Error modifying level:', error);
      toast.error('Failed to modify level');
    }
  };

  const handleDistributeDividend = async () => {
    if (!selectedStock) return;
    
    try {
      const { totalAmount, assets } = processDividendsForStocks({
        annualYieldPercent: dividendYield,
        symbolFilter: selectedStock.symbol,
      });

      if (totalAmount <= 0 || assets.length === 0) {
        toast.info(`No eligible holdings for ${selectedStock.symbol} to receive dividends.`);
        setShowDividendDialog(false);
        return;
      }

      toast.success(
        `Dividends distributed for ${selectedStock.symbol}. Total paid: $${totalAmount.toFixed(2)}`
      );
      setShowDividendDialog(false);
    } catch (error) {
      console.error('Error distributing dividend:', error);
      toast.error('Failed to distribute dividend');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredUsers = users.filter(user => 
    user.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStocks = stockAssets.filter(stock =>
    stock.symbol.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
    stock.name.toLowerCase().includes(stockSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total System Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${users.reduce((sum, u) => sum + u.balance, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {users.length} users
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Settings</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{settings.length}</div>
            <p className="text-xs text-muted-foreground">
              Global configuration keys
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Trader</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topTraders[0]?.nickname || 'None'}</div>
            <p className="text-xs text-muted-foreground">
              ${topTraders[0]?.total_profit_loss.toLocaleString() || '0'} Profit
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Global Trading Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setting</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.map((setting) => (
                  <TableRow key={setting.id}>
                    <TableCell>
                      <div className="font-medium">{setting.setting_key}</div>
                      <div className="text-xs text-muted-foreground">{setting.description}</div>
                    </TableCell>
                    <TableCell>{String(setting.setting_value)}</TableCell>
                    <TableCell>
                      {typeof setting.setting_value === 'boolean' ? (
                        <Switch 
                          checked={setting.setting_value}
                          onCheckedChange={(checked) => handleUpdateSetting(setting, checked)}
                        />
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => {
                          const newValue = prompt('Enter new value:', String(setting.setting_value));
                          if (newValue !== null) handleUpdateSetting(setting, newValue);
                        }}>
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Traders</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trader</TableHead>
                  <TableHead className="text-right">Profit/Loss</TableHead>
                  <TableHead className="text-right">Win Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topTraders.map((trader) => (
                  <TableRow key={trader.id}>
                    <TableCell>
                      <div className="font-medium">{trader.nickname}</div>
                      <div className="text-xs text-muted-foreground">Level {trader.level}</div>
                    </TableCell>
                    <TableCell className={`text-right ${trader.total_profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${trader.total_profit_loss.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{trader.win_rate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>User Management</CardTitle>
          <div className="w-64">
            <Input 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nickname}</TableCell>
                  <TableCell>${u.balance.toLocaleString()}</TableCell>
                  <TableCell>Level {u.level}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setSelectedUserId(u.id);
                      setShowModifyBalanceDialog(true);
                    }}>
                      <DollarSign className="h-4 w-4 mr-1" />
                      Balance
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      setSelectedUserId(u.id);
                      setShowModifyLevelDialog(true);
                    }}>
                      <Trophy className="h-4 w-4 mr-1" />
                      Level
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showModifyBalanceDialog} onOpenChange={setShowModifyBalanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify Balance</DialogTitle>
            <DialogDescription>
              Adjust the USDT balance for the selected user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant={modifyType === 'add' ? 'default' : 'outline'}
                onClick={() => setModifyType('add')}
              >
                <Plus className="h-4 w-4 mr-2" /> Add
              </Button>
              <Button 
                variant={modifyType === 'remove' ? 'default' : 'outline'}
                onClick={() => setModifyType('remove')}
              >
                <Minus className="h-4 w-4 mr-2" /> Remove
              </Button>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                value={modifyAmount}
                onChange={(e) => setModifyAmount(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModifyBalanceDialog(false)}>Cancel</Button>
            <Button onClick={handleModifyBalance}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showModifyLevelDialog} onOpenChange={setShowModifyLevelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify Level</DialogTitle>
            <DialogDescription>
              Adjust the player level for the selected user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant={modifyType === 'add' ? 'default' : 'outline'}
                onClick={() => setModifyType('add')}
              >
                <Plus className="h-4 w-4 mr-2" /> Add
              </Button>
              <Button 
                variant={modifyType === 'remove' ? 'default' : 'outline'}
                onClick={() => setModifyType('remove')}
              >
                <Minus className="h-4 w-4 mr-2" /> Remove
              </Button>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="level_amount" className="text-right">
                Levels
              </Label>
              <Input
                id="level_amount"
                type="number"
                value={modifyAmount}
                onChange={(e) => setModifyAmount(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModifyLevelDialog(false)}>Cancel</Button>
            <Button onClick={handleModifyLevel}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
