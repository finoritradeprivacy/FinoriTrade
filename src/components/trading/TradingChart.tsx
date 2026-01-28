import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, UTCTimestamp, CandlestickSeries, LineSeries, createSeriesMarkers, IPriceLine, MouseEventParams, SeriesMarker } from 'lightweight-charts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSimTrade } from '@/contexts/SimTradeContext';
import { TrendingUp, TrendingDown, Minus, Square, Type, RotateCcw, Trash2, Activity, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

const safeSaveCandles = (key: string, data: any[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage quota exceeded. Clearing old candle cache...');
    try {
      // Clear all candle keys except the current one
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('candles_') && k !== key) {
          localStorage.removeItem(k);
        }
      });
      localStorage.setItem(key, JSON.stringify(data));
    } catch (retryError) {
      console.error('Failed to save candles even after cleanup', retryError);
    }
  }
};

interface Asset {
  id: string;
  symbol: string;
  name: string;
  category: string;
  current_price: number;
  price_change_24h?: number | null;
  updated_at?: string;
  [key: string]: unknown;
}

interface TradingChartProps {
  asset: Asset;
}

type Timeframe = '1s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
type ChartType = 'candlestick' | 'line' | 'ohlc';
type DrawingTool = 'none' | 'trendline' | 'horizontal' | 'rectangle' | 'text';

interface Trade {
  id: string;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  timestamp: number;
}

interface Drawing {
  id: string;
  type: DrawingTool;
  points: Array<{
    time: number;
    price: number;
  }>;
  text?: string;
}

const validateCandle = (c: Partial<CandlestickData>): CandlestickData | null => {
  const timeNumber = Number(c.time as unknown as number);
  const openNumber = Number(c.open);
  const highNumber = Number(c.high);
  const lowNumber = Number(c.low);
  const closeNumber = Number(c.close);

  if (!Number.isFinite(timeNumber) ||
    !Number.isFinite(openNumber) ||
    !Number.isFinite(highNumber) ||
    !Number.isFinite(lowNumber) ||
    !Number.isFinite(closeNumber)) {
    return null;
  }
  
  return {
    time: timeNumber as UTCTimestamp,
    open: openNumber,
    high: highNumber,
    low: lowNumber,
    close: closeNumber
  };
};

const sanitizeCandles = (arr?: unknown[]): CandlestickData[] => {
  if (!Array.isArray(arr)) return [];
  const valid = arr
    .map(c => validateCandle(c as CandlestickData))
    .filter((c): c is CandlestickData => c !== null && (c.time as number) > 0)
    .sort((a, b) => (a.time as number) - (b.time as number));
  
  // Deduplicate by time (keep the last one encountered for each time)
  const unique = new Map<number, CandlestickData>();
  valid.forEach(c => unique.set(c.time as number, c));
  
  return Array.from(unique.values()).sort((a, b) => (a.time as number) - (b.time as number));
};

const sanitizeDrawings = (raw: unknown): Drawing[] => {
  if (!Array.isArray(raw)) return [];
  const validTypes: DrawingTool[] = ['none', 'trendline', 'horizontal', 'rectangle', 'text'];
  const result: Drawing[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const anyItem = item as any;
    if (!validTypes.includes(anyItem.type)) continue;
    if (!Array.isArray(anyItem.points) || anyItem.points.length === 0) continue;
    const sanitizedPoints = anyItem.points.map((p: any) => {
      const t = Number(p?.time);
      const price = Number(p?.price);
      if (!Number.isFinite(t) || !Number.isFinite(price)) return null;
      return { time: t, price };
    }).filter((p: { time: number; price: number } | null): p is { time: number; price: number } => p !== null);
    if (!sanitizedPoints.length) continue;
    const id = typeof anyItem.id === 'string' ? anyItem.id : String(Date.now() + Math.random());
    const drawing: Drawing = {
      id,
      type: anyItem.type,
      points: sanitizedPoints
    };
    if (anyItem.type === 'text' && typeof anyItem.text === 'string') {
      drawing.text = anyItem.text;
    }
    result.push(drawing);
  }
  return result;
};

const getTimeframeSeconds = (tf: Timeframe): number => {
  switch (tf) {
    case '1s': return 1;
    case '1m': return 60;
    case '5m': return 300;
    case '15m': return 900;
    case '1h': return 3600;
    case '4h': return 14400;
    case '1d': return 86400;
    case '1w': return 604800;
    default: return 60;
  }
};

const getVolatilityForTimeframe = (tf: Timeframe): number => {
  switch (tf) {
    case '1s': return 0.0005;
    case '1m': return 0.002;
    case '5m': return 0.004;
    case '15m': return 0.006;
    case '1h': return 0.01;
    case '4h': return 0.015;
    case '1d': return 0.02;
    case '1w': return 0.03;
    default: return 0.002;
  }
};

const getPriceFormatForPrice = (price: number) => {
  let precision = 2;
  let minMove = 0.01;
  if (price < 1000) {
    if (price >= 1) {
      precision = 4;
      minMove = 0.0001;
    } else if (price >= 0.01) {
      precision = 6;
      minMove = 0.000001;
    } else {
      precision = 8;
      minMove = 0.00000001;
    }
  }
  return { precision, minMove };
};

const getCandleLimits = (timeframe: Timeframe): [number, number] => {
  switch (timeframe) {
    case '1s': return [2000, 2000];
    case '1m': return [2000, 2000];
    case '15m': return [1000, 1750];
    case '5m': return [1000, 1750];
    case '1h': return [500, 1500];
    case '4h': return [300, 500];
    case '1d': return [100, 400];
    case '1w': return [15, 60];
    default: return [100, 500];
  }
};

const normalizeCandleBody = (candle: CandlestickData, price: number): CandlestickData => {
  const open = Number(candle.open);
  const close = Number(candle.close);
  if (!Number.isFinite(open) || !Number.isFinite(close)) return candle;
  const { minMove } = getPriceFormatForPrice(price);
  const pctThreshold = price > 0 ? price * 0.0002 : 0;
  const bodyThreshold = Math.max(minMove, pctThreshold);
  const diff = Math.abs(close - open);

  let adjustedClose = close;
  if (bodyThreshold !== 0 && diff < bodyThreshold) {
    const direction = price >= open ? 1 : -1;
    adjustedClose = open + direction * bodyThreshold;
  }

  let high = Number(candle.high);
  let low = Number(candle.low);
  if (!Number.isFinite(high)) high = Math.max(open, adjustedClose);
  if (!Number.isFinite(low)) low = Math.min(open, adjustedClose);

  const highBase = Math.max(open, adjustedClose);
  const lowBase = Math.min(open, adjustedClose);
  const wickSize = Math.max(minMove, highBase * 0.0002);

  if (high < highBase + wickSize) high = highBase + wickSize;
  if (low > lowBase - wickSize) low = lowBase - wickSize;

  return {
    ...candle,
    close: adjustedClose,
    high,
    low,
  };
};

const getTableForTimeframe = (tf: Timeframe): string => {
  switch (tf) {
    case '1s':
    case '1m':
    case '5m':
    case '15m':
      return 'price_history';
    case '1h':
    case '4h':
      return 'price_history_hourly';
    case '1d':
    case '1w':
      return 'price_history_daily';
    default:
      return 'price_history';
  }
};

type PriceHistoryRow = Database['public']['Tables']['price_history']['Row'];
type PriceHistoryHourlyRow = Database['public']['Tables']['price_history_hourly']['Row'];
type PriceHistoryDailyRow = Database['public']['Tables']['price_history_daily']['Row'];

export const TradingChart = ({
  asset
}: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  // Keep references to overlay elements so we can cleanly re-render drawings
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const trendlineSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const markersRef = useRef<SeriesMarker<Time>[] | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1s');
  const [timeframeCooldown, setTimeframeCooldown] = useState(0);
  const lastTimeframeChangeRef = useRef<number>(0);
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('none');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [showMA, setShowMA] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastCandle, setLastCandle] = useState<CandlestickData | null>(null);
  const [drawingInProgress, setDrawingInProgress] = useState<{
    type: DrawingTool;
    points: Array<{
      time: number;
      price: number;
    }>;
  } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [priceCountdown, setPriceCountdown] = useState(1);
  const { trades: ctxTrades } = useSimTrade();
  const lastGenerationPriceRef = useRef<number | null>(null);
  const currentAssetIdRef = useRef<string | null>(null);
  const candleCacheRef = useRef<Record<string, CandlestickData[]>>({});
  const liveRecentClosesRef = useRef<Record<string, number[]>>({});

  // Price update countdown - 1 second updates
  useEffect(() => {
    const calculateCountdown = () => {
      if (!asset?.updated_at) return 1;
      const lastUpdate = new Date(asset.updated_at).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - lastUpdate) / 1000);
      const remaining = Math.max(0, 1 - elapsed);
      return remaining;
    };
    setPriceCountdown(calculateCountdown());
    const interval = setInterval(() => {
      setPriceCountdown(calculateCountdown());
    }, 100);
    return () => clearInterval(interval);
  }, [asset?.updated_at]);

  // Timeframe cooldown countdown
  useEffect(() => {
    if (timeframeCooldown <= 0) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastTimeframeChangeRef.current) / 1000);
      const remaining = Math.max(0, 20 - elapsed);
      setTimeframeCooldown(remaining);
    }, 100);
    return () => clearInterval(interval);
  }, [timeframeCooldown]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: {
          color: '#0B0E11'
        },
        textColor: '#B7BDC6'
      },
      grid: {
        vertLines: {
          color: 'rgba(42, 46, 57, 0.5)',
          style: 1
        },
        horzLines: {
          color: 'rgba(42, 46, 57, 0.5)',
          style: 1
        }
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: 'rgba(224, 227, 235, 0.1)',
          style: 3
        },
        horzLine: {
          width: 1,
          color: 'rgba(224, 227, 235, 0.1)',
          style: 3
        }
      },
      rightPriceScale: {
        borderColor: 'rgba(42, 46, 57, 0.5)',
        borderVisible: true,
        autoScale: true,
        scaleMargins: {
          top: 0.15,
          bottom: 0.15
        }
      },
      timeScale: {
        borderColor: 'rgba(42, 46, 57, 0.5)',
        borderVisible: true,
        timeVisible: true,
        secondsVisible: false
      }
    });
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#0ECB81',
      downColor: '#F6465D',
      borderVisible: false,
      wickUpColor: '#0ECB81',
      wickDownColor: '#F6465D'
    });
    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    setIsInitialized(true);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart precision based on asset price
  useEffect(() => {
    if (!candlestickSeriesRef.current || !asset?.current_price) return;

    const price = asset.current_price;
    const { precision, minMove } = getPriceFormatForPrice(price);

    candlestickSeriesRef.current.applyOptions({
      priceFormat: {
        type: 'price',
        precision,
        minMove,
      },
    });
    
    // Also update right scale to ensure it matches
    chartRef.current?.priceScale('right').applyOptions({
      autoScale: true,
      minimumWidth: 60,
    });

  }, [asset?.id, asset?.current_price]);

  const generateHistoricalData = useCallback(async (targetAsset: Asset, targetTimeframe: Timeframe) => {
    if (!candlestickSeriesRef.current || !targetAsset) return;
    
    // Clear existing data to prevent conflicts during load
    try {
      candlestickSeriesRef.current.setData([]);
    } catch (e) {
      console.error('Failed to clear chart data', e);
    }

    setIsLoadingData(true);
    try {
      const cacheKey = `${targetAsset.id}_${targetTimeframe}`;
      let cached = sanitizeCandles(candleCacheRef.current[cacheKey]);

      if (!cached.length) {
        const stored = localStorage.getItem(`candles_${cacheKey}`);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length) {
              cached = sanitizeCandles(parsed);
            }
          } catch {
          }
        }
      }

      const timeframeSeconds = getTimeframeSeconds(targetTimeframe);
      const now = Math.floor(Date.now() / 1000);
      const nowBucket = Math.floor(now / timeframeSeconds) * timeframeSeconds as UTCTimestamp;

      if (cached && cached.length) {
        const extended = [...cached];
        const volPercExisting = getVolatilityForTimeframe(targetTimeframe);
        let last = extended[extended.length - 1];
        let lastTime = Number(last.time as UTCTimestamp);
        let price = Number(last.close);
        const recentClosesExisting = extended.slice(-5).map(c => Number(c.close));

        while (lastTime + timeframeSeconds <= nowBucket) {
          const time = (lastTime + timeframeSeconds) as UTCTimestamp;
          const change = (Math.random() - 0.5) * volPercExisting;
          const open = price;
          let close = open * (1 + change);
          if (!Number.isFinite(close) || close <= 0) {
            close = Math.max(0.0001, open);
          }

          const { minMove } = getPriceFormatForPrice(open);
          const pctThreshold = open > 0 ? open * 0.0002 : 0;
          const bodyThreshold = Math.max(minMove, pctThreshold);
          let adjustedClose = close;
          let attempts = 0;
          while (recentClosesExisting.some(c => Math.abs(c - adjustedClose) < bodyThreshold) && attempts < 5) {
            const direction = Math.random() < 0.5 ? -1 : 1;
            adjustedClose += direction * bodyThreshold;
            if (adjustedClose <= 0) {
              adjustedClose = Math.max(bodyThreshold, open);
            }
            attempts++;
          }
          close = adjustedClose;

          const highBase = Math.max(open, close);
          const lowBase = Math.min(open, close);
          const wickSize = Math.max(minMove, highBase * 0.0002);
          let high = highBase * (1 + Math.random() * volPercExisting * 0.5);
          let low = lowBase * (1 - Math.random() * volPercExisting * 0.5);
          
          if (high < highBase + wickSize) high = highBase + wickSize;
          if (low > lowBase - wickSize) low = lowBase - wickSize;

          const candle = validateCandle({
            time,
            open,
            high,
            low,
            close,
          });

          if (candle) {
            extended.push(candle);
            recentClosesExisting.push(candle.close);
            if (recentClosesExisting.length > 5) {
              recentClosesExisting.shift();
            }
            price = candle.close;
            lastTime = Number(time);
          } else {
            lastTime += timeframeSeconds;
          }
        }

        candleCacheRef.current[cacheKey] = extended;
        candlestickSeriesRef.current.setData(extended);
        setLastCandle(extended[extended.length - 1] || null);
        const recentFromExtended = extended.slice(-5).map(c => Number(c.close));
        liveRecentClosesRef.current[cacheKey] = recentFromExtended;
        safeSaveCandles(`candles_${cacheKey}`, extended);

        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
        setIsLoadingData(false);
        return;
      }

      const [, maxCandles] = getCandleLimits(targetTimeframe);
      const lastTime = Math.floor(now / timeframeSeconds) * timeframeSeconds;
      const chartData: CandlestickData[] = [];

      const basePrice = targetAsset.current_price > 0 ? targetAsset.current_price : 100;
      const volPerc = getVolatilityForTimeframe(targetTimeframe);

      let price = basePrice;
      const recentCloses: number[] = [];
      for (let i = maxCandles - 1; i >= 0; i--) {
        const time = (lastTime - i * timeframeSeconds) as UTCTimestamp;
        const change = (Math.random() - 0.5) * volPerc;
        const open = price;
        let close = open * (1 + change);
        if (!Number.isFinite(close) || close <= 0) {
          close = Math.max(0.0001, open);
        }

        const { minMove } = getPriceFormatForPrice(open);
        const pctThreshold = open > 0 ? open * 0.0002 : 0;
        const bodyThreshold = Math.max(minMove, pctThreshold);
        let adjustedClose = close;
        let attempts = 0;
        while (recentCloses.some(c => Math.abs(c - adjustedClose) < bodyThreshold) && attempts < 5) {
          const direction = Math.random() < 0.5 ? -1 : 1;
          adjustedClose += direction * bodyThreshold;
          if (adjustedClose <= 0) {
            adjustedClose = Math.max(bodyThreshold, open);
          }
          attempts++;
        }
        close = adjustedClose;

        const highBase = Math.max(open, close);
        const lowBase = Math.min(open, close);
        const wickSize = Math.max(minMove, highBase * 0.0002);
        let high = highBase * (1 + Math.random() * volPerc * 0.5);
        let low = lowBase * (1 - Math.random() * volPerc * 0.5);
        
        if (high < highBase + wickSize) high = highBase + wickSize;
        if (low > lowBase - wickSize) low = lowBase - wickSize;

        const candle = validateCandle({
          time,
          open,
          high,
          low,
          close,
        });

        if (candle) {
          chartData.push(candle);
          recentCloses.push(candle.close);
          if (recentCloses.length > 5) {
            recentCloses.shift();
          }
          price = candle.close;
        }
      }

      candleCacheRef.current[cacheKey] = chartData;
      candlestickSeriesRef.current.setData(chartData);
      setLastCandle(chartData[chartData.length - 1] || null);
      const recentFromGenerated = chartData.slice(-5).map(c => Number(c.close));
      liveRecentClosesRef.current[cacheKey] = recentFromGenerated;
      safeSaveCandles(`candles_${cacheKey}`, chartData);

      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  // Handle timeframe change with cooldown
  const handleTimeframeChange = (newTimeframe: Timeframe) => {
    if (timeframeCooldown > 0) {
      toast.error(`Please wait ${timeframeCooldown}s before switching timeframes`);
      return;
    }
    setTimeframe(newTimeframe);
    lastTimeframeChangeRef.current = Date.now();
    setTimeframeCooldown(20);
  };

  useEffect(() => {
    if (!asset || !candlestickSeriesRef.current) return;
    if (!asset.current_price || asset.current_price <= 0) return;

    if (isLoadingData) return;

    const now = Math.floor(Date.now() / 1000);
    const timeframeSeconds = getTimeframeSeconds(timeframe);
    const bucketTime = Math.floor(now / timeframeSeconds) * timeframeSeconds as UTCTimestamp;
    const rawPrice = asset.current_price;
    const cacheKey = asset ? `${asset.id}_${timeframe}` : '';

    let currentPrice = rawPrice;
    if (cacheKey) {
      const recent = liveRecentClosesRef.current[cacheKey] || [];
      const { minMove } = getPriceFormatForPrice(rawPrice);
      const pctThreshold = rawPrice > 0 ? rawPrice * 0.0002 : 0;
      const bodyThreshold = Math.max(minMove, pctThreshold);
      let adjusted = currentPrice;
      let attempts = 0;
      while (recent.some(c => Math.abs(c - adjusted) < bodyThreshold) && attempts < 5) {
        const direction = Math.random() < 0.5 ? -1 : 1;
        adjusted += direction * bodyThreshold;
        if (adjusted <= 0) {
          adjusted = Math.max(bodyThreshold, rawPrice);
        }
        attempts++;
      }
      currentPrice = adjusted;
      const updatedRecent = [...recent, currentPrice];
      liveRecentClosesRef.current[cacheKey] = updatedRecent.slice(-5);
    }

    if (lastCandle) {
      const priceDiffPercent = Math.abs((currentPrice - lastCandle.close) / lastCandle.close);
      if (priceDiffPercent > 0.1) {
        const resetKey = `${asset.id}_${timeframe}`;
        delete candleCacheRef.current[resetKey];
        delete liveRecentClosesRef.current[resetKey];
        generateHistoricalData(asset, timeframe);
        return;
      }
    }

    setLastCandle(prev => {
      let next: CandlestickData;
      if (!prev || prev.time !== bucketTime) {
        const open = prev?.close ?? currentPrice;
        next = {
          time: bucketTime,
          open,
          high: currentPrice,
          low: currentPrice,
          close: currentPrice
        } as CandlestickData;
      } else {
        next = {
          time: bucketTime,
          open: prev.open,
          high: Math.max(prev.high, currentPrice),
          low: Math.min(prev.low, currentPrice),
          close: currentPrice
        } as CandlestickData;
      }
      next = normalizeCandleBody(next, currentPrice);

      const validatedNext = validateCandle(next);
      if (!validatedNext) {
        return prev;
      }

      candlestickSeriesRef.current?.update(validatedNext);

      const key = asset ? `${asset.id}_${timeframe}` : '';
      if (key) {
        const [, maxCandles] = getCandleLimits(timeframe);
        const existing = candleCacheRef.current[key] || [];
        let updated: CandlestickData[];
        if (!prev || prev.time !== bucketTime) {
          updated = [...existing, validatedNext];
          if (updated.length > maxCandles) {
            updated = updated.slice(updated.length - maxCandles);
          }
        } else {
          updated = existing.length ? [...existing] : [];
          if (updated.length) {
            updated[updated.length - 1] = validatedNext;
          } else {
            updated = [validatedNext];
          }
        }
        candleCacheRef.current[key] = updated;
        safeSaveCandles(`candles_${key}`, updated);
      }
      return validatedNext;
    });
  }, [asset?.id, asset?.current_price, timeframe]);


  // Load trades for current asset
  useEffect(() => {
    if (!asset) return;
    const symbol = asset.symbol || asset.id;
    
    const safeTimestamp = (val: unknown): number => {
      if (typeof val === 'number') return Math.floor(val / 1000);
      if (typeof val === 'string') {
        const d = new Date(val).getTime();
        if (!Number.isNaN(d)) return Math.floor(d / 1000);
      }
      return Math.floor(Date.now() / 1000);
    };

    const filtered = ctxTrades
      .filter(t => t.symbol === symbol)
      .slice(0, 50)
      .map(t => ({
        id: t.id,
        type: t.side,
        price: t.price,
        amount: t.quantity,
        timestamp: safeTimestamp(t.createdAt),
      }));
    const unique = new Map<string, Trade>();
    filtered.forEach(tr => {
      if (!unique.has(tr.id)) unique.set(tr.id, tr);
    });
    setTrades(Array.from(unique.values()));
  }, [asset, ctxTrades]);

  // Note: Trade markers are now rendered together with drawings in the render drawings effect

  useEffect(() => {
    const key = asset?.id ? `drawings_${asset.id}` : '';
    if (!key) {
      setDrawings([]);
      return;
    }
    const savedDrawings = localStorage.getItem(key);
    if (!savedDrawings) {
      setDrawings([]);
      return;
    }
    try {
      const parsed = JSON.parse(savedDrawings);
      const sanitized = sanitizeDrawings(parsed);
      setDrawings(sanitized);
    } catch {
      setDrawings([]);
    }
  }, [asset?.id]);

  // Save drawings to local storage
  useEffect(() => {
    if (asset?.id) {
      localStorage.setItem(`drawings_${asset.id}`, JSON.stringify(drawings));
    }
  }, [drawings, asset]);

  // Handle chart click for drawing tools
  useEffect(() => {
    if (!chartRef.current || drawingTool === 'none') return;
    const handleClick = (param: MouseEventParams) => {
      if (!param.point || !param.time) return;
      const price = candlestickSeriesRef.current?.coordinateToPrice(param.point.y);
      if (!price) return;
      const newPoint = {
        time: param.time as number,
        price: price as number
      };
      if (drawingTool === 'horizontal') {
        // Create horizontal line
        const newDrawing: Drawing = {
          id: `${Date.now()}`,
          type: 'horizontal',
          points: [newPoint]
        };
        setDrawings(prev => [...prev, newDrawing]);
        toast.success('Horizontal line added');
        setDrawingTool('none');
      } else if (drawingTool === 'text') {
        // Create text note
        const text = prompt('Enter note text:');
        if (text) {
          const newDrawing: Drawing = {
            id: `${Date.now()}`,
            type: 'text',
            points: [newPoint],
            text
          };
          setDrawings(prev => [...prev, newDrawing]);
          toast.success('Note added');
        }
        setDrawingTool('none');
      } else if (drawingTool === 'trendline' || drawingTool === 'rectangle') {
        // Handle two-point drawings
        if (!drawingInProgress) {
          // First point
          setDrawingInProgress({
            type: drawingTool,
            points: [newPoint]
          });
          toast.info(`Click second point for ${drawingTool}`);
        } else {
          // Second point - complete the drawing
          const newDrawing: Drawing = {
            id: `${Date.now()}`,
            type: drawingInProgress.type,
            points: [...drawingInProgress.points, newPoint]
          };
          setDrawings(prev => [...prev, newDrawing]);
          toast.success(`${drawingTool} added`);
          setDrawingInProgress(null);
          setDrawingTool('none');
        }
      }
    };
    chartRef.current.subscribeClick(handleClick);
    return () => {
      if (chartRef.current) {
        chartRef.current.unsubscribeClick(handleClick);
      }
    };
  }, [drawingTool, drawingInProgress]);

  // Render drawings on chart
  useEffect(() => {
    const series = candlestickSeriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    // CLEAN PREVIOUS OVERLAYS
    if (priceLinesRef.current.length) {
      try {
        priceLinesRef.current.forEach(line => {
          try {
            series.removePriceLine(line);
          } catch {
            // ignore
          }
        });
      } finally {
        priceLinesRef.current = [];
      }
    }
    if (trendlineSeriesRef.current.size) {
      trendlineSeriesRef.current.forEach(s => {
        try {
          chart.removeSeries(s);
        } catch {
          // ignore
        }
      });
      trendlineSeriesRef.current.clear();
    }

    // Build new overlays from current drawings
    const markers: SeriesMarker<Time>[] = [];
    drawings.forEach(drawing => {
      if (drawing.type === 'horizontal') {
        const line = series.createPriceLine({
          price: drawing.points[0].price,
          color: '#FCD535',
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'Support/Resistance'
        });
        priceLinesRef.current.push(line);
      } else if (drawing.type === 'rectangle' && drawing.points.length === 2) {
        const highPrice = Math.max(drawing.points[0].price, drawing.points[1].price);
        const lowPrice = Math.min(drawing.points[0].price, drawing.points[1].price);
        const top = series.createPriceLine({
          price: highPrice,
          color: '#8B5CF6',
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: 'Zone Top'
        });
        const bottom = series.createPriceLine({
          price: lowPrice,
          color: '#8B5CF6',
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: 'Zone Bottom'
        });
        priceLinesRef.current.push(top, bottom);
      } else if (drawing.type === 'trendline' && drawing.points.length === 2) {
        // Skip if both points have the same timestamp
        if (drawing.points[0].time === drawing.points[1].time) {
          return;
        }

        // Ensure points are sorted by time (ascending)
        const sortedPoints = [...drawing.points].sort((a, b) => a.time - b.time);
        const isRising = sortedPoints[1].price > sortedPoints[0].price;
        const color = isRising ? '#0ECB81' : '#F6465D';
        const tl = chart.addSeries(LineSeries, {
          color,
          lineWidth: 2,
          lineStyle: 1,
          // Dashed line
          lastValueVisible: false,
          priceLineVisible: false,
          crosshairMarkerVisible: false
        });
        tl.setData([{
          time: sortedPoints[0].time as UTCTimestamp,
          value: sortedPoints[0].price
        }, {
          time: sortedPoints[1].time as UTCTimestamp,
          value: sortedPoints[1].price
        }]);
        trendlineSeriesRef.current.set(drawing.id, tl);
        markers.push({
          time: drawing.points[0].time as UTCTimestamp,
          position: 'inBar' as const,
          color,
          shape: 'circle' as const,
          text: 'Start'
        });
        markers.push({
          time: drawing.points[1].time as UTCTimestamp,
          position: 'inBar' as const,
          color,
          shape: (isRising ? 'arrowUp' : 'arrowDown') as 'arrowUp' | 'arrowDown',
          text: isRising ? 'Up Trend' : 'Down Trend'
        });
      } else if (drawing.type === 'text') {
        // Use marker to render text note
        markers.push({
          time: drawing.points[0].time as UTCTimestamp,
          position: 'aboveBar' as const,
          color: '#FCD535',
          shape: 'square' as const,
          text: drawing.text || 'Note'
        });
      }
    });

    // Combine with trade markers - deduplicate by trade ID
    const seenTradeIds = new Set<string>();
    const tradeMarkers = trades.filter(trade => {
      if (seenTradeIds.has(trade.id)) return false;
      if (!Number.isFinite(trade.price) || !Number.isFinite(trade.amount) || !Number.isFinite(trade.timestamp)) {
        return false;
      }
      seenTradeIds.add(trade.id);
      return true;
    }).map(trade => ({
      time: trade.timestamp as UTCTimestamp,
      position: (trade.type === 'buy' ? 'belowBar' : 'aboveBar') as 'belowBar' | 'aboveBar',
      color: trade.type === 'buy' ? '#8B5CF6' : '#F6465D',
      shape: (trade.type === 'buy' ? 'arrowUp' : 'arrowDown') as 'arrowUp' | 'arrowDown',
      text: `${trade.type.toUpperCase()} ${trade.amount.toFixed(4)} @ $${trade.price.toFixed(2)}`
    }));
    const allMarkers = [...tradeMarkers, ...markers];

    // Use lightweight-charts v5 API for markers
    try {
      if (!markersRef.current) {
        markersRef.current = createSeriesMarkers(series, allMarkers);
      } else {
        markersRef.current.setMarkers(allMarkers);
      }
    } catch (e) {
      console.error('Failed to set markers:', e);
    }
  }, [drawings, trades]);

  // Note: handleTimeframeChange is defined above with cooldown logic

  useEffect(() => {
    if (isInitialized && asset) {
      generateHistoricalData(asset, timeframe);
    }
  }, [isInitialized, asset?.id, timeframe]); // Only regenerate when ID or timeframe changes

  // Remove specific drawing
  const removeDrawing = (id: string) => {
    setDrawings(prev => prev.filter(d => d.id !== id));
    toast.success('Drawing removed');
  };

  // Clear all drawings
  const clearDrawings = () => {
    setDrawings([]);
    setDrawingInProgress(null);
    toast.success('All drawings cleared');
  };

  // Undo last drawing
  const undoDrawing = () => {
    if (drawingInProgress) {
      setDrawingInProgress(null);
      toast.info('Drawing cancelled');
    } else if (drawings.length > 0) {
      setDrawings(prev => prev.slice(0, -1));
      toast.success('Last drawing removed');
    }
  };
  const timeframes: Timeframe[] = ['1s', '1m', '5m', '15m', '1h', '4h', '1d', '1w'];
  return <Card className="p-0 bg-[#0B0E11] border-[#2A2E39]">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4 border-b border-[#2A2E39]">
        <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
          <h3 className="text-base sm:text-lg font-semibold text-[#EAECEF]">
            {asset?.symbol || 'BTC'}/USDT
          </h3>
          <span className="text-xl sm:text-2xl font-bold text-[#EAECEF]">
            ${asset?.current_price?.toFixed(2)}
          </span>
          <span className={`text-xs sm:text-sm font-medium ${asset?.price_change_24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {asset?.price_change_24h >= 0 ? '+' : ''}{((asset?.price_change_24h || 0) * 100).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-3 border-b border-[#2A2E39]">
        {/* Timeframe selector */}
        <div className="flex gap-1 relative group">
          {timeframes.map(tf => <div key={tf} className="relative">
              <Button variant={timeframe === tf ? 'default' : 'outline'} size="sm" onClick={() => handleTimeframeChange(tf)} disabled={timeframeCooldown > 0 && timeframe !== tf} className={timeframeCooldown > 0 && timeframe !== tf ? 'opacity-50 cursor-not-allowed' : ''}>
                {tf}
              </Button>
            </div>)}
          {timeframeCooldown > 0 && <div className="absolute -top-8 left-0 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              Cooldown: {timeframeCooldown}s
            </div>}
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Drawing tools */}
        <Button variant={drawingTool === 'trendline' ? 'default' : 'outline'} size="sm" onClick={() => setDrawingTool(drawingTool === 'trendline' ? 'none' : 'trendline')} title="Trend Line">
          <TrendingUp className="h-4 w-4" />
        </Button>
        <Button variant={drawingTool === 'horizontal' ? 'default' : 'outline'} size="sm" onClick={() => setDrawingTool(drawingTool === 'horizontal' ? 'none' : 'horizontal')} title="Horizontal Line">
          <Minus className="h-4 w-4" />
        </Button>
        <Button variant={drawingTool === 'rectangle' ? 'default' : 'outline'} size="sm" onClick={() => setDrawingTool(drawingTool === 'rectangle' ? 'none' : 'rectangle')} title="Rectangle">
          <Square className="h-4 w-4" />
        </Button>
        <Button variant={drawingTool === 'text' ? 'default' : 'outline'} size="sm" onClick={() => setDrawingTool(drawingTool === 'text' ? 'none' : 'text')} title="Text Note">
          <Type className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border" />

        {/* Indicators */}
        
        

        <div className="w-px h-6 bg-border" />

        {/* Actions */}
        <Button variant="outline" size="sm" onClick={undoDrawing} title="Undo" disabled={drawings.length === 0}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={clearDrawings} title="Clear All" disabled={drawings.length === 0}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Chart container */}
      <div className="relative">
        <div ref={chartContainerRef} className="w-full" />
        {isLoadingData && <div className="absolute inset-0 bg-[#0B0E11]/80 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading chart data...</p>
            </div>
          </div>}
      </div>

      {/* Info footer */}
      <div className="px-4 py-3 text-sm text-[#848E9C] border-t border-[#2A2E39]">
        {drawingTool !== 'none' && <div className="flex items-center gap-2 text-[#FCD535]">
            <span className="font-medium">Drawing mode active:</span>
            <span className="capitalize">{drawingTool}</span>
            <span className="text-[#848E9C]">
              {drawingInProgress ? '- Click second point' : '- Click on the chart to draw'}
            </span>
          </div>}
        {drawings.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-medium">Drawings ({drawings.length}):</span>
            {drawings.map(drawing => <Button key={drawing.id} variant="outline" size="sm" onClick={() => removeDrawing(drawing.id)} className="h-6 px-2 text-xs">
                {drawing.type} ×
              </Button>)}
          </div>}
        {trades.length > 0 && <div className="mt-2">
            Showing {trades.length} trades • 
            <span className="text-[#8B5CF6] ml-1">Purple = Buy</span> • 
            <span className="text-[#F6465D] ml-1">Red = Sell</span>
          </div>}
      </div>
    </Card>;
};
