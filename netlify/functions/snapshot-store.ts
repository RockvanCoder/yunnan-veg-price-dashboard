// 每日全量快照存储 —— 时序数据库层
// 以日期为 key 存储完整的市场行情快照，支持按日期范围查询和导出

import { getStore } from "@netlify/blobs";
import type { VegetableQuote } from "../../src/lib/types";

export type DailySnapshot = {
  date: string;                    // "2026-05-29"
  capturedAt: string;              // "2026-05-29 12:00:00"
  marketId: string;
  marketName: string;
  sourceName: string;
  sourceUrl: string;
  quotes: VegetableQuote[];        // 当日全量报价
  summary: {
    avgPrice: number;
    highestPrice: number;
    lowestPrice: number;
    risingCount: number;
    fallingCount: number;
  };
};

const STORE_NAME = "yunnan-veg-daily-snapshots";

function snapshotKey(date: string, marketId: string) {
  return `${date}__${marketId}`;
}

export async function saveDailySnapshot(snapshot: DailySnapshot) {
  try {
    const store = getStore(STORE_NAME);
    const key = snapshotKey(snapshot.date, snapshot.marketId);
    await store.setJSON(key, snapshot);
    return true;
  } catch {
    return false;
  }
}

export async function loadDailySnapshot(date: string, marketId: string): Promise<DailySnapshot | null> {
  try {
    const store = getStore(STORE_NAME);
    const key = snapshotKey(date, marketId);
    return await store.get(key, { type: "json" }) as DailySnapshot | null;
  } catch {
    return null;
  }
}

// 列出所有快照日期（按日期降序）
export async function listSnapshotDates(marketId: string): Promise<string[]> {
  try {
    const store = getStore(STORE_NAME);
    const { blobs } = await store.list({ prefix: "", paginate: false });
    const dates = new Set<string>();
    for (const blob of blobs) {
      const parts = blob.key.split("__");
      if (parts[1] === marketId && /^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
        dates.add(parts[0]);
      }
    }
    return Array.from(dates).sort().reverse();
  } catch {
    return [];
  }
}

// 按日期范围批量加载快照
export async function loadSnapshotRange(
  marketId: string,
  startDate: string,
  endDate: string,
): Promise<DailySnapshot[]> {
  try {
    const store = getStore(STORE_NAME);
    const { blobs } = await store.list({ prefix: "", paginate: false });
    const prefix = `${marketId}`;
    const keys = blobs
      .map((b) => b.key)
      .filter((k) => {
        const parts = k.split("__");
        return parts[1] === marketId && parts[0] >= startDate && parts[0] <= endDate;
      });

    const snapshots: DailySnapshot[] = [];
    for (const key of keys) {
      const snap = await store.get(key, { type: "json" }) as DailySnapshot | null;
      if (snap) snapshots.push(snap);
    }
    return snapshots.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

// 转换为 CSV 字符串
export function snapshotsToCSV(snapshots: DailySnapshot[]): string {
  const header = "日期,时间,市场,品种,品类,单位,当前价格(元),昨日价格(元),涨跌额(元),涨跌幅(%),7日均价(元),30日均价(元)";
  const rows: string[] = [header];

  for (const snap of snapshots) {
    for (const q of snap.quotes) {
      const row = [
        snap.date,
        snap.capturedAt,
        escapeCsv(snap.marketName),
        escapeCsv(q.name),
        escapeCsv(q.category),
        q.unit,
        q.currentPrice.toFixed(2),
        q.yesterdayPrice.toFixed(2),
        q.growthAmount.toFixed(2),
        q.growthRate.toFixed(2),
        q.history7dAvg.toFixed(2),
        q.history30dAvg.toFixed(2),
      ].join(",");
      rows.push(row);
    }
  }

  return rows.join("\n");
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
