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

(globalThis as any).WebSocket = MockWebSocket as any;
(globalThis as any).localStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

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

});
