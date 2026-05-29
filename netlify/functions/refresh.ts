import { json } from "./_shared";
import { buildDashboardPayload } from "./service";

export async function handler(event: { queryStringParameters?: Record<string, string | undefined> }) {
  const marketId = event.queryStringParameters?.marketId ?? "76E4F160C162936CE040A8C020017257";
  const days = Number(event.queryStringParameters?.days ?? "7");

  try {
    const payload = await buildDashboardPayload({ marketId, days: Number.isFinite(days) ? days : 7 });
    return json({
      ok: true,
      marketId,
      refreshedAt: payload.summary.syncAt,
      quoteCount: payload.quotes.length,
      source: payload.summary.sourceName,
    });
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "refresh_failed",
      refreshedAt: new Date().toISOString(),
    }, 500);
  }
}
