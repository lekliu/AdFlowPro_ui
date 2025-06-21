<template>
  <div class="device-detail-page" v-if="device">
    <el-page-header
      @back="goBack"
      :content="`Device Details - ${device.device_id}`"
    />
    <el-card style="margin-top: 20px">
      <el-descriptions title="Device Information" :column="2" border>
        <el-descriptions-item label="Device ID">{{
          device.device_id
        }}</el-descriptions-item>
        <el-descriptions-item label="Name">{{
          device.device_name || "N/A"
        }}</el-descriptions-item>
        <el-descriptions-item label="OS Version">{{
          device.os_version || "N/A"
        }}</el-descriptions-item>
        <el-descriptions-item label="App Version">{{
          device.app_version || "N/A"
        }}</el-descriptions-item>
        <el-descriptions-item label="DB Status">
          <el-tag :type="device.status === 'online' ? 'success' : 'info'">{{
            device.status
          }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="WebSocket">
          <el-tag :type="device.is_connected_ws ? 'success' : 'danger'">
            {{ device.is_connected_ws ? "Connected" : "Disconnected" }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="IP Address">{{
          device.ip_address || "N/A"
        }}</el-descriptions-item>
        <el-descriptions-item label="Last Seen">{{
          formatDate(device.last_seen_at)
        }}</el-descriptions-item>
        <el-descriptions-item label="Registered At">{{
          formatDate(device.registered_at)
        }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>Send Command</template>
      <CommandForm :device-id="deviceId" @command-sent="onCommandSent" />
    </el-card>

    <!-- Future: Section for device logs or history -->
  </div>
  <div v-else-if="isLoading">
    <el-skeleton :rows="5" animated />
  </div>
  <div v-else>
    <el-empty description="Device not found or failed to load." />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDeviceStore } from "@/stores/deviceStore";
import type { DevicePublic } from "@/types/api";
import CommandForm from "@/components/CommandForm.vue";
import { ElMessage } from "element-plus";

const route = useRoute();
const router = useRouter();
const deviceStore = useDeviceStore();

const deviceId = computed(() => route.params.deviceId as string);
const device = ref<DevicePublic | null>(null);
const isLoading = ref(false);

const fetchDetails = async () => {
  if (!deviceId.value) return;
  isLoading.value = true;
  try {
    // Use store if already fetched, otherwise fetch fresh
    // This logic can be refined based on how often you want to refresh
    const storeDevice = deviceStore.devices.find(
      (d) => d.device_id === deviceId.value
    );
    if (
      storeDevice &&
      deviceStore.selectedDevice?.device_id === deviceId.value
    ) {
      // Check if selectedDevice in store is the current one
      device.value = deviceStore.selectedDevice;
    } else {
      await deviceStore.fetchDeviceDetails(deviceId.value);
      device.value = deviceStore.selectedDevice;
    }
  } catch (error) {
    console.error("Failed to fetch device details:", error);
    device.value = null;
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchDetails();
});

const goBack = () => {
  router.back(); // Or router.push({ name: 'DevicesList' });
};

const formatDate = (dateString: string | Date): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString();
};

const onCommandSent = (success: boolean) => {
  if (success) {
    ElMessage.info("Command status updated by form emission.");
    // Optionally re-fetch device details if a command might change its status
    // fetchDetails();
  }
};
</script>

<style scoped>
.device-detail-page {
  padding: 20px;
}
.el-page-header {
  margin-bottom: 20px;
}
</style>
