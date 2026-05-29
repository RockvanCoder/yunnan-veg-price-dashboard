import { json, fallbackPayload } from "./_shared";
import { buildHistoryPayload } from "./service";

export async function handler(event: { queryStringParameters?: Record<string, string | undefined> }) {
  const vegetableId = event.queryStringParameters?.vegetableId ?? "135";
  const marketId = event.queryStringParameters?.marketId ?? "76E4F160C162936CE040A8C020017257";
  const days = Number(event.queryStringParameters?.days ?? "7");

  try {
    return json(await buildHistoryPayload({
      vegetableId,
      marketId,
      days: Number.isFinite(days) ? days : 7,
    }));
  } catch {
    const payload = fallbackPayload();
    const found = payload.featuredHistory.find((item) => item.vegetableId === vegetableId);
    return json(found?.points ?? []);
  }
}
