import apiClient from "./apiClient";
import type { PaginatedResponse, ScheduledTaskPublic, ScheduledTaskCreatePayload, ScheduledTaskUpdatePayload } from "@/types/api";

export const scheduledTaskService = {
  async getTasks(params?: { skip?: number; limit?: number; search?: string }): Promise<PaginatedResponse<ScheduledTaskPublic>> {
    return apiClient.get("/scheduled-tasks", { params });
  },

  async createTask(payload: ScheduledTaskCreatePayload): Promise<ScheduledTaskPublic> {
    return apiClient.post("/scheduled-tasks/", payload);
  },

  async updateTask(scheduleId: number, payload: ScheduledTaskUpdatePayload): Promise<ScheduledTaskPublic> {
    return apiClient.put(`/scheduled-tasks/${scheduleId}`, payload);
  },

  async deleteTask(scheduleId: number): Promise<void> {
    return apiClient.delete(`/scheduled-tasks/${scheduleId}`);
  },
};
