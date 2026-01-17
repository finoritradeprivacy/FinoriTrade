import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Newspaper, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewsEvent {
  id: string;
  headline: string;
  content: string;
  event_type: string;
  impact_type: 'bullish' | 'bearish' | 'neutral';
  impact_strength: number;
  created_at: string;
  scheduled_for: string | null;
}

const NewsFeed = () => {
  const [news, setNews] = useState<NewsEvent[]>([]);
  const [nextEventTime, setNextEventTime] = useState<string | null>(null);

  useEffect(() => {
    // Mock initial news
    const initialNews: NewsEvent[] = [
      {
        id: '1',
        headline: 'Bitcoin Breaks Resistance Level',
        content: 'Bitcoin has successfully broken through the key resistance level of $45,000.',
        event_type: 'Crypto Market',
        impact_type: 'bullish',
        impact_strength: 8,
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        scheduled_for: null
      },
      {
        id: '2',
        headline: 'Fed Announces Interest Rate Decision',
        content: 'The Federal Reserve has decided to keep interest rates unchanged.',
        event_type: 'Economic Policy',
        impact_type: 'neutral',
        impact_strength: 5,
        created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        scheduled_for: null
      },
      {
        id: '3',
        headline: 'Tech Stocks Sell-off Continues',
        content: 'Major tech stocks continue to slide as bond yields rise.',
        event_type: 'Stock Market',
        impact_type: 'bearish',
        impact_strength: 7,
        created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        scheduled_for: null
      }
    ];
    setNews(initialNews);

    // Update countdown every second
    const interval = setInterval(() => {
      setNews(prev => [...prev]); // Force re-render to update countdown
      updateNextEventCountdown();
    }, 1000);

    // Simulate incoming news
    const newsInterval = setInterval(() => {
        const newEvent: NewsEvent = {
            id: Date.now().toString(),
            headline: 'Market Update: Volatility Increases',
            content: 'Market volatility has increased significantly in the last hour.',
            event_type: 'Market Alert',
            impact_type: Math.random() > 0.5 ? 'bearish' : 'bullish',
            impact_strength: 6,
            created_at: new Date().toISOString(),
            scheduled_for: null
        };
        setNews(prev => [newEvent, ...prev].slice(0, 15));
        
        // Play notification sound
        // const audio = new Audio('/notification.mp3');
        // audio.play().catch(() => {});
    }, 60000 * 5); // Every 5 minutes

    // Initial countdown calculation
    updateNextEventCountdown();

    return () => {
      clearInterval(interval);
      clearInterval(newsInterval);
    };
  }, []);

  // Calculate countdown to next 20-minute interval (XX:00, XX:20, XX:40)
  const updateNextEventCountdown = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    
    let nextMinute: number;
    if (minutes < 20) {
      nextMinute = 20;
    } else if (minutes < 40) {
      nextMinute = 40;
    } else {
      nextMinute = 60;
    }
    
    const totalSecondsUntil = (nextMinute - minutes) * 60 - seconds;
    const mins = Math.floor(totalSecondsUntil / 60);
    const secs = totalSecondsUntil % 60;
    
    setNextEventTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
  };

  const getImpactColor = (impactType: string) => {
    switch (impactType) {
      case 'bullish': return 'text-success';
      case 'bearish': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getImpactIcon = (impactType: string) => {
    switch (impactType) {
      case 'bullish': return <TrendingUp className="w-3 h-3" />;
      case 'bearish': return <TrendingDown className="w-3 h-3" />;
      default: return <Newspaper className="w-3 h-3" />;
    }
  };

  const getCountdown = (scheduledFor: string | null) => {
    if (!scheduledFor) return null;
    
    const now = Date.now();
    const scheduled = new Date(scheduledFor).getTime();
    const diff = scheduled - now;
    
    if (diff <= 0) return null; // Already triggered
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Separate pending and published news
  const pendingNews = news.filter(item => {
    const countdown = getCountdown(item.scheduled_for);
    return countdown !== null;
  });
  
  const publishedNews = news.filter(item => {
    const countdown = getCountdown(item.scheduled_for);
    return countdown === null;
  });

  return (
    <Card className="p-4 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Market News</h2>
      </div>
      
      {/* Next event countdown banner */}
      <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm font-medium text-primary">
            New event in {nextEventTime || '--:--'}
          </span>
        </div>
      </div>

      {/* Pending news section */}
      {pendingNews.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            Pending Events ({pendingNews.length})
          </h3>
          <div className="space-y-2">
            {pendingNews.map((item) => {
              const countdown = getCountdown(item.scheduled_for);
              return (
                <div
                  key={item.id}
                  className="p-2 rounded-lg bg-warning/10 border border-warning/30 animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("", getImpactColor(item.impact_type))}>
                        {getImpactIcon(item.impact_type)}
                      </span>
                      <span className="text-xs font-medium truncate max-w-[150px]">
                        {item.headline}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-warning">
                      {countdown}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <ScrollArea className="h-[280px]">
        <div className="space-y-3 pr-4">
          {publishedNews.length === 0 && pendingNews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No pending news events
            </p>
          ) : publishedNews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No published news yet. Wait for pending events to trigger.
            </p>
          ) : (
            publishedNews.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg border bg-secondary/50 border-border hover:bg-secondary transition-all"
              >
                <div className="flex items-start gap-2 mb-1">
                  <span className={cn("mt-0.5", getImpactColor(item.impact_type))}>
                    {getImpactIcon(item.impact_type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold line-clamp-2">{item.headline}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {item.content}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {item.event_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default NewsFeed;
