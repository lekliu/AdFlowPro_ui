import apiClient from "./apiClient";
import type { ActionFragmentPublic, ActionFragmentCreatePayload, ActionFragmentUpdatePayload } from "@/types/api";

export const actionFragmentService = {
  async getFragments(params?: { skip?: number; limit?: number; search?: string; categoryId?: number }): Promise<{total: number, items: ActionFragmentPublic[]}> {
    return apiClient.get("/action-fragments", { params });
  },

  async getFragmentById(id: number): Promise<ActionFragmentPublic> {
    return apiClient.get(`/action-fragments/${id}`);
  },

  async createFragment(payload: ActionFragmentCreatePayload): Promise<ActionFragmentPublic> {
    return apiClient.post("/action-fragments", payload);
  },

  async updateFragment(id: number, payload: ActionFragmentUpdatePayload): Promise<ActionFragmentPublic> {
    return apiClient.put(`/action-fragments/${id}`, payload);
  },

  async deleteFragment(id: number): Promise<void> {
    return apiClient.delete(`/action-fragments/${id}`);
  },

  async batchDeleteFragments(ids: number[]): Promise<void> {
    return apiClient.post("/action-fragments/batch-delete", { ids });
  }
};
