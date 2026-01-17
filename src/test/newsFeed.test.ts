import { describe, it, expect } from "vitest";
import { calculateNewsImpactPrice } from "@/components/trading/NewsFeed";

describe("calculateNewsImpactPrice", () => {
  it("applies bullish impact as percentage increase", () => {
    const price = 100;
    const result = calculateNewsImpactPrice(price, "bullish", 5);
    expect(result).toBeCloseTo(105, 5);
  });

  it("applies bearish impact as percentage decrease", () => {
    const price = 200;
    const result = calculateNewsImpactPrice(price, "bearish", 10);
    expect(result).toBeCloseTo(180, 5);
  });

  it("returns original price for neutral impact", () => {
    const price = 150;
    const result = calculateNewsImpactPrice(price, "neutral", 7);
    expect(result).toBe(price);
  });

  it("clamps impact strength between 0 and 10", () => {
    const price = 100;
    const strongBull = calculateNewsImpactPrice(price, "bullish", 50);
    const strongBear = calculateNewsImpactPrice(price, "bearish", 50);
    expect(strongBull).toBeCloseTo(110, 5);
    expect(strongBear).toBeCloseTo(90, 5);
  });

  it("ignores invalid or non-positive prices", () => {
    expect(calculateNewsImpactPrice(0, "bullish", 5)).toBe(0);
    expect(calculateNewsImpactPrice(-10, "bullish", 5)).toBe(-10);
    expect(calculateNewsImpactPrice(Number.NaN, "bullish", 5)).toBeNaN();
  });
});

