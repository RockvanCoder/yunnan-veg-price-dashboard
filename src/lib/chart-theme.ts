// ECharts 主题 token，跟随浅色/深色模式切换
import { ref, watchEffect } from "vue";

export interface ChartTheme {
  textColor: string;
  mutedText: string;
  splitLine: string;
  axisLine: string;
}

export function useChartTheme() {
  const theme = ref<ChartTheme>(resolveTheme());

  function resolveTheme(): ChartTheme {
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    return isDark
      ? {
          textColor: "#9ca3af",
          mutedText: "#6b7280",
          splitLine: "rgba(255,255,255,0.08)",
          axisLine: "rgba(255,255,255,0.12)",
        }
      : {
          textColor: "#6b7280",
          mutedText: "#9ca3af",
          splitLine: "rgba(0,0,0,0.06)",
          axisLine: "rgba(0,0,0,0.1)",
        };
  }

  // 监听主题切换
  if (typeof window !== "undefined") {
    const observer = new MutationObserver(() => {
      theme.value = resolveTheme();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }

  return { chartTheme: theme };
}

// 静态导出用于 computed options 中引用
export function getChartTheme(): ChartTheme {
  if (typeof document === "undefined") {
    return { textColor: "#9ca3af", mutedText: "#6b7280", splitLine: "rgba(255,255,255,0.08)", axisLine: "rgba(255,255,255,0.12)" };
  }
  const isDark = document.documentElement.getAttribute("data-theme") !== "light";
  return isDark
    ? { textColor: "#9ca3af", mutedText: "#6b7280", splitLine: "rgba(255,255,255,0.08)", axisLine: "rgba(255,255,255,0.12)" }
    : { textColor: "#6b7280", mutedText: "#9ca3af", splitLine: "rgba(0,0,0,0.06)", axisLine: "rgba(0,0,0,0.1)" };
}
