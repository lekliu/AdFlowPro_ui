import type { PerformActionPayload } from "./common";

export interface ActionFragmentBase {
  name: string;
  description?: string;
  categoryId?: number | null;
  actionsJson: PerformActionPayload[];
}

export interface ActionFragmentCreatePayload extends ActionFragmentBase {}

export interface ActionFragmentUpdatePayload {
  name?: string;
  description?: string;
  categoryId?: number | null;
  actionsJson?: PerformActionPayload[];
}

export interface ActionFragmentPublic extends ActionFragmentBase {
  fragmentId: number;
  tenantId: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
  categoryName?: string;
}
