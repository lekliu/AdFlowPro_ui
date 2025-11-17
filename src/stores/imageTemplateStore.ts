// FILE: AdFlowPro_ui/src/stores/imageTemplateStore.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import { imageTemplateService } from "@/api/imageTemplateService";
import type { ImageTemplate, ImageTemplateUpdatePayload, UploadCompletePayload } from "@/types/api/imageTemplate";

export const useImageTemplateStore = defineStore("imageTemplate", () => {
  const templates = ref<ImageTemplate[]>([]);
  const total = ref(0);
  const isLoading = ref(false);

  // --- 用于对话框选择器的完整列表 ---
  const allTemplates = ref<ImageTemplate[]>([]);
  const isLoadingAll = ref(false);

  async function fetchTemplates(params: { skip: number; limit: number; search?: string }) {
    isLoading.value = true;
    try {
      const data = await imageTemplateService.getTemplates(params);
      templates.value = data.items;
      total.value = data.total;
    } catch (error) {
      console.error("Failed to fetch image templates:", error);
      // Error is handled by apiClient interceptor
    } finally {
      isLoading.value = false;
    }
  }

  // --- 获取所有图元模板的方法 ---
  async function fetchAllTemplates() {
    if (allTemplates.value.length > 0) return;
    isLoadingAll.value = true;
    try {
      // Fetch with a large limit to get all items
      const data = await imageTemplateService.getTemplates({ skip: 0, limit: 2000 });
      allTemplates.value = data.items;
    } catch (error) {
      console.error("Failed to fetch all image templates:", error);
    } finally {
      isLoadingAll.value = false;
    }
  }

  async function addTemplate(payload: UploadCompletePayload) {
    const newTemplate = await imageTemplateService.notifyUploadComplete(payload);
    allTemplates.value = []; // Invalidate cache
    return newTemplate;
  }

  async function updateTemplate(templateId: string, payload: ImageTemplateUpdatePayload) {
    const updatedTemplate = await imageTemplateService.updateTemplate(templateId, payload);
    allTemplates.value = []; // Invalidate cache
    return updatedTemplate;
  }

  async function deleteTemplate(templateId: string) {
    await imageTemplateService.deleteTemplate(templateId);
    allTemplates.value = [];
  }

  return {
    templates,
    total,
    isLoading,
    allTemplates,
    isLoadingAll,
    fetchAllTemplates,
    fetchTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
  };
});
