<template>
  <div class="af-page-container" ref="pageContainerRef">
    <el-card class="table-card" shadow="never">
      <!-- 顶部操作栏 -->
      <template #header>
        <div class="af-list-header">
          <div class="left">
            <el-button type="primary" :icon="Plus" @click="handleCreate">新建用例</el-button>

            <el-button-group class="ml-4">
              <el-button :icon="Edit" @click="handleEditSelected" :disabled="selectedCases.length !== 1">编辑</el-button>
              <el-button :icon="Delete" type="danger" plain @click="handleDeleteSelected" :disabled="selectedCases.length === 0">删除</el-button>
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
          :data="caseStore.cases"
          v-loading="caseStore.isLoading || categoryStore.isLoading"
          style="width: 100%"
          border
          stripe
          class="custom-table"
          @selection-change="handleSelectionChange"
          @row-click="handleRowClick"
          @row-dblclick="handleRowDblClick"
          ref="tableRef"
      >
        <el-table-column type="selection" width="45" align="center" />

        <!-- ID 列：等宽字体 -->
        <el-table-column prop="caseId" label="ID" width="80" sortable align="center">
          <template #default="{row}">
            <span class="id-text">{{ row.caseId }}</span>
          </template>
        </el-table-column>

        <!-- 名称与类型 -->
        <el-table-column prop="name" label="测试用例名称" min-width="220" sortable>
          <template #default="{row}">
            <div class="name-cell">
              <el-tag
                  size="small"
                  :type="row.caseType === 'flow' ? 'warning' : 'info'"
                  effect="plain"
                  class="type-tag"
              >
                {{ row.caseType === "flow" ? "流" : "线" }}
              </el-tag>
              <span class="main-name">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>

        <!-- 分类 -->
        <el-table-column prop="categoryName" label="分类" width="130" sortable>
          <template #default="{row}">
            <el-tag v-if="row.categoryName" type="info" size="small" effect="light">
              {{ row.categoryName }}
            </el-tag>
            <span v-else class="text-placeholder">--</span>
          </template>
        </el-table-column>

        <!-- 描述：响应式隐藏 -->
        <el-table-column v-if="showDescriptionCol" prop="description" label="描述" min-width="250" show-overflow-tooltip />

        <!-- 创建时间：核心 Gmail 悬浮效果列 -->
        <el-table-column
            label="创建时间"
            prop="createdAt"
            width="180"
            sortable
            align="right"
            header-align="left"
        >
          <template #default="scope">
            <div class="action-swap-container">
              <!-- 默认显示的状态：时间文本 -->
              <span class="time-text-display">{{ formatDateTime(scope.row.createdAt) }}</span>

              <!-- 悬浮触发的操作组 -->
              <div class="row-floating-actions">
                <div class="action-mask-gradient"></div>
                <div class="action-buttons-inner">
                  <el-tooltip content="编辑用例" placement="top" :show-after="500">
                    <el-button :icon="Edit" circle class="btn-action btn-edit" @click.stop="handleEdit(scope.row.caseId)" />
                  </el-tooltip>
                  <el-tooltip content="删除用例" placement="top" :show-after="500">
                    <el-button :icon="Delete" circle class="btn-action btn-delete" @click.stop="handleDelete(scope.row.caseId, scope.row.name)" />
                  </el-tooltip>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="af-pagination-wrap">
        <el-pagination
            v-if="caseStore.totalCases > 0"
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="caseStore.totalCases"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
/* === 基础配置与导入 === */
defineOptions({ name: "TestCasesList" });

import { ref, onMounted, onActivated, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useCaseStore } from "@/stores/caseStore";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Edit, Delete, Search } from "@element-plus/icons-vue";
import { formatDateTime } from "@/utils/formatter";
import { useTablePagination, useTableHelper } from "@/composables/useTableManager";
import { confirmBatchDelete } from "@/utils/messageBox";

const router = useRouter();
const caseStore = useCaseStore();
const categoryStore = useAtomCategoryStore();

// --- 使用组合式逻辑管理表格状态 ---
const { currentPage, pageSize, searchQuery, getPaginationParams, resetPagination } = useTablePagination(10);
const {
  tableRef,
  selection: selectedCases,
  handleSelectionChange,
  handleRowClick,
  handleRowDblClick
} = useTableHelper("caseId", "TestCaseEditor");

const categoryFilter = ref<number | "">("");

// --- 数据拉取逻辑 ---
const fetchData = () => {
  const params = {
    ...getPaginationParams(),
    categoryId: categoryFilter.value || undefined,
  };
  caseStore.fetchCases(params);
};

onMounted(() => {
  fetchData();
  categoryStore.fetchAllCategories();
  initResizeObserver();
});

onActivated(() => {
  if (caseStore.needsRefresh) {
    fetchData();
    caseStore.setNeedsRefresh(false);
  }
});

// --- 事件处理器 ---
const handleSearch = () => { resetPagination(); fetchData(); };
const handleSizeChange = (val: number) => { pageSize.value = val; fetchData(); };
const handleCurrentChange = (val: number) => { currentPage.value = val; fetchData(); };

const handleCreate = () => router.push({ name: "TestCaseEditor" });

const handleEdit = (caseId: number) => {
  router.push({ name: "TestCaseEditor", params: { caseId } });
};

const handleEditSelected = () => {
  if (selectedCases.value.length === 1) handleEdit(selectedCases.value[0].caseId);
  else ElMessage.warning("请选择一个测试用例进行编辑");
};

// 批量删除
const handleDeleteSelected = async () => {
  if (selectedCases.value.length === 0) return;
  const names = selectedCases.value.map(c => c.name);
  if (await confirmBatchDelete(names, "测试用例")) {
    try {
      const deletePromises = selectedCases.value.map(c => caseStore.deleteCase(c.caseId));
      await Promise.all(deletePromises);
      ElMessage.success(`成功删除 ${selectedCases.value.length} 个测试用例！`);
      fetchData();
    } catch (e) {
      // 错误由拦截器处理
    }
  }
};

// 单个删除
const handleDelete = async (caseId: number, name: string) => {
  try {
    await ElMessageBox.confirm(`确定要删除测试用例 "${name}" 吗？`, "确认删除", { type: "warning" });
    await caseStore.deleteCase(caseId);
    ElMessage.success("删除成功！");
    // 补齐：删除最后一条自动回退页码
    if (caseStore.cases.length === 1 && currentPage.value > 1) {
      currentPage.value--;
    }
    fetchData();
  } catch (error) {
    if (error === "cancel") ElMessage.info("已取消删除");
  }
};

// --- 响应式布局列隐藏逻辑 ---
const pageContainerRef = ref<HTMLElement | null>(null);
const showDescriptionCol = ref(true);
let resizeObserver: ResizeObserver | null = null;

const initResizeObserver = () => {
  if (pageContainerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        showDescriptionCol.value = entry.contentRect.width >= 1100;
      }
    });
    resizeObserver.observe(pageContainerRef.value);
  }
};

onUnmounted(() => resizeObserver?.disconnect());
</script>

<style scoped>
/* ==================== 基础容器与卡片 ==================== */
.af-page-container { padding: 20px; }
.table-card { border: none; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.05) !important; }

.af-list-header { display: flex; justify-content: space-between; align-items: center; }
.af-list-header .left, .af-list-header .right { display: flex; align-items: center; gap: 12px; }

/* ==================== 表格样式优化 ==================== */
.name-cell { display: flex; align-items: center; gap: 8px; }
.type-tag { font-weight: bold; border-radius: 4px; padding: 0 6px; }
.id-text { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #909399; }
.text-placeholder { color: #dcdfe6; }

/* ==================== Gmail 悬浮效果 ==================== */
.action-swap-container { position: relative; display: flex; align-items: center; justify-content: flex-end; width: 100%; height: 32px; }
.time-text-display {
  transition: opacity 0.2s; color: #606266; font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
}

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
  display: flex; align-items: center; gap: 4px; padding-right: 12px;
  background-color: var(--el-table-row-hover-bg-color);
}

.action-buttons-inner :deep(.btn-action) { border: none; background: transparent; width: 34px; height: 34px; }
.action-buttons-inner :deep(.btn-action .el-icon) {
  font-size: 20px !important;  /* 改大，例如 18px 或 20px */
}

/* 按钮颜色主题 */
.action-buttons-inner :deep(.btn-edit) { color: var(--el-color-primary); }
.action-buttons-inner :deep(.btn-edit:hover) { background-color: var(--el-color-primary-light-9); }

.action-buttons-inner :deep(.btn-delete) { color: var(--el-color-danger); }
.action-buttons-inner :deep(.btn-delete:hover) { background-color: var(--el-color-danger-light-9); }

/* 悬浮切换 */
:deep(.el-table__row:hover) .time-text-display { opacity: 0; }
:deep(.el-table__row:hover) .row-floating-actions { opacity: 1; pointer-events: auto; right: 0; }
:deep(.el-table__row:hover > td.el-table__cell) { background-color: var(--el-table-row-hover-bg-color) !important; }

/* ==================== 辅助类 ==================== */
.af-pagination-wrap { margin-top: 20px; display: flex; justify-content: flex-end; }
.ml-4 { margin-left: 16px; }
</style>