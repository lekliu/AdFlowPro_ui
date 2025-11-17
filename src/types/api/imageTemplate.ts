// FILE: AdFlowPro_ui/src/types/api/imageTemplate.ts

export interface ImageTemplate {
  templateId: string;
  name: string;
  description: string | null;
  publicUrl: string;
  fileSize: number | null;
  imageWidth: number | null;
  imageHeight: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedImageTemplates {
  total: number;
  items: ImageTemplate[];
}

export interface GetUploadUrlPayload {
  fileName: string;
  contentType: string;
}

export interface GetUploadUrlResponse {
  uploadUrl: string;
  objectName: string;
}

export interface UploadCompletePayload {
  name: string;
  description: string | null;
  objectName: string;
  fileSize: number;
  imageWidth: number;
  imageHeight: number;
}

export interface ImageTemplateUpdatePayload {
  name?: string;
  description?: string;
}
