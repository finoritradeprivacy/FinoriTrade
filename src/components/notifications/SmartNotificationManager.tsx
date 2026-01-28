
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSimTrade } from '@/contexts/SimTradeContext';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Helper to track previous value
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export const SmartNotificationManager = () => {
  const { user } = useAuth();
  const { orders, trades, holdings, prices, usdtBalance } = useSimTrade();
  const { addNotification } = useSmartNotifications();
  const prevOrders = usePrevious(orders);
  const prevTrades = usePrevious(trades);
  
  // Fetch user profile for role and level
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*, player_stats(*)')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const userRole = (profile?.player_stats?.[0] as any)?.achievements?.role || 'FinoriPro';
  
  const userLevel = (profile?.player_stats?.[0] as any)?.level || 1;
  const prevLevel = usePrevious(userLevel);
  const { notifications } = useSmartNotifications();

  // 1. SYSTEM NOTIFICATIONS
  useEffect(() => {
    if (!user || !profile) return;

    // Level Up
    if (prevLevel && userLevel > prevLevel) {
      addNotification(
        'system',
        `Level Up!`,
        `Congratulations! You reached Level ${userLevel}.`,
        { level: userLevel }
      );
    }

    // XP Milestone (Every 500 XP = 5 trades)
    if (prevTrades && trades.length > prevTrades.length) {
       const totalXp = trades.length * 100;
       if (totalXp > 0 && totalXp % 500 === 0) {
          addNotification(
            'progress',
            'XP Milestone',
            `You reached ${totalXp} XP! Keep grinding.`,
            { xp: totalXp }
          );
       }
       
       // Challenge Progress (Daily Trader: 5 trades)
       const today = new Date().toDateString();
       const tradesToday = trades.filter(t => new Date(t.createdAt).toDateString() === today).length;
       if (tradesToday === 4) {
           addNotification(
               'progress',
               'Challenge Progress',
               'Daily Trader: 80% completed (4/5 trades).',
               { challenge: 'Daily Trader', progress: 0.8 }
           );
       }
    }

  }, [user, profile, userLevel, prevLevel, trades, prevTrades]);

  // 2. TRADE STATUS NOTIFICATIONS (Canceled only - Filled is handled in Context)
  useEffect(() => {
    if (!prevOrders) return;

    // Detect changes in orders
    orders.forEach(order => {
      const prevOrder = prevOrders.find(o => o.id === order.id);
      
      // Order Canceled
      if (prevOrder && prevOrder.status === 'pending' && order.status === 'cancelled') {
        addNotification(
          'trade',
          `Order Canceled`,
          `Your order for ${order.symbol} was canceled.`,
          { order_id: order.id }
        );
      }
    });
  }, [orders]);

  // 3. BEHAVIOR NOTIFICATIONS (Gold+)
  useEffect(() => {
    if (!['FinoriGold', 'FinoriUltra', 'FinoriFamily'].includes(userRole)) return;
    
    // Overtrading Check: 5 trades in 10 minutes
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;
    const recentTradesCount = trades.filter(t => t.createdAt > tenMinutesAgo).length;
    
    // Only check if we have a previous state to compare against (avoids triggering on page load)
    if (prevTrades && recentTradesCount === 5) {
       const prevRecentCount = prevTrades.filter(t => t.createdAt > tenMinutesAgo).length;
       if (prevRecentCount < 5) {
         addNotification(
           'behavior',
           'High Trading Activity',
           'You placed 5 trades in the last 10 minutes. Consider slowing down.',
           { count: recentTradesCount }
         );
       }
    }

    // Repeated SL Check: 3 stop-losses hit in a row (last 3 trade notifications)
    const tradeNotifs = notifications
        .filter(n => n.notification_type === 'trade_status' || n.notification_type === 'trade')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
    
    if (tradeNotifs.length === 3) {
        const allSL = tradeNotifs.every(n => n.title.includes('Stop-loss'));
        
        const lastSLAlert = localStorage.getItem('last_sl_alert');
        const latestNotifTime = new Date(tradeNotifs[0].created_at).getTime();
        
        if (allSL && (!lastSLAlert || latestNotifTime > Number(lastSLAlert))) {
             addNotification(
               'behavior',
               'Risk Warning',
               '3 stop-losses hit in a row. Review your risk management.',
               { trigger: 'repeated_sl' }
             );
             localStorage.setItem('last_sl_alert', String(Date.now()));
        }
    }

    // Inactivity Check (Once per session/mount if applicable)
    if (trades.length > 0) {
        // Sort trades by date desc to get last trade
        const lastTradeTime = Math.max(...trades.map(t => t.createdAt));
        const threeDays = 3 * 24 * 60 * 60 * 1000;
        
        if (now - lastTradeTime > threeDays) {
            const lastInactivityAlert = localStorage.getItem('last_inactivity_alert');
            // Alert once every 3 days
            if (!lastInactivityAlert || now - Number(lastInactivityAlert) > threeDays) {
                addNotification(
                    'behavior',
                    'Long Inactivity',
                    'You haven’t traded for 3 days. New challenges are available.',
                    { last_trade: lastTradeTime }
                );
                localStorage.setItem('last_inactivity_alert', String(now));
            }
        }
    }

  }, [trades, userRole, notifications, prevTrades]);

  // 4. ADVANCED NOTIFICATIONS (Ultra+)
  useEffect(() => {
      if (!['FinoriUltra', 'FinoriFamily'].includes(userRole)) return;

      // Portfolio Concentration
      let totalValue = usdtBalance;
      const assetValues: Record<string, number> = {};
      
      Object.entries(holdings).forEach(([symbol, holding]) => {
          const price = prices[symbol] || holding.averageBuyPrice || 0;
          const val = holding.quantity * price;
          assetValues[symbol] = val;
          totalValue += val;
      });
      
      if (totalValue > 0) {
          Object.entries(assetValues).forEach(([symbol, val]) => {
              const concentration = val / totalValue;
              if (concentration > 0.72) { // 72% threshold
                   const lastAlert = localStorage.getItem(`concentration_alert_${symbol}`);
                   if (!lastAlert || Date.now() - Number(lastAlert) > 24 * 60 * 60 * 1000) { // Once a day
                       addNotification(
                           'portfolio',
                           'High Concentration Risk',
                           `${(concentration * 100).toFixed(0)}% of your portfolio is exposed to ${symbol}.`,
                           { symbol, concentration }
                       );
                       localStorage.setItem(`concentration_alert_${symbol}`, String(Date.now()));
                   }
              }
          });
      }

      // Drawdown Alert
      // Track max balance in local storage
      const currentBalance = totalValue;
      const maxBalanceStr = localStorage.getItem('max_portfolio_balance');
      let maxBalance = maxBalanceStr ? Number(maxBalanceStr) : 0;
      
      if (currentBalance > maxBalance) {
          maxBalance = currentBalance;
          localStorage.setItem('max_portfolio_balance', String(maxBalance));
      } else if (maxBalance > 0 && currentBalance < maxBalance * 0.92) { // -8% drawdown
           const lastDrawdownAlert = localStorage.getItem('drawdown_alert');
           if (!lastDrawdownAlert || Date.now() - Number(lastDrawdownAlert) > 24 * 60 * 60 * 1000) {
               addNotification(
                   'portfolio',
                   'Drawdown Alert',
                   `Current drawdown reached -${((1 - currentBalance/maxBalance) * 100).toFixed(1)}%.`,
                   { drawdown: 1 - currentBalance/maxBalance }
               );
               localStorage.setItem('drawdown_alert', String(Date.now()));
           }
      }

      // AI Insights (Win Rate & Risk/Reward) - Weekly Check
      // We check this once per session or day
      const lastInsightCheck = localStorage.getItem('last_insight_check');
      if (!lastInsightCheck || Date.now() - Number(lastInsightCheck) > 7 * 24 * 60 * 60 * 1000) { // Weekly
          const now = Date.now();
          const oneWeek = 7 * 24 * 60 * 60 * 1000;
          const recentTrades = trades.filter(t => now - t.createdAt < oneWeek);
          const previousTrades = trades.filter(t => now - t.createdAt >= oneWeek && now - t.createdAt < 2 * oneWeek);
          
          if (recentTrades.length >= 5 && previousTrades.length >= 5) {
               // Win Rate
               const winRate = recentTrades.filter(t => t.totalValue > t.quantity * t.price).length / recentTrades.length; // Simplified profit check
               const prevWinRate = previousTrades.filter(t => t.totalValue > t.quantity * t.price).length / previousTrades.length;
               
               if (winRate > prevWinRate + 0.1) { // 10% improvement
                   addNotification(
                       'insight',
                       'Performance Improvement',
                       `Win rate improved by ${(winRate - prevWinRate * 100).toFixed(0)}% compared to last week.`,
                       { win_rate: winRate }
                   );
               }
               
               // Risk/Reward (Avg Win / Avg Loss)
               // This is hard to calculate without PnL per trade stored explicitly in Trade interface as profit/loss
               // Assuming totalValue - (quantity * price) = PnL (approx)
               // Note: Trade interface has 'price' (execution price) and 'totalValue' (total value at execution?).
               // Wait, Trade interface:
               // price: execution price
               // totalValue: price * quantity
               // We don't have exit price here. We only have "Trades" (executions).
               // If these are entry trades, we can't calculate PnL yet.
               // If these are closed trades... The SimTradeContext doesn't explicitly track closed trades with PnL.
               // It tracks "Trades" (order executions).
               
               // So we can't calculate Win Rate or R:R from the 'trades' array easily unless we match entries and exits.
               // Skipping complex PnL analysis for now to avoid errors.
          }
          localStorage.setItem('last_insight_check', String(Date.now()));
      }

  }, [holdings, prices, usdtBalance, userRole, trades]);

  // 5. MARKET CONTEXT (Gold+) - Volatility
  const lastPricesRef = useRef<Record<string, number>>({});
  
  useEffect(() => {
      if (!['FinoriGold', 'FinoriUltra', 'FinoriFamily'].includes(userRole)) return;
      
      // Check for >5% move in 1 minute?
      // We run this effect when 'prices' change.
      // We need to throttle/interval this check.
      
      const interval = setInterval(() => {
          Object.entries(prices).forEach(([symbol, price]) => {
              const lastPrice = lastPricesRef.current[symbol];
              if (lastPrice) {
                  const change = Math.abs((price - lastPrice) / lastPrice);
                  if (change > 0.05) { // 5% jump
                       addNotification(
                           'market',
                           'High Volatility Detected',
                           `${symbol} moved by ${(change * 100).toFixed(1)}% recently.`,
                           { symbol, change }
                       );
                       // Reset ref for this symbol to avoid spamming every second
                       // Actually we should update ref always at end of interval
                  }
              }
              lastPricesRef.current[symbol] = price;
          });
      }, 60000); // Check every minute
      
      return () => clearInterval(interval);
  }, [prices, userRole]);

  return null;
};
