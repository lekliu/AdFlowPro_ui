<template>
  <div class="af-page-container" ref="pageContainerRef">
    <el-card class="table-card" shadow="never">
      <!-- 顶部操作栏 -->
      <template #header>
        <div class="af-list-header">
          <div class="left">
            <el-button type="primary" :icon="Plus" @click="handleCreate">新建操作</el-button>

            <el-tooltip content="将所有原子的扫描和命中次数清零，重新开始健康度统计" placement="top">
              <el-button type="danger" plain :icon="RefreshLeft" @click="handleResetAllStats">
                重置统计
              </el-button>
            </el-tooltip>

            <el-button-group class="ml-4">
              <el-button :icon="Edit" @click="handleEditSelected" :disabled="selectedAtoms.length !== 1">编辑</el-button>
              <el-button :icon="CopyDocument" @click="handleCopySelected" :disabled="selectedAtoms.length !== 1">复制</el-button>
              <el-button :icon="Delete" type="danger" plain @click="handleDeleteSelected" :disabled="selectedAtoms.length === 0">删除</el-button>
            </el-button-group>
          </div>

          <div class="right">
            <el-select v-model="categoryFilter" placeholder="按分类筛选" clearable @change="handleSearch" style="width: 150px">
              <el-option
                  v-for="category in categoryStore.allCategories"
                  :key="category.categoryId"
                  :label="category.name"
                  :value="category.categoryId"
              />
            </el-select>
            <el-input v-model="searchQuery" placeholder="按名称或描述搜索" clearable @keyup.enter="handleSearch" style="width: 240px">
              <template #append>
                <el-button :icon="Search" @click="handleSearch" />
              </template>
            </el-input>
          </div>
        </div>
      </template>

      <!-- 数据表格 -->
      <el-table
          :data="atomStore.atoms"
          v-loading="atomStore.isLoading || categoryStore.isLoading"
          style="width: 100%"
          border
          stripe
          class="custom-table"
          @selection-change="handleSelectionChange"
          @row-click="handleRowClick"
          @row-dblclick="handleRowDblClick"
          @sort-change="handleSortChange"
          ref="tableRef"
      >
        <el-table-column type="selection" width="45" align="center" />

        <!-- ID 列：淡化处理，使用等宽字体 -->
        <el-table-column prop="atomId" label="ID" width="70" sortable align="center">
          <template #default="{row}">
            <span class="id-text">{{ row.atomId }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="原子操作名称" min-width="200">
          <template #default="{row}">
            <div class="name-cell">
              <span class="main-name">{{ row.name }}</span>
              <el-tag v-if="row.categoryName" size="small" type="info" effect="light" class="ml-2">
                {{ row.categoryName }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <!-- 统计列：合并扫描与命中，增加视觉对比 -->
        <el-table-column label="扫描 / 命中" width="120" align="center">
          <template #default="scope">
            <div class="stat-cell">
              <span class="scan-count">{{ scope.row.totalScans || 0 }}</span>
              <span class="stat-divider">/</span>
              <span class="match-count">{{ scope.row.totalMatches || 0 }}</span>
            </div>
          </template>
        </el-table-column>

        <!-- 健康度列 (基于你原本的 getAtomHealthStatus 逻辑可视化) -->
        <el-table-column label="健康度" width="140">
          <template #default="{row}">
            <el-tooltip :content="getAtomHealthDesc(row)" placement="top">
              <div class="health-indicator">
                <el-progress
                    :percentage="Math.min((row.hitRate || 0) * 100 * 10, 100)"
                    :status="getAtomHealthStatus(row) === 'exception' ? 'exception' : getAtomHealthStatus(row)"
                    :stroke-width="6"
                    :show-text="false"
                />
                <span :class="['health-label', getAtomHealthColor(row)]">
                  {{ (row.hitRate * 100).toFixed(1) }}%
                </span>
              </div>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column prop="priority" label="优先级" width="90" sortable="custom" align="center" />
        <el-table-column v-if="showDescriptionCol" prop="description" label="描述" min-width="150" show-overflow-tooltip />

        <!-- 最后更新：核心 Gmail 悬浮效果列 -->
        <el-table-column
            label="最后更新"
            prop="updatedAt"
            width="180"
            sortable="custom"
            align="right"
            header-align="left"
        >
          <template #default="scope">
            <div class="action-swap-container">
              <!-- 默认显示的状态：时间文本 -->
              <span class="time-text-display">{{ formatDateTime(scope.row.updatedAt) }}</span>

              <!-- 悬浮触发的状态：操作按钮组 (带有渐变背景遮罩) -->
              <div class="row-floating-actions">
                <div class="action-mask-gradient"></div>
                <div class="action-buttons-inner">
                  <el-tooltip content="编辑" placement="top" :show-after="500" :enterable="false">
                    <el-button :icon="Edit" circle class="btn-action btn-edit" @click.stop="handleEdit(scope.row.atomId)" />
                  </el-tooltip>
                  <el-tooltip content="克隆" placement="top" :show-after="500" :enterable="false">
                    <el-button :icon="CopyDocument" circle class="btn-action btn-edit" @click.stop="handleQuickCopy(scope.row)" />
                  </el-tooltip>
                  <el-dropdown trigger="click" @command="(cmd) => handleActionCommand(cmd, scope.row)">
                    <el-button :icon="MoreFilled" circle class="btn-action btn-edit" />
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="delete" :icon="Delete" class="danger-text">删除原子</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

      </el-table>

      <div class="af-pagination-wrap">
        <el-pagination
            v-if="atomStore.totalAtoms > 0"
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="atomStore.totalAtoms"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/* === 你的原生逻辑 100% 保持不变 === */
defineOptions({ name: "AtomsList" });

import { ref, onMounted, onActivated, computed, reactive, onUnmounted } from "vue";
import { useAtomStore } from "@/stores/atomStore";
import { useRouter } from "vue-router";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Edit, Delete, Search, CopyDocument, RefreshLeft, MoreFilled } from "@element-plus/icons-vue";
import type { AtomicOperationCreatePayload } from "@/types/api";
import { formatDateTime } from "@/utils/formatter";
import { useTablePagination, useTableHelper } from "@/composables/useTableManager";
import { confirmBatchDelete } from "@/utils/messageBox";

const router = useRouter();
const atomStore = useAtomStore();
const categoryStore = useAtomCategoryStore();

// --- 使用组合式逻辑管理表格状态 ---
const { currentPage, pageSize, searchQuery, getPaginationParams, resetPagination } = useTablePagination(10);
const {
  tableRef,
  selection: selectedAtoms,
  handleSelectionChange,
  handleRowClick,
  handleRowDblClick
} = useTableHelper("atomId", "AtomEditor");

const categoryFilter = ref<number | "">("");

// 排序状态
const sortState = reactive({
  prop: 'updatedAt',
  order: 'descending'
});

const fetchData = () => {
  const params = {
    ...getPaginationParams(),
    categoryId: categoryFilter.value || undefined,
    sortBy: sortState.prop,
    sortOrder: sortState.order === 'ascending' ? 'asc' : 'desc'
  };
  atomStore.fetchAtoms(params);
};

const handleSortChange = ({ prop, order }: { prop: string, order: string }) => {
  sortState.prop = prop;
  sortState.order = order;
  resetPagination();
  fetchData();
};

/**
 * 核心业务逻辑：健康度判定 (1:1 还原)
 */
const getAtomHealthStatus = (row: any) => {
  if (row.totalScans > 500 && (row.totalMatches || 0) === 0) return 'exception'; // 僵尸原子
  if ((row.hitRate || 0) < 0.01) return 'warning'; // 低效
  return 'success';
};

const getAtomHealthColor = (row: any) => {
  if (row.totalScans > 500 && (row.totalMatches || 0) === 0) return 'danger';
  if (row.totalScans === 0) return 'info';
  if ((row.hitRate || 0) < 0.01) return 'warning';
  return 'success';
};

const getAtomHealthDesc = (row: any) => {
  if (row.totalScans > 500 && (row.totalMatches || 0) === 0) return '僵尸原子：扫描多次从未命中，建议清理';
  if (row.totalScans === 0) return '未激活：该原子尚未被任务扫描过';
  return `命中率：${((row.hitRate || 0) * 100).toFixed(2)}%`;
};

// 基础交互逻辑
const handleSearch = () => { resetPagination(); fetchData(); };
const handleSizeChange = (val: number) => { pageSize.value = val; fetchData(); };
const handleCurrentChange = (val: number) => { currentPage.value = val; fetchData(); };
const handleCreate = () => { router.push({ name: "AtomEditor" }); };
const handleEdit = (atomId: number) => { router.push({ name: "AtomEditor", params: { atomId } }); };

const handleEditSelected = () => {
  if (selectedAtoms.value.length === 1) handleEdit(selectedAtoms.value[0].atomId);
  else ElMessage.warning("请选择一个原子操作进行编辑");
};

/**
 * 核心逻辑：批量删除 (1:1 还原)
 */
const handleDeleteSelected = async () => {
  if (selectedAtoms.value.length === 0) return;
  const names = selectedAtoms.value.map(a => a.name);
  if (await confirmBatchDelete(names, "原子操作")) {
    const deletePromises = selectedAtoms.value.map(atom => atomStore.deleteAtom(atom.atomId));
    await Promise.all(deletePromises);
    ElMessage.success(`成功删除 ${selectedAtoms.value.length} 个原子操作！`);
    fetchData();
  }
};

// 处理下拉菜单命令
const handleActionCommand = (command: string, row: any) => {
  if (command === 'delete') {
    handleDelete(row.atomId, row.name);
  }
};

// 快速克隆逻辑
const handleQuickCopy = async (row: any) => {
  selectedAtoms.value = [row];
  await handleCopySelected();
};

const handleDelete = async (atomId: number, name: string) => {
  try {
    await ElMessageBox.confirm(`确定要删除原子操作 "${name}" 吗？`, "确认删除", { type: "warning" });
    await atomStore.deleteAtom(atomId);
    ElMessage.success("删除成功！");
    fetchData();
  } catch (e) { if (e !== 'cancel') console.error(e); }
};

/**
 * 核心逻辑：原子克隆 (1:1 还原深度克隆逻辑)
 */
const handleCopySelected = async () => {
  if (selectedAtoms.value.length !== 1) return;
  const atomId = selectedAtoms.value[0].atomId;
  try {
    await ElMessageBox.confirm("确定要复制此原子操作吗？", "确认复制", { type: "info" });
    const atom = await atomStore.fetchAtomById(atomId);
    if (!atom) return ElMessage.error("获取原数据失败");

    // 使用 JSON 序列化确保 100% 深度克隆，断绝所有对象引用关系
    const source = JSON.parse(JSON.stringify(atom));
    const payload: AtomicOperationCreatePayload = {
      name: `${source.name} - 副本`,
      description: source.description,
      triggerType: source.triggerType,
      categoryId: source.categoryId,
      priority: source.priority,
      executionCountLimit: source.executionCountLimit,
      continueAfterMatch: source.continueAfterMatch,
      actionLoopCount: source.actionLoopCount,
      sceneSnapshotJson: source.sceneSnapshotJson,
      actionsJson: source.actionsJson
    };

    await atomStore.addAtom(payload);
    ElMessage.success("复制成功");
    fetchData();
  } catch (error) { if (error !== "cancel") console.error("Copy failed:", error); }
};

/**
 * 核心业务逻辑：清除全量健康数据
 */
const handleResetAllStats = () => {
  ElMessageBox.confirm(
      '确定要清空本租户所有原子操作的“扫描次数”和“命中次数”吗？该操作不可撤销，健康度将重新从 0% 开始计算。',
      '警告：重置全量统计数据',
      {
        confirmButtonText: '确 定',
        cancelButtonText: '取 消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
  ).then(async () => {
    await atomStore.resetStats();
    ElMessage.success('统计数据已重置');
    fetchData(); // 刷新列表查看效果
  }).catch(() => {});
};

const pageContainerRef = ref<HTMLElement | null>(null);
const showDescriptionCol = ref(true);
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  fetchData();
  categoryStore.fetchAllCategories();

  // 监听表格外层容器的实际宽度变化
  if (pageContainerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // entry.contentRect.width 就是容器当前的真实可用宽度
        // 假设侧边栏通常是 200px 左右，这里阈值可以设为 1100 或 1200
        showDescriptionCol.value = entry.contentRect.width >= 1100;
      }
    });
    resizeObserver.observe(pageContainerRef.value);
  }
});

onUnmounted(() => {
  // 组件销毁时断开监听，防止内存泄漏
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});


onActivated(() => { if (atomStore.needsRefresh) { fetchData(); atomStore.setNeedsRefresh(false); } });
</script>

<style scoped>
/* 表格整体风格 */
.table-card {
  border: none;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05) !important;
}
.ml-4 { margin-left: 16px; }
.ml-2 { margin-left: 8px; }

/* 名字单元格布局 */
.name-cell {
  display: flex;
  align-items: center;
}

/* ID 文本与统计数字使用等宽字体，更整齐 */
.id-text, .stat-cell {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 13px;
  color: #909399;
}

.stat-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.match-count { color: var(--el-color-success); font-weight: 600; }
.stat-divider { color: #dcdfe6; }

/* 健康度指示器 - 配合你的业务逻辑 */
.health-indicator {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 10px;
}
.health-label {
  font-size: 11px;
  font-weight: bold;
}
.health-label.success { color: var(--el-color-success); }
.health-label.warning { color: var(--el-color-warning); }
.health-label.danger { color: var(--el-color-danger); }
.health-label.info { color: var(--el-color-info); }

/* --- 核心 Gmail 悬浮效果 CSS --- */
.action-swap-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  height: 32px;
}

.time-text-display {
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: #606266;
  font-size: 13px;
  white-space: nowrap;
}

.row-floating-actions {
  position: absolute;
  top: 0;
  right: -10px; /* 稍微向右偏移对齐边框 */
  bottom: 0;
  display: flex;
  align-items: center;
  opacity: 0;
  pointer-events: none;
  transition: all 0.2s ease;
  z-index: 5;
}

/* 渐变遮罩：解决当内容过长时，按钮左侧硬切断的问题 */
.action-mask-gradient {
  width: 40px;
  height: 100%;
  background: linear-gradient(to right, rgba(255, 255, 255, 0), var(--el-table-row-hover-bg-color) 80%);
}

.action-buttons-inner {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-left: 4px;
  padding-right: 12px;
  /* 确保背景色与 Element Plus 表格悬浮行颜色一致，解决斑马纹冲突 */
  background-color: var(--el-table-row-hover-bg-color);
}

/* --- 1. 基础按钮尺寸与交互 --- */
.action-buttons-inner :deep(.btn-action) {
  border: none;
  background: transparent;
  width: 34px;  /* 整体按钮变大 (原先小按钮约 24px) */
  height: 34px;
  transition: all 0.2s;
}

/* --- 2. 调大中心图标的尺寸 --- */
.action-buttons-inner :deep(.btn-action .el-icon) {
  font-size: 20px !important; /* 图标放大，你可以改为 18px 会更大 */
}

/* --- 3. 恢复彩色及悬浮背景色 --- */

/* 编辑按钮：蓝色主题 */
.action-buttons-inner :deep(.btn-edit) {
  color: var(--el-color-primary); /* 原本的 Element 蓝色 */
}
.action-buttons-inner :deep(.btn-edit:hover) {
  background-color: var(--el-color-primary-light-9); /* 极浅的蓝色背景 */
  transform: translateY(-1px);
}

/* 复制/克隆按钮：绿色主题 (如果你喜欢别的颜色，可以改成 warning 或 info) */
.action-buttons-inner :deep(.btn-copy) {
  color: var(--el-color-success); /* 原本的 Element 绿色 */
}
.action-buttons-inner :deep(.btn-copy:hover) {
  background-color: var(--el-color-success-light-9); /* 极浅的绿色背景 */
  transform: translateY(-1px);
}

/* 更多按钮：常规灰色主题 */
.action-buttons-inner :deep(.btn-more) {
  color: var(--el-text-color-regular);
}
.action-buttons-inner :deep(.btn-more:hover) {
  background-color: var(--el-fill-color);
  transform: translateY(-1px);
}

/* 当行悬浮时切换状态 */
:deep(.el-table__row:hover) .time-text-display {
  opacity: 0;
}

:deep(.el-table__row:hover) .row-floating-actions {
  opacity: 1;
  pointer-events: auto;
  right: 0;
}

/* 针对 Element Plus 斑马纹处理：强制悬浮层背景色同步 */
:deep(.el-table__row:hover > td.el-table__cell) {
  background-color: var(--el-table-row-hover-bg-color) !important;
}

/* 危险操作颜色 */
.danger-text { color: var(--el-color-danger) !important; }
</style>