import { defineStore } from "pinia";
import { suiteService } from "@/api/suiteService";
import type { TestSuitePublic, TestSuiteListPublic, TestSuiteCreatePayload, TestSuiteUpdatePayload } from "@/types/api";

interface SuiteState {
  suites: TestSuiteListPublic[];
  totalSuites: number;
  allSuites: TestSuiteListPublic[];

  isLoading: boolean;
  error: string | null;
  needsRefresh: boolean;
}

export const useSuiteStore = defineStore("suite", {
  state: (): SuiteState => ({
    suites: [],
    totalSuites: 0,
    allSuites: [],
    isLoading: false,
    error: null,
    needsRefresh: false,
  }),
  actions: {
    setNeedsRefresh(status: boolean) {
      this.needsRefresh = status;
    },
    async fetchSuites(params: { skip: number; limit: number; search?: string; categoryId?: number }) {
      this.isLoading = true;
      try {
        // The API call now implicitly fetches linear suites
        const response = await suiteService.getSuites(params);
        this.suites = response.items;
        this.totalSuites = response.total;
        this.error = null;
      } catch (err: any) {
        this.error = err.message || "Failed to fetch linear suites";
      } finally {
        this.isLoading = false;
      }
    },

    async fetchSuiteById(suiteId: number): Promise<TestSuitePublic | null> {
      this.isLoading = true;
      try {
        return await suiteService.getSuiteById(suiteId);
      } catch (err: any) {
        this.error = `Failed to fetch suite ${suiteId}`;
        return null;
      } finally {
        this.isLoading = false;
      }
    },

    async addSuite(payload: TestSuiteCreatePayload) {
      this.isLoading = true;
      try {
        // [修改] 捕获结果并返回它
        const res = await suiteService.createSuite(payload);
        return res;
      } finally {
        this.isLoading = false;
      }
    },

    async updateSuite(suiteId: number, payload: TestSuiteUpdatePayload) {
      this.isLoading = true;
      try {
        await suiteService.updateSuite(suiteId, payload);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchAllSuites() {
      // Fetch only if the list is empty to act as a cache
      if (this.allSuites.length > 0) return;

      this.isLoading = true;
      try {
        const response = await suiteService.getSuites({ skip: 0, limit: 2000 });
        this.allSuites = response.items;
      } catch (err: any) {
        this.error = err.message || "Failed to fetch all linear suites";
      } finally {
        this.isLoading = false;
      }
    },

    async deleteSuite(suiteId: number) {
      this.isLoading = true;
      try {
        await suiteService.deleteSuite(suiteId);
        this.totalSuites = Math.max(0, this.totalSuites - 1);
        this.allSuites = [];
      } finally {
        this.isLoading = false;
      }
    },
  },
});
