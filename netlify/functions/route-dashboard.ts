import { json } from "./_shared";
import { buildRouteDashboardPayload } from "./service";

export async function handler(event: { queryStringParameters?: Record<string, string | undefined> }) {
  const productionMarketId = event.queryStringParameters?.productionMarketId;
  const destinationMarketId = event.queryStringParameters?.destinationMarketId;
  const days = Number(event.queryStringParameters?.days ?? "7");

  try {
    return json(
      await buildRouteDashboardPayload({
        productionMarketId,
        destinationMarketId,
        days: Number.isFinite(days) ? days : 7,
      })
    );
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "route_dashboard_failed",
        spreads: [],
        featuredSpreadHistory: [],
      },
      502
    );
  }
}
