<script setup lang="ts">
defineProps<{
  alerts: Array<{
    vegetableId: string;
    name: string;
    rate: number;
    type: "surge" | "plunge";
  }>;
}>();

const emit = defineEmits<{
  select: [id: string];
}>();
</script>

<template>
  <div v-if="alerts.length" class="alert-bar">
    <div class="alert-inner">
      <span class="alert-icon">🚨</span>
      <span class="alert-text">价格异动：</span>
      <span v-for="(a, idx) in alerts" :key="a.vegetableId">
        <button class="alert-link" @click="emit('select', a.vegetableId)">
          {{ a.name }}<template v-if="a.type === 'surge'">📈</template><template v-else>📉</template>
          {{ a.rate > 0 ? "+" : "" }}{{ a.rate.toFixed(1) }}%
        </button>
        <template v-if="idx < alerts.length - 1"><span class="alert-sep">|</span></template>
      </span>
    </div>
  </div>
</template>

<style scoped>
.alert-bar {
  margin-top: 12px;
  padding: 10px 16px;
  border-radius: 16px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.2);
  animation: alertPulse 2s ease-in-out infinite;
}

@keyframes alertPulse {
  0%, 100% { border-color: rgba(239, 68, 68, 0.2); }
  50% { border-color: rgba(239, 68, 68, 0.5); }
}

.alert-inner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 0.9rem;
}

.alert-icon {
  font-size: 1.2rem;
}

.alert-text {
  font-weight: 600;
  color: #fca5a5;
}

.alert-link {
  background: none;
  border: none;
  padding: 2px 4px;
  color: #fca5a5;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  font-size: inherit;
}

.alert-link:hover {
  color: #fef2f2;
}

.alert-sep {
  color: rgba(255, 255, 255, 0.15);
  margin: 0 2px;
}
</style>
