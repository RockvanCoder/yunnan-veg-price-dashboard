import type { DashboardPayload, PricePoint, VegetableQuote } from "../../src/lib/types";
import { fallbackPayload } from "./_shared";
import {
  DEFAULT_VEGETABLE_NAMES,
  fetchCurrentPriceQuote,
  fetchGrowthRanking,
  fetchVegetableCatalog,
  fetchYunnanMarkets,
  getYunnanFallbackMarket,
} from "./pfsc";
import { createEmptyBucket, loadHistoryBucket, saveHistoryBucket, upsertHistoryRecord } from "./history-store";

type DashboardBuildInput = {
  marketId?: string;
  days?: number;
};

type QuoteBuildResult = VegetableQuote & {
  bucket: {
    marketId: string;
    marketName: string;
    provinceCode: string;
    varietyId: string;
    varietyName: string;
    category: string;
    unit: string;
    records: Array<{ date: string; price: number; capturedAt: string }>;
  };
};

const DEFAULT_RANGE_DAYS = 7;

function shanghaiNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
}

function shanghaiDateKey(date = shanghaiNow()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shanghaiDateTime(date = shanghaiNow()) {
  const key = shanghaiDateKey(date);
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");
  return `${key} ${hours}:${minutes}:${seconds}`;
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function findPreviousRecord(records: Array<{ date: string; price: number }>, date: string) {
  const reversed = [...records].reverse();
  return reversed.find((item) => item.date < date) ?? null;
}

function buildQuoteOptions(growthRanking: Awaited<ReturnType<typeof fetchGrowthRanking>>) {
  const map = new Map<string, number>();

  growthRanking.names.forEach((name, index) => {
    const growth = Number.parseFloat(growthRanking.priceHbs[index] ?? "0");
    map.set(name, Number.isFinite(growth) ? growth : 0);
  });

  return map;
}

function buildPriceFallbackMap(growthRanking: Awaited<ReturnType<typeof fetchGrowthRanking>>) {
  const map = new Map<string, number>();

  growthRanking.names.forEach((name, index) => {
    const price = Number.parseFloat(growthRanking.avgPrice[index] ?? growthRanking.lastAvgPrice[index] ?? "0");
    if (Number.isFinite(price) && price > 0) {
      map.set(name, price);
    }
  });

  return map;
}

function buildDailySeries(records: Array<{ date: string; price: number }>): PricePoint[] {
  return records.map((item, index) => {
    const previous = records[index - 1];
    const growthRate = previous && previous.price > 0 ? Number((((item.price - previous.price) / previous.price) * 100).toFixed(2)) : 0;

    return {
      date: item.date.slice(5),
      price: Number(item.price.toFixed(2)),
      growthRate,
    };
  });
}

export async function buildDashboardPayload({ marketId, days = DEFAULT_RANGE_DAYS }: DashboardBuildInput = {}): Promise<DashboardPayload> {
  const markets = await fetchYunnanMarkets();
  const activeMarket = markets.find((item) => item.id === marketId) ?? markets[0] ?? {
    id: getYunnanFallbackMarket().id,
    name: getYunnanFallbackMarket().name,
    code: "530100",
    provinceCode: "530000",
    provinceName: "云南省",
  };

  const catalog = await fetchVegetableCatalog();

  if (!catalog.length) {
    return fallbackPayload();
  }

  const growthRanking = await fetchGrowthRanking();
  const growthLookup = buildQuoteOptions(growthRanking);
  const priceFallbackLookup = buildPriceFallbackMap(growthRanking);
  const now = shanghaiNow();
  const today = shanghaiDateKey(now);
  const syncAt = shanghaiDateTime(now);

  const quoteResults: QuoteBuildResult[] = await Promise.all(
    catalog.map(async (item) => {
      const bucket =
        (await loadHistoryBucket(activeMarket.id, item.id)) ??
        createEmptyBucket({
          marketId: activeMarket.id,
          marketName: activeMarket.name,
          provinceCode: activeMarket.provinceCode,
          varietyId: item.id,
          varietyName: item.name,
          category: item.category,
          unit: item.unit,
        });

      let currentPrice = bucket.records.at(-1)?.price ?? 0;
      try {
        const response = await fetchCurrentPriceQuote({
          marketId: activeMarket.id,
          provinceCode: activeMarket.provinceCode,
          varietyId: item.id,
        });
        currentPrice = Number(response.y[0] ?? currentPrice);
      } catch {
        currentPrice = bucket.records.at(-1)?.price ?? priceFallbackLookup.get(item.name) ?? currentPrice;
      }

      const previousRecord = findPreviousRecord(bucket.records, today);
      const yesterdayPrice = previousRecord?.price ?? currentPrice;
      const growthAmount = Number((currentPrice - yesterdayPrice).toFixed(2));
      const growthRate = previousRecord
        ? Number((((currentPrice - yesterdayPrice) / (yesterdayPrice || 1)) * 100).toFixed(2))
        : growthLookup.get(item.name) ?? 0;

      const updatedBucket = upsertHistoryRecord(bucket, {
        date: today,
        price: currentPrice,
        capturedAt: syncAt,
      });

      const history = updatedBucket.records;
      const history7d = history.slice(-7).map((entry) => entry.price);
      const history30d = history.slice(-30).map((entry) => entry.price);

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        marketId: activeMarket.id,
        currentPrice: Number(currentPrice.toFixed(2)),
        yesterdayPrice: Number(yesterdayPrice.toFixed(2)),
        growthAmount,
        growthRate,
        history7dAvg: avg(history7d),
        history30dAvg: avg(history30d),
        updatedAt: syncAt,
        bucket: updatedBucket,
      };
    })
  );

  const savedBuckets = quoteResults.map((item) => item.bucket);
  await Promise.all(savedBuckets.map((bucket) => saveHistoryBucket(bucket)));

  const quotes = quoteResults
    .map(({ bucket, ...quote }) => quote)
    .sort((a, b) => b.growthRate - a.growthRate || a.name.localeCompare(b.name, "zh-CN"));
  const currentAvgPrice = avg(quotes.map((item) => item.currentPrice));
  const highestPrice = Math.max(...quotes.map((item) => item.currentPrice));
  const lowestPrice = Math.min(...quotes.map((item) => item.currentPrice));
  const risingCount = quotes.filter((item) => item.growthRate > 0).length;
  const fallingCount = quotes.filter((item) => item.growthRate < 0).length;

  const featuredHistory = await Promise.all(
    savedBuckets.slice(0, 4).map(async (bucket) => {
      const points = buildDailySeries(bucket.records).slice(-Math.max(1, days));

      return {
        vegetableId: bucket.varietyId,
        name: bucket.varietyName,
        points,
      };
    })
  );

  return {
    summary: {
      sourceName: "农业农村部全国农产品批发市场价格信息系统",
      sourceUrl: "https://pfsc.agri.cn/priceMarket",
      market: {
        id: activeMarket.id,
        name: activeMarket.name,
        region: activeMarket.provinceName ?? "云南",
        note: "官方云南市场数据",
        updatedAt: syncAt,
      },
      currentAvgPrice,
      highestPrice,
      lowestPrice,
      risingCount,
      fallingCount,
      syncAt,
      staleAtMinutes: 5,
    },
    quotes,
    featuredHistory,
  };
}

export async function buildMarketsPayload() {
  const markets = await fetchYunnanMarkets();
  const now = shanghaiDateTime();

  return {
    markets: markets.map((market) => ({
      id: market.id,
      name: market.name,
      region: market.provinceName ?? "云南",
      note: "农业农村部官方云南市场",
      updatedAt: now,
    })),
    source: "official",
  };
}

export async function buildHistoryPayload(input: { marketId: string; vegetableId: string; days: number }) {
  const markets = await fetchYunnanMarkets();
  const activeMarket = markets.find((item) => item.id === input.marketId) ?? markets[0] ?? {
    id: getYunnanFallbackMarket().id,
    name: getYunnanFallbackMarket().name,
    code: "530100",
    provinceCode: "530000",
    provinceName: "云南省",
  };

  const bucket = await loadHistoryBucket(activeMarket.id, input.vegetableId);
  if (!bucket) {
    return [];
  }

  return buildDailySeries(bucket.records).slice(-Math.max(1, input.days));
}
