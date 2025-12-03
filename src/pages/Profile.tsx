import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, Award, DollarSign, Clock, Target, LogOut, RotateCcw, Trash2, UserPlus, Camera, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Portfolio from "@/components/trading/Portfolio";
interface ProfileData {
  nickname: string;
  email: string;
  avatar_url?: string;
  level: number;
  total_xp: number;
  played_time_seconds: number;
  total_trades: number;
  win_rate: number;
  total_profit_loss: number;
  usdt_balance: number;
}
const Profile = () => {
  const {
    user,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfileData();

    // Track played time
    const interval = setInterval(() => {
      updatePlayedTime();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [user, navigate]);
  const fetchProfileData = async () => {
    if (!user) return;
    try {
      const [profileRes, statsRes, balanceRes] = await Promise.all([supabase.from("profiles").select("*").eq("id", user.id).single(), supabase.from("player_stats").select("*").eq("user_id", user.id).maybeSingle(), supabase.from("user_balances").select("*").eq("user_id", user.id).single()]);
      if (profileRes.data) {
        setProfileData({
          nickname: profileRes.data.nickname,
          email: profileRes.data.email,
          avatar_url: profileRes.data.avatar_url,
          level: statsRes.data?.level || 1,
          total_xp: statsRes.data?.total_xp || 0,
          played_time_seconds: profileRes.data.played_time_seconds || 0,
          total_trades: profileRes.data.total_trades || 0,
          win_rate: profileRes.data.win_rate || 0,
          total_profit_loss: profileRes.data.total_profit_loss || 0,
          usdt_balance: balanceRes.data?.usdt_balance || 0
        });
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst data profilu",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const updatePlayedTime = async () => {
    if (!user) return;
    await supabase.from("profiles").update({
      played_time_seconds: (profileData?.played_time_seconds || 0) + 60,
      last_active_at: new Date().toISOString()
    }).eq("id", user.id);
  };
  const handleResetPortfolio = async () => {
    if (!user) return;
    try {
      // Delete all orders, trades, and portfolio entries
      await Promise.all([supabase.from("orders").delete().eq("user_id", user.id), supabase.from("trades").delete().eq("user_id", user.id), supabase.from("portfolios").delete().eq("user_id", user.id)]);

      // Reset balance to initial amount
      await supabase.from("user_balances").update({
        usdt_balance: 100000,
        locked_balance: 0
      }).eq("user_id", user.id);

      // Reset profile stats
      await supabase.from("profiles").update({
        total_trades: 0,
        win_rate: 0,
        total_profit_loss: 0
      }).eq("id", user.id);
      toast({
        title: "Portfolio resetováno",
        description: "Vaše portfolio bylo úspěšně resetováno na výchozí stav"
      });
      setShowResetDialog(false);
      fetchProfileData();
    } catch (error) {
      console.error("Error resetting portfolio:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se resetovat portfolio",
        variant: "destructive"
      });
    }
  };
  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      // Delete all user data
      await Promise.all([supabase.from("orders").delete().eq("user_id", user.id), supabase.from("trades").delete().eq("user_id", user.id), supabase.from("portfolios").delete().eq("user_id", user.id), supabase.from("player_stats").delete().eq("user_id", user.id), supabase.from("user_balances").delete().eq("user_id", user.id), supabase.from("profiles").delete().eq("id", user.id)]);
      toast({
        title: "Účet smazán",
        description: "Váš účet byl úspěšně smazán"
      });
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat účet",
        variant: "destructive"
      });
    }
  };
  const handleUpdateAvatar = async () => {
    if (!user || !avatarUrl.trim()) return;
    try {
      await supabase.from("profiles").update({
        avatar_url: avatarUrl
      }).eq("id", user.id);
      toast({
        title: "Profilový obrázek aktualizován",
        description: "Váš profilový obrázek byl úspěšně změněn"
      });
      setShowAvatarDialog(false);
      fetchProfileData();
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat profilový obrázek",
        variant: "destructive"
      });
    }
  };
  const formatPlayedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    return `${hours}h ${minutes}m`;
  };
  const calculateXpForNextLevel = () => {
    if (!profileData) return {
      current: 0,
      needed: 1000,
      percentage: 0
    };

    // Calculate total XP needed for current level
    let totalForCurrentLevel = 0;
    for (let i = 1; i <= profileData.level; i++) {
      totalForCurrentLevel += i * 500 + 500;
    }

    // Calculate XP needed for next level
    const xpForNextLevel = (profileData.level + 1) * 500 + 500;
    const currentLevelXp = profileData.total_xp - totalForCurrentLevel;
    const percentage = currentLevelXp / xpForNextLevel * 100;
    return {
      current: Math.max(0, currentLevelXp),
      needed: xpForNextLevel,
      percentage: Math.max(0, Math.min(100, percentage))
    };
  };
  if (loading || !profileData) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Načítání profilu...</div>
      </div>;
  }
  const xpProgress = calculateXpForNextLevel();
  const isProfitable = profileData.total_profit_loss >= 0;
  return <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate("/trade")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zpět na trading
        </Button>

        {/* Profile Header */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                {profileData.avatar_url ? <AvatarImage src={profileData.avatar_url} alt={profileData.nickname} /> : <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                    {profileData.nickname.substring(0, 2).toUpperCase()}
                  </AvatarFallback>}
              </Avatar>
              <Button size="icon" variant="secondary" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full" onClick={() => {
              setAvatarUrl(profileData.avatar_url || "");
              setShowAvatarDialog(true);
            }}>
                <Camera className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{profileData.nickname}</h1>
                <Badge variant="secondary" className="text-sm">
                  Level {profileData.level}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-4">{profileData.email}</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    XP: {xpProgress.current} / {xpProgress.needed}
                  </span>
                  <span className="text-muted-foreground">
                    {xpProgress.percentage.toFixed(0)}%
                  </span>
                </div>
                <Progress value={xpProgress.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Celkem XP: {profileData.total_xp}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button variant="outline" className="w-full" onClick={() => setShowAvatarDialog(true)}>
                <Camera className="h-4 w-4 mr-2" />
                Změnit profilovku
              </Button>
              <Button variant="outline" className="w-full" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-2" />
                Odhlásit se
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-2xl font-bold">
                  ${profileData.usdt_balance.toLocaleString('en-US', {
                  minimumFractionDigits: 2
                })}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isProfitable ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {isProfitable ? <TrendingUp className="h-5 w-5 text-green-500" /> : <TrendingDown className="h-5 w-5 text-red-500" />}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className={`text-2xl font-bold ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                  {isProfitable ? '+' : ''}${profileData.total_profit_loss.toLocaleString('en-US', {
                  minimumFractionDigits: 2
                })}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{profileData.win_rate.toFixed(1)}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nahraný čas</p>
                <p className="text-2xl font-bold">{formatPlayedTime(profileData.played_time_seconds)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Additional Stats */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">​Business statistics </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Celkem obchodů</p>
              <p className="text-3xl font-bold">{profileData.total_trades}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Úspěšné obchody</p>
              <p className="text-3xl font-bold text-green-500">
                {Math.round(profileData.win_rate / 100 * profileData.total_trades)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Neúspěšné obchody</p>
              <p className="text-3xl font-bold text-red-500">
                {profileData.total_trades - Math.round(profileData.win_rate / 100 * profileData.total_trades)}
              </p>
            </div>
          </div>
        </Card>

        {/* Invite Friend */}
        <Card className="p-6 mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">​Invite friends </h3>
              </div>
              <p className="text-muted-foreground">
                ​Invite friends and get rewarded!    
              </p>
            </div>
            <Button size="lg" className="font-semibold">
              for 17 500
            </Button>
          </div>
        </Card>

        {/* Portfolio */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">​Your Portfolio</h2>
          <Portfolio />
        </div>

        <Separator className="my-6" />

        {/* Danger Zone */}
        <Card className="p-6 border-destructive/50">
          <h2 className="text-xl font-semibold mb-4 text-destructive">Nebezpečná zóna</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Resetovat portfolio</p>
                <p className="text-sm text-muted-foreground">
                  Smaže všechny obchody a obnoví počáteční balance
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowResetDialog(true)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Smazat účet</p>
                <p className="text-sm text-muted-foreground">
                  Trvale smaže váš účet a všechna data
                </p>
              </div>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Smazat
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Reset Portfolio Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu chcete resetovat portfolio?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce smaže všechny vaše obchody, pozice a obnoví balance na 100 000 USDT.
              Tuto akci nelze vrátit zpět.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPortfolio}>
              Ano, resetovat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu chcete smazat účet?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce trvale smaže váš účet a všechna související data.
              Tuto akci nelze vrátit zpět.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ano, smazat účet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Avatar Dialog */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Změnit profilový obrázek</DialogTitle>
            <DialogDescription>
              Zadejte URL adresu vašeho profilového obrázku
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="avatar-url">URL obrázku</Label>
              <Input id="avatar-url" placeholder="https://example.com/avatar.jpg" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
            </div>
            {avatarUrl && <div className="flex justify-center">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl} alt="Preview" />
                  <AvatarFallback>Preview</AvatarFallback>
                </Avatar>
              </div>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAvatarDialog(false)}>
                Zrušit
              </Button>
              <Button onClick={handleUpdateAvatar}>
                Uložit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default Profile;