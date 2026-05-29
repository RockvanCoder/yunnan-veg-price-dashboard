import { fallbackPayload, json } from "./_shared";
import { buildDashboardPayload } from "./service";

export async function handler(event: { queryStringParameters?: Record<string, string | undefined> }) {
  const marketId = event.queryStringParameters?.marketId ?? "yn-km";
  const days = Number(event.queryStringParameters?.days ?? "7");
  try {
    return json(await buildDashboardPayload({ marketId, days: Number.isFinite(days) ? days : 7 }));
  } catch (error) {
    const payload = fallbackPayload();
    payload.summary.market.id = marketId;
    payload.summary.staleAtMinutes = Number.isFinite(days) ? days : 7;
    payload.summary.sourceName = "示例数据源";
    payload.summary.sourceUrl = "官方源暂时不可用，已回退到本地示例数据";
    return json(payload, 200);
  }
}
