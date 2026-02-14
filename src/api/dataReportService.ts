import apiClient from "./apiClient";

// 1. 定义统计项的接口
export interface StatItem {
    time_bucket: string;
    sum_value: number;
    avg_value: number;
    count_value: number;
    max_value: number;
    min_value: number;
}

export const dataReportService = {
    // 获取所有可用的业务标签
    getLabels: (): Promise<string[]> =>
        apiClient.get("/data-reports/labels"),

    // 分页获取报表记录明细
    getReports: (params: any): Promise<{ total: number; items: any[] }> =>
        apiClient.get("/data-reports/list", { params }),

    // 2. 明确返回类型为 Promise<StatItem[]>
    getStats: (params: { label: string; interval: string; start?: string; end?: string }): Promise<StatItem[]> =>
        apiClient.get("/data-reports/stats", { params }),

    // 批量删除记录
    batchDelete: (ids: number[]) =>
        apiClient.post("/data-reports/batch-delete", { ids }),

    // 获取 Top 10 应用
    getTopApps: (params: { label: string; start?: string; end?: string; deviceId?: string }): Promise<any[]> =>
        apiClient.get("/data-reports/top-apps", { params }),

    // 获取系统告警列表
    getSystemAlarms: (params: any): Promise<{ total: number; items: any[] }> =>
        apiClient.get("/data-reports/alarms/list", { params }),
};