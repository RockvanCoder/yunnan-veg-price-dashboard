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
  { deep: true }
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
});
</script>

<template>
  <div class="chart-shell" :style="{ height: chartHeight }">
    <div ref="chartEl" class="chart-canvas"></div>
    <div v-if="loading" class="chart-loading">正在加载图表数据...</div>
  </div>
</template>
