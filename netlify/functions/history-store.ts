import fs from "node:fs/promises";
import path from "node:path";
import { getStore } from "@netlify/blobs";

export type DailyHistoryRecord = {
  date: string;
  price: number;
  capturedAt: string;
};

export type HistoryBucket = {
  marketId: string;
  marketName: string;
  provinceCode: string;
  varietyId: string;
  varietyName: string;
  category: string;
  unit: string;
  records: DailyHistoryRecord[];
};

const LOCAL_HISTORY_PATH = path.resolve(process.cwd(), ".netlify", "veg-price-history.json");
const STORE_NAME = "yunnan-veg-price-history";
const WRITE_COOLDOWN_MS = 60 * 60 * 1000; // 1 小时：同一品种同一天价格不变时不重复写

function historyKey(marketId: string, varietyId: string) {
  return `${marketId}:${varietyId}`;
}

async function readLocalStore(): Promise<Record<string, HistoryBucket>> {
  try {
    const raw = await fs.readFile(LOCAL_HISTORY_PATH, "utf8");
    return JSON.parse(raw) as Record<string, HistoryBucket>;
  } catch {
    return {};
  }
}

async function writeLocalStore(data: Record<string, HistoryBucket>) {
  await fs.mkdir(path.dirname(LOCAL_HISTORY_PATH), { recursive: true });
  await fs.writeFile(LOCAL_HISTORY_PATH, JSON.stringify(data, null, 2), "utf8");
}

async function readBlobBucket(key: string): Promise<HistoryBucket | null> {
  try {
    const store = getStore(STORE_NAME);
    return (await store.get(key, { type: "json" })) as HistoryBucket | null;
  } catch {
    return null;
  }
}

async function writeBlobBucket(key: string, bucket: HistoryBucket) {
  const store = getStore(STORE_NAME);
  await store.setJSON(key, bucket);
}

export async function loadHistoryBucket(marketId: string, varietyId: string): Promise<HistoryBucket | null> {
  const key = historyKey(marketId, varietyId);
  const blobBucket = await readBlobBucket(key);
  if (blobBucket) return blobBucket;

  const localStore = await readLocalStore();
  return localStore[key] ?? null;
}

export async function saveHistoryBucket(bucket: HistoryBucket) {
  const key = historyKey(bucket.marketId, bucket.varietyId);

  try {
    // 限流：检查是否需要写入
    const existing = await readBlobBucket(key);
    if (shouldSkipWrite(existing, bucket)) {
      return;
    }
    await writeBlobBucket(key, bucket);
  } catch {
    // Blob storage is the primary path on Netlify; local persistence keeps
    // development and fallback flows usable when blobs are unavailable.
  }

  try {
    const localStore = await readLocalStore();
    localStore[key] = bucket;
    await writeLocalStore(localStore);
  } catch {
    // Ignore local mirror failures in serverless environments.
  }
}

function shouldSkipWrite(existing: HistoryBucket | null, updated: HistoryBucket): boolean {
  if (!existing) return false;
  const lastExisting = existing.records.at(-1);
  const lastUpdated = updated.records.at(-1);
  if (!lastExisting || !lastUpdated) return false;
  // 同一天价格没变 → 跳过写入
  if (lastExisting.date === lastUpdated.date && lastExisting.price === lastUpdated.price) {
    return true;
  }
  return false;
}

export function upsertHistoryRecord(bucket: HistoryBucket, record: DailyHistoryRecord): HistoryBucket {
  const records = [...bucket.records];
  const index = records.findIndex((item) => item.date === record.date);

  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }

  records.sort((a, b) => a.date.localeCompare(b.date));

  return { ...bucket, records };
}

export function createEmptyBucket(input: Omit<HistoryBucket, "records">): HistoryBucket {
  return { ...input, records: [] };
}

export function toDailyPoints(bucket: HistoryBucket, days: number) {
  const limited = bucket.records.slice(-days);

  return limited.map((item, index) => {
    const previous = limited[index - 1];
    const growthRate = previous && previous.price > 0 ? Number((((item.price - previous.price) / previous.price) * 100).toFixed(2)) : 0;

    return {
      date: item.date.slice(5),
      price: Number(item.price.toFixed(2)),
      growthRate,
    };
  });
}

export function getBucketKey(marketId: string, varietyId: string) {
  return historyKey(marketId, varietyId);
}
