// FILE: AdFlowPro_ui/src/types/api/aiModel.ts
import type { PaginatedResponse } from "./common";

export interface AiModelBase {
    name: string;
    description: string | null;
    labels: string[];
    inputSize: number;
}

export interface AiModelPublic extends AiModelBase {
    modelId: string;
    objectName: string;
    fileSize: number | null;
    publicUrl: string;
    createdAt: string;
    updatedAt: string;
}

export interface AiModelCreate extends AiModelBase {
    objectName: string;
    fileSize: number;
}

export interface GetUploadUrlPayload {
    fileName: string;
}

export interface GetUploadUrlResponse {
    uploadUrl: string;
    objectName: string;
}

export type PaginatedAiModels = PaginatedResponse<AiModelPublic>;
