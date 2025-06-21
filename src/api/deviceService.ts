// src/services/deviceService.ts
import apiClient from "./apiClient";
import type { DevicePublic, FetchDeviceParams } from "@/types/api";

export const deviceService = {
  async getDevices(params?: FetchDeviceParams): Promise<DevicePublic[]> {
    // If your API returns { items: [], total: number }, you'd adjust the return type
    // and how you access data. For now, assuming API returns List[DevicePublic] directly.
    return apiClient.get("/devices", { params });
  },

  async getActiveWebSocketDevices(): Promise<DevicePublic[]> {
    // Or SimpleDeviceStatus[]
    return apiClient.get("/devices/active_ws");
  },

  async getDevice(deviceId: string): Promise<DevicePublic> {
    return apiClient.get(`/devices/${deviceId}`);
  },
};
