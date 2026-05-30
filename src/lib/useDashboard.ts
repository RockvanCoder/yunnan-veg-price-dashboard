import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { fetchDashboard, fetchHistory, fetchMarkets } from "./api";
import type { DashboardPayload, Market, PricePoint, VegetableQuote } from "./types";

const STORAGE_KEY_MARKET = "veg_marketId";
const STORAGE_KEY_VEGETABLE = "veg_vegetableId";
const STORAGE_KEY_DAYS = "veg_rangeDays";
const STORAGE_KEY_THEME = "veg_theme";
const STORAGE_KEY_FONT = "veg_largeFont";
const STORAGE_KEY_FARMGATE = "veg_farmGateRatio";

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silently ignore
  }
}

export type ThemeMode = "system" | "light" | "dark";

export function useDashboard() {
  const markets = ref<Market[]>([]);
  const activeMarketId = ref(loadStorage(STORAGE_KEY_MARKET, "76E4F160C162936CE040A8C020017257"));
  const rangeDays = ref(loadStorage(STORAGE_KEY_DAYS, 7));
  const loading = ref(true);
  const refreshing = ref(false);
  const useMockNotice = ref(false);
  const dashboard = ref<DashboardPayload | null>(null);
  const selectedVegetableId = ref(loadStorage(STORAGE_KEY_VEGETABLE, "135"));
  const historyPoints = ref<Array<{ date: string; price: number; growthRate: number }>>([]);
  const sourceError = ref("");
  const lastUpdated = ref("");
  const themeMode = ref<ThemeMode>(loadStorage(STORAGE_KEY_THEME, "system"));
  const largeFont = ref(loadStorage(STORAGE_KEY_FONT, false));
  const farmGateRatio = ref(loadStorage(STORAGE_KEY_FARMGATE, 0.7));
  const staleMinutes = ref(0);
  let refreshTimer: number | undefined;
  let staleTimer: number | undefined;

  // ── search / filter ──

  const vegetableSearch = ref("");
  const selectedCategory = ref("全部");

  const categories = computed(() => {
    const set = new Set<string>();
    for (const q of quotes.value) {
      if (q.category) set.add(q.category);
    }
    return ["全部", ...Array.from(set).sort()];
  });

  // ── derived ──

  const activeMarket = computed(
    () => markets.value.find((item) => item.id === activeMarketId.value) ?? markets.value[0],
  );
  const quotes = computed(() => dashboard.value?.quotes ?? []);
  const selectedQuote = computed(
    () => quotes.value.find((item) => item.id === selectedVegetableId.value) ?? quotes.value[0],
  );

  const filteredQuotes = computed(() => {
    let list = quotes.value;
    if (selectedCategory.value !== "全部") {
      list = list.filter((q) => q.category === selectedCategory.value);
    }
    if (vegetableSearch.value.trim()) {
      const kw = vegetableSearch.value.trim().toLowerCase();
      list = list.filter((q) => q.name.toLowerCase().includes(kw));
    }
    return list;
  });

  const topGainers = computed(() =>
    [...quotes.value].sort((a, b) => b.growthRate - a.growthRate),
  );
  const topLosers = computed(() =>
    [...quotes.value].sort((a, b) => a.growthRate - b.growthRate),
  );

  // ── price alerts ──

  const alerts = computed(() => {
    const result: Array<{ vegetableId: string; name: string; rate: number; type: "surge" | "plunge" }> = [];
    for (const q of quotes.value) {
      if (q.growthRate >= 15) {
        result.push({ vegetableId: q.id, name: q.name, rate: q.growthRate, type: "surge" });
      } else if (q.growthRate <= -10) {
        result.push({ vegetableId: q.id, name: q.name, rate: q.growthRate, type: "plunge" });
      }
    }
    return result;
  });

  // ── helpers ──

  function money(value: number) {
    return `¥${value.toFixed(2)}`;
  }

  function signedRate(value: number) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  }

  function colorForRate(value: number) {
    if (value > 0) return "var(--red)";
    if (value < 0) return "var(--green)";
    return "var(--muted)";
  }

  // ── 田头价估算 ──

  function farmGatePrice(wholesalePrice: number): number {
    return Number((wholesalePrice * farmGateRatio.value).toFixed(2));
  }

  function setFarmGateRatio(ratio: number) {
    farmGateRatio.value = ratio;
    saveStorage(STORAGE_KEY_FARMGATE, ratio);
  }

  const farmGateAvg = computed(() => {
    if (!quotes.value.length) return 0;
    return farmGatePrice(quotes.value.reduce((s, q) => s + q.currentPrice, 0) / quotes.value.length);
  });

  const farmGateHigh = computed(() => {
    if (!quotes.value.length) return 0;
    return farmGatePrice(Math.max(...quotes.value.map((q) => q.currentPrice)));
  });

  const farmGateLow = computed(() => {
    if (!quotes.value.length) return 0;
    return farmGatePrice(Math.min(...quotes.value.map((q) => q.currentPrice)));
  });

  // ── data loading ──

  let requestId = 0;
  let loadPromise: Promise<void> | null = null; // 请求去重

  async function loadDashboard() {
    loading.value = true;
    sourceError.value = "";
    const thisRequest = ++requestId; // 竞态保护

    try {
      if (!markets.value.length) {
        markets.value = await fetchMarkets();
        if (
          !markets.value.some((item) => item.id === activeMarketId.value) &&
          markets.value[0]
        ) {
          activeMarketId.value = markets.value[0].id;
        }
      }
      const payload = await fetchDashboard(activeMarketId.value, rangeDays.value);
      // 如果在这期间发起了更新的请求，丢弃本结果
      if (thisRequest !== requestId) return;
      dashboard.value = payload;
      selectedVegetableId.value = payload.quotes[0]?.id ?? selectedVegetableId.value;
      useMockNotice.value = payload.summary.sourceName.includes("示例");
      lastUpdated.value = payload.summary.syncAt;
      if (selectedVegetableId.value) {
        historyPoints.value = await fetchHistory(
          selectedVegetableId.value,
          activeMarketId.value,
          rangeDays.value,
        );
      }
    } catch (error) {
      sourceError.value = error instanceof Error ? error.message : "加载失败";
    } finally {
      loading.value = false;
    }
  }

  async function refreshNow() {
    refreshing.value = true;
    try {
      await loadDashboard();
    } finally {
      refreshing.value = false;
    }
  }

  async function selectVegetable(id: string) {
    selectedVegetableId.value = id;
    saveStorage(STORAGE_KEY_VEGETABLE, id);
    historyPoints.value = await fetchHistory(id, activeMarketId.value, rangeDays.value);
  }

  // ── TTS ──

  function speakQuote(quote: VegetableQuote) {
    if (!window.speechSynthesis) return;
    // Cancel any ongoing speech first
    window.speechSynthesis.cancel();
    const direction = quote.growthRate >= 0 ? "上涨" : "下跌";
    const text = `${quote.name}，当前价格 ${quote.currentPrice} 元每${quote.unit.replace("元/", "")}，较昨日${direction} ${Math.abs(quote.growthRate).toFixed(1)}%`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  // ── theme ──

  function applyTheme(mode: ThemeMode) {
    themeMode.value = mode;
    saveStorage(STORAGE_KEY_THEME, mode);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = mode === "dark" || (mode === "system" && prefersDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }

  // ── font size ──

  function applyFont(large: boolean) {
    largeFont.value = large;
    saveStorage(STORAGE_KEY_FONT, large);
    document.documentElement.setAttribute("data-font", large ? "large" : "normal");
  }

  // ── lifecycle ──

  watch(
    [activeMarketId, rangeDays],
    ([mid, days]) => {
      saveStorage(STORAGE_KEY_MARKET, mid);
      saveStorage(STORAGE_KEY_DAYS, days);
      void loadDashboard();
    },
  );

  watch(selectedVegetableId, (id) => {
    void selectVegetable(id);
  });

  // 计算数据新鲜度（距离上次同步的分钟数）
  function tickStaleness() {
    if (lastUpdated.value) {
      const synced = new Date(lastUpdated.value).getTime();
      if (!Number.isNaN(synced)) {
        staleMinutes.value = Math.max(0, Math.floor((Date.now() - synced) / 60000));
      }
    }
  }

  onMounted(() => {
    applyTheme(themeMode.value);
    applyFont(largeFont.value);
    void loadDashboard();
    refreshTimer = window.setInterval(() => {
      void refreshNow();
    }, 5 * 60 * 1000);
    // 每分钟检查一次数据新鲜度
    staleTimer = window.setInterval(tickStaleness, 60 * 1000);
    tickStaleness();
  });

  onBeforeUnmount(() => {
    if (refreshTimer) window.clearInterval(refreshTimer);
    if (staleTimer) window.clearInterval(staleTimer);
  });

  return {
    // state
    markets,
    activeMarketId,
    rangeDays,
    loading,
    refreshing,
    useMockNotice,
    dashboard,
    selectedVegetableId,
    historyPoints,
    sourceError,
    lastUpdated,
    themeMode,
    largeFont,
    farmGateRatio,
    staleMinutes,
    vegetableSearch,
    selectedCategory,
    // derived
    activeMarket,
    quotes,
    selectedQuote,
    filteredQuotes,
    categories,
    topGainers,
    topLosers,
    alerts,
    farmGateAvg,
    farmGateHigh,
    farmGateLow,
    // helpers
    money,
    signedRate,
    colorForRate,
    farmGatePrice,
    // actions
    loadDashboard,
    refreshNow,
    selectVegetable,
    speakQuote,
    applyTheme,
    applyFont,
    setFarmGateRatio,
  };
}
