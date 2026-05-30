import type { DashboardPayload, Market, PricePoint, RouteDashboardPayload, SpreadSignal, VegetableQuote } from "../../src/lib/types";
import { fallbackPayload } from "./_shared";
import {
  DEFAULT_VEGETABLE_CATALOG,
  fetchCurrentPriceQuote,
  fetchGrowthRanking,
  fetchVegetableCatalog,
  fetchYunnanMarkets,
  getYunnanFallbackMarket,
} from "./pfsc";
import {
  createEmptyBucket,
  createEmptySpreadBucket,
  loadHistoryBucket,
  loadSpreadHistoryBucket,
  saveHistoryBucket,
  saveSpreadHistoryBucket,
  upsertHistoryRecord,
  upsertSpreadHistoryRecord,
} from "./history-store";

type DashboardBuildInput = {
  marketId?: string;
  days?: number;
};

type RouteBuildInput = {
  productionMarketId?: string;
  destinationMarketId?: string;
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
const DESTINATION_REFERENCE_MARKET: Market = {
  id: "national-wholesale-average",
  name: "全国销区批发参考均价",
  region: "全国重点批发市场",
  note: "来自官方涨幅排行中的全国平均批发价，用作销区参考价",
  updatedAt: "",
  kind: "benchmark",
  group: "销区参考",
};

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

function buildSpreadSeries(
  records: Array<{ date: string; productionPrice: number; destinationPrice: number; spreadAmount: number; spreadRate: number }>
) {
  return records.map((item) => ({
    date: item.date.slice(5),
    productionPrice: Number(item.productionPrice.toFixed(2)),
    destinationPrice: Number(item.destinationPrice.toFixed(2)),
    spreadAmount: Number(item.spreadAmount.toFixed(2)),
    spreadRate: Number(item.spreadRate.toFixed(2)),
  }));
}

function spreadSignal(spreadRate: number, productionGrowthRate: number): SpreadSignal {
  if (spreadRate >= 20 && productionGrowthRate >= 0) return "strong";
  if (spreadRate >= 8) return "watch";
  return "weak";
}

function resolveCatalogItem(vegetableId: string, catalog: Awaited<ReturnType<typeof fetchVegetableCatalog>>) {
  return (
    catalog.find((item) => item.id === vegetableId) ??
    DEFAULT_VEGETABLE_CATALOG.find((item) => item.id === vegetableId) ??
    {
      id: vegetableId,
      name: vegetableId,
      category: "蔬菜",
      unit: "元/公斤",
      code: vegetableId,
    }
  );
}

async function seedTodayHistoryBucket(input: {
  marketId: string;
  marketName: string;
  provinceCode: string;
  item: {
    id: string;
    name: string;
    category: string;
    unit: string;
  };
}) {
  const growthRanking = await fetchGrowthRanking();
  const priceFallbackLookup = buildPriceFallbackMap(growthRanking);
  const now = shanghaiNow();
  const today = shanghaiDateKey(now);
  const syncAt = shanghaiDateTime(now);

  let currentPrice = priceFallbackLookup.get(input.item.name) ?? 0;
  try {
    const response = await fetchCurrentPriceQuote({
      marketId: input.marketId,
      provinceCode: input.provinceCode,
      varietyId: input.item.id,
    });
    currentPrice = Number(response.y[0] ?? currentPrice);
  } catch {
    // Keep the fallback price so a first-time history request still gets
    // a usable "today" point instead of returning an empty history.
  }

  const bucket = upsertHistoryRecord(
    createEmptyBucket({
      marketId: input.marketId,
      marketName: input.marketName,
      provinceCode: input.provinceCode,
      varietyId: input.item.id,
      varietyName: input.item.name,
      category: input.item.category,
      unit: input.item.unit,
    }),
    {
      date: today,
      price: Number(currentPrice.toFixed(2)),
      capturedAt: syncAt,
    }
  );

  await saveHistoryBucket(bucket);
  return bucket;
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
      kind: "production" as const,
      group: "云南产区",
    })),
    source: "official",
  };
}

export async function buildRouteDashboardPayload({
  productionMarketId,
  destinationMarketId = DESTINATION_REFERENCE_MARKET.id,
  days = DEFAULT_RANGE_DAYS,
}: RouteBuildInput = {}): Promise<RouteDashboardPayload> {
  const markets = await fetchYunnanMarkets();
  const activeMarket = markets.find((item) => item.id === productionMarketId) ?? markets[0] ?? {
    id: getYunnanFallbackMarket().id,
    name: getYunnanFallbackMarket().name,
    code: "530100",
    provinceCode: "530000",
    provinceName: "云南省",
  };
  const catalog = await fetchVegetableCatalog();
  const growthRanking = await fetchGrowthRanking();
  const destinationLookup = buildPriceFallbackMap(growthRanking);
  const growthLookup = buildQuoteOptions(growthRanking);
  const now = shanghaiNow();
  const today = shanghaiDateKey(now);
  const syncAt = shanghaiDateTime(now);
  const historicalQuotes = await Promise.all(
    catalog.map(async (item): Promise<VegetableQuote | null> => {
      const bucket = await loadHistoryBucket(activeMarket.id, item.id);
      if (!bucket) return null;
      const currentRecord = bucket.records.at(-1);
      if (!currentRecord) return null;

      const previousRecord = findPreviousRecord(bucket.records, currentRecord.date);
      const currentPrice = currentRecord.price;
      const yesterdayPrice = previousRecord?.price ?? currentPrice;
      const growthAmount = Number((currentPrice - yesterdayPrice).toFixed(2));
      const growthRate = previousRecord
        ? Number((((currentPrice - yesterdayPrice) / (yesterdayPrice || 1)) * 100).toFixed(2))
        : growthLookup.get(item.name) ?? 0;
      const history7d = bucket.records.slice(-7).map((entry) => entry.price);
      const history30d = bucket.records.slice(-30).map((entry) => entry.price);

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
        updatedAt: currentRecord.capturedAt,
      };
    })
  );
  const quotesFromHistory = historicalQuotes.filter((item): item is VegetableQuote => Boolean(item));
  const dashboard = quotesFromHistory.length
    ? null
    : await buildDashboardPayload({ marketId: activeMarket.id, days });
  const quotes = quotesFromHistory.length ? quotesFromHistory : dashboard?.quotes ?? [];
  const productionMarket = {
    id: activeMarket.id,
    name: activeMarket.name,
    region: activeMarket.provinceName ?? "云南",
    note: "官方云南产区市场数据",
    updatedAt: syncAt,
    kind: "production" as const,
    group: "云南产区",
  };
  const destinationMarket = {
    ...DESTINATION_REFERENCE_MARKET,
    id: destinationMarketId,
    updatedAt: syncAt,
  };

  const spreadResults = await Promise.all(
    quotes
      .filter((quote) => quote.currentPrice > 0)
      .map(async (quote) => {
        const destinationPrice = destinationLookup.get(quote.name) ?? quote.currentPrice;
        const spreadAmount = Number((destinationPrice - quote.currentPrice).toFixed(2));
        const spreadRate = quote.currentPrice > 0 ? Number(((spreadAmount / quote.currentPrice) * 100).toFixed(2)) : 0;

        const existingBucket = await loadSpreadHistoryBucket(productionMarket.id, destinationMarket.id, quote.id);
        const bucket = upsertSpreadHistoryRecord(
          existingBucket ??
            createEmptySpreadBucket({
              productionMarketId: productionMarket.id,
              productionMarketName: productionMarket.name,
              destinationMarketId: destinationMarket.id,
              destinationMarketName: destinationMarket.name,
              varietyId: quote.id,
              varietyName: quote.name,
            }),
          {
            date: today,
            productionPrice: quote.currentPrice,
            destinationPrice,
            spreadAmount,
            spreadRate,
            capturedAt: syncAt,
          }
        );

        await saveSpreadHistoryBucket(bucket);

        return {
          spread: {
            id: quote.id,
            name: quote.name,
            category: quote.category,
            unit: quote.unit,
            productionMarketId: productionMarket.id,
            productionMarketName: productionMarket.name,
            destinationMarketId: destinationMarket.id,
            destinationMarketName: destinationMarket.name,
            productionPrice: quote.currentPrice,
            destinationPrice: Number(destinationPrice.toFixed(2)),
            spreadAmount,
            spreadRate,
            productionGrowthRate: quote.growthRate,
            signal: spreadSignal(spreadRate, quote.growthRate),
            updatedAt: syncAt,
          },
          history: {
            vegetableId: quote.id,
            name: quote.name,
            points: buildSpreadSeries(bucket.records).slice(-Math.max(1, days)),
          },
        };
      })
  );

  const spreads = spreadResults
    .map((item) => item.spread)
    .sort((a, b) => b.spreadAmount - a.spreadAmount || b.spreadRate - a.spreadRate);
  const strongest = spreads[0];
  const averageSpread = avg(spreads.map((item) => item.spreadAmount));
  const positiveSpreadCount = spreads.filter((item) => item.spreadAmount > 0).length;

  return {
    summary: {
      sourceName: "农业农村部全国农产品批发市场价格信息系统",
      sourceUrl: "https://pfsc.agri.cn/priceMarket",
      productionMarket,
      destinationMarket,
      syncAt,
      quoteCount: spreads.length,
      averageSpread,
      positiveSpreadCount,
      strongestVegetableName: strongest?.name ?? "--",
      staleAtMinutes: dashboard?.summary.staleAtMinutes ?? 5,
      note: "销区价当前使用官方全国平均批发价作为参考，后续可替换为北京、广州、上海等具体销区市场。",
    },
    spreads,
    featuredSpreadHistory: spreadResults.slice(0, 4).map((item) => item.history),
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
  const catalog = await fetchVegetableCatalog();
  const item = resolveCatalogItem(input.vegetableId, catalog);
  const existingBucket = await loadHistoryBucket(activeMarket.id, input.vegetableId);

  const bucket =
    existingBucket && existingBucket.records.length > 0
      ? existingBucket
      : await seedTodayHistoryBucket({
          marketId: activeMarket.id,
          marketName: activeMarket.name,
          provinceCode: activeMarket.provinceCode,
          item,
        });

  return buildDailySeries(bucket.records).slice(-Math.max(1, input.days));
}
