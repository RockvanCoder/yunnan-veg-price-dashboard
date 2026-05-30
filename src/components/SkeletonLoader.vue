<script setup lang="ts">
defineProps<{
  type: "stat" | "chart" | "list";
}>();
</script>

<template>
  <div v-if="type === 'stat'" class="skeleton-card">
    <div class="skeleton-text short"></div>
    <div class="skeleton-text long"></div>
    <div class="skeleton-text short"></div>
  </div>
  <div v-else-if="type === 'chart'" class="skeleton-chart-box">
    <div class="skeleton-chart-area">
      <div class="skeleton-bar" v-for="i in 7" :key="i" :style="{ height: `${30 + Math.random() * 50}%` }"></div>
    </div>
  </div>
  <div v-else-if="type === 'list'" class="skeleton-list">
    <div class="skeleton-row" v-for="i in 6" :key="i">
      <div class="skeleton-text medium"></div>
      <div class="skeleton-text short"></div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-card,
.skeleton-chart-box,
.skeleton-list {
  width: 100%;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.02);
  overflow: hidden;
}

.skeleton-card {
  padding: 24px;
  display: grid;
  gap: 12px;
}

.skeleton-text {
  height: 14px;
  border-radius: 7px;
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton-text.short { width: 40%; }
.skeleton-text.medium { width: 60%; }
.skeleton-text.long { width: 85%; height: 28px; margin: 4px 0; }

.skeleton-chart-box {
  padding: 30px 24px;
  height: 260px;
  display: flex;
  align-items: flex-end;
}

.skeleton-chart-area {
  width: 100%;
  height: 180px;
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.skeleton-bar {
  flex: 1;
  border-radius: 6px 6px 0 0;
  background: linear-gradient(180deg, rgba(245,158,11,0.06) 0%, rgba(245,158,11,0.15) 100%);
  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton-list {
  display: grid;
  gap: 10px;
  padding: 16px;
}

.skeleton-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255,255,255,0.02);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
