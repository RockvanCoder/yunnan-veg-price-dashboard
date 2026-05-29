import { getMockDashboard, getMockMarkets } from "./mock";
import type { DashboardPayload, Market, PricePoint, VegetableQuote } from "./types";

const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
const allowMockFallback = import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== "false";

async function requestJson<T>(path: string): Promise<T> {
  if (import.meta.env.DEV && !baseUrl) {
    throw new Error("dev_mock_mode");
  }

  const url = baseUrl ? `${baseUrl}${path}` : path;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchMarkets(): Promise<Market[]> {
  try {
    const payload = await requestJson<{ markets: Market[] }>("/api/markets");
    return payload.markets;
  } catch (error) {
    if (!allowMockFallback) throw error;
    return getMockMarkets();
  }
}

export async function fetchDashboard(marketId: string, days: number): Promise<DashboardPayload> {
  const fallback = getMockDashboard();
  try {
    return await requestJson<DashboardPayload>(`/api/dashboard?marketId=${encodeURIComponent(marketId)}&days=${days}`);
  } catch (error) {
    if (!allowMockFallback) throw error;
    return fallback;
  }
}

export async function fetchQuotes(marketId: string): Promise<VegetableQuote[]> {
  const dashboard = await fetchDashboard(marketId, 7);
  return dashboard.quotes;
}

export async function fetchHistory(vegetableId: string, marketId: string, days: number): Promise<PricePoint[]> {
  try {
    return await requestJson<PricePoint[]>(
      `/api/history?vegetableId=${encodeURIComponent(vegetableId)}&marketId=${encodeURIComponent(marketId)}&days=${days}`
    );
  } catch (error) {
    if (!allowMockFallback) throw error;
    const dashboard = getMockDashboard();
    const found = dashboard.featuredHistory.find((item) => item.vegetableId === vegetableId);
    return found?.points ?? [];
  }
}
