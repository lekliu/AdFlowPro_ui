import { ref } from 'vue';
import { useRouter } from 'vue-router';

/**
 * 分页逻辑管理
 * @param defaultSize 默认每页条数
 */
export function useTablePagination(defaultSize = 10) {
    const currentPage = ref(1);
    const pageSize = ref(defaultSize);
    const searchQuery = ref("");

    // 统一计算后端需要的 skip 和 limit 参数
    const getPaginationParams = () => {
        return {
            skip: (currentPage.value - 1) * pageSize.value,
            limit: pageSize.value,
            search: searchQuery.value || undefined,
        };
    };

    // 重置分页（搜索操作时触发）
    const resetPagination = () => {
        currentPage.value = 1;
    };

    return {
        currentPage,
        pageSize,
        searchQuery,
        getPaginationParams,
        resetPagination
    };
}

/**
 * 表格交互逻辑管理 (选择、点击、跳转)
 * @param idKey 业务 ID 的键名，如 'atomId'
 * @param onEdit 路由名称或回调函数
 */
export function useTableHelper(idKey: string, onEdit?: string | ((row: any) => void)) {
    const router = useRouter();
    const tableRef = ref<any>(null);
    const selection = ref<any[]>([]);

    const handleSelectionChange = (val: any[]) => {
        selection.value = val;
    };

    // 点击行切换选中状态 (增加交互便利性)
    const handleRowClick = (row: any) => {
        if (tableRef.value) {
            const isSelected = selection.value.some(item => item[idKey] === row[idKey]);
            tableRef.value.toggleRowSelection(row, !isSelected);
        }
    };

    // 双击行触发编辑
    const handleRowDblClick = (row: any) => {
        if (!row || !onEdit) return;

        if (typeof onEdit === 'function') {
            onEdit(row);
        } else {
            router.push({name: onEdit, params: {[idKey]: row[idKey]}});
        }
    };

    return {
        tableRef,
        selection,
        handleSelectionChange,
        handleRowClick,
        handleRowDblClick
    };
}
