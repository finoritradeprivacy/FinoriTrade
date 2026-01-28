import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Crown, Medal, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LeaderboardUser {
  id: string;
  nickname: string;
  role: string;
  total_xp: number;
  level: number;
  avatar_url?: string;
}

interface PremiumLeaderboardProps {
  userRole?: string;
}

const VISIBLE_ROLES = ['FinoriGold', 'FinoriUltra', 'FinoriFamily'];
const ACCESS_ROLES = ['FinoriPro', 'FinoriGold', 'FinoriUltra', 'FinoriFamily'];

export const PremiumLeaderboard = ({ userRole }: PremiumLeaderboardProps) => {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  const hasAccess = userRole && ACCESS_ROLES.includes(userRole);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!hasAccess) return;

      try {
        // Fetch stats and profiles
        const { data: statsData, error } = await supabase
          .from('player_stats')
          .select(`
            user_id,
            total_xp,
            level,
            achievements
          `)
          .order('total_xp', { ascending: false });

        if (error) throw error;

        // Get user profiles
        const userIds = statsData.map(s => s.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, nickname, avatar_url')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]));

        // Process and filter users
        const leaderboardUsers: LeaderboardUser[] = statsData
          .map(stat => {
            const role = (stat.achievements as any)?.role || 'User';
            const profile = profilesMap.get(stat.user_id);
            
            return {
              id: stat.user_id,
              nickname: profile?.nickname || 'Unknown Trader',
              avatar_url: profile?.avatar_url,
              role,
              total_xp: stat.total_xp,
              level: stat.level
            };
          })
          .filter(user => VISIBLE_ROLES.includes(user.role))
          .sort((a, b) => b.total_xp - a.total_xp)
          .slice(0, 50); // Top 50

        setUsers(leaderboardUsers);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [hasAccess]);

  if (!hasAccess) {
    return (
      <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent relative overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
          <Lock className="h-12 w-12 text-yellow-500 mb-3" />
          <h3 className="text-xl font-bold mb-2">Premium Leaderboard</h3>
          <p className="text-muted-foreground mb-4">
            Upgrade to FinoriPro or higher to view the elite trader rankings.
          </p>
          <Button variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
            Unlock Premium
          </Button>
        </div>
        {/* Blurred background content */}
        <CardHeader>
          <CardTitle className="flex items-center gap-2 filter blur-sm">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Premium Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="filter blur-sm">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Premium Rankings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted/50 rounded-lg" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Crown className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No Premium users found yet.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {users.map((user, index) => (
                <div 
                  key={user.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    index === 0 ? 'bg-yellow-500/10 border-yellow-500/30' :
                    index === 1 ? 'bg-slate-300/10 border-slate-300/30' :
                    index === 2 ? 'bg-orange-700/10 border-orange-700/30' :
                    'bg-card/50 border-border/50 hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-6 text-center font-bold text-muted-foreground">
                      {index + 1}
                    </div>
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>{user.nickname.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{user.nickname}</span>
                        {index === 0 && <Crown className="h-3 w-3 text-yellow-500" />}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] h-4 px-1 ${
                          user.role === 'FinoriGold' ? 'text-yellow-500 border-yellow-500/30' :
                          user.role === 'FinoriUltra' ? 'text-purple-500 border-purple-500/30' :
                          'text-blue-500 border-blue-500/30'
                        }`}
                      >
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-sm">
                      {user.total_xp.toLocaleString()} XP
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Lvl {user.level}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
