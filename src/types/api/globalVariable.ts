/**
 * 全局变量公开信息
 */
export interface GlobalVariablePublic {
  variableId: number;
  name: string;
  value: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建全局变量的负载
 */
export interface GlobalVariableCreatePayload {
  name: string;
  value: string;
  description?: string;
}

/**
 * 更新全局变量的负载
 */
export interface GlobalVariableUpdatePayload {
  name?: string;
  value?: string;
  description?: string;
}
