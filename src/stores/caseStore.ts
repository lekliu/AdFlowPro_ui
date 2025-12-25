import { defineStore } from "pinia";
import { caseService } from "@/api/caseService";
import type { TestCasePublic, TestCaseListPublic, TestCaseCreatePayload, TestCaseUpdatePayload } from "@/types/api";

interface CaseState {
  cases: TestCaseListPublic[];
  totalCases: number;
  isLoading: boolean;
  error: string | null;
  needsRefresh: boolean;
}

export const useCaseStore = defineStore("case", {
  state: (): CaseState => ({
    cases: [],
    totalCases: 0,
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
        await caseService.createCase(payload);
      } finally {
        this.isLoading = false;
      }
    },

    async updateCase(caseId: number, payload: TestCaseUpdatePayload) {
      this.isLoading = true;
      try {
        await caseService.updateCase(caseId, payload);
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
