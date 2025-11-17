import apiClient from "./apiClient";
import type {
    AtomCategoryPublic,
    AtomCategoryCreatePayload,
    AtomCategoryUpdatePayload,
} from "@/types/api";

interface CategoryWithCount extends AtomCategoryPublic {
    atomCount: number;
}

export const atomCategoryService = {
    async getCategories(params: { withCount?: boolean; search?: string }): Promise<{ items: (AtomCategoryPublic | CategoryWithCount)[] }> {
        return apiClient.get("/atom-categories", { params });
    },

    async createCategory(payload: AtomCategoryCreatePayload): Promise<AtomCategoryPublic> {
        return apiClient.post("/atom-categories", payload);
    },

    async updateCategory(categoryId: number, payload: AtomCategoryUpdatePayload): Promise<AtomCategoryPublic> {
        return apiClient.put(`/atom-categories/${categoryId}`, payload);
    },

    async deleteCategory(categoryId: number): Promise<void> {
        return apiClient.delete(`/atom-categories/${categoryId}`);
    },
};