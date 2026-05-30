import { json } from "./_shared";
import { captureDailySnapshot } from "./service";

const DEFAULT_MARKET_ID = "76E4F160C162936CE040A8C020017257";

export async function runSnapshot() {
  try {
    // captureDailySnapshot 同时完成数据采集 + 每日快照持久化
    const payload = await captureDailySnapshot(DEFAULT_MARKET_ID);
    return json({
      ok: true,
      refreshedAt: payload.summary.syncAt,
      source: payload.summary.sourceName,
      quoteCount: payload.quotes.length,
      market: payload.summary.market,
      persisted: true,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "snapshot_failed",
        refreshedAt: new Date().toISOString(),
      },
      500,
    );
  }
}

export async function handler() {
  return runSnapshot();
}
