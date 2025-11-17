// 文件路径: src/stores/scheduledTaskStore.ts (新文件)

import { defineStore } from "pinia";
import { scheduledTaskService } from "@/api/scheduledTaskService";
import type { ScheduledTaskPublic, ScheduledTaskCreatePayload, ScheduledTaskUpdatePayload } from "@/types/api";

interface ScheduledTaskState {
  tasks: ScheduledTaskPublic[];
  totalTasks: number;
  isLoading: boolean;
  error: string | null;
}

export const useScheduledTaskStore = defineStore("scheduledTask", {
  state: (): ScheduledTaskState => ({
    tasks: [],
    totalTasks: 0,
    isLoading: false,
    error: null,
  }),
  actions: {
    async fetchTasks(params: { skip: number; limit: number; search?: string }) {
      this.isLoading = true;
      try {
        const response = await scheduledTaskService.getTasks(params);
        this.tasks = response.items;
        this.totalTasks = response.total;
        this.error = null;
      } catch (err: any) {
        this.error = err.message || "Failed to fetch scheduled tasks";
      } finally {
        this.isLoading = false;
      }
    },

    async addTask(payload: ScheduledTaskCreatePayload) {
      this.isLoading = true;
      try {
        await scheduledTaskService.createTask(payload);
      } finally {
        this.isLoading = false;
      }
    },

    async updateTask(scheduleId: number, payload: ScheduledTaskUpdatePayload) {
      // For quick toggles, we don't set the global loading state
      // this.isLoading = true;
      try {
        const updatedTask = await scheduledTaskService.updateTask(scheduleId, payload);
        // Update the task in the list for immediate UI feedback
        const index = this.tasks.findIndex((t) => t.scheduleId === scheduleId);
        if (index !== -1) {
          this.tasks[index] = { ...this.tasks[index], ...updatedTask };
        }
      } finally {
        // this.isLoading = false;
      }
    },

    async deleteTask(scheduleId: number) {
      this.isLoading = true;
      try {
        await scheduledTaskService.deleteTask(scheduleId);
        this.totalTasks = Math.max(0, this.totalTasks - 1);
      } finally {
        this.isLoading = false;
      }
    },
  },
});
