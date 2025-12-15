<template>
  <div class="dashboard-page">
    <!-- 1. 顶部 HUD 统计栏 -->
    <div class="stats-hud">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <el-statistic title="在线设备" :value="onlineCount" value-style="color: #67c23a" />
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <el-statistic title="忙碌中" :value="0" value-style="color: #409eff">
              <template #suffix><span style="font-size: 12px; color: #909399">(暂未对接)</span></template>
            </el-statistic>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <el-statistic title="离线设备" :value="offlineCount" value-style="color: #909399" />
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <el-statistic title="总设备数" :value="deviceStore.totalDevices" />
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 2. 视图控制栏 -->
    <div class="view-controls">
      <span class="control-label">监控网格密度:</span>
      <el-slider v-model="gridColumns" :min="3" :max="20" :step="1" show-stops style="width: 300px; margin-right: 20px" />

      <el-radio-group v-model="filterStatus" size="small">
        <el-radio-button label="all" value="all">全部</el-radio-button>
        <el-radio-button label="online" value="online">仅在线</el-radio-button>
        <el-radio-button label="offline" value="offline">仅离线</el-radio-button>
      </el-radio-group>

      <div class="server-info">
        <span class="label">Server:</span>
        <span class="value">{{ serverIp || apiBaseUrl }}</span>
      </div>
    </div>

    <!-- 3. 监控矩阵 -->
    <div class="matrix-container" :style="{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }">
      <DeviceMonitorCard
          v-for="device in filteredDevices"
          :key="device.deviceId"
          :device="device"
      />
    </div>

    <el-empty v-if="filteredDevices.length === 0 && !deviceStore.isLoading" description="暂无符合条件的设备" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useDeviceStore } from "@/stores/deviceStore";
import DeviceMonitorCard from "@/components/DeviceMonitorCard.vue";
import axios from "axios";
import logger from "@/utils/logger"; // <-- 修复: 导入 logger

// 移除了不正确的 defineComponent

const deviceStore = useDeviceStore();
const gridColumns = ref(6);
const filterStatus = ref("all");
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
const serverIp = ref("");

const onlineCount = computed(() => deviceStore.devices.filter(d => d.isConnectedWs).length);
const offlineCount = computed(() => deviceStore.devices.length - onlineCount.value);

const filteredDevices = computed(() => {
  if (filterStatus.value === "all") {
    return deviceStore.devices;
  } else if (filterStatus.value === "online") {
    return deviceStore.devices.filter(d => d.isConnectedWs);
  } else if (filterStatus.value === "offline") {
    return deviceStore.devices.filter(d => !d.isConnectedWs);
  }
  return deviceStore.devices;
});

onMounted(() => {
  if (deviceStore.devices.length === 0) {
    deviceStore.fetchDevices({ limit: 2000 });
  }

  const healthUrl = apiBaseUrl.replace(/\/api\/v1\/?$/, "") + "/health";
  axios.get(healthUrl).then((res) => {
    if (res.data && res.data.server_ip) {
      serverIp.value = res.data.server_ip;
    }
  }).catch((err) => {
    // 修复: 移除不正确的 ElMessage，改为 logger.warn
    logger.warn("Failed to fetch server health info:", err);
  });
});

watch(filterStatus, () => {
  // Logic remains here
});

// 移除了 setup 块末尾的 `return { ... }` 语句，
// 因为在 <script setup> 中，所有顶级声明都会自动暴露给模板。
</script>

<style scoped>
.dashboard-page {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent body scrollbar */
}

.stats-hud {
  margin-bottom: 20px;
  flex-shrink: 0; /* Ensure HUD stays at the top */
}

.stat-card {
  text-align: center;
  height: 100%; /* Make cards fill their grid cell height */
}

.view-controls {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  background-color: #fff;
  padding: 10px 20px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  flex-shrink: 0; /* Ensure controls stay at the top */
}

.control-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-right: 15px;
}

.server-info {
  margin-left: auto; /* Push server info to the right */
  font-size: 13px;
  color: #909399;
  display: flex;
  align-items: center;
}

.server-info .label {
  margin-right: 5px;
}

.server-info .value {
  font-family: monospace;
  color: #606266;
}

.matrix-container {
  display: grid;
  gap: 10px;
  flex-grow: 1; /* Allow matrix to fill remaining vertical space */
  overflow-y: auto; /* Make the matrix scrollable */
  padding-bottom: 20px; /* Add some padding at the bottom */
  align-content: start; /* Align items to the start, not stretch */
}
</style>