export type Market = {
  id: string;
  name: string;
  region: string;
  note: string;
  updatedAt: string;
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
