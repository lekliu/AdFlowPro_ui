import { defineStore } from "pinia";
import { packageService } from "@/api/packageService";
import type { TestPackagePublic, TestPackageCreatePayload, TestPackageUpdatePayload, TestPackagePublicWithAtoms } from "@/types/api";
import apiClient from "../api/apiClient";

interface PackageState {
  packages: TestPackagePublic[];
    // 【核心隔离】编辑器资源池专用状态
    poolPackages: TestPackagePublic[];
    totalPoolPackages: number;
  totalPackages: number;
  isLoading: boolean;
  error: string | null;
  needsRefresh: boolean;
  forbiddenIds: number[]; // 新增：当前编辑包禁止包含的 ID 列表
}

export const usePackageStore = defineStore("package", {
  state: (): PackageState => ({
    packages: [],
      poolPackages: [],
      totalPoolPackages: 0,
    totalPackages: 0,
    isLoading: false,
    error: null,
    needsRefresh: false,
    forbiddenIds: [],
  }),
  actions: {
    async fetchForbiddenAncestors(packageId: number) {
      try {
        const res = await apiClient.get(`/packages/${packageId}/forbidden-ancestors`);
        this.forbiddenIds = res as unknown as number[];
      } catch (e) {
        this.forbiddenIds = [packageId];
      }
    },
    setNeedsRefresh(status: boolean) {
      this.needsRefresh = status;
    },
    // 专门给列表管理页用
    async fetchPackages(params: { skip: number; limit: number; search?: string; categoryId?: number }) {
      this.isLoading = true;
      try {
        // 核心修复：加载前清空列表，防止旧数据残留导致的 UI 错位
        this.packages = [];
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
      // 【核心隔离】供编辑器调用的独立抓取方法
      async fetchPoolPackages(params: { skip: number; limit: number; search?: string; categoryId?: number }) {
          this.isLoading = true;
          try {
              // 透传所有过滤参数
              const response = await packageService.getPackages(params);
              this.poolPackages = response.items;
              this.totalPoolPackages = response.total;
          } catch (err: any) {
              this.poolPackages = [];
              this.totalPoolPackages = 0;
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
        return await packageService.createPackage(payload);
      } finally {
        this.isLoading = false;
      }
    },

    async updatePackage(packageId: number, payload: TestPackageUpdatePayload) {
      this.isLoading = true;
      try {
        return await packageService.updatePackage(packageId, payload);
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
