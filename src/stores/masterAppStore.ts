// AdFlowPro_ui\src\stores\masterAppStore.ts

import { defineStore } from "pinia";
import { masterAppService } from "@/api/masterAppService";
import type { MasterAppPublic, MasterAppCreatePayload, MasterAppUpdatePayload } from "@/types/api";
import { ElMessage } from "element-plus";

interface MasterAppState {
  apps: MasterAppPublic[];
  totalApps: number;
  isLoading: boolean;
  error: string | null;
}

export const useMasterAppStore = defineStore("masterApp", {
  state: (): MasterAppState => ({
    apps: [],
    totalApps: 0,
    isLoading: false,
    error: null,
  }),
  actions: {
    async fetchApps(params: { skip: number; limit: number; search?: string; suiteSearch?: string }) {
      this.isLoading = true;
      try {
        const response = await masterAppService.getMasterApps(params);
        this.apps = response.items;
        this.totalApps = response.total;
        this.error = null;
      } catch (err: any) {
        const errorMessage = err.message || "Failed to fetch master apps";
        this.error = errorMessage;
        ElMessage.error(this.error || "发生未知错误");
        this.apps = [];
        this.totalApps = 0;
      } finally {
        this.isLoading = false;
      }
    },
    async addApp(payload: MasterAppCreatePayload) {
      this.isLoading = true;
      try {
        const newApp = await masterAppService.createMasterApp(payload);
        this.apps.unshift(newApp); // Add to the top of the list
        ElMessage.success("应用添加成功！");
      } catch (err: any) {
        this.error = err.message || "Failed to add app";
        // The API client interceptor will already show an error message
      } finally {
        this.isLoading = false;
      }
    },
    async editApp(appId: number, payload: MasterAppUpdatePayload) {
      this.isLoading = true;
      try {
        const updatedApp = await masterAppService.updateMasterApp(appId, payload);
        const index = this.apps.findIndex((a) => a.appId === appId);
        if (index !== -1) {
          this.apps[index] = updatedApp;
        }
        ElMessage.success("应用更新成功！");
      } catch (err: any) {
        this.error = err.message || "Failed to update app";
      } finally {
        this.isLoading = false;
      }
    },
    async removeApp(appId: number, deleteFiles: boolean) {
      this.isLoading = true;
      try {
        await masterAppService.deleteMasterApp(appId, deleteFiles);

        this.apps = this.apps.filter((a) => a.appId !== appId);
        ElMessage.success("应用删除成功！");
      } catch (err: any) {
        this.error = err.message || "Failed to delete app";
      } finally {
        this.isLoading = false;
      }
    },
  },
});
