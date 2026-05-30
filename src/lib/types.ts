export type MarketKind = "production" | "destination" | "benchmark";

export type Market = {
  id: string;
  name: string;
  region: string;
  note: string;
  updatedAt: string;
  kind?: MarketKind;
  group?: string;
};

export type VegetableQuote = {
  id: string;
  name: string;
  category: string;
  unit: string;
  marketId: string;
  currentPrice: number;
  yesterdayPrice: number;
  growthAmount: number;
  growthRate: number;
  history7dAvg: number;
  history30dAvg: number;
  updatedAt: string;
};

export type PricePoint = {
  date: string;
  price: number;
  growthRate: number;
};

export type DashboardSummary = {
  sourceName: string;
  sourceUrl: string;
  market: Market;
  currentAvgPrice: number;
  highestPrice: number;
  lowestPrice: number;
  risingCount: number;
  fallingCount: number;
  syncAt: string;
  staleAtMinutes: number;
};

export type DashboardPayload = {
  summary: DashboardSummary;
  quotes: VegetableQuote[];
  featuredHistory: Array<{
    vegetableId: string;
    name: string;
    points: PricePoint[];
  }>;
};

export type SpreadSignal = "strong" | "watch" | "weak";

export type SpreadQuote = {
  id: string;
  name: string;
  category: string;
  unit: string;
  productionMarketId: string;
  productionMarketName: string;
  destinationMarketId: string;
  destinationMarketName: string;
  productionPrice: number;
  destinationPrice: number;
  spreadAmount: number;
  spreadRate: number;
  productionGrowthRate: number;
  signal: SpreadSignal;
  updatedAt: string;
};

export type SpreadPoint = {
  date: string;
  productionPrice: number;
  destinationPrice: number;
  spreadAmount: number;
  spreadRate: number;
};

export type RouteDashboardPayload = {
  summary: {
    sourceName: string;
    sourceUrl: string;
    productionMarket: Market;
    destinationMarket: Market;
    syncAt: string;
    quoteCount: number;
    averageSpread: number;
    positiveSpreadCount: number;
    strongestVegetableName: string;
    staleAtMinutes: number;
    note: string;
  };
  spreads: SpreadQuote[];
  featuredSpreadHistory: Array<{
    vegetableId: string;
    name: string;
    points: SpreadPoint[];
  }>;
};
