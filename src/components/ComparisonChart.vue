<script setup lang="ts">
import { computed } from "vue";
import type { EChartsOption } from "echarts";
import BaseChart from "./BaseChart.vue";
import type { DashboardPayload, PricePoint } from "../lib/types";
import { getChartTheme } from "../lib/chart-theme";

const props = defineProps<{
  dashboard: DashboardPayload | null;
  loading: boolean;
}>();

const option = computed<EChartsOption>(() => {
  const t = getChartTheme();
  return {
    grid: { left: 40, right: 18, top: 36, bottom: 30 },
    tooltip: { trigger: "axis" },
    legend: {
      textStyle: { color: t.mutedText },
      top: 0,
    },
    xAxis: {
      type: "category" as const,
      data: props.dashboard?.featuredHistory[0]?.points.map((p: PricePoint) => p.date) ?? [],
      axisLabel: { color: t.mutedText },
      axisLine: { lineStyle: { color: t.axisLine } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: t.mutedText },
      splitLine: { lineStyle: { color: t.splitLine } },
    },
    series: (props.dashboard?.featuredHistory ?? []).slice(0, 5).map((item) => ({
      name: item.name,
      type: "line" as const,
      smooth: true,
      data: item.points.map((p: PricePoint) => p.price),
    })),
    color: ["#f59e0b", "#60a5fa", "#22c55e", "#f97316", "#a78bfa"],
  };
});
</script>

<template>
  <BaseChart :option="option" :loading="loading" height="320px" />
</template>
