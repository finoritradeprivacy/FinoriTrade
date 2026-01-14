import { useState, useEffect, useRef } from "react";
import { Bell, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { useSoundAlerts } from "@/hooks/useSoundAlerts";

interface DividendAsset {
  asset_id: string;
  amount: number;
  shares: number;
  symbol?: string;
}

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata: {
    total_amount?: number;
    assets?: DividendAsset[];
    payment_date?: string;
    [key: string]: unknown;
  };
}

export const UserNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [animatingBell, setAnimatingBell] = useState(false);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());
  const { playNotificationSound, soundEnabled } = useSoundAlerts();
  const lastNotificationIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setNotifications([]);
    setUnreadCount(0);
  }, [user]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "dividend":
        return "💰";
      case "trade":
        return "📈";
      case "challenge":
        return "🏆";
      case "news":
        return "📰";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "dividend":
        return "bg-green-500/20 text-green-400";
      case "trade":
        return "bg-blue-500/20 text-blue-400";
      case "challenge":
        return "bg-yellow-500/20 text-yellow-400";
      case "news":
        return "bg-purple-500/20 text-purple-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell 
            className={`h-5 w-5 transition-transform ${
              animatingBell ? 'animate-bell-ring' : ''
            }`}
            style={{
              transformOrigin: 'top center'
            }}
          />
          {unreadCount > 0 && (
            <Badge
              className={`absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary ${
                animatingBell ? 'animate-pulse' : ''
              }`}
              variant="default"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const isDividend = notification.notification_type === "dividend";
                const isExpanded = expandedNotifications.has(notification.id);
                const dividendAssets = notification.metadata?.assets as DividendAsset[] | undefined;
                
                return (
                  <div
                    key={notification.id}
                    className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                      !notification.is_read ? "bg-primary/5" : ""
                    }`}
                    onClick={() => {
                      if (!notification.is_read) markAsRead(notification.id);
                      if (isDividend && dividendAssets?.length) toggleExpanded(notification.id);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${getNotificationColor(
                          notification.notification_type
                        )}`}
                      >
                        {getNotificationIcon(notification.notification_type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                          {isDividend && dividendAssets?.length && (
                            <span className="ml-auto text-muted-foreground">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isDividend 
                            ? `You received money from the dividend. Total: $${notification.metadata?.total_amount?.toFixed(2) || '0.00'}`
                            : notification.message
                          }
                        </p>
                        
                        {/* Expandable dividend details */}
                        {isDividend && isExpanded && dividendAssets && (
                          <div className="mt-2 p-2 bg-muted/30 rounded-md space-y-1">
                            {dividendAssets.map((asset, idx) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                  {asset.shares.toFixed(2)} shares
                                </span>
                                <span className="text-success font-medium">
                                  +${asset.amount.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
