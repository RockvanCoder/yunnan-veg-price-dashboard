<script setup lang="ts">
import { ref } from "vue";

const success = ref(false);

async function copyLink() {
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    success.value = true;
    setTimeout(() => { success.value = false; }, 2000);
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    success.value = true;
    setTimeout(() => { success.value = false; }, 2000);
  }
}
</script>

<template>
  <button class="share-btn" @click="copyLink" :title="success ? '已复制' : '分享链接'">
    {{ success ? "✅ 链接已复制" : "🔗 分享看板" }}
  </button>
</template>

<style scoped>
.share-btn {
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  font-size: 0.85rem;
  white-space: nowrap;
  transition: all 0.2s;
}

.share-btn:hover {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.3);
}
</style>
