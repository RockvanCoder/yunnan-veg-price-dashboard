<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useDashboard } from "./lib/useDashboard";
import PriceTrendChart from "./components/PriceTrendChart.vue";
import DailyGrowthChart from "./components/DailyGrowthChart.vue";
import ComparisonChart from "./components/ComparisonChart.vue";
import ThemeToggle from "./components/ThemeToggle.vue";
import ShareButton from "./components/ShareButton.vue";
import PriceAlertBanner from "./components/PriceAlertBanner.vue";
import RankingList from "./components/RankingList.vue";
import SkeletonLoader from "./components/SkeletonLoader.vue";
import ExportDialog from "./components/ExportDialog.vue";
import NetworkStatus from "./components/NetworkStatus.vue";

const {
  markets, activeMarketId, rangeDays, loading, refreshing, useMockNotice,
  dashboard, selectedVegetableId, historyPoints, sourceError, lastUpdated,
  themeMode, largeFont, farmGateRatio, staleMinutes, vegetableSearch, selectedCategory,
  activeMarket, quotes, selectedQuote, filteredQuotes, categories,
  topGainers, topLosers, alerts, farmGateAvg, farmGateHigh, farmGateLow,
  money, signedRate, colorForRate, farmGatePrice,
  loadDashboard, refreshNow, selectVegetable, speakQuote, applyTheme, applyFont, setFarmGateRatio,
} = useDashboard();

// ── ranking collapse ──
const rankingCollapsed = ref(false);

// ── speaking indicator ──
const currentlySpeaking = ref(false);

// ── export dialog ──
const showExport = ref(false);

function handleSpeak(quote: { id: string; name: string; currentPrice: number; growthRate: number; unit: string }) {
  currentlySpeaking.value = true;
  speakQuote(quote as Parameters<typeof speakQuote>[0]);
}

// ── print ──
function handlePrint() {
  window.print();
}

// ── keyboard shortcuts ──
function onKeydown(e: KeyboardEvent) {
  // 忽略文本框内的快捷键
  const tag = (e.target as HTMLElement).tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  switch (e.key.toLowerCase()) {
    case "r":
      e.preventDefault();
      void refreshNow();
      break;
    case "f":
      e.preventDefault();
      document.querySelector<HTMLInputElement>(".search-input")?.focus();
      break;
    case "e":
      e.preventDefault();
      showExport.value = true;
      break;
  }
}

onMounted(() => {
  if (window.speechSynthesis) {
    window.speechSynthesis.addEventListener("end", () => { currentlySpeaking.value = false; });
    window.speechSynthesis.addEventListener("error", () => { currentlySpeaking.value = false; });
  }
  window.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div class="app-shell">
    <NetworkStatus />
    <div class="ambient ambient-a"></div>
    <div class="ambient ambient-b"></div>

    <header class="hero">
      <div class="hero-copy">
        <div class="eyebrow">云南菜价通</div>
        <h1>菜农身边的行情助手</h1>
        <p>
          专注云南批发市场行情，红色涨幅高亮、蓝色估算产地价、一键语音播报，让种菜的看得懂价格、算得清账。
        </p>
        <div class="hero-meta">
          <span>📡 {{ dashboard?.summary.sourceName ?? "等待加载" }}</span>
          <span>⏱ 同步：{{ lastUpdated || "--" }}</span>
          <span>🏪 {{ activeMarket?.name ?? "--" }}</span>
        </div>
      </div>

      <div class="hero-panel">
        <div class="hero-toolbar">
          <ThemeToggle :mode="themeMode" @update="applyTheme" />
          <button
            class="font-toggle-btn"
            :class="{ active: largeFont }"
            :aria-label="largeFont ? '切换到标准字号' : '切换到大字号模式'"
            :aria-pressed="largeFont"
            @click="applyFont(!largeFont)"
          >
            <template v-if="largeFont">🔤 大字</template>
            <template v-else>🔤 标准</template>
          </button>
          <button class="export-toggle-btn" @click="showExport = true" aria-label="导出数据">
            📥 导出
          </button>
          <button class="print-btn" @click="handlePrint" aria-label="打印看板">
            🖨 打印
          </button>
          <ShareButton />
        </div>

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
            {{ refreshing ? "刷新中..." : "🔄 立即刷新" }}
          </button>
        </div>

        <!-- Price Alerts -->
        <PriceAlertBanner :alerts="alerts" @select="selectVegetable" />

        <div class="source-status" :class="{ warning: useMockNotice || staleMinutes > 15 }">
          <span class="dot" :class="{ stale: staleMinutes > 15 }"></span>
          <span v-if="useMockNotice">当前为示例数据，正式接入后将显示真实接口数据</span>
          <span v-else-if="staleMinutes > 15" role="status">数据已 {{ staleMinutes }} 分钟未更新，点击刷新获取最新行情</span>
          <span v-else>已连接数据源 · {{ staleMinutes }} 分钟前更新</span>
        </div>
      </div>
    </header>

    <!-- Stats Cards -->
    <section class="stats-grid">
      <template v-if="loading">
        <SkeletonLoader type="stat" v-for="i in 5" :key="i" />
      </template>
      <template v-else>
        <article class="stat-card" role="status">
          <span>📦 批发均价</span>
          <strong :aria-label="`批发均价 ${dashboard ? dashboard.summary.currentAvgPrice.toFixed(2) : '未加载'}元`">{{ dashboard ? money(dashboard.summary.currentAvgPrice) : "--" }}</strong>
          <small>批发市场综合均值 · 昆明呈贡/王旗营</small>
        </article>
        <article class="stat-card farm-gate-card" role="status">
          <span>🌾 估算产地价</span>
          <strong :aria-label="`估算产地均价 ${farmGateAvg.toFixed(2)}元`">{{ money(farmGateAvg) }}</strong>
          <small>批发价 × {{ (farmGateRatio * 100).toFixed(0) }}% · 扣除运费代办费</small>
        </article>
        <article class="stat-card" role="status">
          <span>📈 最高价</span>
          <strong :aria-label="`最高价 ${dashboard ? dashboard.summary.highestPrice.toFixed(2) : '未加载'}元`">{{ dashboard ? money(dashboard.summary.highestPrice) : "--" }}</strong>
          <small>当前样本中最高单品（批发价）</small>
        </article>
        <article class="stat-card" role="status">
          <span>📉 最低价</span>
          <strong :aria-label="`最低价 ${dashboard ? dashboard.summary.lowestPrice.toFixed(2) : '未加载'}元`">{{ dashboard ? money(dashboard.summary.lowestPrice) : "--" }}</strong>
          <small>当前样本中最低单品（批发价）</small>
        </article>
        <article class="stat-card">
          <span>📊 上涨 / 下跌</span>
          <strong v-if="dashboard" :style="{ color: dashboard.summary.risingCount > dashboard.summary.fallingCount ? 'var(--red)' : 'var(--green)' }">
            {{ dashboard.summary.risingCount }} ↑ / {{ dashboard.summary.fallingCount }} ↓
          </strong>
          <strong v-else>--</strong>
          <small>正涨幅红色高亮</small>
        </article>
      </template>
    </section>

    <!-- Main Content -->
    <section class="content-grid">
      <main class="main-column">
        <!-- Price Trend -->
        <section class="panel panel-hero">
          <div class="panel-header">
            <div>
              <h2>📈 菜价趋势</h2>
              <p>选中菜品的历史价格变化，适合看成熟期是否值得出货。</p>
            </div>
            <div v-if="selectedQuote" class="panel-chip">
              {{ selectedQuote.name }}
              <button
                class="speak-btn-inline"
                title="播报价格"
                @click="handleSpeak(selectedQuote)"
              >🔊</button>
            </div>
            <div v-else class="panel-chip">未选择</div>
          </div>
          <PriceTrendChart :history-points="historyPoints" :farm-gate-ratio="farmGateRatio" :loading="loading" />
        </section>

        <!-- Daily Growth -->
        <section class="panel panel-hero">
          <div class="panel-header">
            <div>
              <h2>📊 每日涨幅</h2>
              <p>每天的价格变动单独展示，涨幅为正时使用红色，方便快速判断行情。</p>
            </div>
          </div>
          <DailyGrowthChart :history-points="historyPoints" :loading="loading" />
        </section>

        <!-- Historical Comparison -->
        <section class="panel panel-hero">
          <div class="panel-header">
            <div>
              <h2>📉 历史对比</h2>
              <p>同一张图里看多个菜品的价格曲线，便于观察不同作物的出货节奏。</p>
            </div>
          </div>
          <ComparisonChart :dashboard="dashboard" :loading="loading" />
        </section>
      </main>

      <aside class="side-column">
        <!-- Vegetable List with Search -->
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>🧅 菜品明细</h2>
              <p>点击菜品切换走势，点击 🔊 播报价格。</p>
            </div>
          </div>

          <!-- Search + Category Filter -->
          <div class="search-bar">
            <input
              v-model="vegetableSearch"
              type="search"
              class="search-input"
              placeholder="搜索菜品名称..."
              aria-label="搜索菜品名称"
              autocomplete="off"
            />
            <span v-if="vegetableSearch" class="search-count" role="status" :aria-label="`找到 ${filteredQuotes.length} 个菜品`">{{ filteredQuotes.length }}/{{ quotes.length }}</span>
          </div>
          <div class="category-chips" v-if="categories.length > 1">
            <button
              v-for="cat in categories"
              :key="cat"
              class="chip"
              :class="{ active: selectedCategory === cat }"
              @click="selectedCategory = cat"
            >{{ cat }}</button>
          </div>

          <div v-if="sourceError" class="error-box">{{ sourceError }}</div>

          <template v-if="loading">
            <SkeletonLoader type="list" />
          </template>
          <template v-else-if="!filteredQuotes.length">
            <div class="empty-state">没有找到匹配的菜品</div>
          </template>
          <template v-else>
          <div class="quote-list" role="listbox" :aria-label="`菜品列表，${filteredQuotes.length}个品种`">
              <button
                v-for="item in filteredQuotes"
                :key="item.id"
                class="quote-row"
                :class="{ active: item.id === selectedVegetableId }"
                :aria-label="`${item.name}，${item.currentPrice.toFixed(2)}元每${item.unit.replace('元/', '')}，较昨日${item.growthRate >= 0 ? '涨' : '跌'}${Math.abs(item.growthRate).toFixed(1)}%`"
                :aria-current="item.id === selectedVegetableId ? 'true' : undefined"
                role="option"
                @click="selectVegetable(item.id)"
              >
                <div class="quote-main">
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.category }} · {{ item.unit }}</span>
                </div>
                <div class="quote-metrics">
                  <div style="display:flex;align-items:center;gap:4px;">
                    <b :style="{ color: colorForRate(item.growthRate) }">{{ money(item.currentPrice) }}</b>
                    <button
                      class="speak-btn"
                      @click.stop="handleSpeak(item)"
                      title="播报价格"
                    >🔊</button>
                  </div>
                  <small class="farm-gate-hint">产地 ≈ {{ money(farmGatePrice(item.currentPrice)) }}</small>
                  <small :style="{ color: colorForRate(item.growthRate) }">{{ signedRate(item.growthRate) }}</small>
                </div>
              </button>
            </div>
          </template>
        </section>

        <!-- Rankings -->
        <RankingList
          :gainers="topGainers"
          :losers="topLosers"
          :collapsed="rankingCollapsed"
          @select="selectVegetable"
          @toggle-collapse="rankingCollapsed = !rankingCollapsed"
          @speak="handleSpeak"
        />

        <!-- Source Info -->
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>ℹ️ 数据说明</h2>
              <p>价格来源与估算方法说明。</p>
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
              <span>价格类型</span>
              <strong>📦 批发市场交易价（非产地出货价）</strong>
            </div>
            <div>
              <span>产地价估算</span>
              <strong>🌾 批发价 × {{ (farmGateRatio * 100).toFixed(0) }}% · 扣除运费代办费</strong>
            </div>
            <div>
              <span>估算比例</span>
              <div style="margin-top:8px;">
                <input
                  type="range"
                  :value="farmGateRatio"
                  :min="0.5"
                  :max="0.9"
                  :step="0.05"
                  class="ratio-slider"
                  aria-label="调整产地价估算比例"
                  @input="setFarmGateRatio(parseFloat(($event.target as HTMLInputElement).value))"
                />
                <div class="ratio-labels">
                  <span>50% (偏远)</span>
                  <span>{{ (farmGateRatio * 100).toFixed(0) }}%</span>
                  <span>90% (近郊)</span>
                </div>
              </div>
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

    <!-- Speaking indicator -->
    <div v-if="currentlySpeaking" class="speaking-indicator" role="status" aria-live="polite" aria-label="正在播报价格">
      <div class="wave">
        <span></span><span></span><span></span>
      </div>
      <span>正在播报价格...</span>
    </div>

    <!-- Export Dialog -->
    <ExportDialog v-if="showExport" :dashboard="dashboard" :farm-gate-ratio="farmGateRatio" @close="showExport = false" />
  </div>
</template>

<style scoped>
.speak-btn-inline {
  background: none;
  border: none;
  padding: 2px 6px;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.5;
  transition: opacity 0.15s;
  vertical-align: middle;
}

.speak-btn-inline:hover {
  opacity: 1;
}

/* ── Font toggle ── */
.font-toggle-btn {
  padding: 6px 10px;
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 14px;
  background: rgba(255,255,255,0.06);
  color: var(--muted);
  font-size: 0.85rem;
  white-space: nowrap;
  transition: all 0.2s;
}

.font-toggle-btn.active {
  background: rgba(245, 158, 11, 0.2);
  color: var(--text);
  border-color: rgba(245, 158, 11, 0.3);
}

/* ── Farm-gate ── */
.farm-gate-card {
  border-color: rgba(59, 130, 246, 0.3) !important;
  background: linear-gradient(135deg, rgba(59,130,246,0.06), rgba(59,130,246,0.02)) !important;
}

.farm-gate-card strong {
  color: #3b82f6;
}

.farm-gate-hint {
  color: #3b82f6;
  font-size: 0.78rem;
  opacity: 0.85;
}

.ratio-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--panel-border);
  border-radius: 3px;
  outline: none;
}

.ratio-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3b82f6;
  border: 2px solid white;
  cursor: pointer;
}

.ratio-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
  color: var(--muted);
  margin-top: 4px;
}

/* ── Export toggle ── */
.export-toggle-btn {
  padding: 6px 10px;
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 14px;
  background: rgba(34, 197, 94, 0.08);
  color: var(--green);
  font-size: 0.85rem;
  white-space: nowrap;
  transition: all 0.2s;
  font-weight: 600;
}

.export-toggle-btn:hover {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.5);
}

/* ── Print button ── */
.print-btn {
  padding: 6px 10px;
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  background: var(--select-bg);
  color: var(--text-secondary);
  font-size: 0.85rem;
  white-space: nowrap;
  transition: all 0.2s;
}

.print-btn:hover {
  background: var(--hover-bg);
  color: var(--text);
  border-color: rgba(245, 158, 11, 0.3);
}

/* ── Staleness ── */
.dot.stale {
  background: #f59e0b;
  box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.12);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ── Search ── */
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.search-input {
  flex: 1;
  height: 42px;
  padding: 0 14px;
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  background: var(--select-bg);
  color: var(--text);
  font-size: 0.92rem;
  outline: none;
  transition: border-color 0.2s;
}

.search-input::placeholder {
  color: var(--muted);
}

.search-input:focus {
  border-color: rgba(245, 158, 11, 0.4);
}

.search-count {
  font-size: 0.82rem;
  color: var(--muted);
  white-space: nowrap;
}

/* ── Category chips ── */
.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.chip {
  padding: 4px 10px;
  border: 1px solid var(--panel-border);
  border-radius: 999px;
  background: var(--select-bg);
  color: var(--muted);
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s;
}

.chip:hover {
  background: var(--hover-bg);
  color: var(--text);
}

.chip.active {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.4);
  color: var(--accent);
}

/* ── Empty state ── */
.empty-state {
  text-align: center;
  padding: 32px 16px;
  color: var(--muted);
  font-size: 0.95rem;
}
</style>
