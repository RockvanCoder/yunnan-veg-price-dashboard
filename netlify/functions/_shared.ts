import { getMockDashboard, getMockMarkets } from "../../src/lib/mock";
import type { DashboardPayload, Market } from "../../src/lib/types";

export const mockMarkets: Market[] = getMockMarkets();

export function json(body: unknown, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

export function fallbackPayload(): DashboardPayload {
  const payload = getMockDashboard();
  payload.summary.syncAt = new Date().toISOString();
  return payload;
}
