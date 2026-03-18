import { ElMessageBox, ElMessage } from 'element-plus';

/**
 * 标准化批量删除确认框
 * @param names 要删除的项名称列表
 * @param typeName 业务对象名称，如 "原子操作"
 */
export const confirmBatchDelete = async (names: string[], typeName: string) => {
    if (names.length === 0) return false;

    const displayNames = names.length > 3
        ? names.slice(0, 3).join(', ') + ` 等 ${names.length} 项`
        : names.join(', ');

    const message = `确定要删除选中的 ${names.length} 个${typeName}吗？<br/>涉及: <b>${displayNames}</b><br/><br/><span style="color: #f56c6c; font-size: 12px;">注意：此操作通常不可撤销。</span>`;

    try {
        await ElMessageBox.confirm(message, "危险操作确认", {
            type: "warning",
            dangerouslyUseHTMLString: true,
            confirmButtonClass: 'el-button--danger',
        });
        return true;
    } catch {
        ElMessage.info("已取消操作");
        return false;
    }
};
