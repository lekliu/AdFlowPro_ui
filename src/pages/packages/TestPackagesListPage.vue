<template>
  <div class="af-page-container" ref="pageContainerRef">
    <el-card class="table-card" shadow="never">
      <!-- 顶部操作栏 -->
      <template #header>
        <div class="af-list-header">
          <div class="left">
            <el-button type="primary" :icon="Plus" @click="handleCreate">新建测试包</el-button>

            <el-button-group class="ml-4">
              <el-button :icon="Edit" @click="handleEditSelected" :disabled="selectedPackages.length !== 1">编辑</el-button>
              <el-button :icon="Delete" type="danger" plain @click="handleDeleteSelected" :disabled="selectedPackages.length === 0">删除</el-button>
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
            <el-input v-model="searchQuery" placeholder="名称或描述..." clearable @keyup.enter="handleSearch" style="width: 220px">
              <template #append>
                <el-button :icon="Search" @click="handleSearch" />
              </template>
            </el-input>
          </div>
        </div>
      </template>

      <!-- 数据表格 -->
      <el-table
          :data="packageStore.packages"
          v-loading="packageStore.isLoading || categoryStore.isLoading"
          style="width: 100%"
          border
          stripe
          class="custom-table"
          @selection-change="handleSelectionChange"
          @row-click="handleRowClick"
          @row-dblclick="handleRowDblClick"
          ref="packageTableRef"
      >
        <el-table-column type="selection" width="45" align="center" />

        <!-- ID 列：等宽字体 -->
        <el-table-column prop="packageId" label="ID" width="80" sortable align="center">
          <template #default="{row}">
            <span class="id-text">{{ row.packageId }}</span>
          </template>
        </el-table-column>

        <!-- 名称与分类 -->
        <el-table-column prop="name" label="测试包名称" min-width="200" sortable>
          <template #default="{row}">
            <div class="name-cell">
              <span class="main-name">{{ row.name }}</span>
              <el-tag v-if="row.category" size="small" type="info" effect="light" class="ml-2">
                {{ row.category.name }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <!-- 是否公共 -->
        <el-table-column label="可见性" width="100" align="center">
          <template #default="{row}">
            <el-tag :type="row.isCommon ? 'success' : 'info'" size="small">
              {{ row.isCommon ? "公共" : "私有" }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 描述列：响应式显示 -->
        <el-table-column v-if="showDescriptionCol" prop="description" label="描述" min-width="250" show-overflow-tooltip>
          <template #default="{row}">
            <span class="description-text">{{ row.description || '' }}</span>
          </template>
        </el-table-column>

        <!-- 最后更新/操作：Gmail 悬浮效果 -->
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
              <span class="time-text-display">{{ formatDate(scope.row.createdAt) }}</span>

              <!-- 悬浮触发的操作组 -->
              <div class="row-floating-actions">
                <div class="action-mask-gradient"></div>
                <div class="action-buttons-inner">
                  <el-tooltip content="编辑" placement="top" :show-after="500">
                    <el-button :icon="Edit" circle class="btn-action btn-edit" @click.stop="handleEdit(scope.row.packageId)" />
                  </el-tooltip>

                  <el-tooltip content="血缘分析" placement="top" :show-after="500">
                    <el-button :icon="Compass" circle class="btn-action btn-lineage" @click.stop="openLineage(scope.row.packageId)" />
                  </el-tooltip>

                  <el-tooltip content="删除" placement="top" :show-after="500">
                    <el-button :icon="Delete" circle class="btn-action btn-delete" @click.stop="handleDelete(scope.row.packageId, scope.row.name)" />
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
            v-if="packageStore.totalPackages > 0"
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="packageStore.totalPackages"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 血缘分析抽屉组件 -->
    <PackageLineageDrawer ref="lineageDrawer" />
  </div>
</template>

<script setup lang="ts">
/* === 基础配置 === */
defineOptions({ name: "TestPackagesList" });

import { ref, onMounted, onActivated, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { usePackageStore } from "@/stores/packageStore";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Edit, Delete, Search, Compass } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import PackageLineageDrawer from "@/components/PackageLineageDrawer.vue";

dayjs.extend(utc);

// --- 实例与 Store ---
const router = useRouter();
const packageStore = usePackageStore();
const categoryStore = useAtomCategoryStore();
const lineageDrawer = ref<InstanceType<typeof PackageLineageDrawer> | null>(null);

// --- 分页与查询状态 ---
const currentPage = ref(1);
const pageSize = ref(10);
const searchQuery = ref("");
const categoryFilter = ref<number | "">("");
const selectedPackages = ref<any[]>([]);
const packageTableRef = ref();

// --- 数据拉取 ---
const fetchData = () => {
  const params = {
    skip: (currentPage.value - 1) * pageSize.value,
    limit: pageSize.value,
    search: searchQuery.value || undefined,
    categoryId: categoryFilter.value || undefined,
  };
  packageStore.fetchPackages(params);
};

onMounted(() => {
  fetchData();
  categoryStore.fetchAllCategories();
  initResizeObserver();
});

onActivated(() => {
  if (packageStore.needsRefresh) {
    fetchData();
    packageStore.setNeedsRefresh(false);
  }
});

// --- 核心业务逻辑 ---
const openLineage = (id: number) => {
  lineageDrawer.value?.open(id);
};

const handleSearch = () => {
  currentPage.value = 1;
  packageTableRef.value?.clearSelection();
  fetchData();
};

const handleSizeChange = (val: number) => {
  pageSize.value = val;
  fetchData();
};

const handleCurrentChange = (val: number) => {
  currentPage.value = val;
  fetchData();
};

const handleCreate = () => router.push({ name: "TestPackageEditor" });

const handleEdit = (packageId: number) => {
  router.push({ name: "TestPackageEditor", params: { packageId } });
};

const handleEditSelected = () => {
  if (selectedPackages.value.length === 1) handleEdit(selectedPackages.value[0].packageId);
  else ElMessage.warning("请选择一个测试包进行编辑");
};

const handleSelectionChange = (selection: any[]) => {
  selectedPackages.value = selection;
};

const handleRowClick = (row: any) => {
  const isSelected = selectedPackages.value.some(item => item.packageId === row.packageId);
  packageTableRef.value?.toggleRowSelection(row, !isSelected);
};

const handleRowDblClick = (row: any) => {
  if (row?.packageId) handleEdit(row.packageId);
};

// 批量删除
const handleDeleteSelected = async () => {
  if (selectedPackages.value.length === 0) return;
  const count = selectedPackages.value.length;
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${count} 个测试包吗？`, "确认批量删除", { type: "warning" });
    await Promise.all(selectedPackages.value.map(pkg => packageStore.deletePackage(pkg.packageId)));
    ElMessage.success(`成功删除 ${count} 个测试包！`);
    fetchData();
  } catch (e) {
    if (e === 'cancel') ElMessage.info("已取消删除");
  }
};

// 单个删除
const handleDelete = async (packageId: number, name: string) => {
  try {
    await ElMessageBox.confirm(`确定要删除测试包 "${name}" 吗？`, "确认删除", { type: "warning" });
    await packageStore.deletePackage(packageId);
    ElMessage.success("删除成功！");
    if (packageStore.packages.length === 1 && currentPage.value > 1) {
      currentPage.value--;
    }
    fetchData();
  } catch (e) {
    if (e === 'cancel') ElMessage.info("已取消删除");
  }
};

const formatDate = (dateString: string | Date): string => {
  if (!dateString) return "N/A";
  return dayjs.utc(dateString).local().format("YYYY-MM-DD HH:mm:ss");
};

// --- 响应式布局 ---
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
.name-cell { display: flex; align-items: center; }
.id-text { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #909399; }
.description-text { color: var(--el-text-color-regular); font-size: 13px; }

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

/* 按钮基础样式 */
.action-buttons-inner :deep(.btn-action) { border: none; background: transparent; width: 34px; height: 34px; transition: all 0.2s; }
.action-buttons-inner :deep(.btn-action .el-icon) { font-size: 20px !important; }

/* 按钮颜色主题 */
.action-buttons-inner :deep(.btn-edit) { color: var(--el-color-primary); }
.action-buttons-inner :deep(.btn-edit:hover) { background-color: var(--el-color-primary-light-9); transform: translateY(-1px); }

.action-buttons-inner :deep(.btn-lineage) { color: var(--el-color-warning); }
.action-buttons-inner :deep(.btn-lineage:hover) { background-color: var(--el-color-warning-light-9); transform: translateY(-1px); }

.action-buttons-inner :deep(.btn-delete) { color: var(--el-color-danger); }
.action-buttons-inner :deep(.btn-delete:hover) { background-color: var(--el-color-danger-light-9); transform: translateY(-1px); }

/* 悬浮切换逻辑 */
:deep(.el-table__row:hover) .time-text-display { opacity: 0; }
:deep(.el-table__row:hover) .row-floating-actions { opacity: 1; pointer-events: auto; right: 0; }
:deep(.el-table__row:hover > td.el-table__cell) { background-color: var(--el-table-row-hover-bg-color) !important; }

/* ==================== 辅助类 ==================== */
.af-pagination-wrap { margin-top: 20px; display: flex; justify-content: flex-end; }
.ml-4 { margin-left: 16px; }
.ml-2 { margin-left: 8px; }
</style>