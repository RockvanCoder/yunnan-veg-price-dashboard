import { json } from "./_shared";
import { buildDashboardPayload, buildRouteDashboardPayload } from "./service";

const DEFAULT_MARKET_ID = "76E4F160C162936CE040A8C020017257";

export async function handler() {
  try {
    const payload = await buildDashboardPayload({ marketId: DEFAULT_MARKET_ID, days: 7 });
    const routePayload = await buildRouteDashboardPayload({ productionMarketId: DEFAULT_MARKET_ID, days: 7 });
    return json({
      ok: true,
      refreshedAt: payload.summary.syncAt,
      source: payload.summary.sourceName,
      quoteCount: payload.quotes.length,
      routeQuoteCount: routePayload.spreads.length,
      positiveSpreadCount: routePayload.summary.positiveSpreadCount,
      market: payload.summary.market,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "snapshot_failed",
        refreshedAt: new Date().toISOString(),
      },
      500
    );
  }
}
