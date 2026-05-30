<script setup lang="ts">
import type { ThemeMode } from "../lib/useDashboard";

defineProps<{
  mode: ThemeMode;
}>();

const emit = defineEmits<{
  update: [mode: ThemeMode];
}>();

const options: Array<{ value: ThemeMode; label: string; icon: string }> = [
  { value: "light", label: "浅色", icon: "☀️" },
  { value: "dark", label: "深色", icon: "🌙" },
  { value: "system", label: "跟随系统", icon: "💻" },
];
</script>

<template>
  <div class="theme-toggle">
    <button
      v-for="opt in options"
      :key="opt.value"
      class="theme-btn"
      :class="{ active: mode === opt.value }"
      @click="emit('update', opt.value)"
      :title="opt.label"
    >
      <span class="theme-icon">{{ opt.icon }}</span>
      <span class="theme-label">{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.theme-toggle {
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--muted);
  font-size: 0.82rem;
  transition: all 0.2s;
}

.theme-btn.active {
  background: rgba(245, 158, 11, 0.2);
  color: var(--text);
}

.theme-icon {
  font-size: 1rem;
}

.theme-label {
  white-space: nowrap;
}

@media (max-width: 720px) {
  .theme-label {
    display: none;
  }
}
</style>
