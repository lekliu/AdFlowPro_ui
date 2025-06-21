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
    | "wait_for_element";
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
  device_id: string;
  device_name?: string;
  os_version?: string;
  app_version?: string;
  status?: string; // 'online', 'offline', 'busy' (from DB)
  ip_address?: string;
  registered_at: string; // ISO Date string
  last_seen_at: string; // ISO Date string
  is_connected_ws?: boolean; // Live WebSocket status
}

// For GET /api/v1/devices
export interface FetchDeviceParams {
  skip?: number;
  limit?: number;
  status?: string;
  // Add other filter params your API supports
}

// For GET /api/v1/devices/active_ws
export interface SimpleDeviceStatus {
  device_id: string;
  is_connected_ws: boolean;
}

// Add other request/response types as needed
// Example:
// export interface UiNode {
//   resource_id?: string;
//   text?: string;
//   // ... other fields from your UiNodeModel in FastAPI
//   children: UiNode[];
// }

// export interface UiStructureResponse {
//   correlationId: string;
//   structure: UiNode;
//   timestamp: number;
// }
