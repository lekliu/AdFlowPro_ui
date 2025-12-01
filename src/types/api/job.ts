// 文件路径: src/types/api/job.ts (新文件)

import type { DevicePublic } from "./device";
import type { TestSuitePublic } from "./testAsset";

/**
 * 创建任务的负载
 */
export interface JobCreatePayload {
  suiteId: number;
  targetAppPackageName: string;
  deviceId: string;
}

/**
 * 任务公开信息
 */
export interface JobPublic {
  jobId: number;
  suite: TestSuitePublic;
  targetAppPackageName: string;
  device: DevicePublic;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ResultCreatePayload {
  stepName: string;
  stepType: string;
  status: "success" | "failure";
  log?: string;
  screenshotUrl?: string;
  reportedValue?: string;
  durationMs?: number;
  failureContextJson?: Record<string, any>;
  stepDetails?: Record<string, any>;
}

export interface ResultPublic extends ResultCreatePayload {
  resultId: number;
  jobId: number;
  createdAt: string;
}

// --- 任务报告与历史记录 ---

export interface JobListPublic {
  jobId: number;
  suiteName: string;
  targetAppPackageName: string;
  deviceName?: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface JobDetailPublic {
  jobDetails: JobPublic;
  results: ResultPublic[];
}
