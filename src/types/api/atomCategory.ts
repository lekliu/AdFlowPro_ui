/**
 * 公开的原子操作分类信息
 */
export interface AtomCategoryPublic {
    categoryId: number;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    atomCount?: number;
    packageCount?: number;
}

/**
 * 创建原子操作分类的负载
 */
export interface AtomCategoryCreatePayload {
    name: string;
    description?: string;
}

/**
 * 更新原子操作分类的负载
 */
export interface AtomCategoryUpdatePayload {
    name?: string;
    description?: string;
}