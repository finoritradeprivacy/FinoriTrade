import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Flame } from "lucide-react";
import { toast } from "sonner";
import { useSimTrade } from "@/contexts/SimTradeContext";

interface Challenge {
  id: string;
  title: string;
  description: string;
  reward_usdt: number;
  reward_xp: number;
  target_value: number;
  current_value: number;
  completed: boolean;
}

interface DayStatus {
  day: string;
  status: 'pending' | 'completed' | 'missed';
}

const DAILY_CHALLENGES_MOCK = [
  {
    id: '1',
    title: 'Daily Trader',
    description: 'Execute 5 trades today',
    reward_usdt: 100,
    reward_xp: 50,
    target_value: 5,
  },
  {
    id: '2',
    title: 'Profit Seeker',
    description: 'Make $1000 profit',
    reward_usdt: 200,
    reward_xp: 100,
    target_value: 1000,
  }
];

export const Challenges = () => {
  const { user } = useAuth();
  const { trades } = useSimTrade();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [streak, setStreak] = useState(0);
  const [weekStatus, setWeekStatus] = useState<DayStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      initializeChallenges();
      updateStreak();
    }
  }, [user, trades]);

  const initializeChallenges = () => {
    // Simple mock implementation
    // In a real local-only app, we might persist this in localStorage per day
    // For now, we just calculate based on current session's trades for "Daily Trader"
    
    const todayTrades = trades.filter(t => {
      const date = new Date(t.createdAt);
      const today = new Date();
      return date.getDate() === today.getDate() && 
             date.getMonth() === today.getMonth() && 
             date.getFullYear() === today.getFullYear();
    });

    const mappedChallenges: Challenge[] = DAILY_CHALLENGES_MOCK.map(dc => {
      let current = 0;
      if (dc.id === '1') {
        current = todayTrades.length;
      } else if (dc.id === '2') {
        current = Math.max(0, todayTrades.reduce((acc, t) => acc + (t.totalValue > 0 ? t.totalValue * 0.05 : 0), 0)); // Mock profit calculation
      }

      return {
        ...dc,
        current_value: current,
        completed: current >= dc.target_value
      };
    });

    setChallenges(mappedChallenges);
    setLoading(false);
  };

  const updateStreak = () => {
    if (!user) return;

    const lastLoginKey = `streak_last_login_${user.id}`;
    const streakKey = `streak_count_${user.id}`;
    const historyKey = `streak_history_${user.id}`;

    const todayDateObj = new Date();
    const today = todayDateObj.toISOString().split("T")[0];

    const lastLogin = localStorage.getItem(lastLoginKey);

    let history: string[] = [];
    try {
      const raw = localStorage.getItem(historyKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          history = parsed.filter(d => typeof d === "string");
        }
      }
    } catch {
    }

    if (!history.includes(today)) {
      history.push(today);
    }

    const uniqueHistory = Array.from(new Set(history)).sort();

    const maxDaysToKeep = 30;
    const trimmedHistory =
      uniqueHistory.length > maxDaysToKeep
        ? uniqueHistory.slice(uniqueHistory.length - maxDaysToKeep)
        : uniqueHistory;

    localStorage.setItem(historyKey, JSON.stringify(trimmedHistory));
    localStorage.setItem(lastLoginKey, today);

    let currentStreak = 0;
    const cursor = new Date(today);

    while (true) {
      const cursorStr = cursor.toISOString().split("T")[0];
      if (trimmedHistory.includes(cursorStr)) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    localStorage.setItem(streakKey, currentStreak.toString());
    setStreak(currentStreak);

    const week: DayStatus[] = [];
    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(todayDateObj);
      d.setDate(todayDateObj.getDate() - (6 - offset));
      const label = d.toLocaleDateString(undefined, { weekday: "short" });
      const dayStr = d.toISOString().split("T")[0];
      const isCompleted = trimmedHistory.includes(dayStr);
      week.push({
        day: label,
        status: isCompleted ? "completed" : "pending",
      });
    }

    setWeekStatus(week);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Card className="p-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-16 bg-muted rounded"></div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto w-full">
      {/* Daily Streak */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-bold">Daily Streak</h3>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-1">
            {streak} {streak === 1 ? 'Day' : 'Days'}
          </Badge>
        </div>

        {/* Week Overview */}
        <div className="flex justify-between mb-4">
          {weekStatus.map((day) => (
            <div key={day.day} className="flex flex-col items-center gap-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                day.status === 'completed' 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : day.status === 'missed'
                  ? 'border-destructive text-destructive'
                  : 'border-muted text-muted-foreground'
              }`}>
                {day.status === 'completed' && <CheckCircle2 className="w-6 h-6" />}
                {day.status === 'missed' && <Circle className="w-6 h-6" />}
                {day.status === 'pending' && <Circle className="w-6 h-6" />}
              </div>
              <span className="text-xs text-muted-foreground">{day.day}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Daily Challenges */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Daily Challenges</h3>
        {challenges.map((challenge) => (
          <Card key={challenge.id} className="p-4 transition-all hover:bg-accent/5">
            <div className="flex items-start justify-between mb-3">
              <div className="space-y-1">
                <h4 className="font-medium">{challenge.title}</h4>
                <p className="text-sm text-muted-foreground">{challenge.description}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                  +{challenge.reward_usdt} USDT
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                  +{challenge.reward_xp} XP
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className={challenge.completed ? "text-primary font-medium" : "text-muted-foreground"}>
                  {challenge.current_value} / {challenge.target_value}
                </span>
              </div>
              <Progress value={(challenge.current_value / challenge.target_value) * 100} className="h-2" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
