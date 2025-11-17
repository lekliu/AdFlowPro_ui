<template>
  <div class="dashboard-page">
    <el-card>
      <template #header>Dashboard Overview</template>
      <p>Welcome to the AdFlowPro Management Interface.</p>
      <p>Use the navigation menu to manage devices and send commands.</p>

      <el-row :gutter="20" style="margin-top: 20px">
        <el-col :span="8">
          <el-statistic title="Connected Devices (WS)" :value="connectedWsCount" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="Total Registered Devices" :value="deviceStore.totalDevices" />
        </el-col>
        <!-- Add more stats -->
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "Dashboard",
});
import { ref, onMounted, computed } from "vue";
import { useDeviceStore } from "@/stores/deviceStore";
import { deviceService } from "@/api/deviceService"; // For live WS count

const deviceStore = useDeviceStore();
const connectedWsCount = ref(0);

const fetchConnectedWsCount = async () => {
  try {
    const activeDevices = await deviceService.getActiveWebSocketDevices();
    connectedWsCount.value = activeDevices.length;
  } catch (error) {
    console.error("Failed to fetch active WebSocket devices count", error);
    connectedWsCount.value = 0;
  }
};

onMounted(() => {
  if (deviceStore.devices.length === 0) {
    // Fetch only if not already populated
    deviceStore.fetchDevices({ limit: 1000 }); // Fetch all for total count initially
  }
  fetchConnectedWsCount();
  // Set an interval to refresh WebSocket count
  // setInterval(fetchConnectedWsCount, 10000); // Poll every 10 seconds
});
</script>

<style scoped>
.dashboard-page {
  padding: 0px;
}
</style>
