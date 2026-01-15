import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSimTrade } from "@/contexts/SimTradeContext";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Award, DollarSign } from "lucide-react";

interface PlayerData {
  nickname: string;
  email: string;
  level: number;
  total_xp: number;
  achievements: unknown[];
  total_trades: number;
  win_rate: number;
  total_profit_loss: number;
  usdt_balance: number;
}

const PlayerProfile = () => {
  const { user } = useAuth();
  const { usdtBalance, trades, holdings, prices, timeOnSite } = useSimTrade();
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!user) return;

      try {
        const nickname =
          (user.user_metadata as Record<string, unknown>)?.nickname ||
          (user.email ? String(user.email).split("@")[0] : "Trader");
        const email = user.email || "";
        const baseBalance = 100000;
        const equity =
          usdtBalance +
          Object.entries(holdings).reduce((sum, [symbol, h]) => {
            const px = prices[symbol] ?? h.averageBuyPrice ?? 0;
            return sum + h.quantity * px;
          }, 0);
        const totalTrades = trades.length;
        const totalProfitLoss = equity - baseBalance;
        const level = 1 + Math.floor(totalTrades / 10);
        const totalXp = totalTrades * 100;
        setPlayerData({
          nickname,
          email,
          level,
          total_xp: totalXp,
          achievements: [],
          total_trades: totalTrades,
          win_rate: 0,
          total_profit_loss: totalProfitLoss,
          usdt_balance: usdtBalance,
        });
      } catch (error) {
        console.error("Error fetching player data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [user, usdtBalance, trades, holdings, prices]);

  if (loading || !playerData) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </Card>
    );
  }

  // XP formula: Level 1 = 1000 XP, then +500 XP per level (1000, 1500, 2000, 2500...)
  const calculateXpForLevel = (level: number): number => {
    if (level <= 1) return 0;
    let total = 0;
    for (let i = 1; i < level; i++) {
      total += 1000 + (i - 1) * 500;
    }
    return total;
  };
  
  const xpForCurrentLevel = calculateXpForLevel(playerData.level);
  const xpForNextLevel = 1000 + (playerData.level - 1) * 500;
  const xpInCurrentLevel = playerData.total_xp - xpForCurrentLevel;
  const xpProgress = Math.min(100, (xpInCurrentLevel / xpForNextLevel) * 100);
  const isProfitable = playerData.total_profit_loss >= 0;

  const formatTimeOnSite = (secondsTotal: number) => {
    const hours = Math.floor(secondsTotal / 3600);
    const minutes = Math.floor((secondsTotal % 3600) / 60);
    const seconds = secondsTotal % 60;
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
    }
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary text-primary-foreground font-bold">
            {playerData.nickname.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">
              {playerData.nickname}
            </h3>
            <Badge variant="secondary" className="text-xs">
              Level {playerData.level}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>XP: {xpInCurrentLevel} / {xpForNextLevel}</span>
              <span>{xpProgress.toFixed(0)}%</span>
            </div>
            <Progress value={xpProgress} className="h-1.5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            <span>Balance</span>
          </div>
          <p className="font-semibold text-foreground">
            ${playerData.usdt_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {isProfitable ? (
              <TrendingUp className="h-3.5 w-3.5 text-success" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            )}
            <span>Total P&L</span>
          </div>
          <p className={`font-semibold ${isProfitable ? 'text-success' : 'text-destructive'}`}>
            {isProfitable ? '+' : ''}${playerData.total_profit_loss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Award className="h-3.5 w-3.5" />
            <span>Win Rate</span>
          </div>
          <p className="font-semibold text-foreground">
            {playerData.win_rate.toFixed(1)}%
          </p>
        </div>

        <div className="space-y-1">
          <div className="text-muted-foreground">
            <span>Total Trades</span>
          </div>
          <p className="font-semibold text-foreground">
            {playerData.total_trades}
          </p>
        </div>

        <div className="space-y-1">
          <div className="text-muted-foreground">
            <span>Time on Site</span>
          </div>
          <p className="font-semibold text-foreground">
            {formatTimeOnSite(timeOnSite || 0)}
          </p>
        </div>
      </div>

      {playerData.achievements.length > 0 && (
        <div className="pt-3 border-t">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Award className="h-3.5 w-3.5" />
            <span>Achievements</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {playerData.achievements.slice(0, 6).map((achievement: unknown, index: number) => {
              const ach = achievement as Record<string, unknown>;
              return (
                <Badge key={index} variant="outline" className="text-xs">
                  {String(ach.name) || `Achievement ${index + 1}`}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};

export default PlayerProfile;
