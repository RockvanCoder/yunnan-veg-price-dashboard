<script setup lang="ts">
import type { VegetableQuote } from "../lib/types";

defineProps<{
  gainers: VegetableQuote[];
  losers: VegetableQuote[];
  collapsed: boolean;
}>();

const emit = defineEmits<{
  toggleCollapse: [];
  select: [id: string];
  speak: [quote: VegetableQuote];
}>();

function signedRate(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function colorForRate(value: number) {
  if (value > 0) return "var(--red)";
  if (value < 0) return "var(--green)";
  return "var(--muted)";
}
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <div>
        <h2>涨幅排行</h2>
        <p>红色上涨，绿色回落。点击行可播报价格。</p>
      </div>
      <button class="collapse-btn" @click="emit('toggleCollapse')">
        {{ collapsed ? "展开全部" : "收起" }}
      </button>
    </div>

    <div class="rank-block" v-if="!collapsed">
      <div class="rank-section">
        <h3>💰 涨幅最高</h3>
        <div v-for="item in gainers" :key="item.id" class="rank-item">
          <div class="rank-left">
            <span class="rank-pos">{{ gainers.indexOf(item) + 1 }}</span>
            <span>{{ item.name }}</span>
          </div>
          <div class="rank-right">
            <strong class="up">{{ signedRate(item.growthRate) }}</strong>
            <button
              class="speak-btn"
              title="播报价格"
              @click="emit('speak', item)"
            >🔊</button>
          </div>
        </div>
      </div>
      <div class="rank-divider"></div>
      <div class="rank-section">
        <h3>📉 跌幅最低</h3>
        <div v-for="item in losers" :key="item.id" class="rank-item">
          <div class="rank-left">
            <span class="rank-pos">{{ losers.indexOf(item) + 1 }}</span>
            <span>{{ item.name }}</span>
          </div>
          <div class="rank-right">
            <strong class="down">{{ signedRate(item.growthRate) }}</strong>
            <button
              class="speak-btn"
              title="播报价格"
              @click="emit('speak', item)"
            >🔊</button>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="collapsed-hint">
      <span>{{ gainers.length + losers.length }} 个品种 · 点击展开查看详情</span>
    </div>
  </section>
</template>

<style scoped>
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-header h2, .rank-section h3 {
  margin: 0;
}

.panel-header p {
  margin: 6px 0 0;
  color: var(--muted);
  line-height: 1.7;
}

.collapse-btn {
  background: none;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 4px 12px;
  border-radius: 10px;
  color: var(--muted);
  font-size: 0.82rem;
  white-space: nowrap;
  cursor: pointer;
}

.collapse-btn:hover {
  background: rgba(255,255,255,0.06);
  color: var(--text);
}

.rank-block {
  display: grid;
  gap: 14px;
}

.rank-section {
  display: grid;
  gap: 8px;
}

.rank-divider {
  height: 1px;
  background: rgba(255,255,255,0.06);
}

.rank-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  background: rgba(255,255,255,0.03);
}

.rank-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rank-pos {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  font-size: 0.78rem;
  color: var(--muted);
}

.rank-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rank-item strong.up { color: var(--red); }
.rank-item strong.down { color: var(--green); }

.speak-btn {
  background: none;
  border: none;
  padding: 2px 6px;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0.5;
  transition: opacity 0.15s;
  border-radius: 8px;
}

.rank-item:hover .speak-btn {
  opacity: 1;
}

.collapsed-hint {
  text-align: center;
  padding: 16px;
  color: var(--muted);
  font-size: 0.9rem;
}
</style>
