// FILE: AdFlowPro_ui/src/api/deviceService.ts
import apiClient from "./apiClient";
import type { DevicePublic, FetchDeviceParams, DeviceUpdatePayload, OcrPayload, CommandResponse, DeviceInstalledApp } from "@/types/api";

// 我们需要为卸载和安装定义Payload类型
interface UninstallPayload {
  packageName: string;
}
interface InstallPayload {
  appId: number;
  deviceIds: string[];
}

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
  async updateDevice(deviceId: string, payload: DeviceUpdatePayload): Promise<DevicePublic> {
    return apiClient.put(`/devices/${deviceId}`, payload);
  },
  // 获取设备已安装应用列表 <<
  async getInstalledApps(deviceId: string): Promise<DeviceInstalledApp[]> {
    return apiClient.get(`/devices/${deviceId}/installed-apps`, {
      params: {
        _t: new Date().getTime(),
      },
    });
  },

  // 卸载应用 <<
  async uninstallApp(deviceId: string, packageName: string): Promise<CommandResponse> {
    const payload: UninstallPayload = { packageName };
    return apiClient.post(`/devices/${deviceId}/uninstall`, payload);
  },

  // 拉取并上传APK <<
  async pullApk(deviceId: string, packageName: string): Promise<CommandResponse> {
    return apiClient.post(`/devices/${deviceId}/pull-apk`, { packageName });
  },

  // 远程安装应用 (如果之前没加) <<
  async installApp(appId: number, deviceIds: string[]): Promise<CommandResponse> {
    const payload: InstallPayload = { appId, deviceIds };
    // Call the new, clearer endpoint
    return apiClient.post(`/devices/install-app`, payload);
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
  async refreshApps(deviceId: string): Promise<CommandResponse> {
    return apiClient.post(`/devices/${deviceId}/refresh-apps`);
  },
  async getInstallTargets(packageName: string, versionCode: number): Promise<DevicePublic[]> {
    // 调用修正后的、语义正确的后端API
    return apiClient.get("/devices/for-install", {
      params: {
        package_name: packageName,
        version_code: versionCode,
      },
    });
  },
};
