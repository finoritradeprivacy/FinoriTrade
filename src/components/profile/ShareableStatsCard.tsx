import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, Trophy, Medal } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface ShareableStatsCardProps {
  data: {
    nickname: string;
    avatar_url?: string;
    role?: string;
    total_profit_loss: number;
    win_rate: number;
    total_trades: number;
    level: number;
  };
}

export const ShareableStatsCard = ({ data }: ShareableStatsCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2, // High resolution
        useCORS: true, // Critical for external images like avatars
        logging: false,
      });
      
      const link = document.createElement("a");
      link.download = `finori-stats-${data.nickname}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast.success("Stats card downloaded!");
    } catch (err) {
      console.error("Image generation failed:", err);
      toast.error("Failed to generate image. Please try again.");
    }
  };

  const getTheme = (role?: string) => {
    switch (role) {
      case "FinoriUltra":
        return {
          bg: "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900",
          border: "border-purple-500/50",
          accent: "text-purple-400",
          badge: "bg-purple-500/20 text-purple-200 border-purple-500/50"
        };
      case "FinoriGold":
        return {
          bg: "bg-gradient-to-br from-slate-900 via-amber-900/40 to-slate-900",
          border: "border-amber-500/50",
          accent: "text-amber-400",
          badge: "bg-amber-500/20 text-amber-200 border-amber-500/50"
        };
      case "FinoriPro":
        return {
          bg: "bg-gradient-to-br from-slate-900 via-blue-900/40 to-slate-900",
          border: "border-blue-500/50",
          accent: "text-blue-400",
          badge: "bg-blue-500/20 text-blue-200 border-blue-500/50"
        };
      default:
        return {
          bg: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
          border: "border-white/10",
          accent: "text-emerald-400",
          badge: "bg-white/10 text-slate-200 border-white/20"
        };
    }
  };

  const theme = getTheme(data.role);
  const isProfit = data.total_profit_loss >= 0;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-medium">Your Trading Card</h3>
        <p className="text-sm text-muted-foreground">Share your success with the community</p>
      </div>

      {/* Capture Area */}
      <div 
        ref={cardRef}
        className={`relative w-[380px] overflow-hidden rounded-2xl border ${theme.border} ${theme.bg} p-8 shadow-2xl transition-all`}
      >
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 p-3 opacity-10">
          <Trophy className="w-24 h-24 rotate-12" />
        </div>
        <div className="absolute bottom-0 left-0 p-3 opacity-10">
          <TrendingUp className="w-24 h-24 -rotate-12" />
        </div>

        {/* Header */}
        <div className="relative flex items-center gap-4 mb-8">
          <Avatar className="h-16 w-16 border-2 border-white/20 shadow-lg">
            <AvatarImage src={data.avatar_url} className="object-cover" />
            <AvatarFallback className="text-xl bg-slate-800 text-white">
              {data.nickname.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{data.nickname}</h2>
            <Badge variant="outline" className={`${theme.badge} mt-1`}>
              {data.role || "Trader"}
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="relative grid grid-cols-2 gap-4 mb-8">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Net P&L</p>
            <p className={`text-xl font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
              {isProfit ? '+' : ''}{data.total_profit_loss.toLocaleString()} USDT
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Win Rate</p>
            <p className={`text-xl font-bold ${theme.accent}`}>
              {data.win_rate.toFixed(1)}%
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Total Trades</p>
            <p className="text-xl font-bold text-white">
              {data.total_trades}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Level</p>
            <div className="flex items-center gap-2">
              <Medal className={`w-5 h-5 ${theme.accent}`} />
              <p className="text-xl font-bold text-white">{data.level}</p>
            </div>
          </div>
        </div>

        {/* Footer / Branding */}
        <div className="relative flex items-center justify-between pt-6 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center">
              <span className="text-xs font-bold text-white">F</span>
            </div>
            <span className="text-sm font-semibold text-white tracking-wide">FinoriTrade</span>
          </div>
          <span className="text-[10px] text-slate-500">finoritrade.com</span>
        </div>
      </div>

      <Button onClick={handleDownload} className="w-full max-w-[380px] gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white shadow-lg">
        <Download className="h-4 w-4" />
        Download Image
      </Button>
    </div>
  );
};
