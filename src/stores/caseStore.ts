import { defineStore } from "pinia";
import { caseService } from "@/api/caseService";
import type { TestCasePublic, TestCaseListPublic, TestCaseCreatePayload, TestCaseUpdatePayload } from "@/types/api";

interface CaseState {
  cases: TestCaseListPublic[];
  totalCases: number;
  allCases: TestCaseListPublic[]; // 独立池槽位
  isLoading: boolean;
  error: string | null;
  needsRefresh: boolean;
}

export const useCaseStore = defineStore("case", {
  state: (): CaseState => ({
    cases: [],
    totalCases: 0,
    allCases: [],
    isLoading: false,
    error: null,
    needsRefresh: false,
  }),
  actions: {
    setNeedsRefresh(status: boolean) {
      this.needsRefresh = status;
    },
    async fetchCases(params: { skip: number; limit: number; search?: string; categoryId?: number }) {
      this.isLoading = true;
      try {
        const response = await caseService.getCases(params);
        this.cases = response.items;
        this.totalCases = response.total;
        this.error = null;
      } catch (err: any) {
        this.error = err.message || "Failed to fetch cases";
      } finally {
        this.isLoading = false;
      }
    },

    async fetchAllCases() {
      if (this.allCases.length > 0) return;
      this.isLoading = true;
      try {
        const response = await caseService.getCases({ skip: 0, limit: 2000 });
        this.allCases = response.items;
      } catch (err) {
        console.error("Failed to fetch all cases", err);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchCaseById(caseId: number): Promise<TestCasePublic | null> {
      this.isLoading = true;
      try {
        return await caseService.getCaseById(caseId);
      } catch (err: any) {
        this.error = `Failed to fetch case ${caseId}`;
        return null;
      } finally {
        this.isLoading = false;
      }
    },

    async addCase(payload: TestCaseCreatePayload) {
      this.isLoading = true;
      try {
        const res = await caseService.createCase(payload);
        return res; // [关键修复] 返回 API 结果
      } finally {
        this.isLoading = false;
      }
    },

    async updateCase(caseId: number, payload: TestCaseUpdatePayload) {
      this.isLoading = true;
      try {
        const res = await caseService.updateCase(caseId, payload);
        return res; // [关键修复] 返回 API 结果
      } finally {
        this.isLoading = false;
      }
    },

    async deleteCase(caseId: number) {
      this.isLoading = true;
      try {
        await caseService.deleteCase(caseId);
        this.totalCases = Math.max(0, this.totalCases - 1);
      } finally {
        this.isLoading = false;
      }
    },
  },
});
