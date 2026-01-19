// FILE: AdFlowPro_ui/src/api/aiModelService.ts
import apiClient from "./apiClient";
import type { GetUploadUrlResponse, AiModelPublic, PaginatedAiModels, AiModelCreate } from "@/types/api";


export const aiModelService = {
    getModels: (params: any): Promise<PaginatedAiModels> =>
        apiClient.get("/ai-models", { params }),

    getUploadUrl: (fileName: string): Promise<GetUploadUrlResponse> =>
        apiClient.post("/ai-models/get-upload-url", { fileName }),

    notifyUpload: (payload: AiModelCreate): Promise<AiModelPublic> =>
        apiClient.post("/ai-models/notify-upload-complete", payload),

    deleteModel: (modelId: string): Promise<void> =>
        apiClient.delete(`/ai-models/${modelId}`)
};
