import apiClient from "./apiClient";
import type {
  TestCasePublic,
  TestCaseListPublic,
  TestCaseCreatePayload,
  TestCaseUpdatePayload,
  PaginatedResponse,
} from "@/types/api";

export const caseService = {
  async getCases(params?: {
    skip?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<TestCaseListPublic>> {
    return apiClient.get("/cases", { params });
  },

  async getCaseById(caseId: number): Promise<TestCasePublic> {
    return apiClient.get(`/cases/${caseId}`);
  },

  async createCase(payload: TestCaseCreatePayload): Promise<TestCasePublic> {
    return apiClient.post("/cases", payload);
  },

  async updateCase(caseId: number, payload: TestCaseUpdatePayload): Promise<TestCasePublic> {
    return apiClient.put(`/cases/${caseId}`, payload);
  },

  async deleteCase(caseId: number): Promise<void> {
    return apiClient.delete(`/cases/${caseId}`);
  },
};
