import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface AdBannerProps {
  userRole?: string;
  className?: string;
  format?: 'horizontal' | 'vertical' | 'box';
}

const PREMIUM_ROLES = ['FinoriPro', 'FinoriGold', 'FinoriUltra', 'FinoriFamily'];

export const AdBanner = ({ userRole, className = "", format = 'horizontal' }: AdBannerProps) => {
  // If user has any premium role, do not show ads
  if (userRole && PREMIUM_ROLES.includes(userRole)) {
    return null;
  }

  // Placeholder ad content
  return (
    <div className={`bg-muted/50 border border-border/50 rounded-lg flex items-center justify-center overflow-hidden relative group ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
      
      <div className="text-center p-4 relative z-10">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Advertisement</p>
        <h3 className="font-bold text-foreground mb-2">Upgrade to Premium</h3>
        <p className="text-sm text-muted-foreground mb-3">Remove ads and unlock exclusive features!</p>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          Learn More <ExternalLink className="ml-1 h-3 w-3" />
        </Button>
      </div>
      
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }}>
      </div>
    </div>
  );
};
