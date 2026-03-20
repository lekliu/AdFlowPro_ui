<template>
  <div class="af-page-container" ref="pageContainerRef">
    <el-card class="table-card" shadow="never">
      <!-- 顶部操作栏 -->
      <template #header>
        <div class="af-list-header">
          <div class="left">
            <el-button type="primary" :icon="Plus" @click="handleCreate">新建片段</el-button>

            <el-button-group class="ml-4">
              <el-button :icon="Edit" @click="handleEditSelected" :disabled="selectedItems.length !== 1">编辑</el-button>
              <el-button :icon="Delete" type="danger" plain @click="handleBatchDelete" :disabled="selectedItems.length === 0">删除</el-button>
            </el-button-group>
          </div>

          <div class="right">
            <el-select v-model="categoryFilter" placeholder="按分类筛选" clearable @change="handleSearch" style="width: 150px">
              <el-option
                  v-for="cat in categoryStore.allCategories"
                  :key="cat.categoryId"
                  :label="cat.name"
                  :value="cat.categoryId"
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
          :data="fragmentStore.fragments"
          v-loading="fragmentStore.isLoading || categoryStore.isLoading"
          style="width: 100%"
          border
          stripe
          class="custom-table"
          ref="tableRef"
          @selection-change="handleSelectionChange"
          @row-click="handleRowClick"
          @row-dblclick="handleRowDblClick"
          @sort-change="handleSortChange"
      >
        <el-table-column type="selection" width="45" align="center" />

        <el-table-column prop="fragmentId" label="ID" width="70" sortable="custom" align="center">
          <template #default="{row}">
            <span class="id-text">{{ row.fragmentId }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="动作片段名称" min-width="200">
          <template #default="{row}">
            <div class="name-cell">
              <span class="main-name">{{ row.name }}</span>
              <el-tag v-if="row.categoryName" size="small" type="info" effect="light" class="ml-2">
                {{ row.categoryName }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="包含动作数" width="120" align="center">
          <template #default="scope">
            <div class="stat-cell">
              <span class="action-count-badge">{{ parseActionCount(scope.row.actionsJson) }}</span>
              <span class="stat-suffix">步</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column v-if="showDescriptionCol" prop="description" label="描述" min-width="200" show-overflow-tooltip />

        <!-- 最后更新：核心 Gmail 悬浮效果列 (已精简按钮) -->
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
              <span class="time-text-display">{{ formatDateTime(scope.row.updatedAt) }}</span>

              <div class="row-floating-actions">
                <div class="action-mask-gradient"></div>
                <div class="action-buttons-inner">
                  <el-tooltip content="编辑片段" placement="top" :show-after="500" :enterable="false">
                    <el-button :icon="Edit" circle class="btn-action btn-edit" @click.stop="handleEdit(scope.row.fragmentId)" />
                  </el-tooltip>

                  <el-tooltip content="删除片段" placement="top" :show-after="500" :enterable="false">
                    <el-button :icon="Delete" circle class="btn-action btn-delete" @click.stop="handleDelete(scope.row)" />
                  </el-tooltip>

                  <!-- 如果未来需要更多操作，可以加 MoreFilled 下拉，目前两个按钮直接平铺更直观 -->
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="af-pagination-wrap">
        <el-pagination
            v-if="fragmentStore.total > 0"
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 15, 20, 50, 100]"
            :total="fragmentStore.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "ActionFragmentsList" });

import { ref, onMounted, onActivated, onUnmounted, reactive } from "vue";
import { useRouter } from "vue-router";
import { Plus, Edit, Delete, Search } from "@element-plus/icons-vue"; // 移除了 CopyDocument
import { useActionFragmentStore } from "@/stores/actionFragmentStore";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { ElMessageBox, ElMessage } from "element-plus";
import { formatDateTime } from "@/utils/formatter";
import { useTablePagination, useTableHelper } from "@/composables/useTableManager";
import { confirmBatchDelete } from "@/utils/messageBox";

const router = useRouter();
const fragmentStore = useActionFragmentStore();
const categoryStore = useAtomCategoryStore();

// --- 组合式逻辑 ---
const { currentPage, pageSize, searchQuery, getPaginationParams, resetPagination } = useTablePagination(15);
const {
  tableRef,
  selection: selectedItems,
  handleSelectionChange,
  handleRowClick,
  handleRowDblClick
} = useTableHelper("fragmentId", "ActionFragmentEditor");

const categoryFilter = ref<number | "">("");
const sortState = reactive({ prop: 'updatedAt', order: 'descending' });

const fetchData = () => {
  fragmentStore.fetchFragments({
    ...getPaginationParams(),
    categoryId: categoryFilter.value || undefined,
    sortBy: sortState.prop,
    sortOrder: sortState.order === 'ascending' ? 'asc' : 'desc'
  });
};

onMounted(() => {
  fetchData();
  categoryStore.fetchAllCategories();

  if (pageContainerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        showDescriptionCol.value = entry.contentRect.width >= 900;
      }
    });
    resizeObserver.observe(pageContainerRef.value);
  }
});

const parseActionCount = (actionsData: any) => {
  if (!actionsData) return 0;
  if (Array.isArray(actionsData)) return actionsData.length;
  try {
    const parsed = JSON.parse(actionsData);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch (e) { return 0; }
};

const handleSortChange = ({ prop, order }: { prop: string, order: string }) => {
  sortState.prop = prop;
  sortState.order = order;
  resetPagination();
  fetchData();
};

const handleSearch = () => { resetPagination(); fetchData(); };
const handleSizeChange = (val: number) => { pageSize.value = val; fetchData(); };
const handleCurrentChange = (val: number) => { currentPage.value = val; fetchData(); };
const handleCreate = () => router.push({ name: "ActionFragmentEditor" });
const handleEdit = (fragmentId: number) => router.push({ name: "ActionFragmentEditor", params: { fragmentId } });

const handleEditSelected = () => {
  if (selectedItems.value.length === 1) handleEdit(selectedItems.value[0].fragmentId);
};

const handleBatchDelete = () => {
  if (selectedItems.value.length === 0) return;
  const names = selectedItems.value.map(i => i.name);
  confirmBatchDelete(names, "动作片段").then(async (ok) => {
    if (!ok) return;
    await fragmentStore.removeBatch(selectedItems.value.map(i => i.fragmentId));
    ElMessage.success("批量删除成功");
    fetchData();
  });
};

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定要删除动作片段 "${row.name}" 吗？`, "删除确认", { type: "warning" })
      .then(async () => {
        await fragmentStore.remove(row.fragmentId);
        ElMessage.success("删除成功");
        fetchData();
      }).catch(() => {});
};

// 响应式布局
const pageContainerRef = ref<HTMLElement | null>(null);
const showDescriptionCol = ref(true);
let resizeObserver: ResizeObserver | null = null;

onUnmounted(() => resizeObserver?.disconnect());
onActivated(() => {
  if ((fragmentStore as any).needsRefresh) {
    fetchData();
    (fragmentStore as any).setNeedsRefresh(false);
  }
});
</script>

<style scoped>
.table-card { border: none; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.05) !important; }
.af-list-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; }
.af-list-header .left, .af-list-header .right { display: flex; align-items: center; gap: 10px; }
.ml-4 { margin-left: 16px; }
.ml-2 { margin-left: 8px; }

.name-cell { display: flex; align-items: center; }
.id-text { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #909399; }

.stat-cell { display: flex; align-items: center; justify-content: center; gap: 4px; }
.action-count-badge {
  font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600;
  color: var(--el-color-primary); background: var(--el-color-primary-light-9);
  padding: 2px 8px; border-radius: 4px;
}
.stat-suffix { font-size: 12px; color: #909399; }

.af-pagination-wrap { margin-top: 20px; display: flex; justify-content: flex-end; }

/* Gmail 悬浮效果 */
.action-swap-container { position: relative; display: flex; align-items: center; justify-content: flex-end; width: 100%; height: 32px; }
.time-text-display { transition: opacity 0.2s; color: #606266; font-size: 13px; }

.row-floating-actions {
  position: absolute; top: 0; right: -10px; bottom: 0;
  display: flex; align-items: center; opacity: 0; pointer-events: none;
  transition: all 0.2s ease; z-index: 5;
}

.action-mask-gradient {
  width: 40px; height: 100%;
  background: linear-gradient(to right, rgba(255, 255, 255, 0), var(--el-table-row-hover-bg-color) 80%);
}

.action-buttons-inner {
  display: flex; align-items: center; gap: 8px;
  padding-left: 4px; padding-right: 12px;
  background-color: var(--el-table-row-hover-bg-color);
}

.action-buttons-inner :deep(.btn-action) { border: none; background: transparent; width: 34px; height: 34px; font-size: 20px !important;}
.action-buttons-inner :deep(.btn-edit) { color: var(--el-color-primary); }
.action-buttons-inner :deep(.btn-edit:hover) { background-color: var(--el-color-primary-light-9); }
.action-buttons-inner :deep(.btn-delete) { color: var(--el-color-danger); }
.action-buttons-inner :deep(.btn-delete:hover) { background-color: var(--el-color-danger-light-9); }

:deep(.el-table__row:hover) .time-text-display { opacity: 0; }
:deep(.el-table__row:hover) .row-floating-actions { opacity: 1; pointer-events: auto; right: 0; }
:deep(.el-table__row:hover > td.el-table__cell) { background-color: var(--el-table-row-hover-bg-color) !important; }
</style>