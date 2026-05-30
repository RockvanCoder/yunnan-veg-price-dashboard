<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { ECharts, EChartsOption } from "echarts";

const props = defineProps<{
  option: EChartsOption;
  height?: string;
  loading?: boolean;
}>();

const chartEl = ref<HTMLDivElement | null>(null);
let chart: ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;
let echartsModule: typeof import("echarts") | null = null;

const chartHeight = computed(() => props.height ?? "320px");

function render() {
  if (!chart) return;
  chart.setOption(props.option, true);
}

onMounted(() => {
  const el = chartEl.value;
  if (!el) return;
  void (async () => {
    echartsModule = await import("echarts");
    chart = echartsModule.init(el, "auto", { renderer: "canvas" });
    render();
    resizeObserver = new ResizeObserver(() => chart?.resize());
    resizeObserver.observe(el);
  })();
});

watch(
  () => props.option,
  () => render(),
  { deep: true },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
});
</script>

<template>
  <div class="chart-shell" :style="{ height: chartHeight }">
    <div v-if="loading" class="chart-loading">
      <div class="skeleton-chart">
        <div class="skeleton-line" v-for="i in 4" :key="i"></div>
      </div>
    </div>
    <div ref="chartEl" class="chart-canvas" :class="{ invisible: loading }"></div>
  </div>
</template>

<style scoped>
.chart-shell {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.72), rgba(7, 13, 24, 0.94));
}

.chart-canvas {
  width: 100%;
  height: 100%;
}

.chart-canvas.invisible {
  opacity: 0;
  position: absolute;
  pointer-events: none;
}

.chart-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 40px;
}

.skeleton-chart {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  padding: 20px 30px;
}

.skeleton-line {
  height: 18px;
  border-radius: 9px;
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton-line:nth-child(1) { width: 92%; animation-delay: 0s; }
.skeleton-line:nth-child(2) { width: 76%; animation-delay: 0.15s; }
.skeleton-line:nth-child(3) { width: 84%; animation-delay: 0.3s; }
.skeleton-line:nth-child(4) { width: 65%; animation-delay: 0.45s; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
