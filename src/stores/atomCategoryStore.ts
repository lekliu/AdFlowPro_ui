import { defineStore } from "pinia";
import { atomCategoryService } from "@/api/atomCategoryService";
import type { AtomCategoryPublic, AtomCategoryCreatePayload, AtomCategoryUpdatePayload } from "@/types/api";
import { ElMessage } from "element-plus";

interface AtomCategoryWithCount extends AtomCategoryPublic {
    atomCount: number;
}

interface AtomCategoryState {
    categoriesWithCount: AtomCategoryWithCount[];
    allCategories: AtomCategoryPublic[]; // For dropdowns
    isLoading: boolean;
    error: string | null;
}

export const useAtomCategoryStore = defineStore("atomCategory", {
    state: (): AtomCategoryState => ({
        categoriesWithCount: [],
        allCategories: [],
        isLoading: false,
        error: null,
    }),
    actions: {
        async fetchCategoriesWithCount(search?: string) {
            this.isLoading = true;
            try {
                const response = await atomCategoryService.getCategories({ withCount: true, search });
                this.categoriesWithCount = response.items as AtomCategoryWithCount[];
                this.error = null;
            } catch (err: any) {
                this.error = err.message || "Failed to fetch categories with count";
            } finally {
                this.isLoading = false;
            }
        },
        async fetchAllCategories() {
            // Use as a cache: only fetch if empty
            if (this.allCategories.length > 0) return;
            this.isLoading = true;
            try {
                const response = await atomCategoryService.getCategories({ withCount: false });
                this.allCategories = response.items as AtomCategoryPublic[];
            } catch (err: any) {
                this.error = err.message || "Failed to fetch all categories";
            } finally {
                this.isLoading = false;
            }
        },
        async addCategory(payload: AtomCategoryCreatePayload): Promise<AtomCategoryPublic> {
            this.isLoading = true;
            try {
                const newCategory = await atomCategoryService.createCategory(payload);
                this.allCategories.push(newCategory); // Update dropdown cache
                this.allCategories.sort((a, b) => a.name.localeCompare(b.name));
                return newCategory;
            } finally {
                this.isLoading = false;
            }
        },
        async editCategory(categoryId: number, payload: AtomCategoryUpdatePayload) {
            this.isLoading = true;
            try {
                await atomCategoryService.updateCategory(categoryId, payload);
                this.allCategories = []; // Invalidate cache, force refetch
            } finally {
                this.isLoading = false;
            }
        },
        async removeCategory(categoryId: number) {
            this.isLoading = true;
            try {
                await atomCategoryService.deleteCategory(categoryId);
                this.allCategories = []; // Invalidate cache
            } catch (error: any) {
                if (error.response?.status !== 409) {
                    ElMessage.error("删除失败");
                }
                throw error; // Re-throw for component to handle
            } finally {
                this.isLoading = false;
            }
        },
    },
});