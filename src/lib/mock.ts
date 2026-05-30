import type { DashboardPayload, Market, PricePoint, RouteDashboardPayload, VegetableQuote } from "./types";

const markets: Market[] = [
  { id: "76E4F160C162936CE040A8C020017257", name: "云南昆明呈贡龙城农产品经营股份有限公司", region: "云南省", note: "主产区批发参考", updatedAt: "2026-05-29 12:00" },
  { id: "90238B410A02082400BD630E77906355", name: "昆明市王旗营蔬菜批发市场有限公司", region: "云南省", note: "高原蔬菜观察", updatedAt: "2026-05-29 12:00" },
];

const quotes: VegetableQuote[] = [
  { id: "135", name: "西红柿", category: "瓜果类", unit: "公斤", marketId: "76E4F160C162936CE040A8C020017257", currentPrice: 5.2, yesterdayPrice: 4.8, growthAmount: 0.4, growthRate: 8.33, history7dAvg: 4.9, history30dAvg: 4.4, updatedAt: "2026-05-29 11:58" },
  { id: "77", name: "大白菜", category: "叶菜类", unit: "公斤", marketId: "76E4F160C162936CE040A8C020017257", currentPrice: 2.1, yesterdayPrice: 2.25, growthAmount: -0.15, growthRate: -6.67, history7dAvg: 2.18, history30dAvg: 2.36, updatedAt: "2026-05-29 11:58" },
  { id: "139", name: "黄瓜", category: "瓜果类", unit: "公斤", marketId: "76E4F160C162936CE040A8C020017257", currentPrice: 3.8, yesterdayPrice: 3.5, growthAmount: 0.3, growthRate: 8.57, history7dAvg: 3.62, history30dAvg: 3.35, updatedAt: "2026-05-29 11:58" },
  { id: "137", name: "青椒", category: "瓜果类", unit: "公斤", marketId: "76E4F160C162936CE040A8C020017257", currentPrice: 6.4, yesterdayPrice: 6.1, growthAmount: 0.3, growthRate: 4.92, history7dAvg: 6.15, history30dAvg: 5.86, updatedAt: "2026-05-29 11:58" },
  { id: "81", name: "生菜", category: "叶菜类", unit: "公斤", marketId: "76E4F160C162936CE040A8C020017257", currentPrice: 3.2, yesterdayPrice: 3.25, growthAmount: -0.05, growthRate: -1.54, history7dAvg: 3.18, history30dAvg: 3.26, updatedAt: "2026-05-29 11:58" },
  { id: "1234", name: "白萝卜", category: "根茎类", unit: "公斤", marketId: "76E4F160C162936CE040A8C020017257", currentPrice: 1.35, yesterdayPrice: 1.28, growthAmount: 0.07, growthRate: 5.47, history7dAvg: 1.32, history30dAvg: 1.24, updatedAt: "2026-05-29 11:58" },
];

const historyMap: Record<string, PricePoint[]> = {
  "135": [
    { date: "05-23", price: 4.5, growthRate: 0 },
    { date: "05-24", price: 4.6, growthRate: 2.22 },
    { date: "05-25", price: 4.72, growthRate: 2.61 },
    { date: "05-26", price: 4.68, growthRate: -0.85 },
    { date: "05-27", price: 4.85, growthRate: 3.63 },
    { date: "05-28", price: 4.9, growthRate: 1.03 },
    { date: "05-29", price: 5.2, growthRate: 6.12 },
  ],
  "77": [
    { date: "05-23", price: 2.45, growthRate: 0 },
    { date: "05-24", price: 2.41, growthRate: -1.63 },
    { date: "05-25", price: 2.39, growthRate: -0.83 },
    { date: "05-26", price: 2.31, growthRate: -3.35 },
    { date: "05-27", price: 2.28, growthRate: -1.3 },
    { date: "05-28", price: 2.25, growthRate: -1.32 },
    { date: "05-29", price: 2.1, growthRate: -6.67 },
  ],
  "139": [
    { date: "05-23", price: 3.05, growthRate: 0 },
    { date: "05-24", price: 3.12, growthRate: 2.3 },
    { date: "05-25", price: 3.2, growthRate: 2.56 },
    { date: "05-26", price: 3.25, growthRate: 1.56 },
    { date: "05-27", price: 3.35, growthRate: 3.08 },
    { date: "05-28", price: 3.45, growthRate: 2.99 },
    { date: "05-29", price: 3.8, growthRate: 10.14 },
  ],
  "137": [
    { date: "05-23", price: 5.8, growthRate: 0 },
    { date: "05-24", price: 5.88, growthRate: 1.38 },
    { date: "05-25", price: 5.92, growthRate: 0.68 },
    { date: "05-26", price: 6.02, growthRate: 1.69 },
    { date: "05-27", price: 6.05, growthRate: 0.5 },
    { date: "05-28", price: 6.1, growthRate: 0.83 },
    { date: "05-29", price: 6.4, growthRate: 4.92 },
  ],
  "81": [
    { date: "05-23", price: 3.08, growthRate: 0 },
    { date: "05-24", price: 3.1, growthRate: 0.65 },
    { date: "05-25", price: 3.12, growthRate: 0.65 },
    { date: "05-26", price: 3.15, growthRate: 0.96 },
    { date: "05-27", price: 3.2, growthRate: 1.59 },
    { date: "05-28", price: 3.25, growthRate: 1.56 },
    { date: "05-29", price: 3.2, growthRate: -1.54 },
  ],
  "1234": [
    { date: "05-23", price: 1.22, growthRate: 0 },
    { date: "05-24", price: 1.24, growthRate: 1.64 },
    { date: "05-25", price: 1.26, growthRate: 1.61 },
    { date: "05-26", price: 1.29, growthRate: 2.38 },
    { date: "05-27", price: 1.31, growthRate: 1.55 },
    { date: "05-28", price: 1.28, growthRate: -2.29 },
    { date: "05-29", price: 1.35, growthRate: 5.47 },
  ],
};

export function getMockDashboard(): DashboardPayload {
  const summaryMarket = markets[0];
  const currentAvgPrice = quotes.reduce((sum, item) => sum + item.currentPrice, 0) / quotes.length;
  const highestPrice = Math.max(...quotes.map((item) => item.currentPrice));
  const lowestPrice = Math.min(...quotes.map((item) => item.currentPrice));
  const risingCount = quotes.filter((item) => item.growthRate > 0).length;
  const fallingCount = quotes.filter((item) => item.growthRate < 0).length;

  return {
    summary: {
      sourceName: "示例数据源",
      sourceUrl: "待接入官方行情接口",
      market: summaryMarket,
      currentAvgPrice: Number(currentAvgPrice.toFixed(2)),
      highestPrice,
      lowestPrice,
      risingCount,
      fallingCount,
      syncAt: "2026-05-29 12:00:00",
      staleAtMinutes: 5,
    },
    quotes,
    featuredHistory: Object.entries(historyMap).map(([vegetableId, points]) => ({
      vegetableId,
      name: quotes.find((item) => item.id === vegetableId)?.name ?? vegetableId,
      points,
    })),
  };
}

export function getMockMarkets() {
  return markets;
}

export function getMockRouteDashboard(): RouteDashboardPayload {
  const dashboard = getMockDashboard();
  const productionMarket = {
    ...markets[0],
    kind: "production" as const,
    group: "云南产区",
  };
  const destinationMarket = {
    id: "national-wholesale-average",
    name: "全国销区批发参考均价",
    region: "全国重点批发市场",
    note: "示例销区参考",
    updatedAt: dashboard.summary.syncAt,
    kind: "benchmark" as const,
    group: "销区参考",
  };
  const spreads = quotes.map((quote, index) => {
    const destinationPrice = Number((quote.currentPrice * (1.08 + index * 0.025)).toFixed(2));
    const spreadAmount = Number((destinationPrice - quote.currentPrice).toFixed(2));
    const spreadRate = Number(((spreadAmount / quote.currentPrice) * 100).toFixed(2));

    return {
      id: quote.id,
      name: quote.name,
      category: quote.category,
      unit: quote.unit,
      productionMarketId: productionMarket.id,
      productionMarketName: productionMarket.name,
      destinationMarketId: destinationMarket.id,
      destinationMarketName: destinationMarket.name,
      productionPrice: quote.currentPrice,
      destinationPrice,
      spreadAmount,
      spreadRate,
      productionGrowthRate: quote.growthRate,
      signal: spreadRate >= 20 ? "strong" as const : spreadRate >= 8 ? "watch" as const : "weak" as const,
      updatedAt: dashboard.summary.syncAt,
    };
  });

  return {
    summary: {
      sourceName: "示例数据源",
      sourceUrl: "待接入官方行情接口",
      productionMarket,
      destinationMarket,
      syncAt: dashboard.summary.syncAt,
      quoteCount: spreads.length,
      averageSpread: Number((spreads.reduce((sum, item) => sum + item.spreadAmount, 0) / spreads.length).toFixed(2)),
      positiveSpreadCount: spreads.filter((item) => item.spreadAmount > 0).length,
      strongestVegetableName: spreads[0]?.name ?? "--",
      staleAtMinutes: 5,
      note: "示例产销价差，用于本地界面调试。",
    },
    spreads,
    featuredSpreadHistory: dashboard.featuredHistory.slice(0, 4).map((item, index) => ({
      vegetableId: item.vegetableId,
      name: item.name,
      points: item.points.map((point) => {
        const productionPrice = point.price;
        const destinationPrice = Number((productionPrice * (1.08 + index * 0.03)).toFixed(2));
        const spreadAmount = Number((destinationPrice - productionPrice).toFixed(2));
        const spreadRate = Number(((spreadAmount / productionPrice) * 100).toFixed(2));

        return {
          date: point.date,
          productionPrice,
          destinationPrice,
          spreadAmount,
          spreadRate,
        };
      }),
    })),
  };
}
