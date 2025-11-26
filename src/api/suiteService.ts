// AdFlowPro_ui/src/api/suiteService.ts (正确的前端TypeScript代码)

import apiClient from "./apiClient";
import type { PaginatedResponse, TestSuitePublic, TestSuiteCreatePayload, TestSuiteUpdatePayload } from "@/types/api";

export const suiteService = {
  /**
   * 获取线性测试套件列表
   */
  async getSuites(params?: { skip?: number; limit?: number; search?: string }): Promise<PaginatedResponse<TestSuitePublic>> {
    return apiClient.get("/suites", { params });
  },

  /**
   * 根据ID获取单个测试套件的详细信息
   */
  async getSuiteById(suiteId: number): Promise<TestSuitePublic> {
    return apiClient.get(`/suites/${suiteId}`);
  },

  /**
   * 创建一个新的测试套件
   */
  async createSuite(payload: TestSuiteCreatePayload): Promise<TestSuitePublic> {
    return apiClient.post("/suites", payload);
  },

  /**
   * 更新一个已有的测试套件
   */
  async updateSuite(suiteId: number, payload: TestSuiteUpdatePayload): Promise<TestSuitePublic> {
    return apiClient.put(`/suites/${suiteId}`, payload);
  },

  /**
   * 删除一个测试套件
   */
  async deleteSuite(suiteId: number): Promise<void> {
    return apiClient.delete(`/suites/${suiteId}`);
  },

  /**
   * 获取用于执行的、完整的、已打包的测试套件 "剧本"
   */
  async getSuitePackage(suiteId: number): Promise<any> {
    return apiClient.get(`/suites/${suiteId}/package`, {
      params: {
        encrypt: false // Request plain JSON for UI preview
      }
    });
  },
};
