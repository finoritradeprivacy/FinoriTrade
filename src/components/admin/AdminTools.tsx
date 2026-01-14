import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSimTrade } from '@/contexts/SimTradeContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Bug, UserCog, TestTube, Zap, TrendingUp, TrendingDown, 
  RefreshCw, Play, AlertTriangle, Database
} from 'lucide-react';

export const AdminTools = () => {
  const { user } = useAuth();
  const { prices, applyVolatility, applyMarketCrash, overridePrice } = useSimTrade();
  const [testUserEmail, setTestUserEmail] = useState('');
  const [testUserNickname, setTestUserNickname] = useState('');
  const [volatilityMultiplier, setVolatilityMultiplier] = useState('2');
  const [isSimulatingVolatility, setIsSimulatingVolatility] = useState(false);
  const [isCreatingTestUser, setIsCreatingTestUser] = useState(false);

  const handleCreateTestUser = async () => {
    if (!testUserEmail || !testUserNickname) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      toast.info('Creating separate test users is disabled in simulation mode.');
      setTestUserEmail('');
      setTestUserNickname('');
    } catch (error: any) {
      console.error('Error creating test user:', error);
      toast.error(error.message || 'Failed to create test user');
    } finally {
      setIsCreatingTestUser(false);
    }
  };

  const handleSimulateVolatility = async () => {
    setIsSimulatingVolatility(true);
    try {
      const multiplier = parseFloat(volatilityMultiplier);
      if (!Number.isFinite(multiplier) || multiplier <= 0) {
        toast.error('Invalid multiplier');
      } else {
        applyVolatility(multiplier);
        toast.success(`Volatility simulation applied (${multiplier}x)`);
      }
    } catch (error) {
      toast.error('Failed to simulate volatility');
    } finally {
      setIsSimulatingVolatility(false);
    }
  };

  const handleSimulateMarketCrash = async () => {
    try {
      applyMarketCrash();
      toast.success('Market crash simulated');
    } catch (error) {
      toast.error('Failed to simulate market crash');
    }
  };

  const handleSimulateMarketRally = async () => {
    try {
      const keys = Object.keys(prices || {});
      keys.forEach(sym => {
        const p = prices[sym];
        const risePercent = 10 + Math.random() * 20;
        const newPrice = Math.max(0.0001, p * (1 + risePercent / 100));
        overridePrice(sym, newPrice);
      });
      toast.success('Market rally simulated');
    } catch (error) {
      toast.error('Failed to simulate market rally');
    }
  };

  const handleResetAllPrices = async () => {
    try {
      // Reset to base prices
      const basePrices: Record<string, number> = {
        'BTC': 45000,
        'ETH': 2500,
        'SOL': 100,
        'DOGE': 0.08,
        'XRP': 0.55,
        'AAPL': 175,
        'GOOGL': 140,
        'MSFT': 380,
        'TSLA': 250,
        'AMZN': 155,
        'EUR/USD': 1.09,
        'GBP/USD': 1.27,
        'USD/JPY': 149,
        'AUD/USD': 0.65,
        'USD/CAD': 1.36,
      };
      Object.entries(basePrices).forEach(([sym, price]) => {
        overridePrice(sym, price);
      });
      toast.success('All prices reset to base values');
    } catch (error) {
      toast.error('Failed to reset prices');
    }
  };

  const handleTriggerPriceUpdate = async () => {
    try {
      toast.info('Live prices update continuously; manual trigger disabled.');
    } catch (error) {
      toast.error('Failed to trigger price update');
    }
  };

  const [isGeneratingNews, setIsGeneratingNews] = useState(false);
  const [isGeneratingHistory, setIsGeneratingHistory] = useState(false);

  const handleTriggerNewsGeneration = async () => {
    setIsGeneratingNews(true);
    try {
      toast.info('News generation disabled in simulation mode.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to trigger news generation');
    } finally {
      setIsGeneratingNews(false);
    }
  };

  const handleGeneratePriceHistory = async () => {
    setIsGeneratingHistory(true);
    try {
      toast.info('Price history generation disabled in simulation mode.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate price history (may still be running in background)');
    } finally {
      setIsGeneratingHistory(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="testing" className="w-full">
        <TabsList>
          <TabsTrigger value="testing">Testing Tools</TabsTrigger>
          <TabsTrigger value="simulation">Market Simulation</TabsTrigger>
          <TabsTrigger value="triggers">Manual Triggers</TabsTrigger>
        </TabsList>

        <TabsContent value="testing" className="space-y-6">
          {/* Create Test User */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Create Test User
              </CardTitle>
              <CardDescription>
                Create a new test user with a known password for testing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={testUserEmail}
                    onChange={(e) => setTestUserEmail(e.target.value)}
                    placeholder="test@example.com"
                  />
                </div>
                <div>
                  <Label>Nickname</Label>
                  <Input 
                    value={testUserNickname}
                    onChange={(e) => setTestUserNickname(e.target.value)}
                    placeholder="TestPlayer"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Password will be: <code className="bg-muted px-2 py-1 rounded">TestUser123!</code>
              </p>
              <Button 
                onClick={handleCreateTestUser}
                disabled={isCreatingTestUser}
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isCreatingTestUser ? 'Creating...' : 'Create Test User'}
              </Button>
            </CardContent>
          </Card>

          {/* Debug Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Debug Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg font-mono text-sm">
                <p>Current User ID: {user?.id}</p>
                <p>Email: {user?.email}</p>
                <p>Session: Active</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulation" className="space-y-6">
          {/* Volatility Simulation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Volatility Simulation
              </CardTitle>
              <CardDescription>
                Temporarily increase market volatility for testing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div>
                  <Label>Volatility Multiplier</Label>
                  <Input 
                    type="number"
                    value={volatilityMultiplier}
                    onChange={(e) => setVolatilityMultiplier(e.target.value)}
                    min="1"
                    max="10"
                    className="w-24"
                  />
                </div>
                <Button 
                  onClick={handleSimulateVolatility}
                  disabled={isSimulatingVolatility}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {isSimulatingVolatility ? 'Simulating...' : 'Apply Volatility'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Market Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Market Event Simulation
              </CardTitle>
              <CardDescription>
                Simulate extreme market events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Button 
                  variant="destructive"
                  onClick={handleSimulateMarketCrash}
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Simulate Crash
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleSimulateMarketRally}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Simulate Rally
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleResetAllPrices}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Prices
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="triggers" className="space-y-6">
          {/* Manual Triggers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Manual Function Triggers
              </CardTitle>
              <CardDescription>
                Manually trigger background functions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline"
                  onClick={handleTriggerPriceUpdate}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Trigger Price Update
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleTriggerNewsGeneration}
                  disabled={isGeneratingNews}
                >
                  <Zap className={`h-4 w-4 mr-2 ${isGeneratingNews ? 'animate-spin' : ''}`} />
                  {isGeneratingNews ? 'Generating...' : 'Generate Market News'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleGeneratePriceHistory}
                  disabled={isGeneratingHistory}
                  className="col-span-2"
                >
                  <Database className={`h-4 w-4 mr-2 ${isGeneratingHistory ? 'animate-spin' : ''}`} />
                  {isGeneratingHistory ? 'Generating 4-month history...' : 'Generate 4-Month Price History'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
