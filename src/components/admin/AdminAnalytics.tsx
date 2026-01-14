import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, LineChart, PieChart as PieChartIcon,
  TrendingUp, Users, Activity, Clock
} from 'lucide-react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { 
  ResponsiveContainer, LineChart as RechartsLineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, BarChart as RechartsBarChart,
  Bar, PieChart, Pie, Cell
} from 'recharts';

interface AnalyticsData {
  dailySignups: { date: string; count: number }[];
  dailyTrades: { date: string; count: number }[];
  marketDistribution: { name: string; value: number }[];
  userRetention: { period: string; rate: number }[];
  topErrors: { error: string; count: number }[];
  engagementMetrics: {
    avgSessionDuration: number;
    avgTradesPerUser: number;
    activeUserRate: number;
  };
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export const AdminAnalytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      days.push({ date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), count: 0 });
    }
    const emptyDistribution = [
      { name: 'Crypto', value: 0 },
      { name: 'Stocks', value: 0 },
      { name: 'Forex', value: 0 },
    ];
    setData({
      dailySignups: days,
      dailyTrades: days,
      marketDistribution: emptyDistribution,
      userRetention: [
        { period: 'Day 1', rate: 0 },
        { period: 'Day 7', rate: 0 },
        { period: 'Day 30', rate: 0 },
      ],
      topErrors: [],
      engagementMetrics: {
        avgSessionDuration: 0,
        avgTradesPerUser: 0,
        activeUserRate: 0,
      },
    });
    setLoading(false);
  }, []);

  const fetchAnalytics = async () => {};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Engagement Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Session Duration</p>
                <p className="text-2xl font-bold">{data?.engagementMetrics.avgSessionDuration} min</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Trades per User</p>
                <p className="text-2xl font-bold">{data?.engagementMetrics.avgTradesPerUser}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Weekly Active Rate</p>
                <p className="text-2xl font-bold">{data?.engagementMetrics.activeUserRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily Signups Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Daily Signups (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={data?.dailySignups}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Trades Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Daily Trades (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={data?.dailyTrades}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Market Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Market Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.marketDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data?.marketDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Retention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              User Retention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.userRetention.map((item, i) => (
                <div key={item.period} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.period}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-48 h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${item.rate}%`,
                          backgroundColor: COLORS[i]
                        }}
                      />
                    </div>
                    <span className="text-sm font-mono w-12 text-right">{item.rate}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Retention rate shows the percentage of users who remain active after signing up.
                Higher rates indicate better user engagement.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
