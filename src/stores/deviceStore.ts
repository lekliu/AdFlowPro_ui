// src/stores/deviceStore.ts
import { defineStore } from "pinia";
import { deviceService } from "@/api/deviceService"; // You'll create this
import type { DevicePublic, FetchDeviceParams } from "@/types/api"; // Your API types

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
        // Assuming your deviceService.getDevices returns an object like { data: DevicePublic[], total: number }
        // You might need to adjust this based on your actual API response structure
        const response = await deviceService.getDevices(params);
        // If your API returns a flat list and total in headers or another way, adjust this:
        this.devices = response; // Assuming response is directly the list of devices
        this.totalDevices = response.length; // Placeholder, update if API provides total for pagination
        // If API provides total:
        // this.devices = response.items;
        // this.totalDevices = response.totalCount;
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
    // Action to update a device in the list (e.g., after a command that changes its status)
    updateDeviceInList(updatedDevice: DevicePublic) {
      const index = this.devices.findIndex(
        (d) => d.device_id === updatedDevice.device_id
      );
      if (index !== -1) {
        // 使用 Object.assign 或扩展运算符来确保响应性
        this.devices[index] = { ...this.devices[index], ...updatedDevice };
      } else {
        // 如果在列表中找不到，可以选择添加到列表开头
        this.devices.unshift(updatedDevice);
      }
      // 如果更新的设备是当前选中的设备，也更新它
      if (this.selectedDevice?.device_id === updatedDevice.device_id) {
        this.selectedDevice = { ...this.selectedDevice, ...updatedDevice };
      }
    },
  },
});
