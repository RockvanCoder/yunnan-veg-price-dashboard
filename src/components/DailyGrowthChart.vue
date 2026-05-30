<script setup lang="ts">
import { computed } from "vue";
import type { EChartsOption } from "echarts";
import BaseChart from "./BaseChart.vue";
import type { PricePoint } from "../lib/types";
import { getChartTheme } from "../lib/chart-theme";

const props = defineProps<{
  historyPoints: PricePoint[];
  loading: boolean;
}>();

const option = computed<EChartsOption>(() => {
  const t = getChartTheme();
  return {
    grid: { left: 40, right: 18, top: 26, bottom: 30 },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category" as const,
      data: props.historyPoints.map((p) => p.date),
      axisLabel: { color: t.mutedText },
      axisLine: { lineStyle: { color: t.axisLine } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: t.mutedText, formatter: "{value}%" },
      splitLine: { lineStyle: { color: t.splitLine } },
      axisPointer: { snap: true },
    },
    series: [
      {
        data: props.historyPoints.map((p) => ({
          value: p.growthRate,
          itemStyle: { color: p.growthRate >= 0 ? "#ef4444" : "#22c55e" },
        })),
        type: "bar" as const,
        barWidth: "52%",
      },
    ],
    color: ["#ef4444"],
  };
});
</script>

<template>
  <BaseChart :option="option" :loading="loading" height="300px" />
</template>
