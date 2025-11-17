// AdFlowPro_ui\src\api\masterAppService.ts

import apiClient from "./apiClient";
import type { MasterAppPublic, MasterAppCreatePayload, MasterAppUpdatePayload, PaginatedResponse, DevicePublic } from "@/types/api";

export const masterAppService = {
  async getMasterApps(params?: { skip?: number; limit?: number; search?: string }): Promise<PaginatedResponse<MasterAppPublic>> {
    return apiClient.get("/master-apps", { params });
  },

  async createMasterApp(payload: MasterAppCreatePayload): Promise<MasterAppPublic> {
    return apiClient.post("/master-apps", payload);
  },

  async updateMasterApp(appId: number, payload: MasterAppUpdatePayload): Promise<MasterAppPublic> {
    return apiClient.put(`/master-apps/${appId}`, payload);
  },

  async deleteMasterApp(appId: number, deleteFiles: boolean): Promise<void> {
    // API returns 204 No Content, so the response data is void
    return apiClient.delete(`/master-apps/${appId}`, {
      params: { deleteFiles }, // 将参数作为 query string 发送
    });
  },

  async getPullSources(packageName: string): Promise<DevicePublic[]> {
    return apiClient.get(`/master-apps/pull-sources/${packageName}`);
  },
};
