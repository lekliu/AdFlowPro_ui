import apiClient from "./apiClient";
import type { GlobalVariablePublic, GlobalVariableCreatePayload, GlobalVariableUpdatePayload, PaginatedResponse } from "@/types/api";

export const globalVariableService = {
  async getVariables(params?: { skip?: number; limit?: number; search?: string }): Promise<PaginatedResponse<GlobalVariablePublic>> {
    return apiClient.get("/global-variables", { params });
  },

  async createVariable(payload: GlobalVariableCreatePayload): Promise<GlobalVariablePublic> {
    return apiClient.post("/global-variables/", payload);
  },

  async updateVariable(variableId: number, payload: GlobalVariableUpdatePayload): Promise<GlobalVariablePublic> {
    return apiClient.put(`/global-variables/${variableId}`, payload);
  },

  async deleteVariable(variableId: number): Promise<void> {
    return apiClient.delete(`/global-variables/${variableId}`);
  },
};
