import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, TrendingUp, DollarSign, Activity, AlertTriangle, 
  Server, BarChart3, Clock, Zap
} from 'lucide-react';
import { format, subDays, subHours } from 'date-fns';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsers24h: number;
  newUsers7d: number;
  newUsers30d: number;
  totalTrades: number;
  totalVolume: number;
  avgDailyLogins: number;
  topMarkets: { category: string; count: number }[];
  largestPositions: { nickname: string; asset: string; value: number }[];
  suspiciousActivity: { type: string; count: number; severity: string }[];
  serverStatus: { name: string; status: 'online' | 'warning' | 'offline' }[];
}

export const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const baseStats: DashboardStats = {
      totalUsers: 1,
      activeUsers: 1,
      newUsers24h: 0,
      newUsers7d: 0,
      newUsers30d: 0,
      totalTrades: 0,
      totalVolume: 0,
      avgDailyLogins: 1,
      topMarkets: [
        { category: 'crypto', count: 0 },
        { category: 'stocks', count: 0 },
        { category: 'forex', count: 0 },
      ],
      largestPositions: [],
      suspiciousActivity: [],
      serverStatus: [
        { name: 'Auth (Supabase)', status: 'online' },
        { name: 'Trading Simulator', status: 'online' },
        { name: 'Admin Backend', status: 'offline' },
      ],
    };
    setStats(baseStats);
    setLoading(false);
  }, []);

  const fetchDashboardStats = async () => {};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats?.totalUsers.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active (24h)</p>
                <p className="text-2xl font-bold">{stats?.activeUsers.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="text-2xl font-bold">{stats?.totalTrades.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold">${(stats?.totalVolume || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Registrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            New Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{stats?.newUsers24h}</p>
              <p className="text-sm text-muted-foreground">Last 24h</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{stats?.newUsers7d}</p>
              <p className="text-sm text-muted-foreground">Last 7 days</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{stats?.newUsers30d}</p>
              <p className="text-sm text-muted-foreground">Last 30 days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Markets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Most Active Markets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.topMarkets.map((market, i) => (
                <div key={market.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">#{i + 1}</span>
                    <span className="font-medium capitalize">{market.category}</span>
                  </div>
                  <Badge variant="secondary">{market.count} trades</Badge>
                </div>
              ))}
              {stats?.topMarkets.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No trades yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Largest Positions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Largest Open Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.largestPositions.map((pos, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">#{i + 1}</span>
                    <span className="font-medium">{pos.nickname}</span>
                    <Badge variant="outline">{pos.asset}</Badge>
                  </div>
                  <span className="font-mono">${pos.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              ))}
              {stats?.largestPositions.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No open positions</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Suspicious Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Suspicious Activity Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.suspiciousActivity.map((activity, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span>{activity.type}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{activity.count}</span>
                    <Badge variant={activity.severity === 'high' ? 'destructive' : 'secondary'}>
                      {activity.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Server Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.serverStatus.map((server, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span>{server.name}</span>
                  <Badge 
                    variant={server.status === 'online' ? 'default' : server.status === 'warning' ? 'secondary' : 'destructive'}
                    className={server.status === 'online' ? 'bg-green-500' : ''}
                  >
                    {server.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
