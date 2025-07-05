// src/services/deviceService.ts
import apiClient from "./apiClient";
import type {
  DevicePublic,
  FetchDeviceParams,
  DeviceUpdatePayload,
  OcrPayload,
} from "@/types/api";

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
  // 添加更新设备的方法 <<
  async updateDevice(
    deviceId: string,
    payload: DeviceUpdatePayload
  ): Promise<DevicePublic> {
    return apiClient.put(`/devices/${deviceId}`, payload);
  },
  // 获取最新截图的方法 <<
  async getLatestScreenshot(deviceId: string): Promise<Blob> {
    return apiClient.get(`/devices/${deviceId}/last_screenshot`, {
      responseType: "blob", // 关键：告诉axios期望接收二进制数据
      // 添加缓存破坏者
      params: {
        _t: new Date().getTime(),
      },
    });
  },
  // 获取最新OCR结果的方法 <<
  async getLatestOcrResult(deviceId: string): Promise<OcrPayload | null> {
    // APIClient 的拦截器会自动处理 404 等错误，如果404，这里会抛出异常
    // 我们需要在调用处用 try/catch 来处理这种情况
    return apiClient.get(`/devices/${deviceId}/last_ocr_result`, {
      // 添加缓存破坏者
      params: {
        _t: new Date().getTime(),
      },
    });
  },
  // 获取最新UI结构的方法 <<
  async getLatestUiStructure(deviceId: string): Promise<any> {
    return apiClient.get(`/devices/${deviceId}/last_ui_structure`, {
      // 添加缓存破坏者
      params: {
        _t: new Date().getTime(),
      },
    });
  },
};
