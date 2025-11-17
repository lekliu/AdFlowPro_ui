<template>
    <div class="status-bar-container" :style="{ height: `${height}px` }">
      <div class="resizer" @mousedown="startResize"></div>
      <div class="status-bar-header">
        <span>实时日志</span>
        <div class="header-actions">
          <el-button type="primary" link @click="wsStore.clearLogs">清空日志</el-button>
          <el-button type="danger" link :icon="Close" @click="wsStore.toggleLogPanel" />
        </div>
      </div>
      <div class="log-content" ref="logContentRef">
        <div v-for="log in wsStore.logs" :key="log.id" :class="['log-entry', `log-${log.type}`]">
          <span class="log-timestamp">{{ log.timestamp }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, watch } from 'vue';
  import { useWebSocketStore } from '@/stores/webSocketStore';
  import { Close } from '@element-plus/icons-vue';
  
  const wsStore = useWebSocketStore();
  const height = ref(200);
  const logContentRef = ref<HTMLElement | null>(null);
  
  // --- Resizing Logic ---
  const startResize = (startEvent: MouseEvent) => {
    const startY = startEvent.clientY;
    const startHeight = height.value;
  
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = startHeight + deltaY;
      // Set min/max height
      height.value = Math.max(80, Math.min(newHeight, window.innerHeight * 0.8));
    };
  
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  
  // --- Auto-scroll to top on new log ---
  watch(() => wsStore.logs, () => {
    logContentRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
  }, { deep: true });
  </script>
  
  <style scoped>
  .status-bar-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: var(--el-bg-color-overlay);
    border-top: 1px solid var(--el-border-color);
    z-index: 2000; /* Must be above most other elements */
    display: flex;
    flex-direction: column;
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.1);
  }
  
  .resizer {
    width: 100%;
    height: 5px;
    cursor: ns-resize;
    background-color: var(--el-border-color-lighter);
    transition: background-color 0.2s;
  }
  .resizer:hover {
    background-color: var(--el-color-primary);
  }
  
  .status-bar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 15px;
    border-bottom: 1px solid var(--el-border-color-light);
    flex-shrink: 0;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }
  
  .log-content {
    padding: 10px 15px;
    flex-grow: 1;
    overflow-y: auto;
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
  }
  
  .log-entry {
    display: flex;
    gap: 15px;
    padding: 2px 0;
  }
  
  .log-timestamp {
    color: var(--el-text-color-placeholder);
    flex-shrink: 0;
  }
  
  .log-message {
    white-space: pre-wrap;
    word-break: break-all;
  }
  
  .log-info { color: var(--el-text-color-regular); }
  .log-success { color: var(--el-color-success); }
  .log-warning { color: var(--el-color-warning); }
  .log-error { color: var(--el-color-danger); }
  </style>