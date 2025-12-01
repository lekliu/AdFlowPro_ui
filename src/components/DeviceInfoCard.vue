<template>
  <el-card>
    <!-- 修改 column 为 3 -->
    <el-descriptions title="设备信息" :column="3" border>
      <el-descriptions-item label="Device ID">{{
          device.deviceId
        }}</el-descriptions-item>
      <el-descriptions-item label="Name">{{
          device.deviceName || "N/A"
        }}</el-descriptions-item>
      <el-descriptions-item label="OS Version">{{
          device.osVersion || "N/A"
        }}</el-descriptions-item>
      <el-descriptions-item label="App Version">{{
          device.appVersion || "N/A"
        }}</el-descriptions-item>
      <el-descriptions-item label="DB Status">
        <el-tag :type="device.status === 'online' ? 'success' : 'info'">{{
            device.status
          }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="WebSocket">
        <el-tag :type="device.isConnectedWs ? 'success' : 'danger'">
          {{ device.isConnectedWs ? "Connected" : "Disconnected" }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="IP Address">{{
          device.ipAddress || "N/A"
        }}</el-descriptions-item>
      <el-descriptions-item label="Last Seen">{{
          formatDate(device.lastSeenAt)
        }}</el-descriptions-item>
      <el-descriptions-item label="Registered At">{{
          formatDate(device.registeredAt)
        }}</el-descriptions-item>
    </el-descriptions>
  </el-card>
</template>

<script setup lang="ts">
import type { DevicePublic } from "@/types/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

defineProps<{
  device: DevicePublic;
}>();

const formatDate = (dateString: string | Date): string => {
  if (!dateString) return "N/A";
  return dayjs.utc(dateString).local().format("YYYY-MM-DD HH:mm:ss");
};
</script>