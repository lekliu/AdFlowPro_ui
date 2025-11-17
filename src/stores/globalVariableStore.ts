import { defineStore } from "pinia";
import { globalVariableService } from "@/api/globalVariableService";
import type { GlobalVariablePublic, GlobalVariableCreatePayload, GlobalVariableUpdatePayload } from "@/types/api";

interface VariableState {
  variables: GlobalVariablePublic[];
  totalVariables: number;
  isLoading: boolean;
  error: string | null;
}

export const useGlobalVariableStore = defineStore("globalVariable", {
  state: (): VariableState => ({
    variables: [],
    totalVariables: 0,
    isLoading: false,
    error: null,
  }),
  actions: {
    async fetchVariables(params: { skip: number; limit: number; search?: string }) {
      this.isLoading = true;
      try {
        const response = await globalVariableService.getVariables(params);
        this.variables = response.items;
        this.totalVariables = response.total;
        this.error = null;
      } catch (err: any) {
        this.error = err.message || "Failed to fetch global variables";
      } finally {
        this.isLoading = false;
      }
    },

    async addVariable(payload: GlobalVariableCreatePayload) {
      this.isLoading = true;
      try {
        await globalVariableService.createVariable(payload);
        // 通常创建后会刷新列表，而不是只在前端添加
        // this.fetchVariables({ skip: 0, limit: /* your page size */ });
      } finally {
        this.isLoading = false;
      }
    },

    async updateVariable(variableId: number, payload: GlobalVariableUpdatePayload) {
      this.isLoading = true;
      try {
        await globalVariableService.updateVariable(variableId, payload);
      } finally {
        this.isLoading = false;
      }
    },

    async deleteVariable(variableId: number) {
      this.isLoading = true;
      try {
        await globalVariableService.deleteVariable(variableId);
        this.totalVariables = Math.max(0, this.totalVariables - 1);
      } finally {
        this.isLoading = false;
      }
    },
  },
});
