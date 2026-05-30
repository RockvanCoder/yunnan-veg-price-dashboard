<script setup lang="ts">
import { computed } from "vue";
import type { EChartsOption } from "echarts";
import BaseChart from "./BaseChart.vue";
import type { PricePoint } from "../lib/types";
import { getChartTheme } from "../lib/chart-theme";

const props = defineProps<{
  historyPoints: PricePoint[];
  loading: boolean;
  farmGateRatio: number;
}>();

const option = computed<EChartsOption>(() => {
  const t = getChartTheme();
  const ratio = props.farmGateRatio;

  return {
    grid: { left: 48, right: 18, top: 26, bottom: 30 },
    tooltip: {
      trigger: "axis",
      formatter: (params: unknown) => {
        const arr = params as Array<{ seriesName: string; axisValueLabel: string; value: number; color: string }>;
        if (!arr.length) return "";
        const d = arr[0].axisValueLabel;
        let html = `<strong>${d}</strong>`;
        for (const s of arr) {
          html += `<br/><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.color};margin-right:6px;"></span>${s.seriesName}：¥${s.value.toFixed(2)}`;
        }
        return html;
      },
    },
    legend: {
      data: ["批发价", `产地价 (×${(ratio * 100).toFixed(0)}%)`],
      textStyle: { color: t.mutedText, fontSize: 11 },
      top: 0,
      right: 0,
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
        name: "批发价",
        data: props.historyPoints.map((p) => p.price),
        type: "line" as const,
        smooth: true,
        symbolSize: 6,
        lineStyle: { width: 3, color: "#f59e0b" },
        itemStyle: { color: "#f59e0b" },
        areaStyle: { color: "rgba(245, 158, 11, 0.12)" },
      },
      {
        name: `产地价 (×${(ratio * 100).toFixed(0)}%)`,
        data: props.historyPoints.map((p) => Number((p.price * ratio).toFixed(2))),
        type: "line" as const,
        smooth: true,
        symbolSize: 4,
        lineStyle: { width: 2, color: "#3b82f6", type: "dashed" as const },
        itemStyle: { color: "#3b82f6" },
        areaStyle: { color: "rgba(59, 130, 246, 0.08)" },
      },
    ],
    color: ["#f59e0b", "#3b82f6"],
  };
});
</script>

<template>
  <BaseChart :option="option" :loading="loading" height="360px" />
</template>
