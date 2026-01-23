// FILE: AdFlowPro_ui/src/stores/aiModelStore.ts (New File)
import { defineStore } from "pinia";
import { ref } from "vue";
import { aiModelService } from "@/api/aiModelService";
import type { AiModelPublic, AiModelCreate } from "@/types/api";

export const useAiModelStore = defineStore("aiModel", () => {
    const models = ref<any[]>([]);
    const total = ref(0);
    const isLoading = ref(false);

    async function fetchModels(params: any = { skip: 0, limit: 100 }) {
        isLoading.value = true;
        try {
            const response = await aiModelService.getModels(params);
            // response 已经是后端返回的整个对象 {"total":..., "items":...}
            const rawItems = response.items || [];

            // 核心修复：极致鲁棒的字段转换
            models.value = rawItems.map((m: any) => ({
                ...m,
                // 确保 modelId 键一定存在
                modelId: m.modelId || m.model_id || m.id,
            }));
            total.value = response.total || 0;
        } catch (error) {
            console.error("Failed to fetch AI models:", error);
        } finally {
            isLoading.value = false;
        }
    }

    async function addModel(payload: any) {
        const newModel = await aiModelService.notifyUpload(payload);
        models.value.unshift(newModel);
        return newModel;
    }

    async function removeModel(modelId: string) {
        await aiModelService.deleteModel(modelId);
        // 核心修复：确保本地状态同步删除成功
        models.value = models.value.filter(m => m.modelId !== modelId);
    }

    return {
        models,
        total,
        isLoading,
        fetchModels,
        addModel,
        removeModel
    };
});
