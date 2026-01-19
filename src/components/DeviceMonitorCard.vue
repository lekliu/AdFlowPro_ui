<template>
  <div class="device-monitor-card" :class="statusClass" @click="goToDetail">
    <div class="card-header">
      <span class="device-name" :title="device.deviceName">{{ device.deviceName || device.deviceId }}</span>
      <div class="status-indicator"></div>
    </div>
    <div class="card-body">
      <div class="info-row">ID: ...{{ shortId }}</div>
      <div class="info-row">型号: {{ device.deviceModel || 'N/A' }}</div>
      <div class="info-row">IP: {{ device.ipAddress || 'N/A' }}</div>
      <div class="info-row status-text">{{ statusText }}</div>
    </div>
    <div class="card-footer">
      <!-- 预留：未来放置快捷操作按钮 -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import type { DevicePublic } from "@/types/api";

const props = defineProps<{
  device: DevicePublic;
}>();

const router = useRouter();

// 修改 shortId 计算属性，显示后 10 位
const shortId = computed(() => {
  const fullId = props.device.deviceId;
  return fullId.length > 10 ? fullId.slice(-10) : fullId;
});

const statusClass = computed(() => {
  if (!props.device.isConnectedWs) return "status-offline";
  // 这里未来可以结合 Job 状态判断是否为 'busy'
  // 目前仅根据 WS 连接状态判断
  return "status-online";
});

const statusText = computed(() => {
  if (!props.device.isConnectedWs) return "离线";
  return "在线 (空闲)";
});

const goToDetail = () => {
  router.push({ name: "DeviceDetail", params: { deviceId: props.device.deviceId } });
};
</script>

<style scoped>
.device-monitor-card {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  height: 100px;
  position: relative;
  overflow: hidden;
}

.device-monitor-card:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

/* 状态边框指示器 */
.device-monitor-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
}

.status-online::before { background-color: #67c23a; }
.status-offline::before { background-color: #909399; }
.status-busy::before { background-color: #409eff; }
.status-error::before { background-color: #f56c6c; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-left: 8px; /* Space for border */
}

.device-name {
  font-weight: bold;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-body {
  padding-left: 8px;
  font-size: 12px;
  color: #606266;
}

.info-row {
  margin-bottom: 2px;
}
</style>