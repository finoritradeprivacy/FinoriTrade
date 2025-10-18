import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp, Target, Award } from "lucide-react";

interface ProfileData {
  nickname: string;
  email: string;
  win_rate: number;
  total_trades: number;
  total_profit_loss: number;
}

interface PlayerStatsData {
  level: number;
  total_xp: number;
  achievements: any;
}

const PlayerProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStatsData | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("nickname, email, win_rate, total_trades, total_profit_loss")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch player stats
      const { data: statsData } = await supabase
        .from("player_stats")
        .select("level, total_xp, achievements")
        .eq("user_id", user.id)
        .maybeSingle();

      if (statsData) {
        setPlayerStats(statsData);
      }
    };

    fetchProfileData();

    // Set up real-time subscription
    const channel = supabase
      .channel("player-profile-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user?.id}`,
        },
        () => fetchProfileData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_stats",
          filter: `user_id=eq.${user?.id}`,
        },
        () => fetchProfileData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-16 w-16 rounded-full bg-muted"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const xpToNextLevel = playerStats ? (playerStats.level * 1000) : 1000;
  const currentLevelXp = playerStats ? playerStats.total_xp % xpToNextLevel : 0;
  const xpProgress = playerStats ? (currentLevelXp / xpToNextLevel) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Profil hráče
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Info */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg bg-primary text-primary-foreground">
              {profile.nickname.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">{profile.nickname}</h3>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        {/* Level & XP */}
        {playerStats && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Level {playerStats.level}</span>
              <Badge variant="outline">
                {currentLevelXp} / {xpToNextLevel} XP
              </Badge>
            </div>
            <Progress value={xpProgress} className="h-2" />
          </div>
        )}

        {/* Trading Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Target className="h-3 w-3" />
              <span>Win Rate</span>
            </div>
            <p className="text-lg font-semibold">{profile.win_rate.toFixed(1)}%</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <TrendingUp className="h-3 w-3" />
              <span>Celkem obchodů</span>
            </div>
            <p className="text-lg font-semibold">{profile.total_trades}</p>
          </div>
          
          <div className="col-span-2 space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Award className="h-3 w-3" />
              <span>Celkový P/L</span>
            </div>
            <p className={`text-lg font-semibold ${profile.total_profit_loss >= 0 ? 'text-success' : 'text-destructive'}`}>
              {profile.total_profit_loss >= 0 ? '+' : ''}{profile.total_profit_loss.toFixed(2)} USDT
            </p>
          </div>
        </div>

        {/* Achievements */}
        {playerStats && Array.isArray(playerStats.achievements) && playerStats.achievements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Úspěchy</h4>
            <div className="flex flex-wrap gap-2">
              {playerStats.achievements.map((achievement: any, index: number) => (
                <Badge key={index} variant="secondary">
                  {achievement.name || achievement}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerProfile;
