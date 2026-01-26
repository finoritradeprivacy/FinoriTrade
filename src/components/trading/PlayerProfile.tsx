import { useEffect, useState, ChangeEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSimTrade } from "@/contexts/SimTradeContext";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, Award, DollarSign, Crown, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  role?: string;
}

const PREMIUM_ROLES = ["FinoriPro", "FinoriAlpha", "FinoriUltra", "FinoriFamily", "FinoriGold"];

const PlayerProfile = () => {
  const { user } = useAuth();
  const { usdtBalance, trades, holdings, prices, timeOnSite } = useSimTrade();
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Promo code state
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState("FinoriPro");

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(`finori_avatar_url_${user.id}`);
      if (stored) {
        setAvatarUrl(stored);
      }
    } catch {
    }
  }, [user]);

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

        // Fetch role from Supabase
        let role = null;
        try {
          const { data: stats } = await supabase
            .from('player_stats')
            .select('achievements')
            .eq('user_id', user.id)
            .single();
          
          if (stats && stats.achievements) {
            role = (stats.achievements as any).role;
          }
        } catch (err) {
          console.error("Error fetching role:", err);
        }

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
          role: role
        });
      } catch (error) {
        console.error("Error fetching player data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [user, usdtBalance, trades, holdings, prices]);

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setAvatarUrl(result);
        try {
          if (typeof window !== "undefined" && user?.id) {
            window.localStorage.setItem(`finori_avatar_url_${user.id}`, result);
          }
        } catch {
        }
      }
    };
    reader.readAsDataURL(file);
  };

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

  const handleRedeemCode = () => {
    if (promoCode.trim() === "199298AE402N") {
      setShowPromoDialog(false);
      setShowSelectionDialog(true);
      setPromoCode(""); // Clear code
    } else {
      toast.error("Invalid promo code");
    }
  };

  const handleApplyRole = async () => {
    if (!user || !selectedRole) return;

    try {
      // Get current achievements
      const { data: stats } = await supabase
        .from('player_stats')
        .select('achievements')
        .eq('user_id', user.id)
        .single();

      let currentAchievements = (stats?.achievements as any) || {};
      if (Array.isArray(currentAchievements)) {
         // Convert array to object if it was initialized as empty array
         currentAchievements = {};
      }
      
      // Update role
      currentAchievements.role = selectedRole;

      // Save to Supabase
      const { error } = await supabase
        .from('player_stats')
        .update({ achievements: currentAchievements })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setPlayerData(prev => prev ? ({ ...prev, role: selectedRole }) : null);
      
      toast.success(`Congratulations! You are now ${selectedRole}`);
      setShowSelectionDialog(false);
    } catch (error) {
      console.error("Error applying role:", error);
      toast.error("Failed to apply role");
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="relative group cursor-pointer">
          <Avatar className="h-12 w-12">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {playerData.nickname.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
             <span className="text-[10px] text-white font-medium">Edit</span>
          </div>
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleAvatarUpload}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-foreground truncate">
              {playerData.nickname}
            </h3>
            {PREMIUM_ROLES.includes(playerData.role || '') && (
              <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)] animate-pulse text-[10px] h-5 px-1.5">
                <Crown className="w-3 h-3 mr-1" />
                {playerData.role}
              </Badge>
            )}
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

          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-2 h-6 text-xs px-2 text-muted-foreground hover:text-primary"
            onClick={() => setShowPromoDialog(true)}
          >
            <Gift className="w-3 h-3 mr-1" />
            Redeem Code
          </Button>
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

      {/* Promo Code Dialog */}
      <Dialog open={showPromoDialog} onOpenChange={setShowPromoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redeem Promo Code</DialogTitle>
            <DialogDescription>
              Enter your promo code to unlock exclusive rewards.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="promo-code" className="sr-only">
                Promo Code
              </Label>
              <Input
                id="promo-code"
                placeholder="Enter code..."
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button type="button" variant="secondary" onClick={() => setShowPromoDialog(false)}>
              Close
            </Button>
            <Button type="button" onClick={handleRedeemCode}>
              Redeem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Selection Dialog */}
      <Dialog open={showSelectionDialog} onOpenChange={setShowSelectionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Your Status</DialogTitle>
            <DialogDescription>
              Code accepted! Choose your new premium status.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup value={selectedRole} onValueChange={setSelectedRole}>
              <div className="flex items-center space-x-2 mb-2">
                <RadioGroupItem value="FinoriPro" id="r1" />
                <Label htmlFor="r1" className="font-medium text-blue-500">FinoriPro</Label>
              </div>
              <div className="flex items-center space-x-2 mb-2">
                <RadioGroupItem value="FinoriGold" id="r2" />
                <Label htmlFor="r2" className="font-medium text-yellow-500">FinoriGold</Label>
              </div>
              <div className="flex items-center space-x-2 mb-2">
                <RadioGroupItem value="FinoriUltra" id="r3" />
                <Label htmlFor="r3" className="font-medium text-purple-500">FinoriUltra</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FinoriFamily" id="r4" />
                <Label htmlFor="r4" className="font-medium text-green-500">FinoriFamily</Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleApplyRole}>
              Apply Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PlayerProfile;
