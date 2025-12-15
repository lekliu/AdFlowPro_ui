import { defineStore } from "pinia";
import { jobService } from "@/api/jobService";
import type { JobListPublic, JobDetailPublic } from "@/types/api";
import { ElMessage } from "element-plus";

interface JobState {
  jobs: JobListPublic[];
  totalJobs: number;
  currentJobDetails: JobDetailPublic | null;
  isLoading: boolean;
  isDetailsLoading: boolean;
  isCancelling: boolean;
  isExporting: boolean;
  isDeleting: boolean;
  error: string | null;
}

export const useJobStore = defineStore("job", {
  state: (): JobState => ({
    jobs: [],
    totalJobs: 0,
    currentJobDetails: null,
    isLoading: false,
    isDetailsLoading: false,
    isCancelling: false,
    isExporting: false,
    isDeleting: false,
    error: null,
  }),
  actions: {
    async fetchJobs(params: { skip: number; limit: number; status?: string; search?: string; deviceId?: string }) {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await jobService.getJobs(params);
        this.jobs = response.items;
        this.totalJobs = response.total;
      } catch (err: any) {
        this.error = err.message || "Failed to fetch jobs";
        ElMessage.error(this.error || "Unknown error");
      } finally {
        this.isLoading = false;
      }
    },

    async fetchJobDetails(jobId: number) {
      this.isDetailsLoading = true;
      this.error = null;
      this.currentJobDetails = null;
      try {
        this.currentJobDetails = await jobService.getJobById(jobId);
      } catch (err: any) {
        this.error = err.message || `Failed to fetch job details for ID ${jobId}`;
        ElMessage.error(this.error || "Unknown error");
        this.currentJobDetails = null;
      } finally {
        this.isDetailsLoading = false;
      }
    },

    async cancelJob(jobId: number) {
      this.isCancelling = true;
      try {
        const cancelledJob = await jobService.cancelJob(jobId);

        // Optimistically update the job list
        const index = this.jobs.findIndex((job) => job.jobId === jobId);
        if (index !== -1) {
          this.jobs[index].status = "cancelled";
          this.jobs[index].completedAt = cancelledJob.completedAt;
        }

        // Optimistically update the current job details if it's the one being cancelled
        if (this.currentJobDetails?.jobDetails.jobId === jobId) {
          this.currentJobDetails.jobDetails.status = "cancelled";
          this.currentJobDetails.jobDetails.completedAt = cancelledJob.completedAt;
        }

        ElMessage.success(`任务 #${jobId} 已成功发送取消指令。`);
      } catch (err: any) {
        // Error message is handled by apiClient interceptor
        this.error = err.message || `Failed to cancel job #${jobId}`;
      } finally {
        this.isCancelling = false;
      }
    },
    async exportReport(jobId: number) {
      this.isExporting = true;
      try {
        const blob = await jobService.downloadHtmlReport(jobId);

        // 创建一个临时的URL指向内存中的Blob对象
        const url = window.URL.createObjectURL(blob);

        // 创建一个隐藏的<a>标签用于下载
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `adflowpro_report_job_${jobId}.html`);
        document.body.appendChild(link);

        // 模拟点击
        link.click();

        // 清理
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        ElMessage.success(`Job #${jobId} 的报告已开始下载。`);
      } catch (err: any) {
        // 错误消息由 apiClient 拦截器处理
        this.error = err.message || `Failed to export report for job #${jobId}`;
      } finally {
        this.isExporting = false;
      }
    },
    async deleteJob(jobId: number) {
      this.isDeleting = true;
      try {
        await jobService.deleteJob(jobId);

        // Optimistically update the job list
        const index = this.jobs.findIndex((job) => job.jobId === jobId);
        if (index !== -1) {
          this.jobs.splice(index, 1);
          this.totalJobs = Math.max(0, this.totalJobs - 1);
        }
        ElMessage.success(`任务 #${jobId} 已成功删除。`);
      } catch (err: any) {
        // Error message is handled by apiClient interceptor
        this.error = err.message || `Failed to delete job #${jobId}`;
      } finally {
        this.isDeleting = false;
      }
    },
  },
});
