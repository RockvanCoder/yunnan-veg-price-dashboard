<script setup lang="ts">
import { ref } from "vue";
import type { DashboardPayload, VegetableQuote } from "../lib/types";

const props = defineProps<{
  dashboard: DashboardPayload | null;
  farmGateRatio: number;
}>();

const emit = defineEmits<{
  close: [];
}>();

const format = ref<"csv" | "json">("csv");
const startDate = ref(todayMinus(30));
const endDate = ref(today());
const exporting = ref(false);
const error = ref("");
const source = ref<"api" | "local">("local"); // 默认本地导出

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function todayMinus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function quotesToCsv(quotes: VegetableQuote[], marketName: string, capturedAt: string): string {
  const ratio = props.farmGateRatio;
  const header = "日期,时间,市场,品种,品类,单位,批发价(元),昨日批发价(元),涨跌额(元),涨跌幅(%),估算产地价(元),7日均价(元),30日均价(元),产地价比例";
  const rows = [header];
  for (const q of quotes) {
    rows.push([
      capturedAt.slice(0, 10),
      capturedAt,
      escapeCsv(marketName),
      escapeCsv(q.name),
      escapeCsv(q.category),
      q.unit,
      q.currentPrice.toFixed(2),
      q.yesterdayPrice.toFixed(2),
      q.growthAmount.toFixed(2),
      q.growthRate.toFixed(2),
      (q.currentPrice * ratio).toFixed(2),
      q.history7dAvg.toFixed(2),
      q.history30dAvg.toFixed(2),
      ratio.toFixed(2),
    ].join(","));
  }
  return rows.join("\n");
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadBlob(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function doExport() {
  exporting.value = true;
  error.value = "";

  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  const quotes = props.dashboard?.quotes ?? [];
  const marketName = props.dashboard?.summary.market.name ?? "云南市场";

  // 1) 优先尝试 API（完整历史数据）
  try {
    const params = new URLSearchParams({
      marketId: props.dashboard?.summary.market.id ?? "",
      format: format.value,
      start: startDate.value,
      end: endDate.value,
    });
    const resp = await fetch(`/api/export?${params.toString()}`);
    if (resp.ok) {
      if (format.value === "csv") {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `云南菜价_${startDate.value}_${endDate.value}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = await resp.json();
        downloadBlob(JSON.stringify(data, null, 2), "application/json", `云南菜价_${startDate.value}_${endDate.value}.json`);
      }
      source.value = "api";
      emit("close");
      return;
    }
  } catch {
    // API 不可用 → 回落本地导出
  }

  // 2) 回落：从当前页面数据导出
  if (!quotes.length) {
    error.value = "当前没有可导出的数据，请等待数据加载完成后再试";
    exporting.value = false;
    return;
  }

  source.value = "local";
  const dateLabel = now.slice(0, 10);
  const r = props.farmGateRatio;

  if (format.value === "csv") {
    const csv = quotesToCsv(quotes, marketName, now);
    downloadBlob(csv, "text/csv; charset=utf-8", `云南菜价_当前数据_${dateLabel}.csv`);
  } else {
    const json = JSON.stringify({
      exportedAt: now,
      source: "当前页面数据（API 不可用时回落）",
      farmGateRatio: r,
      marketName,
      quoteCount: quotes.length,
      quotes: quotes.map((q) => ({
        ...q,
        estimatedFarmGatePrice: Number((q.currentPrice * r).toFixed(2)),
      })),
    }, null, 2);
    downloadBlob(json, "application/json", `云南菜价_当前数据_${dateLabel}.json`);
  }

  emit("close");
}
</script>

<template>
  <div class="export-overlay" @click.self="emit('close')" role="dialog" aria-label="数据导出">
    <div class="export-panel">
      <div class="export-header">
        <h2>📥 导出数据</h2>
        <button class="close-btn" @click="emit('close')" aria-label="关闭">✕</button>
      </div>

      <div class="export-form">
        <div class="form-row">
          <label>导出格式</label>
          <div class="format-btns">
            <button
              class="fmt-btn"
              :class="{ active: format === 'csv' }"
              @click="format = 'csv'"
            >CSV（Excel / WPS 可打开）</button>
            <button
              class="fmt-btn"
              :class="{ active: format === 'json' }"
              @click="format = 'json'"
            >JSON（程序处理）</button>
          </div>
        </div>

        <div v-if="error" class="export-error" role="alert">{{ error }}</div>

        <button class="export-btn" :disabled="exporting" @click="doExport">
          {{ exporting ? "导出中..." : `📥 下载 ${format.toUpperCase()} 文件` }}
        </button>
      </div>

      <div class="export-info">
        <p>📌 优先获取完整历史数据；API 不可用时自动回落为当前页面数据导出。</p>
        <p>💡 CSV 格式可直接用 Excel / WPS 打开，便于打印和进一步分析。</p>
        <p v-if="!props.dashboard?.quotes.length" style="color: var(--red);">⚠ 数据尚未加载，请先等待页面数据刷新。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.export-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  z-index: 2000;
  padding: 20px;
}

.export-panel {
  width: 100%;
  max-width: 460px;
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 24px;
  padding: 24px;
  box-shadow: var(--shadow);
}

.export-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.export-header h2 {
  margin: 0;
  font-size: 1.2rem;
}

.close-btn {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 1.3rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
}

.close-btn:hover { color: var(--text); }

.export-form {
  display: grid;
  gap: 16px;
}

.form-row {
  display: grid;
  gap: 6px;
}

.form-row label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.format-btns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.fmt-btn {
  padding: 10px;
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  background: var(--select-bg);
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}

.fmt-btn.active {
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.1);
  color: var(--accent);
}

.export-error {
  padding: 10px 14px;
  border-radius: 12px;
  color: #991b1b;
  background: rgba(239, 68, 68, 0.12);
  font-size: 0.88rem;
}

.export-btn {
  height: 48px;
  border: none;
  border-radius: 14px;
  color: #111827;
  font-weight: 700;
  font-size: 1rem;
  background: linear-gradient(135deg, #f59e0b, #fb7185);
  cursor: pointer;
}

.export-btn:disabled {
  opacity: 0.7;
  cursor: progress;
}

.export-info {
  margin-top: 16px;
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 12px;
  background: var(--hover-bg);
}

.export-info p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.6;
}
</style>
