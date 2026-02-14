import apiClient from "./apiClient";
import type { AtomicOperationPublic, AtomicOperationCreatePayload, AtomicOperationUpdatePayload, PaginatedResponse, AtomUsageReport } from "@/types/api";

export const atomService = {
  async getAtoms(params?: { skip?: number; limit?: number; search?: string; categoryId?: number }): Promise<PaginatedResponse<AtomicOperationPublic>> {
    return apiClient.get("/atoms", { params });
  },

  async getAtomById(atomId: number): Promise<AtomicOperationPublic> {
    return apiClient.get(`/atoms/${atomId}`);
  },

  async createAtom(payload: AtomicOperationCreatePayload): Promise<AtomicOperationPublic> {
    return apiClient.post("/atoms", payload);
  },

  async updateAtom(atomId: number, payload: AtomicOperationUpdatePayload): Promise<AtomicOperationPublic> {
    return apiClient.put(`/atoms/${atomId}`, payload);
  },

  async deleteAtom(atomId: number): Promise<void> {
    return apiClient.delete(`/atoms/${atomId}`);
  },

  async getAtomUsage(atomId: number): Promise<AtomUsageReport> {
    return apiClient.get(`/atoms/${atomId}/usage`);
  },

  async resetAllStats(): Promise<void> {
    return apiClient.post("/atoms/reset-stats");
  },
};
