// FILE: AdFlowPro_ui/src/api/imageTemplateService.ts

import apiClient from "./apiClient";
import axios from "axios";
import type {
  PaginatedImageTemplates,
  GetUploadUrlPayload,
  GetUploadUrlResponse,
  UploadCompletePayload,
  ImageTemplate,
  ImageTemplateUpdatePayload,
} from "@/types/api/imageTemplate";

class ImageTemplateService {
  async getTemplates(params: { skip: number; limit: number; search?: string }): Promise<PaginatedImageTemplates> {
    const response = await apiClient.get<PaginatedImageTemplates>("/image-templates", { params });
    return response.data;
  }

  async getTemplateById(templateId: string): Promise<ImageTemplate> {
    // This returns the object directly, no `.data` wrapper needed in the backend for single items
    const response = await apiClient.get<ImageTemplate>(`/image-templates/${templateId}`);
    return response.data;
  }

  async getUploadUrl(payload: GetUploadUrlPayload): Promise<GetUploadUrlResponse> {
    const response = await apiClient.post<GetUploadUrlResponse>("/image-templates/get-upload-url", payload);
    return response.data;
  }

  async notifyUploadComplete(payload: UploadCompletePayload): Promise<ImageTemplate> {
    const response = await apiClient.post<ImageTemplate>("/image-templates/notify-upload-complete", payload);
    return response.data;
  }

  async updateTemplate(templateId: string, payload: ImageTemplateUpdatePayload): Promise<ImageTemplate> {
    const response = await apiClient.put<ImageTemplate>(`/image-templates/${templateId}`, payload);
    return response.data;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await apiClient.delete(`/image-templates/${templateId}`);
  }

  // This is a special method that uses axios directly to upload to MinIO
  async uploadFileToMinio(uploadUrl: string, file: File): Promise<void> {
    // Use the vanilla axios instance, NOT our apiClient with a baseURL.
    await axios.put(uploadUrl, file, {
      headers: {
        "Content-Type": file.type,
      },
    });
  }
}

export const imageTemplateService = new ImageTemplateService();
