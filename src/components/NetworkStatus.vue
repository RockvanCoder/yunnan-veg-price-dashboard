<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const isOnline = ref(navigator.onLine);
const showBanner = ref(false);

function updateStatus() {
  isOnline.value = navigator.onLine;
  showBanner.value = !navigator.onLine;
  if (navigator.onLine) {
    // 在线但短暂显示恢复提示
    setTimeout(() => { showBanner.value = false; }, 3000);
  }
}

onMounted(() => {
  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);
  if (!navigator.onLine) showBanner.value = true;
});

onBeforeUnmount(() => {
  window.removeEventListener("online", updateStatus);
  window.removeEventListener("offline", updateStatus);
});
</script>

<template>
  <Transition name="slide">
    <div v-if="showBanner" class="network-banner" :class="isOnline ? 'online' : 'offline'" role="alert" aria-live="assertive">
      <template v-if="isOnline">
        <span>🔗 网络已恢复，数据将自动刷新</span>
      </template>
      <template v-else>
        <span>📡 当前离线 — 显示缓存数据，网络恢复后自动更新</span>
      </template>
    </div>
  </Transition>
</template>

<style scoped>
.network-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 3000;
  padding: 10px 16px;
  text-align: center;
  font-size: 0.88rem;
  font-weight: 600;
}

.network-banner.offline {
  background: #ef4444;
  color: #fff;
}

.network-banner.online {
  background: #22c55e;
  color: #fff;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateY(-100%);
}
</style>
