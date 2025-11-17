import { defineStore } from "pinia";
import { packageService } from "@/api/packageService";
import type { TestPackagePublic, TestPackageCreatePayload, TestPackageUpdatePayload, TestPackagePublicWithAtoms } from "@/types/api";

interface PackageState {
  packages: TestPackagePublic[];
  totalPackages: number;
  isLoading: boolean;
  error: string | null;
  needsRefresh: boolean;
}

export const usePackageStore = defineStore("package", {
  state: (): PackageState => ({
    packages: [],
    totalPackages: 0,
    isLoading: false,
    error: null,
    needsRefresh: false,
  }),
  actions: {
    setNeedsRefresh(status: boolean) {
      this.needsRefresh = status;
    },
    async fetchPackages(params: { skip: number; limit: number; search?: string }) {
      this.isLoading = true;
      try {
        const response = await packageService.getPackages(params);
        this.packages = response.items;
        this.totalPackages = response.total;
        this.error = null;
      } catch (err: any) {
        this.error = err.message || "Failed to fetch packages";
      } finally {
        this.isLoading = false;
      }
    },

    async fetchPackageById(packageId: number): Promise<TestPackagePublicWithAtoms | null> {
      this.isLoading = true;
      try {
        return await packageService.getPackageById(packageId);
      } catch (err: any) {
        this.error = `Failed to fetch package ${packageId}`;
        return null;
      } finally {
        this.isLoading = false;
      }
    },

    async addPackage(payload: TestPackageCreatePayload) {
      this.isLoading = true;
      try {
        await packageService.createPackage(payload);
      } finally {
        this.isLoading = false;
      }
    },

    async updatePackage(packageId: number, payload: TestPackageUpdatePayload) {
      this.isLoading = true;
      try {
        await packageService.updatePackage(packageId, payload);
      } finally {
        this.isLoading = false;
      }
    },

    async deletePackage(packageId: number) {
      this.isLoading = true;
      try {
        await packageService.deletePackage(packageId);
        this.totalPackages = Math.max(0, this.totalPackages - 1);
      } finally {
        this.isLoading = false;
      }
    },
  },
});
