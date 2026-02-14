import apiClient from "./apiClient";

export const aiImageService = {
    // 获取采样截图列表
    getImageList: (params: { prefix?: string; skip: number; limit: number }): Promise<{ total: number; items: any[] }> =>
        apiClient.get("/ai-images/list", { params }),

    // 批量删除
    deleteImages: (paths: string[]) =>
        apiClient.post("/ai-images/batch-delete", { paths }),

    // 修改：在参数列表中增加 projectId?: number | null
    pushToCvat: (payload: {
        taskName: string;
        images: string[];
        cvatUrl: string;
        cvatToken: string;
        projectId?: number | null
    }) =>
        apiClient.post("/ai-images/push-to-cvat", payload),

    // 修改：批量下载改为获取 Blob
    batchDownload: (paths: string[]): Promise<Blob> =>
        apiClient.post("/ai-images/batch-download", { paths }, { responseType: 'blob' }),

    // 触发远程采集指令
    remoteCapture: (deviceId: string, payload: { prefix: string, correlationId: string }) =>
        apiClient.post(`/devices/${deviceId}/ai-capture`, payload),
};