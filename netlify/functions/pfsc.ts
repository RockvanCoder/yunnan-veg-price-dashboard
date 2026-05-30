import crypto from "node:crypto";

export const PFSC_BASE = "https://pfsc.agri.cn";
export const PFSC_AES_KEY = Buffer.from(
  process.env.PFSC_AES_KEY || "7s9K$pG2xQ8zR5mB7vA3sD9fH2jW40cV",
  "utf8",
);
export const YUNNAN_PROVINCE_CODE = "530000";

const YUNNAN_MARKET_FALLBACK = {
  id: "76E4F160C162936CE040A8C020017257",
  name: "云南昆明呈贡龙城农产品经营股份有限公司",
  code: "530100",
  provinceCode: YUNNAN_PROVINCE_CODE,
  provinceName: "云南省",
};

export const DEFAULT_VEGETABLE_NAMES = [
  "西红柿",
  "黄瓜",
  "青椒",
  "大白菜",
  "生菜",
  "白萝卜",
  "莴笋",
  "西葫芦",
  "茄子",
  "大葱",
  "菠菜",
  "小白菜",
  "豆角",
];

export const DEFAULT_VEGETABLE_CATALOG = [
  { id: "135", name: "西红柿", category: "瓜果类", unit: "元/公斤", code: "AE04001" },
  { id: "139", name: "黄瓜", category: "瓜果类", unit: "元/公斤", code: "AE04005" },
  { id: "137", name: "青椒", category: "瓜果类", unit: "元/公斤", code: "AE04003" },
  { id: "77", name: "大白菜", category: "叶菜类", unit: "元/公斤", code: "AE01001" },
  { id: "81", name: "生菜", category: "叶菜类", unit: "元/公斤", code: "AE01005" },
  { id: "1234", name: "白萝卜", category: "根和根茎类", unit: "元/公斤", code: "AE02001002" },
  { id: "110", name: "莴笋", category: "根和根茎类", unit: "元/公斤", code: "AE02012" },
  { id: "140", name: "西葫芦", category: "瓜果类", unit: "元/公斤", code: "AE04006" },
  { id: "138", name: "茄子", category: "瓜果类", unit: "元/公斤", code: "AE04004" },
  { id: "105", name: "大葱", category: "根和根茎类", unit: "元/公斤", code: "AE02007" },
  { id: "82", name: "菠菜", category: "叶菜类", unit: "元/公斤", code: "AE01006" },
  { id: "80", name: "小白菜", category: "叶菜类", unit: "元/公斤", code: "AE01004" },
  { id: "150", name: "豆角", category: "瓜果类", unit: "元/公斤", code: "AE04016" },
] satisfies VegetableCatalogItem[];

type PfscTreeNode = {
  id?: string;
  code?: string;
  label?: string;
  value?: string;
  hasChildren?: boolean;
  children?: PfscTreeNode[];
  attributelist?: Array<{
    id: string;
    varietyName: string;
    varietyCode: string;
    meteringUnit?: string;
  }>;
};

type PfscChartResponse = {
  date: string;
  x: string[];
  y: number[];
};

type PfscGrowthRanking = {
  date: string[];
  codes: string[];
  unit: string;
  names: string[];
  avgPrice: string[];
  priceHbs: string[];
  lastAvgPrice: string[];
  difAvgPrice: string[];
  meteringUnit: string[];
};

const EMPTY_GROWTH_RANKING: PfscGrowthRanking = {
  date: [],
  codes: [],
  unit: "%",
  names: [],
  avgPrice: [],
  priceHbs: [],
  lastAvgPrice: [],
  difAvgPrice: [],
  meteringUnit: [],
};

type PfscMarket = {
  id: string;
  name: string;
  code: string;
  provinceCode: string;
  provinceName: string;
};

type VegetableCatalogItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  code: string;
};

let marketsPromise: Promise<PfscMarket[]> | null = null;
let catalogPromise: Promise<VegetableCatalogItem[]> | null = null;
let growthPromise: Promise<PfscGrowthRanking> | null = null;

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${PFSC_BASE}${path}`, {
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`pfsc_http_${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function decryptPfscPayload(ciphertext: string) {
  const iv = Buffer.from(ciphertext.slice(0, 16), "utf8");
  const content = ciphertext.slice(16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", PFSC_AES_KEY, iv);
  decipher.setAutoPadding(true);
  return Buffer.concat([decipher.update(content, "base64"), decipher.final()]).toString("utf8");
}

async function fetchTree(path: string): Promise<PfscTreeNode> {
  const payload = await requestJson<{ code: number; content: Array<{ content: PfscTreeNode }> }>(path, {
    method: "GET",
  });

  if (payload.code !== 200) {
    throw new Error(`pfsc_tree_${path}_${payload.code}`);
  }

  return payload.content[0].content;
}

function findProvinceNode(root: PfscTreeNode, provinceCode: string): PfscTreeNode | null {
  if (root.code === provinceCode || root.id === provinceCode) {
    return root;
  }

  for (const child of root.children ?? []) {
    const found = findProvinceNode(child, provinceCode);
    if (found) return found;
  }

  return null;
}

function collectVegetableItems(root: PfscTreeNode): VegetableCatalogItem[] {
  const selected = new Map<string, VegetableCatalogItem>();

  const visit = (node: PfscTreeNode) => {
    if (node.attributelist?.length) {
      for (const item of node.attributelist) {
        const matchName = DEFAULT_VEGETABLE_NAMES.find(
          (candidate) => item.varietyName === candidate || item.varietyName.includes(candidate)
        );

        if (!matchName || selected.has(matchName)) continue;

        selected.set(matchName, {
          id: item.id,
          name: item.varietyName,
          category: node.label ?? node.value ?? "蔬菜",
          unit: item.meteringUnit ?? "元/公斤",
          code: item.varietyCode,
        });
      }
    }

    for (const child of node.children ?? []) {
      visit(child);
    }
  };

  visit(root);

  return DEFAULT_VEGETABLE_NAMES.map((name) => selected.get(name)).filter((item): item is VegetableCatalogItem => Boolean(item));
}

export async function fetchYunnanMarkets(): Promise<PfscMarket[]> {
  if (!marketsPromise) {
    marketsPromise = (async () => {
      try {
        const tree = await fetchTree("/price_portal/sys-user-relation/getTreeByProvinceName");
        const province = findProvinceNode(tree, YUNNAN_PROVINCE_CODE);

        if (!province?.children?.length) {
          return [YUNNAN_MARKET_FALLBACK];
        }

        return province.children.map((child) => ({
          id: child.id ?? child.code ?? child.value ?? child.label ?? "",
          name: child.label ?? child.value ?? "云南市场",
          code: child.code ?? province.code ?? YUNNAN_PROVINCE_CODE,
          provinceCode: province.code ?? YUNNAN_PROVINCE_CODE,
          provinceName: province.label ?? province.value ?? "云南省",
        }));
      } catch (error) {
        marketsPromise = null;
        return [YUNNAN_MARKET_FALLBACK];
      }
    })();
  }

  return marketsPromise;
}

export async function fetchVegetableCatalog(): Promise<VegetableCatalogItem[]> {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      try {
        const tree = await fetchTree("/price_portal/sys-user-relation/getVarietiesTree");
        return collectVegetableItems(tree);
      } catch (error) {
        catalogPromise = null;
        return DEFAULT_VEGETABLE_CATALOG;
      }
    })();
  }

  return catalogPromise;
}

export async function fetchGrowthRanking(): Promise<PfscGrowthRanking> {
  if (!growthPromise) {
    growthPromise = (async () => {
      try {
        const payload = await requestJson<{ code: number; data: PfscGrowthRanking }>("/price_portal/index/growthRanking", {
          method: "POST",
          body: "{}",
        });

        if (payload.code !== 0 && payload.code !== 200) {
          throw new Error(`pfsc_growth_${payload.code}`);
        }

        return payload.data;
      } catch (error) {
        growthPromise = null;
        return EMPTY_GROWTH_RANKING;
      }
    })();
  }

  return growthPromise;
}

export async function fetchCurrentPriceQuote(input: {
  marketId: string;
  provinceCode: string;
  varietyId: string;
}) {
  const query = new URLSearchParams({
    marketIDs: input.marketId,
    provinceCodes: input.provinceCode,
    varietyID: input.varietyId,
  });

  const payload = await requestJson<{ code: number; data: string }>(
    `/price_portal/index/getMarketReportPriceChart?${query.toString()}`,
    { method: "POST", body: "{}" }
  );

  if (payload.code !== 0 && payload.code !== 200) {
    throw new Error(`pfsc_chart_${payload.code}`);
  }

  return JSON.parse(decryptPfscPayload(payload.data)) as PfscChartResponse;
}

export function getYunnanFallbackMarket() {
  return YUNNAN_MARKET_FALLBACK;
}

export type { PfscChartResponse, PfscGrowthRanking, PfscMarket, VegetableCatalogItem };
