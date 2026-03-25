import { defineStore } from "pinia";
import { ref } from "vue";
import { actionFragmentService } from "@/api/actionFragmentService";
import type { ActionFragmentPublic, ActionFragmentCreatePayload, ActionFragmentUpdatePayload } from "@/types/api";

export const useActionFragmentStore = defineStore("actionFragment", () => {
  const fragments = ref<ActionFragmentPublic[]>([]);
  const allFragments = ref<ActionFragmentPublic[]>([]); // 用于下拉选择的完整缓存
  const total = ref(0);
  const isLoading = ref(false);

  const needsRefresh = ref(false);
  function setNeedsRefresh(status: boolean) {
    needsRefresh.value = status;
  }

  async function fetchFragments(params: any) {
    isLoading.value = true;
    try {
      const res = await actionFragmentService.getFragments(params);
      fragments.value = res.items;
      total.value = res.total;
      needsRefresh.value = false; // 取数成功后重置标记
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchAllForSelect() {
    // 如果已有数据则不重复请求，除非手动刷新
    if (allFragments.value.length > 0) return;
    try {
      const res = await actionFragmentService.getFragments({ skip: 0, limit: 2000 });
      allFragments.value = res.items;
    } catch (e) {
      console.error("Failed to load fragments for selection", e);
    }
  }

  async function fetchById(id: number) {
    return await actionFragmentService.getFragmentById(id);
  }

  async function create(payload: ActionFragmentCreatePayload) {
    const res = await actionFragmentService.createFragment(payload);
    allFragments.value = []; // 失效缓存
    return res;
  }

  async function update(id: number, payload: ActionFragmentUpdatePayload) {
    const res = await actionFragmentService.updateFragment(id, payload);
    allFragments.value = []; // 失效缓存
    return res;
  }

  async function remove(id: number) {
    await actionFragmentService.deleteFragment(id);
    allFragments.value = [];
  }

  async function removeBatch(ids: number[]) {
    await actionFragmentService.batchDeleteFragments(ids);
    allFragments.value = []; // 失效缓存
  }

  return {
    fragments,
    allFragments,
    total,
    isLoading,
    needsRefresh,
    setNeedsRefresh,
    fetchFragments,
    fetchAllForSelect,
    fetchById,
    create,
    update,
    remove,
    removeBatch
  };
});
