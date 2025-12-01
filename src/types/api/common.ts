// 文件路径: src/types/api/common.ts

// --- L0: 基础定义 ---

/**
 * 通用UI元素选择器
 */
export interface Selector {
  resourceId?: string;
  text?: string;
  contentDesc?: string;
  className?: string;
  xpath?: string;
  bounds?: string; // Format: "[left, top, right, bottom]"
  index?: number;
}

/**
 * 执行动作的参数
 */
export interface PerformActionParameters {
  text?: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  duration?: number;
  keyCode?: "home" | "back" | "recents";
  offsetX?: number;
  offsetY?: number;
  reportLabel?: string;
  comparisonOperator?: string;
  leftSource?: "regex" | "variable";
  leftValue?: string;
  rightSource?: "value" | "variable" | "regex";
  rightValue?: string;
  targetStateLabel?: string;
}

/**
 * 执行动作的负载
 */
export interface PerformActionPayload {
  correlationId?: string;
  action:
    | "click"
    | "long_click"
    | "swipe"
    | "input_text"
    | "tap"
    | "wait"
    | "press_key"
    | "wake_up" | "jump_to_state"
    | "sleep"
    | "tap_relative"
    | "wait_dynamic"
    | "report_value"
    | "calculate_value"
    | "end_case"
    | "reopen_app_if_needed"
    | "assert_element_exists"
    | "assert_text_equals"
    | "conditional_tap";
  selector?: Selector;
  parameters?: PerformActionParameters;
}

/**
 * 通用分页响应
 */
export interface PaginatedResponse<T> {
  total: number;
  items: T[];
}

/**
 * 通用命令响应
 */
export interface CommandResponse {
  status: string;
  message: string;
  deviceId: string;
  correlationId?: string;
}

export interface RequestScreenCapturePayload {
  correlationId: string;
  format?: "jpeg" | "png";
  quality?: number;
  maxWidth?: number;
}

/**
 * 后端 /execute-action-sequence 端点的响应体
 */
export interface ExecuteActionResponse {
  correlationId: string;
  message: string;
}

export interface FoundNodeInfo {
  text: string | null;
  contentDescription: string | null;
  boundsInScreen: number[]; // [left, top, right, bottom]
  source: "ui" | "ocr" | "image";
}

/**
 * 客户端 (App) 上报的动作执行结果负载
 * 这是 /action-result/{correlationId} 端点返回的数据结构
 */
export interface ActionResultPayload {
  correlationId: string;
  commandType: string;
  success: boolean;
  message?: string;
  details?: Record<string, any>;
  foundNode?: FoundNodeInfo;
  regexGroups?: string[];
}
