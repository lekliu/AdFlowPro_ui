// 文件路径: src/types/api/device.ts (新文件)

/**
 * 设备公开信息
 */
export interface DevicePublic {
  deviceId: string;
  deviceName?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  status?: string;
  ipAddress?: string;
  registeredAt: string;
  lastSeenAt: string;
  isConnectedWs?: boolean;
}

/**
 * 获取设备列表的参数
 */
export interface FetchDeviceParams {
  skip?: number;
  limit?: number;
  status?: string;
}

/**
 * 更新设备的负载
 */
export interface DeviceUpdatePayload {
  deviceName?: string;
}

/**
 * OCR结果
 */
export interface OcrPayload {
  fullText: string;
  elements: {
    text: string;
    left: number;
    top: number;
    right: number;
    bottom: number;
  }[];
}

/**
 * 设备上已安装的应用
 */
export interface DeviceInstalledApp {
  id: number;
  deviceId: string;
  appName: string;
  packageName: string;
  versionName?: string;
  versionCode?: number;
  launchActivity?: string;
  isSystemApp: boolean;
  isInMaster: boolean;
  lastSyncedAt: string;
  defaultSuiteId?: number | null;
  defaultSuiteName?: string | null;
  lastRunAt?: string;
  lastStatus?: string;
  lastFailReason?: string;
  lastDurationS?: number;
}

/**
 * UI 树中的单个节点
 */
export interface UiNode {
  depth: number;
  className?: string;
  packageName?: string;
  text?: string;
  contentDescription?: string;
  viewIdResourceName?: string;
  boundsInScreen?: [number, number, number, number];
  isClickable?: boolean;
  isEditable?: boolean;
  children?: UiNode[];
}

// --- Remote Debugging ---
export interface DebugModePayload {
    enabled: boolean;
    tags: string[];
}
export interface DebugModeStatus {
    enabled: boolean;
    tags: string[];
}
