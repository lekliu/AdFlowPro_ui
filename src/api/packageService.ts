import apiClient from "./apiClient";
import type {
  TestPackagePublic,
  TestPackageCreatePayload,
  TestPackageUpdatePayload,
  PaginatedResponse,
  TestPackagePublicWithAtoms,
} from "@/types/api";

export const packageService = {
  async getPackages(params?: { skip?: number; limit?: number; search?: string; isCommon?: boolean }): Promise<PaginatedResponse<TestPackagePublic>> {
    return apiClient.get("/packages", { params });
  },

  async getPackageById(packageId: number): Promise<TestPackagePublicWithAtoms> {
    return apiClient.get(`/packages/${packageId}`);
  },

  async createPackage(payload: TestPackageCreatePayload): Promise<TestPackagePublic> {
    return apiClient.post("/packages", payload);
  },

  async updatePackage(packageId: number, payload: TestPackageUpdatePayload): Promise<TestPackagePublic> {
    return apiClient.put(`/packages/${packageId}`, payload);
  },

  async deletePackage(packageId: number): Promise<void> {
    return apiClient.delete(`/packages/${packageId}`);
  },
};
