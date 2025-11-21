// 文件路径: src/types/api/masterApp.ts (新文件)

/**
 * 主应用公开信息
 */
export interface MasterAppPublic {
  appId: number;
  appName: string;
  packageName: string;
  description?: string;
  apkUrl?: string;
  versionName?: string;
  versionCode?: number;
  weight: number;
  defaultSuiteId?: number | null;
  defaultSuiteName?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建主应用的负载
 */
export interface MasterAppCreatePayload {
  appName: string;
  packageName: string;
  description?: string;
  apkUrl?: string;
  defaultSuiteId?: number | null;
  weight: number;
}

/**
 * 更新主应用的负载
 */
export interface MasterAppUpdatePayload {
  appName?: string;
  description?: string;
  apkUrl?: string;
  defaultSuiteId?: number | null;
  weight?: number;
}
