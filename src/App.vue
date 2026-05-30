<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { EChartsOption } from "echarts";
import BaseChart from "./components/BaseChart.vue";
import { fetchDashboard, fetchHistory, fetchMarkets, fetchRouteDashboard } from "./lib/api";
import type { DashboardPayload, Market, RouteDashboardPayload } from "./lib/types";

const markets = ref<Market[]>([]);
const activeMarketId = ref("76E4F160C162936CE040A8C020017257");
const rangeDays = ref(7);
const loading = ref(true);
const refreshing = ref(false);
const useMockNotice = ref(false);
const dashboard = ref<DashboardPayload | null>(null);
const routeDashboard = ref<RouteDashboardPayload | null>(null);
const selectedVegetableId = ref("135");
const historyPoints = ref<Array<{ date: string; price: number; growthRate: number }>>([]);
const sourceError = ref("");
const lastUpdated = ref("");
let refreshTimer: number | undefined;

const activeMarket = computed(() => markets.value.find((item) => item.id === activeMarketId.value) ?? markets.value[0]);
const quotes = computed(() => dashboard.value?.quotes ?? []);
const spreadRows = computed(() => routeDashboard.value?.spreads ?? []);
const selectedQuote = computed(() => quotes.value.find((item) => item.id === selectedVegetableId.value) ?? quotes.value[0]);
const selectedSpread = computed(() => spreadRows.value.find((item) => item.id === selectedVegetableId.value) ?? spreadRows.value[0]);
const topGainers = computed(() => [...quotes.value].sort((a, b) => b.growthRate - a.growthRate).slice(0, 4));
const topLosers = computed(() => [...quotes.value].sort((a, b) => a.growthRate - b.growthRate).slice(0, 4));
const spreadHistoryPoints = computed(() => {
  const found = routeDashboard.value?.featuredSpreadHistory.find((item) => item.vegetableId === selectedVegetableId.value);
  if (found?.points.length) return found.points;
  if (!selectedSpread.value) return [];

  return [
    {
      date: lastUpdated.value.slice(5, 10) || "--",
      productionPrice: selectedSpread.value.productionPrice,
      destinationPrice: selectedSpread.value.destinationPrice,
      spreadAmount: selectedSpread.value.spreadAmount,
      spreadRate: selectedSpread.value.spreadRate,
    },
  ];
});
const historyHint = computed(() => {
  if (!dashboard.value) return "";
  if (historyPoints.value.length > 1) return "";
  return "历史数据从今天开始累积，明天起可直接对比涨幅。";
});

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

function signalLabel(signal?: string) {
  if (signal === "strong") return "重点关注";
  if (signal === "watch") return "继续观察";
  return "空间有限";
}

async function resolveHistoryPoints(vegetableId: string) {
  const points = await fetchHistory(vegetableId, activeMarketId.value, rangeDays.value);
  if (points.length) return points;
  return dashboard.value?.featuredHistory.find((item) => item.vegetableId === vegetableId)?.points ?? [];
}

async function loadDashboard() {
  loading.value = true;
  sourceError.value = "";
  try {
    if (!markets.value.length) {
      markets.value = await fetchMarkets();
      if (!markets.value.some((item) => item.id === activeMarketId.value) && markets.value[0]) {
        activeMarketId.value = markets.value[0].id;
      }
    }

    const [payload, routePayload] = await Promise.all([
      fetchDashboard(activeMarketId.value, rangeDays.value),
      fetchRouteDashboard(activeMarketId.value, rangeDays.value),
    ]);
    dashboard.value = payload;
    routeDashboard.value = routePayload;
    selectedVegetableId.value = routePayload.spreads[0]?.id ?? payload.quotes[0]?.id ?? selectedVegetableId.value;
    useMockNotice.value = payload.summary.sourceName.includes("示例") || routePayload.summary.sourceName.includes("示例");
    lastUpdated.value = payload.summary.syncAt;
    if (selectedVegetableId.value) {
      historyPoints.value = await resolveHistoryPoints(selectedVegetableId.value);
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
  historyPoints.value = await resolveHistoryPoints(id);
}

watch([activeMarketId, rangeDays], () => {
  void loadDashboard();
});

watch(selectedVegetableId, () => {
  void selectVegetable(selectedVegetableId.value);
});

onMounted(() => {
  void loadDashboard();
  refreshTimer = window.setInterval(() => {
    void refreshNow();
  }, 5 * 60 * 1000);
});

onBeforeUnmount(() => {
  if (refreshTimer) window.clearInterval(refreshTimer);
});

const spreadChartOption = computed<EChartsOption>(() => ({
  grid: { left: 46, right: 18, top: 32, bottom: 34 },
  tooltip: { trigger: "axis" },
  legend: { top: 0, textStyle: { color: "#475569" } },
  xAxis: {
    type: "category" as const,
    data: spreadHistoryPoints.value.map((point) => point.date),
    axisLabel: { color: "#64748b" },
    axisLine: { lineStyle: { color: "#d9e2ec" } },
  },
  yAxis: {
    type: "value",
    axisLabel: { color: "#64748b" },
    splitLine: { lineStyle: { color: "#edf2f7" } },
  },
  series: [
    {
      name: "产区价",
      data: spreadHistoryPoints.value.map((point) => point.productionPrice),
      type: "line" as const,
      smooth: true,
      symbolSize: 7,
    },
    {
      name: "销区参考价",
      data: spreadHistoryPoints.value.map((point) => point.destinationPrice),
      type: "line" as const,
      smooth: true,
      symbolSize: 7,
    },
    {
      name: "价差",
      data: spreadHistoryPoints.value.map((point) => point.spreadAmount),
      type: "bar" as const,
      barWidth: "36%",
    },
  ],
  color: ["#166534", "#2563eb", "#dc2626"],
}));

const priceChartOption = computed<EChartsOption>(() => ({
  grid: { left: 46, right: 18, top: 26, bottom: 34 },
  tooltip: { trigger: "axis" },
  xAxis: {
    type: "category" as const,
    boundaryGap: false,
    data: historyPoints.value.map((point) => point.date),
    axisLabel: { color: "#64748b" },
    axisLine: { lineStyle: { color: "#d9e2ec" } },
  },
  yAxis: {
    type: "value",
    axisLabel: { color: "#64748b" },
    splitLine: { lineStyle: { color: "#edf2f7" } },
  },
  series: [
    {
      data: historyPoints.value.map((point) => point.price),
      type: "line" as const,
      smooth: true,
      symbolSize: 8,
      lineStyle: { width: 3, color: "#166534" },
      itemStyle: { color: "#166534" },
      areaStyle: { color: "rgba(22, 101, 52, 0.12)" },
      markPoint: {
        data: historyPoints.value.length
          ? [
              { type: "max", name: "最高" },
              { type: "min", name: "最低" },
            ]
          : [],
      },
    },
  ],
  color: ["#166534"],
}));

const growthChartOption = computed<EChartsOption>(() => ({
  grid: { left: 46, right: 18, top: 26, bottom: 34 },
  tooltip: { trigger: "axis" },
  xAxis: {
    type: "category" as const,
    data: historyPoints.value.map((point) => point.date),
    axisLabel: { color: "#64748b" },
    axisLine: { lineStyle: { color: "#d9e2ec" } },
  },
  yAxis: {
    type: "value",
    axisLabel: { color: "#64748b", formatter: "{value}%" },
    splitLine: { lineStyle: { color: "#edf2f7" } },
  },
  series: [
    {
      data: historyPoints.value.map((point) => ({
        value: point.growthRate,
        itemStyle: { color: point.growthRate >= 0 ? "#dc2626" : "#16a34a" },
      })),
      type: "bar" as const,
      barWidth: "52%",
    },
  ],
  color: ["#dc2626"],
}));
</script>

<template>
  <div class="app-shell">
    <header class="hero">
      <div class="hero-copy">
        <div class="eyebrow">产销价格决策台</div>
        <h1>云南蔬菜产区价与销区参考价</h1>
        <p>
          以云南产区批发价为核心，对照官方全国销区参考均价，跟踪每日价差、涨幅和出货关注品种。
        </p>
        <div class="hero-meta">
          <span>产区：{{ routeDashboard?.summary.productionMarket.name ?? activeMarket?.name ?? "--" }}</span>
          <span>销区：{{ routeDashboard?.summary.destinationMarket.name ?? "--" }}</span>
          <span>同步：{{ lastUpdated || "--" }}</span>
        </div>
      </div>

      <div class="hero-panel">
        <div class="hero-actions">
          <select v-model="activeMarketId" class="control">
            <option v-for="item in markets" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
          <select v-model.number="rangeDays" class="control">
            <option :value="7">近 7 天</option>
            <option :value="30">近 30 天</option>
            <option :value="90">近 90 天</option>
          </select>
          <button class="primary-btn" :disabled="refreshing" @click="refreshNow">
            {{ refreshing ? "刷新中..." : "立即刷新" }}
          </button>
        </div>

        <div class="source-status" :class="{ warning: useMockNotice }">
          <span class="dot"></span>
          <span v-if="useMockNotice">当前为示例或备用数据，适合调试界面</span>
          <span v-else>已连接官方数据源，并持续写入每日历史</span>
        </div>
      </div>
    </header>

    <section class="stats-grid">
      <article class="stat-card">
        <span>产区均价</span>
        <strong>{{ dashboard ? money(dashboard.summary.currentAvgPrice) : "--" }}</strong>
        <small>云南产区市场样本均值</small>
      </article>
      <article class="stat-card">
        <span>平均价差</span>
        <strong>{{ routeDashboard ? money(routeDashboard.summary.averageSpread) : "--" }}</strong>
        <small>销区参考价 - 产区价</small>
      </article>
      <article class="stat-card">
        <span>正价差品种</span>
        <strong v-if="routeDashboard">{{ routeDashboard.summary.positiveSpreadCount }} / {{ routeDashboard.summary.quoteCount }}</strong>
        <strong v-else>--</strong>
        <small>有价差空间的品种数量</small>
      </article>
      <article class="stat-card">
        <span>当前最强品种</span>
        <strong>{{ routeDashboard?.summary.strongestVegetableName ?? "--" }}</strong>
        <small>按价差金额排序</small>
      </article>
    </section>

    <section class="content-grid">
      <main class="main-column">
        <section class="panel panel-hero">
          <div class="panel-header">
            <div>
              <h2>产销价差趋势</h2>
              <p>对比选中菜品的产区价、销区参考价和每日价差。</p>
            </div>
            <div class="panel-chip">{{ selectedSpread?.name ?? "未选择" }}</div>
          </div>
          <BaseChart :option="spreadChartOption" :loading="loading" height="340px" />
        </section>

        <section class="panel panel-hero">
          <div class="panel-header">
            <div>
              <h2>产区菜价趋势</h2>
              <p>选中菜品在产区市场的历史价格变化。</p>
            </div>
            <div class="panel-chip">{{ selectedQuote?.name ?? "未选择" }}</div>
          </div>
          <p v-if="historyHint" class="panel-hint">{{ historyHint }}</p>
          <BaseChart :option="priceChartOption" :loading="loading" height="320px" />
        </section>

        <section class="panel panel-hero">
          <div class="panel-header">
            <div>
              <h2>每日涨幅</h2>
              <p>产区价格日度变动，正涨幅使用红色，回落使用绿色。</p>
            </div>
          </div>
          <BaseChart :option="growthChartOption" :loading="loading" height="300px" />
        </section>
      </main>

      <aside class="side-column">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>产销价差排行</h2>
              <p>{{ routeDashboard?.summary.note ?? "根据价差快速筛选可关注品种。" }}</p>
            </div>
          </div>

          <div v-if="sourceError" class="error-box">{{ sourceError }}</div>

          <div class="quote-list">
            <button
              v-for="item in spreadRows"
              :key="item.id"
              class="quote-row spread-row"
              :class="{ active: item.id === selectedVegetableId }"
              @click="selectVegetable(item.id)"
            >
              <div class="quote-main">
                <strong>{{ item.name }}</strong>
                <span>{{ item.category }} · {{ signalLabel(item.signal) }}</span>
              </div>
              <div class="spread-metrics">
                <span>产 {{ money(item.productionPrice) }}</span>
                <span>销 {{ money(item.destinationPrice) }}</span>
                <b :style="{ color: colorForRate(item.spreadAmount) }">{{ money(item.spreadAmount) }}</b>
                <small :style="{ color: colorForRate(item.spreadRate) }">{{ signedRate(item.spreadRate) }}</small>
              </div>
            </button>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>产区涨跌</h2>
              <p>结合产区涨幅判断短期行情热度。</p>
            </div>
          </div>

          <div class="rank-block">
            <div class="rank-section">
              <h3>涨幅最高</h3>
              <div v-for="item in topGainers" :key="item.id" class="rank-item">
                <span>{{ item.name }}</span>
                <strong class="up">{{ signedRate(item.growthRate) }}</strong>
              </div>
            </div>
            <div class="rank-section">
              <h3>回落明显</h3>
              <div v-for="item in topLosers" :key="item.id" class="rank-item">
                <span>{{ item.name }}</span>
                <strong class="down">{{ signedRate(item.growthRate) }}</strong>
              </div>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>数据状态</h2>
              <p>当前阶段销区价格使用官方全国平均批发价作为参考。</p>
            </div>
          </div>
          <div class="info-list">
            <div>
              <span>数据源名称</span>
              <strong>{{ dashboard?.summary.sourceName ?? "--" }}</strong>
            </div>
            <div>
              <span>产区市场</span>
              <strong>{{ routeDashboard?.summary.productionMarket.name ?? "--" }}</strong>
            </div>
            <div>
              <span>销区参考</span>
              <strong>{{ routeDashboard?.summary.destinationMarket.name ?? "--" }}</strong>
            </div>
            <div>
              <span>缓存时效</span>
              <strong>{{ dashboard?.summary.staleAtMinutes ?? "--" }} 分钟</strong>
            </div>
          </div>
        </section>
      </aside>
    </section>
  </div>
</template>
