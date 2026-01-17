import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Newspaper, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSimTrade } from "@/contexts/SimTradeContext";
import { ASSETS } from "@/data/assets";

interface NewsEvent {
  id: string;
  headline: string;
  content: string;
  event_type: string;
  impact_type: 'bullish' | 'bearish' | 'neutral';
  impact_strength: number;
  created_at: string;
  scheduled_for: string | null;
  asset_symbol?: string;
}

export const calculateNewsImpactPrice = (
  price: number,
  impactType: 'bullish' | 'bearish' | 'neutral',
  strength: number
): number => {
  if (!Number.isFinite(price) || price <= 0) return price;
  const clampedStrength = Math.max(0, Math.min(strength, 10));
  if (impactType === 'bullish') {
    const factor = 1 + clampedStrength * 0.01;
    return Math.max(0.0001, price * factor);
  }
  if (impactType === 'bearish') {
    const factor = 1 - clampedStrength * 0.01;
    return Math.max(0.0001, price * factor);
  }
  return price;
};

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateNewsEvent = (scheduledTime: Date | null, assetPrice: number | null): NewsEvent => {
    const asset = getRandomItem(ASSETS);

    const hasValidPassedPrice =
      typeof assetPrice === "number" && Number.isFinite(assetPrice) && assetPrice > 0;
    const basePrice = hasValidPassedPrice
      ? assetPrice as number
      : asset.category === "forex"
        ? 1
        : 100;

    const isBreaking = Math.random() > 0.8; // 20% chance of breaking news
    const type = isBreaking ? "Breaking News" : "Market Sentiment";
    const impactType = Math.random() > 0.5 ? "bullish" : "bearish";
    
    // Breaking news: 5-9% impact
    // Sentiment: 1-3% impact
    const strength = isBreaking 
        ? getRandomInt(5, 9) 
        : getRandomInt(1, 3); 

    let headline = "";
    let content = "";

    const priceForText = basePrice > 0 ? basePrice : 1;
    const priceStr =
      asset.category === "forex"
        ? priceForText.toFixed(4)
        : priceForText > 1
          ? priceForText.toFixed(2)
          : priceForText.toPrecision(4);

    if (isBreaking) {
        if (impactType === 'bullish') {
            if (asset.category === 'crypto') {
                const headlines = [
                    `${asset.name} Skyrockets on Major Partnership`,
                    `Institutional Investors Flock to ${asset.symbol}`,
                    `${asset.symbol} Breaks All-Time Highs in Volume`,
                    `Global Adoption News Boosts ${asset.name}`
                ];
                headline = getRandomItem(headlines);
                content = `Breaking reports indicate a massive surge in demand for ${asset.symbol}. Analysts predict immediate upward price action from the current ${priceStr} level.`;
            } else if (asset.category === 'stocks') {
                const headlines = [
                    `${asset.name} Reports Record Earnings`,
                    `Major Acquisition Announced by ${asset.name}`,
                    `${asset.symbol} Soars on Analyst Upgrade`,
                    `Product Breakthrough for ${asset.name}`
                ];
                headline = getRandomItem(headlines);
                content = `${asset.name} has released highly positive news, driving investor confidence. The stock is rallying strongly from ${priceStr}.`;
            } else {
                const headlines = [
                    `Central Bank Comments Boost ${asset.symbol}`,
                    `Unexpected GDP Growth Lifts ${asset.symbol}`,
                    `Trade Deal Optimism for ${asset.symbol}`,
                    `${asset.symbol} Surges on Inflation Data`
                ];
                headline = getRandomItem(headlines);
                content = `Strong economic data has strengthened ${asset.symbol} against its peers. The pair is moving up from ${priceStr}.`;
            }
        } else {
            if (asset.category === 'crypto') {
                const headlines = [
                    `${asset.name} Plummets Amid Regulatory Crackdown`,
                    `Major Security Breach Affects ${asset.symbol} Ecosystem`,
                    `${asset.symbol} Faces Critical Support Test`,
                    `Panic Selling Hits ${asset.name} Markets`
                ];
                headline = getRandomItem(headlines);
                content = `Urgent selling pressure observed in ${asset.symbol} following negative regulatory news. The asset is under heavy pressure around ${priceStr}.`;
            } else if (asset.category === 'stocks') {
                const headlines = [
                    `${asset.name} Misses Earnings Expectations`,
                    `CEO Resignation Shakes ${asset.name}`,
                    `${asset.symbol} Falls on Weak Guidance`,
                    `Regulatory Probe into ${asset.name}`
                ];
                headline = getRandomItem(headlines);
                content = `Negative corporate developments have triggered a sell-off in ${asset.symbol}. The stock is sliding from ${priceStr}.`;
            } else {
                const headlines = [
                    `Weak Economic Data Hits ${asset.symbol}`,
                    `Central Bank Dovishness Weighs on ${asset.symbol}`,
                    `Geopolitical Tensions Hurt ${asset.symbol}`,
                    `${asset.symbol} Drops on Rate Decision`
                ];
                headline = getRandomItem(headlines);
                content = `Disappointing economic indicators are weighing heavily on ${asset.symbol}. The pair is declining from ${priceStr}.`;
            }
        }
    } else {
         if (impactType === 'bullish') {
            const headlines = [
                `${asset.name} Shows Positive Momentum`,
                `Traders Optimistic About ${asset.symbol}`,
                `Steady Growth for ${asset.name}`,
                `${asset.symbol} Technicals Look Strong`
            ];
            headline = getRandomItem(headlines);
            content = `Traders are optimistic about ${asset.symbol} as market sentiment improves. Price action is constructive above ${priceStr}.`;
        } else {
            const headlines = [
                `${asset.name} Faces Minor Correction`,
                `Short-term Profit Taking on ${asset.symbol}`,
                `${asset.name} Consolidates Gains`,
                `Volume Dries Up for ${asset.symbol}`
            ];
             headline = getRandomItem(headlines);
             content = `Short-term profit taking observed in ${asset.symbol}, leading to a slight dip from recent highs around ${priceStr}.`;
        }
    }

    return {
        id: Math.random().toString(36).substr(2, 9),
        headline,
        content,
        event_type: type,
        impact_type: impactType as 'bullish' | 'bearish' | 'neutral',
        impact_strength: strength,
        created_at: new Date().toISOString(),
        scheduled_for: scheduledTime ? scheduledTime.toISOString() : null,
        asset_symbol: asset.symbol
    };
}

const NewsFeed = () => {
  const { prices, overridePrice } = useSimTrade();
  const [news, setNews] = useState<NewsEvent[]>([]);
  const [nextEventTime, setNextEventTime] = useState<string | null>(null);
  
  // Use ref for prices to access in interval without re-triggering
  const pricesRef = useRef(prices);
  useEffect(() => {
      pricesRef.current = prices;
  }, [prices]);

  // Initial load
  useEffect(() => {
      // Schedule next events
      const now = new Date();
      const minutes = now.getMinutes();
      
      let firstMinute: number;
      if (minutes < 20) firstMinute = 20;
      else if (minutes < 40) firstMinute = 40;
      else firstMinute = 60;
      
      const firstEventTime = new Date(now);
      firstEventTime.setMinutes(firstMinute, 0, 0);
      if (firstMinute === 60) {
          firstEventTime.setHours(firstEventTime.getHours() + 1);
          firstEventTime.setMinutes(0, 0, 0);
      } else {
          firstEventTime.setSeconds(0);
          firstEventTime.setMilliseconds(0);
      }
      
      const secondEventTime = new Date(firstEventTime);
      secondEventTime.setMinutes(firstEventTime.getMinutes() + 20);

      // Generate initial state
      const initialPending = [
          generateNewsEvent(firstEventTime, null),
          generateNewsEvent(secondEventTime, null)
      ];
      
      const initialRecent = [
          generateNewsEvent(null, null), // Recent 1
          generateNewsEvent(null, null)  // Recent 2
      ];
      // Adjust timestamps for recent
      initialRecent[0].created_at = new Date(Date.now() - 1000 * 60 * 15).toISOString();
      initialRecent[1].created_at = new Date(Date.now() - 1000 * 60 * 45).toISOString();

      setNews([...initialPending, ...initialRecent]);
  }, []); // Run once

  // Timer interval
  useEffect(() => {
      const interval = setInterval(() => {
          const nowTs = Date.now();
          let earliestDiff: number | null = null;
          
          setNews(prev => {
              let changed = false;
              let newEventsToAdd: NewsEvent[] = [];

              const updated = prev.map(item => {
                  if (item.scheduled_for) {
                      const scheduledTs = new Date(item.scheduled_for).getTime();
                      const diff = scheduledTs - nowTs;
                      
                      if (diff > 0 && (earliestDiff === null || diff < earliestDiff)) {
                          earliestDiff = diff;
                      }
                      
                      if (diff <= 0) {
                          // Trigger event
                          if (item.asset_symbol) {
                              const currentPrice = pricesRef.current[item.asset_symbol] || 0;
                              // If currentPrice is 0 (not found in feed), maybe look up in ASSETS static
                              const assetStatic = ASSETS.find(a => a.symbol === item.asset_symbol);
                              const basePrice = currentPrice > 0 ? currentPrice : (assetStatic?.current_price || 0);
                              
                              const impactedPrice = calculateNewsImpactPrice(
                                  basePrice,
                                  item.impact_type,
                                  item.impact_strength
                              );
                              
                              if (impactedPrice > 0 && Math.abs(impactedPrice - basePrice) > Number.EPSILON) {
                                  overridePrice(item.asset_symbol, impactedPrice);
                                  // Optionally: Trigger a notification or log
                              }
                          }
                          
                          changed = true;
                          return {
                              ...item,
                              scheduled_for: null,
                              created_at: new Date().toISOString()
                          };
                      }
                  }
                  return item;
              });

              // Ensure we always have at least 2 pending events
              const pendingCount = updated.filter(n => n.scheduled_for).length;
              if (pendingCount < 2) {
                  // Find the last scheduled time
                  const pendingEvents = updated.filter(n => n.scheduled_for);
                  let lastScheduledTime = 0;
                  
                  if (pendingEvents.length > 0) {
                      lastScheduledTime = Math.max(...pendingEvents.map(n => new Date(n.scheduled_for!).getTime()));
                  } else {
                      // No pending events, calculate next slot from now
                      const now = new Date();
                      const minutes = now.getMinutes();
                      let nextMin = Math.ceil(minutes / 20) * 20;
                      if (nextMin === minutes) nextMin += 20;
                      
                      const baseDate = new Date(now);
                      if (nextMin >= 60) {
                          baseDate.setHours(baseDate.getHours() + 1);
                          baseDate.setMinutes(nextMin - 60, 0, 0);
                      } else {
                          baseDate.setMinutes(nextMin, 0, 0);
                      }
                      lastScheduledTime = baseDate.getTime();
                  }
                  
                  // Add needed events
                  const needed = 2 - pendingCount;
                  for (let i = 0; i < needed; i++) {
                      // If we have pending events, add 20 mins to the last one.
                      // If we just calculated "next slot", use that for the first one, then +20 for next.
                      // Note: if pendingEvents.length was 0, lastScheduledTime is the "next slot".
                      // If pendingEvents.length was 1, lastScheduledTime is that event's time.
                      // So we always add 20 mins to lastScheduledTime?
                      // Wait. If pendingEvents.length is 0, we want the FIRST one to be at lastScheduledTime.
                      // If pendingEvents.length is 1, we want the NEXT one to be at lastScheduledTime + 20.
                      
                      let nextTimeMs: number;
                      if (pendingEvents.length === 0 && i === 0) {
                          nextTimeMs = lastScheduledTime;
                      } else {
                          lastScheduledTime += 20 * 60 * 1000;
                          nextTimeMs = lastScheduledTime;
                      }
                      
                      const newEvent = generateNewsEvent(new Date(nextTimeMs), null);
                      newEventsToAdd.push(newEvent);
                  }
                  changed = true;
              }

              if (changed) {
                  return [...updated, ...newEventsToAdd];
              }
              return prev;
          });

          // Update countdown display
          if (earliestDiff === null) {
              setNextEventTime(null);
          } else {
             const totalSeconds = Math.max(0, Math.floor(earliestDiff / 1000));
             const mins = Math.floor(totalSeconds / 60);
             const secs = totalSeconds % 60;
             setNextEventTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
          }

      }, 1000);

      return () => clearInterval(interval);
  }, [overridePrice]);

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
    
    if (diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const pendingNews = news.filter(item => item.scheduled_for !== null).sort((a, b) => 
      new Date(a.scheduled_for!).getTime() - new Date(b.scheduled_for!).getTime()
  );
  
  const publishedNews = news.filter(item => item.scheduled_for === null).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

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
                      <div className="flex flex-col">
                        <span className="text-xs font-medium truncate max-w-[150px]">
                            {item.headline}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                            {item.event_type}
                        </span>
                      </div>
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
          {publishedNews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No published news yet.
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
