// src/stores/deviceStore.ts
import { defineStore } from "pinia";
import { deviceService } from "@/api/deviceService";
import type { DevicePublic, FetchDeviceParams } from "@/types/api";

interface DeviceState {
  devices: DevicePublic[];
  selectedDevice: DevicePublic | null;
  totalDevices: number;
  isLoading: boolean;
  error: string | null;
}

export const useDeviceStore = defineStore("device", {
  state: (): DeviceState => ({
    devices: [],
    selectedDevice: null,
    totalDevices: 0,
    isLoading: false,
    error: null,
  }),
  actions: {
    async fetchDevices(params?: FetchDeviceParams) {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await deviceService.getDevices(params);
        this.devices = response;
        // 注意：当前后端 /devices 接口没有返回 total，所以这里用列表长度作为 total
        // 后续如果实现真实分页，后端需要返回 { items: [], total: number } 结构
        this.totalDevices = response.length;
      } catch (err: any) {
        this.error = err.message || "Failed to fetch devices";
        this.devices = [];
        this.totalDevices = 0;
        console.error(this.error);
      } finally {
        this.isLoading = false;
      }
    },
    async fetchDeviceDetails(deviceId: string) {
      this.isLoading = true;
      this.error = null;
      try {
        this.selectedDevice = await deviceService.getDevice(deviceId);
      } catch (err: any) {
        this.error = err.message || `Failed to fetch device ${deviceId}`;
        this.selectedDevice = null;
        console.error(this.error);
      } finally {
        this.isLoading = false;
      }
    },
    // ==================== 核心修复区域 开始 ====================
    updateDeviceInList(updatedDevice: DevicePublic) {
      // FIX: 使用正确的属性名 deviceId (camelCase) 进行比较
      const index = this.devices.findIndex(
        (d) => d.deviceId === updatedDevice.deviceId
      );

      if (index !== -1) {
        // 如果找到了，就地更新，以保持响应性
        this.devices[index] = { ...this.devices[index], ...updatedDevice };
      } else {
        // 如果在列表中找不到（理论上不应该发生），作为保险措施，添加到列表开头
        // 这种情况可能在列表数据与实际不一致时出现
        this.devices.unshift(updatedDevice);
        console.warn(
          "Updated device not found in list, added to top.",
          updatedDevice
        );
      }

      // 同样，更新当前选中的设备时也使用正确的属性名
      if (this.selectedDevice?.deviceId === updatedDevice.deviceId) {
        this.selectedDevice = { ...this.selectedDevice, ...updatedDevice };
      }
    },
    // ==================== 核心修复区域 结束 ====================
  },
});
