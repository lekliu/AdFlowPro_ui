// 文件路径: src/types/api/scheduledTask.ts (新文件)

import type { ApiBaseModel } from "./common";

/**
 * 定时任务的基础负载
 */
export interface ScheduledTaskBasePayload {
  name: string;
  description?: string;
  suiteId: number;
  suiteType: "linear" | "flow";
  targetAppPackageName: string;
  deviceId: string;
  cronExpression: string;
  isEnabled: boolean;
}

/**
 * 创建定时任务的负载
 */
export interface ScheduledTaskCreatePayload extends ScheduledTaskBasePayload {}

/**
 * 更新定时任务的负载
 */
export interface ScheduledTaskUpdatePayload extends Partial<ScheduledTaskBasePayload> {
  suiteType?: "linear" | "flow";
}

/**
 * 定时任务的公开信息模型
 */
export interface ScheduledTaskPublic extends ScheduledTaskBasePayload {
  scheduleId: number;
  nextRunTime?: string; // DateTime will be a string
  createdAt: string;
  updatedAt: string;
  // For UI display
  suiteName?: string;
  deviceName?: string;
}
