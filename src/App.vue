<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { EChartsOption } from "echarts";
import BaseChart from "./components/BaseChart.vue";
import { fetchDashboard, fetchHistory, fetchMarkets } from "./lib/api";
import type { DashboardPayload, Market, VegetableQuote } from "./lib/types";

const markets = ref<Market[]>([]);
const activeMarketId = ref("76E4F160C162936CE040A8C020017257");
const rangeDays = ref(7);
const loading = ref(true);
const refreshing = ref(false);
const useMockNotice = ref(false);
const dashboard = ref<DashboardPayload | null>(null);
const selectedVegetableId = ref("135");
const historyPoints = ref<Array<{ date: string; price: number; growthRate: number }>>([]);
const sourceError = ref("");
const lastUpdated = ref("");
let refreshTimer: number | undefined;

const activeMarket = computed(() => markets.value.find((item) => item.id === activeMarketId.value) ?? markets.value[0]);
const quotes = computed(() => dashboard.value?.quotes ?? []);
const selectedQuote = computed(() => quotes.value.find((item) => item.id === selectedVegetableId.value) ?? quotes.value[0]);
const topGainers = computed(() => [...quotes.value].sort((a, b) => b.growthRate - a.growthRate).slice(0, 4));
const topLosers = computed(() => [...quotes.value].sort((a, b) => a.growthRate - b.growthRate).slice(0, 4));
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
    const payload = await fetchDashboard(activeMarketId.value, rangeDays.value);
    dashboard.value = payload;
    selectedVegetableId.value = payload.quotes[0]?.id ?? selectedVegetableId.value;
    useMockNotice.value = payload.summary.sourceName.includes("示例");
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

const priceChartOption = computed<EChartsOption>(() => ({
  grid: { left: 40, right: 18, top: 26, bottom: 30 },
  tooltip: { trigger: "axis" },
  xAxis: {
    type: "category" as const,
    boundaryGap: false,
    data: historyPoints.value.map((point) => point.date),
    axisLabel: { color: "#9ca3af" },
    axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
  },
  yAxis: {
    type: "value",
    axisLabel: { color: "#9ca3af" },
    splitLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
  },
  series: [
    {
      data: historyPoints.value.map((point) => point.price),
      type: "line" as const,
      smooth: true,
      symbolSize: 8,
      lineStyle: { width: 4, color: "#f59e0b" },
      itemStyle: { color: "#f59e0b" },
      areaStyle: { color: "rgba(245, 158, 11, 0.18)" },
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
  color: ["#f59e0b"],
}));

const growthChartOption = computed<EChartsOption>(() => ({
  grid: { left: 40, right: 18, top: 26, bottom: 30 },
  tooltip: { trigger: "axis" },
  xAxis: {
    type: "category" as const,
    data: historyPoints.value.map((point) => point.date),
    axisLabel: { color: "#9ca3af" },
    axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
  },
  yAxis: {
    type: "value",
    axisLabel: { color: "#9ca3af", formatter: "{value}%" },
    splitLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
  },
  series: [
    {
      data: historyPoints.value.map((point) => ({
        value: point.growthRate,
        itemStyle: { color: point.growthRate >= 0 ? "#ef4444" : "#22c55e" },
      })),
      type: "bar" as const,
      barWidth: "52%",
    },
  ],
  color: ["#ef4444"],
}));

const comparisonOption = computed<EChartsOption>(() => ({
  grid: { left: 40, right: 18, top: 26, bottom: 30 },
  tooltip: { trigger: "axis" },
  legend: {
    textStyle: { color: "#cbd5e1" },
    top: 0,
  },
  xAxis: {
    type: "category" as const,
    data: dashboard.value?.featuredHistory[0]?.points.map((point) => point.date) ?? [],
    axisLabel: { color: "#9ca3af" },
    axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
  },
  yAxis: {
    type: "value",
    axisLabel: { color: "#9ca3af" },
    splitLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
  },
  series: (dashboard.value?.featuredHistory ?? []).slice(0, 4).map((item) => ({
    name: item.name,
    type: "line" as const,
    smooth: true,
    data: item.points.map((point) => point.price),
  })),
  color: ["#f59e0b", "#60a5fa", "#22c55e", "#f97316"],
}));
</script>

<template>
  <div class="app-shell">
    <div class="ambient ambient-a"></div>
    <div class="ambient ambient-b"></div>

    <header class="hero">
      <div class="hero-copy">
        <div class="eyebrow">云南菜价实时看板</div>
        <h1>给菜农看的价格观察台</h1>
        <p>
          面向种植户的蔬菜价格看板，聚焦云南市场，支持实时刷新、涨幅红色标注、历史趋势回看与单品对比。
        </p>
        <div class="hero-meta">
          <span>数据源：{{ dashboard?.summary.sourceName ?? "等待加载" }}</span>
          <span>同步：{{ lastUpdated || "--" }}</span>
          <span>市场：{{ activeMarket?.name ?? "--" }}</span>
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
          <span v-if="useMockNotice">当前为示例数据，正式接入后将显示真实接口数据</span>
          <span v-else>已连接数据源，页面将自动同步最新行情</span>
        </div>
      </div>
    </header>

    <section class="stats-grid">
      <article class="stat-card">
        <span>最新均价</span>
        <strong>{{ dashboard ? money(dashboard.summary.currentAvgPrice) : "--" }}</strong>
        <small>云南市场综合均值</small>
      </article>
      <article class="stat-card">
        <span>最高价</span>
        <strong>{{ dashboard ? money(dashboard.summary.highestPrice) : "--" }}</strong>
        <small>当前样本中最高单品价格</small>
      </article>
      <article class="stat-card">
        <span>最低价</span>
        <strong>{{ dashboard ? money(dashboard.summary.lowestPrice) : "--" }}</strong>
        <small>当前样本中最低单品价格</small>
      </article>
      <article class="stat-card">
        <span>上涨 / 下跌</span>
        <strong v-if="dashboard">{{ dashboard.summary.risingCount }} / {{ dashboard.summary.fallingCount }}</strong>
        <small>正涨幅红色高亮</small>
      </article>
    </section>

    <section class="content-grid">
      <main class="main-column">
        <section class="panel panel-hero">
          <div class="panel-header">
            <div>
              <h2>菜价趋势</h2>
              <p>选中菜品的历史价格变化，适合看成熟期是否值得出货。</p>
            </div>
            <div class="panel-chip">{{ selectedQuote?.name ?? "未选择" }}</div>
          </div>
          <p v-if="historyHint" class="panel-hint">{{ historyHint }}</p>
          <BaseChart :option="priceChartOption" :loading="loading" height="340px" />
        </section>

        <section class="panel panel-hero">
          <div class="panel-header">
            <div>
              <h2>每日涨幅</h2>
              <p>每天的价格变动单独展示，涨幅为正时使用红色，方便快速判断行情。</p>
            </div>
          </div>
          <BaseChart :option="growthChartOption" :loading="loading" height="300px" />
        </section>

        <section class="panel panel-hero">
          <div class="panel-header">
            <div>
              <h2>历史对比</h2>
              <p>同一张图里看多个菜品的价格曲线，便于观察不同作物的出货节奏。</p>
            </div>
          </div>
          <BaseChart :option="comparisonOption" :loading="loading" height="320px" />
        </section>
      </main>

      <aside class="side-column">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>菜品明细</h2>
              <p>点击菜品后，左侧图表会切换为该菜品历史走势。</p>
            </div>
          </div>

          <div v-if="sourceError" class="error-box">{{ sourceError }}</div>

          <div class="quote-list">
            <button
              v-for="item in quotes"
              :key="item.id"
              class="quote-row"
              :class="{ active: item.id === selectedVegetableId }"
              @click="selectVegetable(item.id)"
            >
              <div class="quote-main">
                <strong>{{ item.name }}</strong>
                <span>{{ item.category }} · {{ item.unit }}</span>
              </div>
              <div class="quote-metrics">
                <b :style="{ color: colorForRate(item.growthRate) }">{{ money(item.currentPrice) }}</b>
                <small :style="{ color: colorForRate(item.growthRate) }">{{ signedRate(item.growthRate) }}</small>
              </div>
            </button>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>涨幅排行</h2>
              <p>红色代表上涨，绿色代表回落。</p>
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
              <h3>涨幅最低</h3>
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
              <h2>来源说明</h2>
              <p>真实上线后会显示你配置的官方行情源和同步时间。</p>
            </div>
          </div>
          <div class="info-list">
            <div>
              <span>数据源名称</span>
              <strong>{{ dashboard?.summary.sourceName ?? "--" }}</strong>
            </div>
            <div>
              <span>数据源地址</span>
              <strong>{{ dashboard?.summary.sourceUrl ?? "--" }}</strong>
            </div>
            <div>
              <span>最后同步</span>
              <strong>{{ dashboard?.summary.syncAt ?? "--" }}</strong>
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
