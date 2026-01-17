import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { SimTradeProvider, useSimTrade } from "@/contexts/SimTradeContext";
import { ASSETS } from "@/data/assets";

class MockWebSocket {
  url: string;
  onmessage: ((event: { data: string }) => void) | null = null;
  constructor(url: string) {
    this.url = url;
  }
  close() {
  }
}

const globalWithOverrides = globalThis as typeof globalThis & {
  WebSocket: typeof WebSocket;
  localStorage: Storage;
};

globalWithOverrides.WebSocket = MockWebSocket as unknown as typeof WebSocket;
globalWithOverrides.localStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
} as unknown as Storage;

describe("SimTradeContext", () => {
  it("mounts provider without runtime errors", () => {
    const TestComponent = () => {
      useSimTrade();
      return null;
    };
    render(
      React.createElement(
        SimTradeProvider,
        null,
        React.createElement(TestComponent)
      )
    );
  });

  it("overridePrice updates asset price in context", async () => {
    const observedPrices: number[] = [];

    const TestComponent = () => {
      const { overridePrice, prices } = useSimTrade();

      useEffect(() => {
        overridePrice("BTC", 12345);
      }, [overridePrice]);

      useEffect(() => {
        const value = prices["BTC"];
        if (value) {
          observedPrices.push(value);
        }
      }, [prices]);

      return null;
    };

    render(
      React.createElement(
        SimTradeProvider,
        null,
        React.createElement(TestComponent)
      )
    );

    await waitFor(() => {
      expect(observedPrices.at(-1)).toBe(12345);
    });
  });

});
