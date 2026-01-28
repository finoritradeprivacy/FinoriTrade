import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Flame, Shield, ShieldAlert, Timer, Settings, Wrench, Lock, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { useSimTrade } from "@/contexts/SimTradeContext";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generateChallenges, getChallengeConfig, ChallengeTemplate } from "@/utils/challengeTemplates";

interface DayStatus {
  day: string;
  status: 'pending' | 'completed' | 'missed' | 'saved';
  date: string;
}

interface ActiveChallenge extends ChallengeTemplate {
  current_value: number;
  completed: boolean;
  isLocked: boolean;
}

export const Challenges = () => {
  const { user } = useAuth();
  const { trades, addNotification } = useSimTrade();
  
  const [dailyChallenges, setDailyChallenges] = useState<ActiveChallenge[]>([]);
  const [weeklyChallenges, setWeeklyChallenges] = useState<ActiveChallenge[]>([]);
  const [monthlyChallenges, setMonthlyChallenges] = useState<ActiveChallenge[]>([]);
  
  const [streak, setStreak] = useState(0);
  const [weekStatus, setWeekStatus] = useState<DayStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextStreakTime, setNextStreakTime] = useState("");
  
  // Premium Streak Features
  const [userRole, setUserRole] = useState<string>();
  const [saveHistory, setSaveHistory] = useState<string[]>([]);
  const [emergencyHistory, setEmergencyHistory] = useState<string[]>([]);
  const [loginHistory, setLoginHistory] = useState<string[]>([]);
  const [autoSave, setAutoSave] = useState(true);
  const [canRepair, setCanRepair] = useState(false);
  const [repairCost, setRepairCost] = useState<{type: 'normal' | 'emergency', date: string} | null>(null);

  useEffect(() => {
    const storedAutoSave = localStorage.getItem('streakAutoSave');
    if (storedAutoSave !== null) {
      setAutoSave(storedAutoSave === 'true');
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Separate effect for challenges to ensure role is loaded
  useEffect(() => {
    if (userRole !== undefined) {
      initializeChallenges();
    }
  }, [userRole, trades]);

  // Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setNextStreakTime(`${h}h ${m}m`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const handleAutoSaveToggle = (checked: boolean) => {
    setAutoSave(checked);
    localStorage.setItem('streakAutoSave', String(checked));
  };

  const fetchUserData = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('player_stats')
        .select('achievements, streak_save_history, emergency_save_history, login_history')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setUserRole(data.achievements?.role || 'User');
        
        const saves = Array.isArray(data.streak_save_history) ? data.streak_save_history : [];
        const emergencies = Array.isArray(data.emergency_save_history) ? data.emergency_save_history : [];
        const logins = Array.isArray(data.login_history) ? data.login_history : [];
        
        setSaveHistory(saves);
        setEmergencyHistory(emergencies);
        setLoginHistory(logins);
        
        updateStreak(saves, emergencies, logins, data.achievements?.role, autoSave);
      } else {
        setUserRole('User');
        updateStreak([], [], [], undefined, autoSave);
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      updateStreak([], [], [], undefined, autoSave);
    }
  };

  const calculateProgress = (trades: any[], template: ChallengeTemplate, type: 'daily' | 'weekly' | 'monthly'): number => {
    const now = new Date();
    
    // Filter trades by period
    const filteredTrades = trades.filter(t => {
      const date = new Date(t.createdAt);
      if (type === 'daily') {
        return date.getDate() === now.getDate() && 
               date.getMonth() === now.getMonth() && 
               date.getFullYear() === now.getFullYear();
      } else if (type === 'weekly') {
        // Simple check: same week number (approx)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return date >= oneWeekAgo;
      } else {
        return date.getMonth() === now.getMonth() && 
               date.getFullYear() === now.getFullYear();
      }
    });

    switch (template.target_metric) {
      case 'trades_count':
        return filteredTrades.length;
      case 'profit':
        // Sum of realized PnL from Sell trades
        return filteredTrades.reduce((acc: number, t: any) => acc + (t.realizedPnL || 0), 0);
      case 'win_rate':
        // (Winning Trades / Total Trades) * 100
        const total = filteredTrades.length;
        if (total === 0) return 0;
        const wins = filteredTrades.filter((t: any) => (t.realizedPnL || 0) > 0).length;
        return (wins / total) * 100;
      case 'risk_reward':
        // Needs avg win / avg loss. Simplified: (Total Win PnL / Win Count) / (Total Loss PnL / Loss Count)
        // This is hard to calculate accurately without proper trade linking.
        // Returning 0 for now as placeholder or maybe a mock logic
        return 0; 
      case 'consecutive_wins':
        let maxStreak = 0;
        let currentStreak = 0;
        // Sort by time
        const sorted = [...filteredTrades].sort((a, b) => a.createdAt - b.createdAt);
        sorted.forEach((t: any) => {
          if ((t.realizedPnL || 0) > 0) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
          } else if ((t.realizedPnL || 0) < 0) {
            currentStreak = 0;
          }
        });
        return maxStreak;
      case 'max_drawdown':
        // Hard to calculate without equity curve. Return 0 for now.
        return 0;
      case 'no_overtrading':
        // Special logic: "Progress" is trades count, but "Success" is keeping it BELOW target.
        // We track count.
        return filteredTrades.length;
      case 'stop_loss_limit':
         // We don't have explicit SL hit flag on Trade yet, only on Notifications.
         // Approximation: Trades with big loss?
         return 0; 
      default:
        return 0;
    }
  };

  const initializeChallenges = () => {
    const config = getChallengeConfig(userRole);
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // Daily Seed
    
    // Weekly Seed: Year + Week
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil(days / 7);
    const weekStr = `${now.getFullYear()}-W${weekNum}`;

    // Monthly Seed
    const monthStr = `${now.getFullYear()}-${now.getMonth()}`;

    const processChallenges = (
      templates: ChallengeTemplate[], 
      limit: number, 
      type: 'daily' | 'weekly' | 'monthly'
    ) => {
      return templates.map((tpl, index) => {
        const isLocked = index >= limit;
        const progress = calculateProgress(trades, tpl, type);
        
        // Check completion based on condition
        let completed = false;
        if (tpl.condition === 'gt') completed = progress >= tpl.target_value;
        else if (tpl.condition === 'lt') completed = progress <= tpl.target_value; // Logic might be inverted for "Do not exceed"
        else if (tpl.condition === 'eq') completed = progress === tpl.target_value;
        
        // Special case for 'no_overtrading': fails if gt
        if (tpl.target_metric === 'no_overtrading') {
           completed = progress <= tpl.target_value;
        }

        return {
          ...tpl,
          current_value: progress,
          completed,
          isLocked
        };
      });
    };

    const dailyRaw = generateChallenges(dateStr, 'daily');
    const weeklyRaw = generateChallenges(weekStr, 'weekly');
    const monthlyRaw = generateChallenges(monthStr, 'monthly');

    setDailyChallenges(processChallenges(dailyRaw, config.dailyCount, 'daily'));
    setWeeklyChallenges(processChallenges(weeklyRaw, config.weeklyCount, 'weekly'));
    setMonthlyChallenges(processChallenges(monthlyRaw, config.monthlyCount, 'monthly'));

    setLoading(false);
  };

  const getSaveLimits = (role: string | undefined) => {
    if (role === 'FinoriGold') return { savesPerWeek: 1, emergencyPerMonth: 0 };
    if (['FinoriUltra', 'FinoriFamily'].includes(role || '')) return { savesPerWeek: 2, emergencyPerMonth: 1 };
    return { savesPerWeek: 0, emergencyPerMonth: 0 };
  };

  const updateStreak = async (
    currentSaveHistory: string[], 
    currentEmergencyHistory: string[], 
    currentLoginHistory: string[],
    role: string | undefined,
    isAutoSaveEnabled: boolean,
    forceRepair: boolean = false
  ) => {
    if (!user) return;

    const todayDateObj = new Date();
    const today = todayDateObj.toISOString().split("T")[0];
    
    // Sync login history
    let updatedLogins = [...currentLoginHistory];
    let justLoggedIn = false;
    if (!updatedLogins.includes(today)) {
      updatedLogins.push(today);
      justLoggedIn = true;
      await supabase.from('player_stats').update({
        login_history: updatedLogins
      }).eq('user_id', user.id);
    }
    
    // Sort and unique
    let uniqueHistory = Array.from(new Set(updatedLogins)).sort();
    
    // Calculate Streak & Apply Saves Logic
    let currentStreak = 0;
    const cursor = new Date(today);
    let newSavesUsed: string[] = [];
    let newEmergenciesUsed: string[] = [];
    let modifiedHistory = [...uniqueHistory];
    let repairPossible = false;
    let repairDetails = null;

    const limits = getSaveLimits(role);
    
    // Iterate back to calculate streak
    for (let i = 0; i < 365; i++) { 
      const cursorStr = cursor.toISOString().split("T")[0];
      
      if (modifiedHistory.includes(cursorStr)) {
        currentStreak++;
      } else {
        // Gap detected
        const isAlreadySaved = currentSaveHistory.includes(cursorStr);
        const isAlreadyEmergencySaved = currentEmergencyHistory.includes(cursorStr);
        
        if (isAlreadySaved || isAlreadyEmergencySaved) {
           currentStreak++;
        } else {
          // Gap is NOT saved. Can we save it?
          
          // Check limits (excluding current session's new saves for accurate check)
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          const savesInLastWeek = currentSaveHistory.filter(d => new Date(d) > oneWeekAgo).length + newSavesUsed.length;
          
          const oneMonthAgo = new Date();
          oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
          const emergenciesInLastMonth = currentEmergencyHistory.filter(d => new Date(d) > oneMonthAgo).length + newEmergenciesUsed.length;

          let canUseNormalSave = limits.savesPerWeek > 0 && savesInLastWeek < limits.savesPerWeek;
          let canUseEmergencySave = limits.emergencyPerMonth > 0 && emergenciesInLastMonth < limits.emergencyPerMonth;
          
          if (canUseNormalSave || canUseEmergencySave) {
            // We CAN save this. Should we?
            if (isAutoSaveEnabled || forceRepair) {
              // Apply save
              if (canUseNormalSave) {
                newSavesUsed.push(cursorStr);
                currentStreak++;
                if (!forceRepair) { // Only toast if auto-saving
                    toast.success("Streak Saved!", {
                    description: `Used a Streak Save for ${cursorStr}.`
                    });
                }
              } else {
                newEmergenciesUsed.push(cursorStr);
                currentStreak++;
                if (!forceRepair) {
                    toast.success("Emergency Streak Save Used!", {
                    description: `Used an Emergency Save for ${cursorStr}.`
                    });
                }
              }
            } else {
              // Auto-save disabled, and we haven't forced repair.
              // Report that repair is possible and STOP streak here.
              repairPossible = true;
              repairDetails = {
                type: canUseNormalSave ? 'normal' : 'emergency',
                date: cursorStr
              };
              break; // Streak broken
            }
          } else {
            break; // Streak broken and cannot be saved
          }
        }
      }
      
      cursor.setDate(cursor.getDate() - 1);
    }

    // Update DB if we used new saves
    if (newSavesUsed.length > 0 || newEmergenciesUsed.length > 0) {
      const updatedSaves = [...currentSaveHistory, ...newSavesUsed];
      const updatedEmergencies = [...currentEmergencyHistory, ...newEmergenciesUsed];
      
      await supabase.from('player_stats').update({
        streak_save_history: updatedSaves,
        emergency_save_history: updatedEmergencies
      }).eq('user_id', user.id);
      
      setSaveHistory(updatedSaves);
      setEmergencyHistory(updatedEmergencies);
      
      if (forceRepair) {

      // Notification for Streak Save
      const cooldownText = getCooldownText(updatedSaves, limits.savesPerWeek, 7);
      const cooldownMsg = cooldownText && cooldownText !== "Available now" 
        ? `. ${cooldownText}.` 
        : "";
        
      addNotification({
        notification_type: "streak_save",
        title: "Streak Saved",
        message: `Your streak was saved${cooldownMsg}`,
        metadata: { type: newSavesUsed.length > 0 ? 'normal' : 'emergency' }
      });
    }

    // Notification for Daily Streak Increase
    if (justLoggedIn) {
        // Recalculate streak to be sure we have the latest number (it is 'currentStreak' variable)
        addNotification({
            notification_type: "streak",
            title: "Daily Streak Increased!",
            message: `Daily streak: ${currentStreak} days. Keep it going.`,
            metadata: { streak: currentStreak }
        });
          toast.success("Streak Repaired Successfully!");
      }
    }

    setStreak(currentStreak);
    setLoginHistory(uniqueHistory);
    setCanRepair(repairPossible);
    // @ts-ignore
    setRepairCost(repairDetails);

    // Week Status
    const week: DayStatus[] = [];
    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(todayDateObj);
      d.setDate(todayDateObj.getDate() - (6 - offset));
      const label = d.toLocaleDateString(undefined, { weekday: "short" });
      const dayStr = d.toISOString().split("T")[0];
      
      const isCompleted = uniqueHistory.includes(dayStr);
      const isSaved = currentSaveHistory.includes(dayStr) || newSavesUsed.includes(dayStr);
      const isEmergency = currentEmergencyHistory.includes(dayStr) || newEmergenciesUsed.includes(dayStr);
      
      let status: DayStatus['status'] = 'pending';
      if (isCompleted) status = 'completed';
      else if (isSaved || isEmergency) status = 'saved';
      else if (d < todayDateObj) status = 'missed';
      
      week.push({
        day: label,
        status: status,
        date: dayStr
      });
    }

    setWeekStatus(week);
  };

  const handleManualRepair = () => {
    updateStreak(saveHistory, emergencyHistory, loginHistory, userRole, false, true);
  };

  const getCooldownText = (history: string[], limit: number, windowDays: number) => {
      if (limit === 0) return null;
      
      const now = new Date();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - windowDays);
      
      const recentSaves = history
        .filter(d => new Date(d) > cutoff)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); 
        
      if (recentSaves.length < limit) return "Available now";
      
      const oldestBlockingSave = recentSaves[limit - 1]; 
      if (!oldestBlockingSave) return "Available now";
      
      const saveDate = new Date(oldestBlockingSave);
      const availableDate = new Date(saveDate);
      availableDate.setDate(availableDate.getDate() + windowDays);
      
      const diffMs = availableDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
      
      if (diffDays > 1) return `Next save in ${diffDays} days`;
      if (diffHours > 0) return `Next save in ${diffHours} hours`;
      return "Available soon";
  };

  const renderChallengeCard = (challenge: ActiveChallenge) => {
    const config = getChallengeConfig(userRole);
    const rewardMultiplier = config.rewardMultiplier;

    return (
      <Card key={challenge.id} className={`p-4 transition-all relative overflow-hidden ${challenge.isLocked ? 'opacity-70 bg-muted/20' : 'hover:bg-accent/5'}`}>
        {challenge.isLocked && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 group cursor-help">
             <Lock className="h-8 w-8 text-yellow-500 mb-2" />
             <div className="bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-6 whitespace-nowrap">
               Unlock with Finori Gold / Ultra
             </div>
          </div>
        )}

        <div className="flex items-start justify-between mb-3">
          <div className="space-y-1">
            <h4 className="font-medium flex items-center gap-2">
              {challenge.title}
              {challenge.completed && !challenge.isLocked && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </h4>
            <p className="text-sm text-muted-foreground">{challenge.description}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
              +{Math.round(challenge.base_reward_usdt * rewardMultiplier)} USDT
            </Badge>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              +{Math.round(challenge.base_reward_xp * rewardMultiplier)} XP
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className={challenge.completed ? "text-primary font-medium" : "text-muted-foreground"}>
              {typeof challenge.current_value === 'number' ? challenge.current_value.toFixed(1) : challenge.current_value} / {challenge.target_value}
            </span>
          </div>
          <Progress value={Math.min(100, (challenge.current_value / challenge.target_value) * 100)} className="h-2" />
        </div>
      </Card>
    );
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
  
  const limits = getSaveLimits(userRole);
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const usedSavesRecent = saveHistory.filter(d => new Date(d) > oneWeekAgo).length;
  const remainingSaves = Math.max(0, limits.savesPerWeek - usedSavesRecent);
  
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  const usedEmergenciesRecent = emergencyHistory.filter(d => new Date(d) > oneMonthAgo).length;
  const remainingEmergencies = Math.max(0, limits.emergencyPerMonth - usedEmergenciesRecent);

  return (
    <div className="space-y-6 max-h-[700px] overflow-y-auto w-full pr-2">
      {/* Streak Card */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500 fill-orange-500 animate-pulse" />
            <div>
              <h3 className="text-xl font-bold">Daily Streak</h3>
              <p className="text-xs text-muted-foreground">Miss a day → streak resets</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
             <Badge variant="secondary" className="text-lg px-4 py-1 bg-background/50 backdrop-blur border-primary/20">
               {streak} {streak === 1 ? 'Day' : 'Days'}
             </Badge>
             <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
               <Timer className="h-3 w-3" />
               <span>Next streak in {nextStreakTime}</span>
             </div>
          </div>
        </div>

        {/* Week Overview */}
        <div className="flex justify-between mb-6">
          {weekStatus.map((day) => (
            <div key={day.day} className="flex flex-col items-center gap-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                day.status === 'completed' 
                  ? 'bg-primary border-primary text-primary-foreground shadow-[0_0_10px_rgba(255,215,0,0.3)]' 
                  : day.status === 'saved'
                  ? 'bg-blue-500/20 border-blue-500 text-blue-500'
                  : day.status === 'missed'
                  ? 'border-destructive/50 text-destructive/50'
                  : 'border-muted text-muted-foreground'
              }`}>
                {day.status === 'completed' && <CheckCircle2 className="w-6 h-6" />}
                {day.status === 'saved' && <Shield className="w-5 h-5" />}
                {day.status === 'missed' && <Circle className="w-6 h-6" />}
                {day.status === 'pending' && <Circle className="w-6 h-6 opacity-20" />}
              </div>
              <span className="text-xs font-medium text-muted-foreground">{day.day}</span>
            </div>
          ))}
        </div>
        
        {/* Streak Settings & Repair */}
        {limits.savesPerWeek > 0 && (
          <div className="space-y-3">
             <div className="flex items-center justify-between bg-background/40 rounded-lg p-2 px-3 border border-border/50">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="auto-save" className="text-sm cursor-pointer">Auto-use Streak Saves</Label>
                </div>
                <Switch 
                  id="auto-save" 
                  checked={autoSave} 
                  onCheckedChange={handleAutoSaveToggle} 
                />
             </div>
             
             {canRepair && (
               <div className="animate-in fade-in slide-in-from-top-2">
                 <Button 
                   onClick={handleManualRepair} 
                   className="w-full bg-blue-500 hover:bg-blue-600 text-white gap-2 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                 >
                   <Wrench className="h-4 w-4" />
                   Repair Streak ({repairCost?.type === 'emergency' ? 'Emergency Save' : '1 Streak Save'})
                 </Button>
               </div>
             )}
          </div>
        )}

        {/* Streak Saves Status (Only for Premium) */}
        {limits.savesPerWeek > 0 && (
          <div className="bg-background/40 rounded-lg p-3 border border-border/50 text-sm mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                Streak Saves
              </span>
              <span className={remainingSaves > 0 ? "text-green-500" : "text-muted-foreground"}>
                {remainingSaves} / {limits.savesPerWeek} available
              </span>
            </div>
            {remainingSaves === 0 && (
               <p className="text-xs text-muted-foreground text-right">
                 {getCooldownText(saveHistory, limits.savesPerWeek, 7)}
               </p>
            )}
            
            {limits.emergencyPerMonth > 0 && (
              <div className="border-t border-border/50 pt-2 mt-2">
                <div className="flex items-center justify-between">
                   <span className="font-semibold flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-500" />
                    Emergency Saves
                  </span>
                  <span className={remainingEmergencies > 0 ? "text-green-500" : "text-muted-foreground"}>
                    {remainingEmergencies} / {limits.emergencyPerMonth} available
                  </span>
                </div>
                {remainingEmergencies === 0 && (
                   <p className="text-xs text-muted-foreground text-right mt-1">
                     {getCooldownText(emergencyHistory, limits.emergencyPerMonth, 30)}
                   </p>
                )}
              </div>
            )}
          </div>
        )}
      </Card>


      {/* Daily Challenges */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Daily Challenges
        </h3>
        {dailyChallenges.map(renderChallengeCard)}
      </div>

      {/* Weekly Challenges */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Timer className="h-5 w-5 text-blue-500" />
          Weekly Challenges
        </h3>
        {weeklyChallenges.map(renderChallengeCard)}
      </div>

      {/* Monthly Challenges */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-500" />
          Monthly Challenges
        </h3>
        {monthlyChallenges.map(renderChallengeCard)}
      </div>
    </div>
  );
};
