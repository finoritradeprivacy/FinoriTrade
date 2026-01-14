import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type Side = "buy" | "sell";
type OrderType = "market" | "limit" | "stop";

interface Order {
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

interface Trade {
  id: string;
  symbol: string;
  side: Side;
  quantity: number;
  price: number;
  totalValue: number;
  createdAt: number;
}

interface Holding {
  quantity: number;
  averageBuyPrice: number;
}

interface SimTradeState {
  usdtBalance: number;
  holdings: Record<string, Holding>;
  orders: Order[];
  trades: Trade[];
  prices: Record<string, number>;
  alerts: PriceAlert[];
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
}

const SimTradeContext = createContext<SimTradeContextValue | null>(null);

const DEFAULT_BALANCE = 100000;
const DEFAULT_SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA"];

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

function loadState(): SimTradeState {
  const raw = localStorage.getItem("simtrade_state");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return { ...parsed, prices: parsed.prices || {}, alerts: parsed.alerts || [] } as SimTradeState;
    } catch { void 0; }
  }
  return { usdtBalance: DEFAULT_BALANCE, holdings: {}, orders: [], trades: [], prices: {}, alerts: [] };
}

function saveState(state: SimTradeState) {
  const toSave = { ...state, prices: {} };
  localStorage.setItem("simtrade_state", JSON.stringify(toSave));
}

export function SimTradeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SimTradeState>(loadState());
  const wsRef = useRef<WebSocket | null>(null);
  const symbols = useMemo(() => DEFAULT_SYMBOLS, []);
  const [priceFeedPaused, setPriceFeedPausedState] = useState(false);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const streams = symbols.map(s => `${s.toLowerCase()}usdt@miniTicker`).join("/");
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onmessage = ev => {
      try {
        const payload = JSON.parse(ev.data);
        const d = payload?.data;
        if (!d || !d.s || !d.c) return;
        if (priceFeedPaused) return;
        const sym = String(d.s).toUpperCase().replace("USDT", "");
        const price = Number(d.c);
        setState(prev => {
          const nextPrices = { ...prev.prices, [sym]: price };
          // Evaluate alerts for this symbol
          const updatedAlerts = prev.alerts.map(alert => {
            if (!alert.isActive || alert.assetId !== sym) return alert;
            const shouldTrigger =
              (alert.condition === "above" && price >= alert.targetPrice) ||
              (alert.condition === "below" && price <= alert.targetPrice);
            if (shouldTrigger) {
              return { ...alert, isActive: false, triggeredAt: Date.now() };
            }
            return alert;
          });
          return { ...prev, prices: nextPrices, alerts: updatedAlerts };
        });
      } catch { void 0; }
    };
    return () => {
      try {
        ws.close();
      } catch { void 0; }
      wsRef.current = null;
    };
  }, [symbols, priceFeedPaused]);

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
    const fresh = { usdtBalance: DEFAULT_BALANCE, holdings: {}, orders: [], trades: [], prices: {}, alerts: [] };
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
  };

  return <SimTradeContext.Provider value={value}>{children}</SimTradeContext.Provider>;
}

export function useSimTrade() {
  const ctx = useContext(SimTradeContext);
  if (!ctx) throw new Error("SimTradeContext missing");
  return ctx;
}
