import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSimTrade } from "@/contexts/SimTradeContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TrendingUp, TrendingDown, Award, DollarSign, Clock, Target, LogOut, RotateCcw, Trash2, UserPlus, Camera, ArrowLeft, Copy, Check, Pencil, AlertTriangle, Mail, Gift, Crown, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Portfolio from "@/components/trading/Portfolio";
import { toast as sonnerToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  role?: string;
}

const PREMIUM_ROLES = ["FinoriPro", "FinoriAlpha", "FinoriUltra", "FinoriFamily", "FinoriGold"];

import { PremiumLeaderboard } from "@/components/trading/PremiumLeaderboard";
import { AdBanner } from "@/components/ui/AdBanner";

import { ShareableStatsCard } from "@/components/profile/ShareableStatsCard";

const Profile = () => {
  const { user, signOut, resendVerificationEmail } = useAuth();
  const { usdtBalance, holdings, trades, prices, resetAll, grantReferralReward } = useSimTrade();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [emailVerified, setEmailVerified] = useState(true);
  const [resendingEmail, setResendingEmail] = useState(false);
  
  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState("FinoriPro");

  const fetchProfileData = useCallback(async () => {
    if (!user) return;
    const metadata = (user.user_metadata || {}) as { nickname?: string; [key: string]: unknown };
    const nickname =
      metadata.nickname ||
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
    const firstTradeTime =
      trades.length > 0
        ? Math.min(...trades.map((t) => t.createdAt))
        : Date.now();
    const playedSeconds = Math.max(
      0,
      Math.floor((Date.now() - firstTradeTime) / 1000)
    );

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

    setProfileData({
      nickname,
      email,
      avatar_url: avatarUrl || undefined,
      level,
      total_xp: totalXp,
      played_time_seconds: playedSeconds,
      total_trades: totalTrades,
      win_rate: 0,
      total_profit_loss: totalProfitLoss,
      usdt_balance: usdtBalance,
      role: role || undefined
    });
    setLoading(false);
  }, [user, usdtBalance, holdings, trades, prices, avatarUrl]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfileData();
    setEmailVerified(user.email_confirmed_at !== null);
  }, [user, navigate, fetchProfileData]);

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


  const handleResetPortfolio = async () => {
    if (!user) return;
    try {
      resetAll();
      toast({
        title: "Portfolio Reset",
        description: "Your portfolio has been successfully reset to default"
      });
      setShowResetDialog(false);
      fetchProfileData();
    } catch (error) {
      console.error("Error resetting portfolio:", error);
      toast({
        title: "Error",
        description: "Failed to reset portfolio",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      toast({
        title: "Account Signed Out",
        description: "You have been signed out and local data reset"
      });
      resetAll();
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive"
      });
    }
  };

  const handleUpdateAvatar = async () => {
    if (!user || !avatarUrl.trim()) return;
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(`finori_avatar_url_${user.id}`, avatarUrl.trim());
      }
      setProfileData((prev) =>
        prev ? { ...prev, avatar_url: avatarUrl } : prev
      );
      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been changed"
      });
      setShowAvatarDialog(false);
      fetchProfileData();
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast({
        title: "Error",
        description: "Failed to update profile picture",
        variant: "destructive"
      });
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    if (editNickname.length < 3) {
      toast({
        title: "Error",
        description: "Nickname must be at least 3 characters",
        variant: "destructive"
      });
      return;
    }

    try {
      setProfileData((prev) =>
        prev
          ? {
              ...prev,
              nickname: editNickname,
              email: editEmail
            }
          : prev
      );
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully"
      });
      setShowEditProfileDialog(false);
      fetchProfileData();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  const handleInviteFriend = async () => {
    const referralLink = `${window.location.origin}/auth?ref=${user?.id}`;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      grantReferralReward();
      toast({
        title: "Link Copied!",
        description: "Your referral link is copied and you received a 17,500 USDT bonus."
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy the link manually: " + referralLink,
        variant: "destructive"
      });
    }
  };

  const formatPlayedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleResendVerificationEmail = async () => {
    setResendingEmail(true);
    try {
      const { error } = await resendVerificationEmail();
      if (error) throw error;
      sonnerToast.success("Verification email sent! Please check your inbox.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resend verification email";
      sonnerToast.error(message);
    } finally {
      setResendingEmail(false);
    }
  };

  const calculateXpForNextLevel = () => {
    if (!profileData) return { current: 0, needed: 1000, percentage: 0 };

    const calculateXpForLevel = (level: number): number => {
      if (level <= 1) return 0;
      let total = 0;
      for (let i = 1; i < level; i++) {
        total += 1000 + (i - 1) * 500;
      }
      return total;
    };

    const xpForCurrentLevel = calculateXpForLevel(profileData.level);
    const xpForNextLevel = 1000 + (profileData.level - 1) * 500;
    const xpInCurrentLevel = profileData.total_xp - xpForCurrentLevel;
    const percentage = (xpInCurrentLevel / xpForNextLevel) * 100;

    return {
      current: Math.max(0, xpInCurrentLevel),
      needed: xpForNextLevel,
      percentage: Math.max(0, Math.min(100, percentage))
    };
  };

  if (loading || !profileData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  const xpProgress = calculateXpForNextLevel();
  const isProfitable = profileData.total_profit_loss >= 0;

  const handleRedeemCode = async () => {
    if (!promoCode.trim()) {
        toast({
            title: "Error",
            description: "Please enter a code",
            variant: "destructive"
        });
        return;
    }
    
    // Check for hardcoded premium codes first (legacy support)
    if (PREMIUM_ROLES.includes(promoCode)) {
        setShowSelectionDialog(true);
        setSelectedRole(promoCode);
        return;
    }
    
    try {
        const { data: codeData, error: codeError } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('code', promoCode)
            .eq('is_active', true)
            .single();
            
        if (codeError || !codeData) {
             toast({
                title: "Invalid Code",
                description: "This code is invalid or expired.",
                variant: "destructive"
             });
             return;
        }
        
        // Check if expired
        if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
            toast({
                title: "Expired Code",
                description: "This code has expired.",
                variant: "destructive"
             });
             return;
        }

        // Redeem
        const { error: redeemError } = await supabase
            .from('promo_code_redemptions')
            .insert({
                promo_code_id: codeData.id,
                user_id: user?.id
            });
            
        if (redeemError) {
             toast({
                title: "Already Redeemed",
                description: "You have already used this code.",
                variant: "destructive"
             });
             return;
        }
        
        toast({
            title: "Code Redeemed!",
            description: `You received: ${codeData.description || 'Rewards'}`,
        });
        
        // Process rewards (if any logic needed beyond just logging redemption)
        // ...
        
        setPromoCode("");
        
    } catch (err) {
        console.error("Redeem error:", err);
         toast({
            title: "Error",
            description: "Failed to redeem code.",
            variant: "destructive"
         });
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

      sonnerToast.success(`Congratulations! You are now ${selectedRole}`);
      setShowSelectionDialog(false);
      fetchProfileData(); // Refresh data
    } catch (error) {
      console.error("Error applying role:", error);
      sonnerToast.error("Failed to apply role");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate("/trade")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Trading
        </Button>

        {/* Email Verification Warning */}
        {!emailVerified && (
          <Card className="mb-6 p-4 bg-yellow-500/20 border-yellow-500/50">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-yellow-500">Please confirm your email</p>
                  <p className="text-sm text-muted-foreground">You won't be able to trade until you verify your email address.</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                onClick={handleResendVerificationEmail}
                disabled={resendingEmail}
              >
                <Mail className="h-4 w-4 mr-2" />
                {resendingEmail ? "Sending..." : "Resend Email"}
              </Button>
            </div>
          </Card>
        )}

        {/* Profile Header */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                {profileData.avatar_url ? (
                  <AvatarImage src={profileData.avatar_url} alt={profileData.nickname} />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                    {profileData.nickname.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                onClick={() => {
                  setAvatarUrl(profileData.avatar_url || "");
                  setShowAvatarDialog(true);
                }}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{profileData.nickname}</h1>
                {PREMIUM_ROLES.includes(profileData.role || '') && (
                  <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)] animate-pulse">
                    <Crown className="w-3 h-3 mr-1" />
                    {profileData.role}
                  </Badge>
                )}
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
                  Total XP: {profileData.total_xp}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2 flex-1 md:flex-none" onClick={() => setShowShareDialog(true)}>
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" className="flex-1 md:flex-none" onClick={() => {
                setEditNickname(profileData.nickname);
                setEditEmail(profileData.email);
                setShowEditProfileDialog(true);
              }}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" className="flex-1 md:flex-none" onClick={() => setShowAvatarDialog(true)}>
                <Camera className="h-4 w-4 mr-2" />
                Avatar
              </Button>
              <Button variant="outline" className="flex-1 md:flex-none" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </Button>
            </div>
          </div>
        </Card>

        {/* AdBanner removed as requested */}


        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-2xl font-bold">
                  ${profileData.usdt_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isProfitable ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {isProfitable ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className={`text-2xl font-bold ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                  {isProfitable ? '+' : ''}${profileData.total_profit_loss.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
        </div>

        {/* Additional Stats */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Trading Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Trades</p>
              <p className="text-3xl font-bold">{profileData.total_trades}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Winning Trades</p>
              <p className="text-3xl font-bold text-green-500">
                {Math.round((profileData.win_rate / 100) * profileData.total_trades)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Losing Trades</p>
              <p className="text-3xl font-bold text-red-500">
                {profileData.total_trades - Math.round((profileData.win_rate / 100) * profileData.total_trades)}
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
                <h3 className="text-lg font-semibold">Invite Friends</h3>
              </div>
              <p className="text-muted-foreground">
                Invite your friends and earn 17,500 USDT when they sign up!
              </p>
            </div>
            <Button size="lg" className="font-semibold" onClick={handleInviteFriend}>
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        </Card>

        {/* Redeem Code - GOLD & PROMINENT */}
        <Card className="p-8 mb-6 bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-background border-2 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
          <div className="flex flex-col gap-6">
             <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-500/20 rounded-full">
                    <Gift className="h-8 w-8 text-yellow-500" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-yellow-500 uppercase tracking-wide">Redeem Code</h3>
                    <p className="text-muted-foreground">
                        Unlock premium status and exclusive rewards
                    </p>
                </div>
             </div>
             
             <div className="flex gap-3">
                <Input 
                  placeholder="Enter your code here..." 
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="h-12 text-lg bg-background/80 border-yellow-500/30 focus-visible:ring-yellow-500 focus-visible:border-yellow-500"
                />
                <Button 
                  onClick={handleRedeemCode}
                  size="lg"
                  className="h-12 px-8 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold text-lg shadow-lg"
                >
                  Redeem
                </Button>
             </div>
          </div>
        </Card>

        {/* Portfolio */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Your Portfolio</h2>
          <Portfolio />
        </div>

        <PremiumLeaderboard userRole={profileData.role} />

        <Separator className="my-6" />

        {/* Danger Zone */}
        <Card className="p-6 border-destructive/50">
          <h2 className="text-xl font-semibold mb-4 text-destructive">Danger Zone</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Reset Portfolio</p>
                <p className="text-sm text-muted-foreground">
                  Delete all trades and restore initial balance
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
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Reset Portfolio Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to reset your portfolio?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete all your trades, positions and restore your balance to 100,000 USDT.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPortfolio}>
              Yes, Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete your account and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Avatar Dialog */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Profile Picture</DialogTitle>
            <DialogDescription>
              Enter the URL of your new profile picture
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="avatar-url">Image URL</Label>
              <Input
                id="avatar-url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
              />
            </div>
            {avatarUrl && (
              <div className="flex justify-center">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl} alt="Preview" />
                  <AvatarFallback>Preview</AvatarFallback>
                </Avatar>
              </div>
            )}
            <Button onClick={handleUpdateAvatar} className="w-full">
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Stats Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="bg-transparent border-none shadow-none p-0 max-w-fit sm:max-w-fit">
          {profileData && (
            <ShareableStatsCard data={{
              nickname: profileData.nickname,
              avatar_url: profileData.avatar_url,
              role: profileData.role,
              total_profit_loss: profileData.total_profit_loss,
              win_rate: profileData.win_rate,
              total_trades: profileData.total_trades,
              level: profileData.level
            }} />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfileDialog} onOpenChange={setShowEditProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your nickname and email address
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-nickname">Nickname</Label>
              <Input
                id="edit-nickname"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                placeholder="Your nickname"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="your@email.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Changing your email will require confirmation
              </p>
            </div>
            <Button onClick={handleUpdateProfile} className="w-full">
              Save Changes
            </Button>
          </div>
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
    </div>
  );
};

export default Profile;
