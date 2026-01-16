import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ASSETS } from "@/data/assets";

type Side = "buy" | "sell";
type OrderType = "market" | "limit" | "stop";

export interface Order {
  id: string;
  symbol: string;
  side: Side;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number | null;
  status: "pending" | "filled" | "cancelled";
  createdAt: number;
  filledAt?: number;
}

export interface Trade {
  id: string;
  symbol: string;
  side: Side;
  quantity: number;
  price: number;
  totalValue: number;
  createdAt: number;
  
}

interface DividendAsset {
  asset_id: string;
  amount: number;
  shares: number;
  symbol?: string;
}

export interface AppNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata: {
    total_amount?: number;
    assets?: DividendAsset[];
    [key: string]: unknown;
  };
}

interface Holding {
  quantity: number;
  averageBuyPrice: number;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h?: number | null;
  [key: string]: unknown;
}

type AlertCondition = "above" | "below";
interface PriceAlert {
  id: string;
  assetId: string;
  targetPrice: number;
  condition: AlertCondition;
  isActive: boolean;
  triggeredAt: number | null;
  createdAt: number;
}

interface SimTradeState {
  usdtBalance: number;
  holdings: Record<string, Holding>;
  orders: Order[];
  trades: Trade[];
  prices: Record<string, number>;
  alerts: PriceAlert[];
  timeOnSite: number;
  notifications: AppNotification[];
}

interface SimTradeContextValue extends SimTradeState {
  placeMarketOrder: (symbol: string, side: Side, quantity: number, price: number) => { ok: boolean; error?: string };
  placeLimitOrder: (symbol: string, side: Side, quantity: number, price: number) => { ok: boolean; error?: string };
  placeStopOrder: (symbol: string, side: Side, quantity: number, stopPrice: number, limitPrice?: number) => { ok: boolean; error?: string };
  cancelOrder: (orderId: string) => void;
  resetAll: () => void;
  createAlert: (assetId: string, targetPrice: number, condition: AlertCondition) => { ok: boolean; error?: string };
  deleteAlert: (alertId: string) => void;
  setPriceFeedPaused: (paused: boolean) => void;
  overridePrice: (symbol: string, price: number) => void;
  applyVolatility: (multiplier: number) => void;
  applyMarketCrash: () => void;
  modifyBalance: (amount: number) => void;
  processDividendsForStocks: (options?: { annualYieldPercent?: number; symbolFilter?: string }) => { totalAmount: number; assets: DividendAsset[] };
  addNotification: (input: Omit<AppNotification, "id" | "created_at" | "is_read">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  grantReferralReward: () => void;
}

const SimTradeContext = createContext<SimTradeContextValue | null>(null);

const DEFAULT_BALANCE = 100000;
const TRACKED_CRYPTO = new Set(ASSETS.filter(a => a.category === "crypto").map(a => a.symbol));
const TRACKED_STOCKS = ASSETS.filter(a => a.category === "stocks").map(a => a.symbol);
const TRACKED_FOREX = ASSETS.filter(a => a.category === "forex").map(a => a.symbol);

function loadState(): SimTradeState {
  const raw = localStorage.getItem("simtrade_state");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return {
        usdtBalance: parsed.usdtBalance ?? DEFAULT_BALANCE,
        holdings: parsed.holdings ?? {},
        orders: parsed.orders ?? [],
        trades: parsed.trades ?? [],
        prices: {}, // Prices are volatile, don't load them
        alerts: parsed.alerts ?? [],
        timeOnSite: parsed.timeOnSite ?? 0,
        notifications: parsed.notifications ?? [],
      };
    } catch {
      // ignore
    }
  }
  return {
    usdtBalance: DEFAULT_BALANCE,
    holdings: {},
    orders: [],
    trades: [],
    prices: {},
    alerts: [],
    timeOnSite: 0,
    notifications: [],
  };
}

function saveState(state: SimTradeState) {
  const toSave = { ...state, prices: {} };
  localStorage.setItem("simtrade_state", JSON.stringify(toSave));
}

export function SimTradeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SimTradeState>(loadState);
  const [priceFeedPaused, setPriceFeedPausedState] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Simulation trends for smoother price movement
  const trendsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Time on Site Tracking
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => ({ ...prev, timeOnSite: (prev.timeOnSite || 0) + 1 }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Crypto WebSocket Connection
  useEffect(() => {
    // Use !miniTicker@arr to get all market updates efficiently
    const url = "wss://stream.binance.com:9443/ws/!miniTicker@arr";
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = ev => {
      try {
        const data = JSON.parse(ev.data);
        if (!Array.isArray(data)) return;
        if (priceFeedPaused) return;

        const updates: Record<string, number> = {};
        let hasUpdates = false;

        data.forEach((d: any) => {
          const rawSym = d.s;
          if (!rawSym.endsWith("USDT")) return;
          const sym = rawSym.replace("USDT", "");
          
          if (TRACKED_CRYPTO.has(sym)) {
            updates[sym] = Number(d.c);
            hasUpdates = true;
          }
        });

        if (hasUpdates) {
          setState(prev => {
            const nextPrices = { ...prev.prices, ...updates };
            // Check alerts
            let alertsUpdated = false;
            const updatedAlerts = prev.alerts.map(alert => {
              const currentPrice = nextPrices[alert.assetId];
              if (!alert.isActive || !currentPrice) return alert;
              
              const shouldTrigger =
                (alert.condition === "above" && currentPrice >= alert.targetPrice) ||
                (alert.condition === "below" && currentPrice <= alert.targetPrice);
                
              if (shouldTrigger) {
                alertsUpdated = true;
                return { ...alert, isActive: false, triggeredAt: Date.now() };
              }
              return alert;
            });

            if (!alertsUpdated && Object.keys(updates).length === 0) return prev;
            return { ...prev, prices: nextPrices, alerts: updatedAlerts };
          });
        }
      } catch { void 0; }
    };

    return () => {
      try {
        ws.close();
      } catch { void 0; }
      wsRef.current = null;
    };
  }, [priceFeedPaused]);

  // Stock Price Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      if (priceFeedPaused) return;
      setState(prev => {
        const nextPrices = { ...prev.prices };
        let hasUpdates = false;

        TRACKED_STOCKS.forEach(sym => {
          // Initialize trend if missing
          if (trendsRef.current[sym] === undefined) {
             trendsRef.current[sym] = (Math.random() - 0.5) * 0.001;
          }
          
          // Occasionally change trend (10% chance)
          if (Math.random() < 0.1) {
             trendsRef.current[sym] = (Math.random() - 0.5) * 0.0015;
          }

          // Initialize if missing (mock start price) or update existing
          const current = nextPrices[sym] || (100 + Math.random() * 400); // Random start 100-500
          
          // Combine trend and noise
          const trend = trendsRef.current[sym];
          const noise = (Math.random() - 0.5) * 0.001;
          const changePercent = trend + noise;
          
          const next = current * (1 + changePercent);
          nextPrices[sym] = next;
          hasUpdates = true;
        });

        TRACKED_FOREX.forEach(sym => {
          const isJPY = sym.includes("JPY") || sym.includes("HUF"); 
          const base = isJPY ? 145 : 1.08;
          
          // Initialize trend if missing
          if (trendsRef.current[sym] === undefined) {
             trendsRef.current[sym] = (Math.random() - 0.5) * 0.0002;
          }
          
          // Occasionally change trend (10% chance)
          if (Math.random() < 0.1) {
             trendsRef.current[sym] = (Math.random() - 0.5) * 0.0003;
          }

          // Initialize if missing or update
          const current = nextPrices[sym] || (base + (Math.random() - 0.5) * (base * 0.05));
          
          // Combine trend and noise (lower for forex)
          const trend = trendsRef.current[sym];
          const noise = (Math.random() - 0.5) * 0.0001;
          const changePercent = trend + noise;
          
          const next = current * (1 + changePercent);
          nextPrices[sym] = next;
          hasUpdates = true;
        });

        if (hasUpdates) {
             return { ...prev, prices: nextPrices };
        }
        return prev;
      });
    }, 3000); // Update stocks every 3s
    return () => clearInterval(interval);
  }, [priceFeedPaused]);

  const placeMarketOrder = (symbol: string, side: Side, quantity: number, price: number) => {
    if (!Number.isFinite(quantity) || quantity <= 0) return { ok: false, error: "Invalid quantity" };
    if (!Number.isFinite(price) || price <= 0) return { ok: false, error: "Invalid price" };
    if (side === "buy") {
      const cost = price * quantity;
      if (state.usdtBalance < cost) return { ok: false, error: "Insufficient balance" };
      const prevHolding = state.holdings[symbol] || { quantity: 0, averageBuyPrice: 0 };
      const newQty = prevHolding.quantity + quantity;
      const newAvg =
        newQty > 0 ? (prevHolding.averageBuyPrice * prevHolding.quantity + price * quantity) / newQty : price;
      const trade: Trade = {
        id: `T${Date.now()}`,
        symbol,
        side,
        quantity,
        price,
        totalValue: cost,
        createdAt: Date.now(),
      };
      const order: Order = {
        id: `O${Date.now()}`,
        symbol,
        side,
        type: "market",
        quantity,
        price,
        status: "filled",
        createdAt: Date.now(),
        filledAt: Date.now(),
      };
      setState(prev => ({
        ...prev,
        usdtBalance: prev.usdtBalance - cost,
        holdings: { ...prev.holdings, [symbol]: { quantity: newQty, averageBuyPrice: newAvg } },
        trades: [trade, ...prev.trades],
        orders: [order, ...prev.orders],
      }));
      return { ok: true };
    } else {
      const holding = state.holdings[symbol];
      if (!holding || holding.quantity < quantity) return { ok: false, error: "Insufficient portfolio" };
      const proceeds = price * quantity;
      const newQty = holding.quantity - quantity;
      const newHolding: Holding =
        newQty > 0 ? { quantity: newQty, averageBuyPrice: holding.averageBuyPrice } : { quantity: 0, averageBuyPrice: 0 };
      const trade: Trade = {
        id: `T${Date.now()}`,
        symbol,
        side,
        quantity,
        price,
        totalValue: proceeds,
        createdAt: Date.now(),
      };
      const order: Order = {
        id: `O${Date.now()}`,
        symbol,
        side,
        type: "market",
        quantity,
        price,
        status: "filled",
        createdAt: Date.now(),
        filledAt: Date.now(),
      };
      setState(prev => ({
        ...prev,
        usdtBalance: prev.usdtBalance + proceeds,
        holdings: { ...prev.holdings, [symbol]: newHolding },
        trades: [trade, ...prev.trades],
        orders: [order, ...prev.orders],
      }));
      return { ok: true };
    }
  };

  const placeLimitOrder = (symbol: string, side: Side, quantity: number, price: number) => {
    if (side === "sell") {
      const holding = state.holdings[symbol];
      if (!holding || holding.quantity < quantity) return { ok: false, error: "Insufficient portfolio" };
    }
    if (side === "buy") {
      const cost = price * quantity;
      if (state.usdtBalance < cost) return { ok: false, error: "Insufficient balance" };
    }
    const order: Order = {
      id: `O${Date.now()}`,
      symbol,
      side,
      type: "limit",
      quantity,
      price,
      status: "pending",
      createdAt: Date.now(),
    };
    setState(prev => ({ ...prev, orders: [order, ...prev.orders] }));
    return { ok: true };
  };

  const placeStopOrder = (symbol: string, side: Side, quantity: number, stopPrice: number, limitPrice?: number) => {
    if (side === "sell") {
      const holding = state.holdings[symbol];
      if (!holding || holding.quantity < quantity) return { ok: false, error: "Insufficient portfolio" };
    }
    const order: Order = {
      id: `O${Date.now()}`,
      symbol,
      side,
      type: "stop",
      quantity,
      price: limitPrice,
      stopPrice,
      status: "pending",
      createdAt: Date.now(),
    };
    setState(prev => ({ ...prev, orders: [order, ...prev.orders] }));
    return { ok: true };
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const prices = prev.prices;
        const updatedOrders = prev.orders.map(o => {
          if (o.status !== "pending") return o;
          const px = prices[o.symbol];
          if (!Number.isFinite(px) || px <= 0) return o;
          if (o.type === "limit") {
            if (o.side === "buy" && px <= (o.price || 0)) return { ...o, status: "filled", filledAt: Date.now(), price: o.price };
            if (o.side === "sell" && px >= (o.price || 0)) return { ...o, status: "filled", filledAt: Date.now(), price: o.price };
          } else if (o.type === "stop") {
            if (o.side === "sell" && px <= (o.stopPrice || 0)) {
              const execPrice = o.price || px;
              return { ...o, status: "filled", filledAt: Date.now(), price: execPrice };
            }
            if (o.side === "buy" && px >= (o.stopPrice || 0)) {
              const execPrice = o.price || px;
              return { ...o, status: "filled", filledAt: Date.now(), price: execPrice };
            }
          }
          return o;
        });
        const newlyFilled = updatedOrders.filter(o => o.status === "filled" && !prev.orders.find(p => p.id === o.id && p.status === "filled"));
        let newState = { ...prev, orders: updatedOrders };
        newlyFilled.forEach(o => {
          const execPrice = Number(o.price || prices[o.symbol] || 0);
          if (o.side === "buy") {
            const cost = execPrice * o.quantity;
            const h = newState.holdings[o.symbol] || { quantity: 0, averageBuyPrice: 0 };
            const newQty = h.quantity + o.quantity;
            const newAvg =
              newQty > 0 ? (h.averageBuyPrice * h.quantity + execPrice * o.quantity) / newQty : execPrice;
            newState.usdtBalance = newState.usdtBalance - cost;
            newState.holdings = { ...newState.holdings, [o.symbol]: { quantity: newQty, averageBuyPrice: newAvg } };
          } else {
            const proceeds = execPrice * o.quantity;
            const h = newState.holdings[o.symbol] || { quantity: 0, averageBuyPrice: 0 };
            const newQty = Math.max(0, h.quantity - o.quantity);
            newState.usdtBalance = newState.usdtBalance + proceeds;
            newState.holdings = { ...newState.holdings, [o.symbol]: { quantity: newQty, averageBuyPrice: h.averageBuyPrice } };
          }
          const trade: Trade = {
            id: `T${Date.now()}_${o.id}`,
            symbol: o.symbol,
            side: o.side,
            quantity: o.quantity,
            price: execPrice,
            totalValue: execPrice * o.quantity,
            createdAt: Date.now(),
          };
          newState = { ...newState, trades: [trade, ...newState.trades] };
        });
        return newState;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const cancelOrder = (orderId: string) => {
    setState(prev => ({ ...prev, orders: prev.orders.map(o => (o.id === orderId && o.status === "pending" ? { ...o, status: "cancelled" } : o)) }));
  };

  const resetAll = () => {
    const fresh: SimTradeState = { usdtBalance: DEFAULT_BALANCE, holdings: {}, orders: [], trades: [], prices: {}, alerts: [], timeOnSite: 0 };
    setState(fresh);
    saveState(fresh);
  };

  const createAlert = (assetId: string, targetPrice: number, condition: AlertCondition) => {
    if (!assetId || !Number.isFinite(targetPrice) || targetPrice <= 0) {
      return { ok: false, error: "Invalid alert parameters" };
    }
    const alert: PriceAlert = {
      id: `A${Date.now()}`,
      assetId,
      targetPrice,
      condition,
      isActive: true,
      triggeredAt: null,
      createdAt: Date.now(),
    };
    setState(prev => ({ ...prev, alerts: [alert, ...prev.alerts] }));
    return { ok: true };
  };

  const deleteAlert = (alertId: string) => {
    setState(prev => ({ ...prev, alerts: prev.alerts.filter(a => a.id !== alertId) }));
  };

  const setPriceFeedPaused = (paused: boolean) => {
    setPriceFeedPausedState(paused);
  };

  const overridePrice = (symbol: string, price: number) => {
    if (!symbol || !Number.isFinite(price) || price <= 0) return;
    setState(prev => ({ ...prev, prices: { ...prev.prices, [symbol]: price } }));
  };

  const applyVolatility = (multiplier: number) => {
    const base = 5;
    setState(prev => {
      const next: Record<string, number> = { ...prev.prices };
      Object.keys(next).forEach(sym => {
        const p = next[sym];
        const changePercent = (Math.random() - 0.5) * 2 * multiplier * base;
        const newPrice = Math.max(0.0001, p * (1 + changePercent / 100));
        next[sym] = newPrice;
      });
      return { ...prev, prices: next };
    });
  };

  const applyMarketCrash = () => {
    setState(prev => {
      const next: Record<string, number> = { ...prev.prices };
      Object.keys(next).forEach(sym => {
        const p = next[sym];
        const dropPercent = 10 + Math.random() * 20;
        const newPrice = Math.max(0.0001, p * (1 - dropPercent / 100));
        next[sym] = newPrice;
      });
      return { ...prev, prices: next };
    });
  };

  const modifyBalance = (amount: number) => {
    setState(prev => ({
      ...prev,
      usdtBalance: Math.max(0, prev.usdtBalance + amount)
    }));
  };

  const addNotification = (input: Omit<AppNotification, "id" | "created_at" | "is_read">) => {
    const now = new Date().toISOString();
    const id = `N${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const notification: AppNotification = {
      id,
      created_at: now,
      is_read: false,
      ...input,
    };
    setState(prev => ({
      ...prev,
      notifications: [notification, ...prev.notifications],
    }));
  };

  const markNotificationRead = (id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ),
    }));
  };

  const markAllNotificationsRead = () => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n =>
        n.is_read ? n : { ...n, is_read: true }
      ),
    }));
  };

  const processDividendsForStocks = (options?: { annualYieldPercent?: number; symbolFilter?: string }) => {
    const annualYieldPercent = options?.annualYieldPercent ?? 4.8;
    const symbolFilter = options?.symbolFilter;
    const annualYield = annualYieldPercent / 100;
    const dailyYield = annualYield / 365;

    let totalAmount = 0;
    const assets: DividendAsset[] = [];

    setState(prev => {
      let usdtBalance = prev.usdtBalance;

      Object.entries(prev.holdings).forEach(([symbol, holding]) => {
        const assetConfig = ASSETS.find(a => a.symbol === symbol);
        if (!assetConfig || assetConfig.category !== "stocks") return;
        if (symbolFilter && symbol !== symbolFilter) return;
        if (holding.quantity <= 0) return;

        const price = prev.prices[symbol] ?? holding.averageBuyPrice;
        if (!price || price <= 0) return;

        const amount = holding.quantity * price * dailyYield;
        if (amount <= 0) return;

        totalAmount += amount;
        usdtBalance += amount;
        assets.push({
          asset_id: assetConfig.id,
          amount,
          shares: holding.quantity,
          symbol: assetConfig.symbol,
        });
      });

      if (totalAmount <= 0) {
        return prev;
      }

      return {
        ...prev,
        usdtBalance,
      };
    });

    if (totalAmount > 0 && assets.length > 0) {
      addNotification({
        notification_type: "dividend",
        title: "Dividend Payout",
        message: "You received dividend income from your stock holdings.",
        metadata: {
          total_amount: totalAmount,
          assets,
        },
      });
    }

    return { totalAmount, assets };
  };

  const grantReferralReward = () => {
    const rewardAmount = 17500;
    setState(prev => ({
      ...prev,
      usdtBalance: prev.usdtBalance + rewardAmount,
    }));

    addNotification({
      notification_type: "referral",
      title: "Referral Reward",
      message: `You received ${rewardAmount.toLocaleString()} USDT for inviting a friend.`,
      metadata: {
        reward_amount: rewardAmount,
      },
    });
  };

  const value: SimTradeContextValue = {
    ...state,
    placeMarketOrder,
    placeLimitOrder,
    placeStopOrder,
    cancelOrder,
    resetAll,
    createAlert,
    deleteAlert,
    setPriceFeedPaused,
    overridePrice,
    applyVolatility,
    applyMarketCrash,
    modifyBalance,
    processDividendsForStocks,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    grantReferralReward,
  };

  return <SimTradeContext.Provider value={value}>{children}</SimTradeContext.Provider>;
}

export function useSimTrade() {
  const ctx = useContext(SimTradeContext);
  if (!ctx) throw new Error("SimTradeContext missing");
  return ctx;
}
