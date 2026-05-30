// 数据导出 API：GET /api/export?marketId=...&start=2026-05-01&end=2026-05-30&format=csv|json

import { json } from "./_shared";
import {
  loadSnapshotRange,
  listSnapshotDates,
  snapshotsToCSV,
} from "./snapshot-store";
import type { DailySnapshot } from "./snapshot-store";

const DEFAULT_MARKET = "76E4F160C162936CE040A8C020017257";

export async function handler(event: {
  queryStringParameters?: Record<string, string | undefined>;
  headers?: Record<string, string | undefined>;
}) {
  const marketId = event.queryStringParameters?.marketId ?? DEFAULT_MARKET;
  const format = event.queryStringParameters?.format ?? "json";
  const start = event.queryStringParameters?.start ?? "";
  const end = event.queryStringParameters?.end ?? "";

  try {
    // 如果未指定日期范围，返回可用日期列表
    if (!start || !end) {
      const dates = await listSnapshotDates(marketId);
      return json({ availableDates: dates, marketId, hint: "传递 start 和 end 参数指定日期范围" });
    }

    const snapshots = await loadSnapshotRange(marketId, start, end);

    if (format === "csv") {
      const csv = snapshotsToCSV(snapshots);
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="云南菜价_${start}_${end}.csv"`,
        },
        body: csv,
      };
    }

    return json({
      marketId,
      startDate: start,
      endDate: end,
      count: snapshots.length,
      snapshots,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "export_failed" }, 500);
  }
}
