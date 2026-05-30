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
    tooltip: {
      trigger: "axis",
      formatter: (params: unknown) => {
        const arr = (params as Array<{ axisValueLabel: string; value: number }>) ?? [];
        if (!arr.length) return "";
        const p = arr[0];
        return `<strong>${p.axisValueLabel}</strong><br/>价格：¥${p.value.toFixed(2)}`;
      },
    },
    xAxis: {
      type: "category" as const,
      boundaryGap: false,
      data: props.historyPoints.map((p) => p.date),
      axisLabel: { color: t.mutedText },
      axisLine: { lineStyle: { color: t.axisLine } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: t.mutedText },
      splitLine: { lineStyle: { color: t.splitLine } },
    },
    series: [
      {
        data: props.historyPoints.map((p) => p.price),
        type: "line" as const,
        smooth: true,
        symbolSize: 8,
        lineStyle: { width: 4, color: "#f59e0b" },
        itemStyle: { color: "#f59e0b" },
        areaStyle: { color: "rgba(245, 158, 11, 0.18)" },
        markPoint: {
          data: props.historyPoints.length
            ? [
                { type: "max" as const, name: "最高" },
                { type: "min" as const, name: "最低" },
              ]
            : [],
        },
        markLine: props.historyPoints.length >= 3
          ? {
              silent: true,
              data: [
                {
                  type: "average" as const,
                  name: "均价",
                  label: { formatter: "均价 {c}", color: t.mutedText },
                  lineStyle: { color: t.splitLine, type: "dashed" as const },
                },
              ],
            }
          : undefined,
      },
    ],
    color: ["#f59e0b"],
  };
});
</script>

<template>
  <BaseChart :option="option" :loading="loading" height="340px" />
</template>
