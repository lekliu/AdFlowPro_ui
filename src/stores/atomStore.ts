import { defineStore } from "pinia";
import { atomService } from "@/api/atomService";
import type { AtomicOperationPublic, AtomicOperationCreatePayload, AtomicOperationUpdatePayload } from "@/types/api";

interface AtomState {
  atoms: AtomicOperationPublic[];
  totalAtoms: number;
  isLoading: boolean;
  error: string | null;
  needsRefresh: boolean;
}

export const useAtomStore = defineStore("atom", {
  state: (): AtomState => ({
    atoms: [],
    totalAtoms: 0,
    isLoading: false,
    error: null,
    needsRefresh: false,
  }),
  actions: {
    setNeedsRefresh(status: boolean) {
      this.needsRefresh = status;
    },
    async fetchAtoms(params: { skip: number; limit: number; search?: string; categoryId?: number }) {
      this.isLoading = true;
      try {
        const response = await atomService.getAtoms(params);
        this.atoms = response.items;
        this.totalAtoms = response.total;
        this.error = null;
      } catch (err: any) {
        this.error = err.message || "Failed to fetch atoms";
        this.atoms = [];
        this.totalAtoms = 0;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchAtomById(atomId: number): Promise<AtomicOperationPublic | null> {
      this.isLoading = true;
      try {
        return await atomService.getAtomById(atomId);
      } catch (err: any) {
        this.error = `Failed to fetch atom ${atomId}`;
        return null;
      } finally {
        this.isLoading = false;
      }
    },

    async addAtom(payload: AtomicOperationCreatePayload) {
      this.isLoading = true;
      try {
        await atomService.createAtom(payload);
      } finally {
        this.isLoading = false;
      }
    },

    async updateAtom(atomId: number, payload: AtomicOperationUpdatePayload) {
      this.isLoading = true;
      try {
        await atomService.updateAtom(atomId, payload);
      } finally {
        this.isLoading = false;
      }
    },

    async deleteAtom(atomId: number) {
      this.isLoading = true;
      try {
        await atomService.deleteAtom(atomId);
        // Optimistically update total count
        this.totalAtoms = Math.max(0, this.totalAtoms - 1);
      } finally {
        this.isLoading = false;
      }
    },
  },
});
