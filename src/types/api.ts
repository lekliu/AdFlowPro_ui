// src/types/api.ts

// Based on FastAPI models/schemas.py

export interface Selector {
  resourceId?: string;
  text?: string;
  contentDesc?: string;
  className?: string;
  xpath?: string;
  index?: number;
}

export interface PerformActionParameters {
  text?: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  duration?: number; // ms
  direction?: "forward" | "backward" | "left" | "right";
  timeout_ms?: number;
  keyCode?: "home" | "back" | "recents";
}

export interface PerformActionPayload {
  correlationId?: string; // Optional for request, backend will generate if missing
  action:
    | "click"
    | "long_click"
    | "swipe"
    | "input_text"
    | "get_text"
    | "exists"
    | "scroll_to_view"
    | "scroll_view"
    | "wait_for_element"
    | "press_key"
    | "wake_up"
    | "sleep";
  selector?: Selector;
  parameters?: PerformActionParameters;
}

export interface RequestScreenCapturePayload {
  correlationId?: string; // Optional for request
  format?: "jpeg" | "png";
  quality?: number; // 1-100
  maxWidth?: number;
}

// API Response for commands
export interface CommandResponse {
  status: string;
  message: string;
  device_id: string;
  correlation_id?: string;
}

// Device information from GET /api/v1/devices/{device_id}
export interface DevicePublic {
  deviceId: string;
  deviceName?: string;
  deviceModel?: string; // 您后端模型里有，这里可以加上
  osVersion?: string;
  appVersion?: string;
  status?: string;
  ipAddress?: string;
  registeredAt: string;
  lastSeenAt: string;
  isConnectedWs?: boolean;
}

// For GET /api/v1/devices
export interface FetchDeviceParams {
  skip?: number;
  limit?: number;
  status?: string;
  // Add other filter params your API supports
}

// 添加设备更新的Payload类型 <<
export interface DeviceUpdatePayload {
  deviceName?: string;
}

// For GET /api/v1/devices/active_ws
export interface SimpleDeviceStatus {
  deviceId: string;
  isConnectedWs: boolean;
}

export interface OcrPayload {
  full_text: string;
  elements: {
    text: string;
    left: number;
    top: number;
    right: number;
    bottom: number;
  }[];
}
