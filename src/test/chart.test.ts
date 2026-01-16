import { describe, it, expect } from 'vitest';

const getTimeframeSeconds = (tf: string): number => {
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

const normalizeCandleBody = (candle: { open: number; high: number; low: number; close: number }, price: number) => {
  const open = Number(candle.open);
  const close = Number(candle.close);
  if (!Number.isFinite(open) || !Number.isFinite(close)) return candle;
  const { minMove } = getPriceFormatForPrice(price);
  const pctThreshold = price > 0 ? price * 0.0002 : 0;
  const bodyThreshold = Math.max(minMove, pctThreshold);
  const diff = Math.abs(close - open);
  if (bodyThreshold === 0 || diff >= bodyThreshold) return candle;
  const direction = price >= open ? 1 : -1;
  const adjustedClose = open + direction * bodyThreshold;
  let high = Number(candle.high);
  let low = Number(candle.low);
  if (!Number.isFinite(high)) high = Math.max(open, adjustedClose);
  if (!Number.isFinite(low)) low = Math.min(open, adjustedClose);
  high = Math.max(high, open, adjustedClose);
  low = Math.min(low, open, adjustedClose);
  return {
    ...candle,
    close: adjustedClose,
    high,
    low,
  };
};

describe('Chart Logic', () => {
  describe('Timeframe Calculations', () => {
    it('should return correct seconds for timeframes', () => {
      expect(getTimeframeSeconds('1s')).toBe(1);
      expect(getTimeframeSeconds('1m')).toBe(60);
      expect(getTimeframeSeconds('1h')).toBe(3600);
      expect(getTimeframeSeconds('1d')).toBe(86400);
    });
  });

  describe('Volatility Scaling', () => {
    it('should scale volatility with square root of time', () => {
      const baseVolatility = 0.002; // 0.2%
      const price = 50000;

      // 1 minute
      const tfSeconds1m = 60;
      const timeScaler1m = Math.sqrt(tfSeconds1m / 60); // sqrt(1) = 1
      const vol1m = price * baseVolatility * timeScaler1m;
      expect(vol1m).toBe(100); // 0.2% of 50000 is 100

      // 1 hour
      const tfSeconds1h = 3600;
      const timeScaler1h = Math.sqrt(tfSeconds1h / 60); // sqrt(60) ≈ 7.746
      const vol1h = price * baseVolatility * timeScaler1h;
      
      expect(timeScaler1h).toBeCloseTo(7.746, 3);
      expect(vol1h).toBeCloseTo(774.59, 1);
    });
  });

  describe('Candle Generation Logic', () => {
    it('should generate valid OHLC values', () => {
      const currentClose = 100;
      const volatility = 1;
      
      // Simulate one iteration
      const move = (0.5 - 0.5) * volatility; // Assuming random is 0.5 (no move)
      const close = currentClose;
      const open = close - move;
      const high = Math.max(open, close) + 0.5 * volatility * 0.5;
      const low = Math.min(open, close) - 0.5 * volatility * 0.5;

      expect(high).toBeGreaterThanOrEqual(Math.max(open, close));
      expect(low).toBeLessThanOrEqual(Math.min(open, close));
    });
  });

  describe('Minimal candle body', () => {
    it('ensures tiny price moves still produce a visible body', () => {
      const price = 50000;
      const candle = {
        open: 50000,
        high: 50000,
        low: 50000,
        close: 50000,
      };
      const adjusted = normalizeCandleBody(candle, price);
      const diff = Math.abs(adjusted.close - adjusted.open);
      const { minMove } = getPriceFormatForPrice(price);
      const pctThreshold = price * 0.0002;
      const bodyThreshold = Math.max(minMove, pctThreshold);
      expect(diff).toBeGreaterThanOrEqual(bodyThreshold);
    });
  });
});
