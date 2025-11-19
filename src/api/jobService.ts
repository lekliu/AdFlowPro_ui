import apiClient from "./apiClient";
import type { JobCreatePayload, JobPublic, PaginatedResponse, JobListPublic, JobDetailPublic } from "@/types/api";

export const jobService = {
  /**
   * 创建并启动一个新的测试任务
   */
  async createJob(payload: JobCreatePayload): Promise<JobPublic> {
    return apiClient.post("/jobs/", payload);
  },

  /**
   * 获取测试任务历史列表
   */
  async getJobs(params: {
    skip: number;
    limit: number;
    status?: string;
    search?: string;
    deviceId?: string;
  }): Promise<PaginatedResponse<JobListPublic>> {
    return apiClient.get("/jobs/", { params });
  },

  /**
   * 根据ID获取单个测试任务的详细信息
   */
  async getJobById(jobId: number): Promise<JobDetailPublic> {
    return apiClient.get(`/jobs/${jobId}`);
  },

  /**
   * 取消一个正在运行的测试任务
   */
  async cancelJob(jobId: number): Promise<JobPublic> {
    return apiClient.post(`/jobs/${jobId}/cancel`);
  },
  /**
   * 下载指定任务的HTML报告
   */
  async downloadHtmlReport(jobId: number): Promise<Blob> {
    return apiClient.get(`/jobs/${jobId}/report/html`, {
      responseType: "blob", // 关键：期望接收二进制文件数据
    });
  },

  /**
   * 删除一个测试任务及其所有关联的产物
   */
  async deleteJob(jobId: number): Promise<void> {
    return apiClient.delete(`/jobs/${jobId}`);
  },
};
