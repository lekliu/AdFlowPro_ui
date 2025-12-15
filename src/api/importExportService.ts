import apiClient from "./apiClient";
import type { WrappedDataResponse } from "@/types/api/common";
import type { ImportSummary } from "@/types/api/importExport";



export const importExportService = {
    /**
     * 上传 .afp 文件并触发导入
     */
    async importAssets(file: File): Promise<ImportSummary> {
        const formData = new FormData();
        formData.append("file", file);

        // 使用 apiClient.post 发送 multipart/form-data
        const response = await apiClient.post<WrappedDataResponse<ImportSummary>>(
            "/maintenance/import",
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );
        // 如果后端返回的是 { data: T } 结构，我们返回 T
        return (response as any).data;
    },

    /**
     * 导出指定的原子操作
     */
    async exportAtoms(atomIds: number[]): Promise<Blob> {
        return apiClient.post<Blob>("/maintenance/export/atoms", atomIds, {
            responseType: "blob",
        })as unknown as Promise<Blob>; // 断言：拦截器返回 Blob 对象
    },

    /**
     * 导出指定的测试包
     */
    async exportPackages(packageIds: number[]): Promise<Blob> {
        return apiClient.post<Blob>("/maintenance/export/packages", packageIds, {
            responseType: "blob",
        })as unknown as Promise<Blob>; // 断言：拦截器返回 Blob 对象
    },

    /**
     * 导出指定的测试用例
     */
    async exportCases(caseIds: number[]): Promise<Blob> {
        return apiClient.post<Blob>("/maintenance/export/cases", caseIds, {
            responseType: "blob",
        })as unknown as Promise<Blob>; // 断言：拦截器返回 Blob 对象
    },

    /**
     * 导出指定的测试套件
     */
    async exportSuites(suiteIds: number[]): Promise<Blob> {
        return apiClient.post<Blob>("/maintenance/export/suites", suiteIds, {
            responseType: "blob",
        })as unknown as Promise<Blob>; // 断言：拦截器返回 Blob 对象
    },
};
