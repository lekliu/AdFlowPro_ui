<template>
  <div class="fragments-list-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">动作片段 (Action Fragments)</span>
          <el-button-group>
            <el-button type="primary" :icon="Plus" @click="handleCreate">新建片段</el-button>
            <el-button type="danger" plain :icon="Delete" :disabled="!selectedItems.length" @click="handleBatchDelete">删除选中</el-button>
          </el-button-group>
        </div>
      </template>

      <div class="filter-bar">
        <el-input v-model="searchQuery" placeholder="搜索名称..." clearable style="width: 250px" @keyup.enter="handleSearch" />
        <el-select v-model="categoryFilter" placeholder="按分类筛选" clearable @change="handleSearch" style="width: 180px; margin-left: 10px">
          <el-option v-for="cat in categoryStore.allCategories" :key="cat.categoryId" :label="cat.name" :value="cat.categoryId" />
        </el-select>
      </div>

      <el-table 
        :data="fragmentStore.fragments" 
        v-loading="fragmentStore.isLoading" 
        border 
        stripe 
        ref="tableRef"
        @selection-change="handleSelectionChange"
        @row-click="handleRowClick"
        @row-dblclick="handleRowDblClick"
      >
        <el-table-column type="selection" width="50" align="center" />
        <el-table-column prop="fragmentId" label="ID" width="80" align="center" />
        <el-table-column prop="name" label="片段名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="categoryName" label="分类" width="150">
          <template #default="{ row }">
            <el-tag v-if="row.categoryName" type="info">{{ row.categoryName }}</el-tag>
            <span v-else>--</span>
          </template>
        </el-table-column>
        <el-table-column label="动作数" width="100" align="center">
          <template #default="{ row }">{{ row.actionsJson?.length || 0 }}</template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" @click="handleEdit(row.fragmentId)">编辑</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="fragmentStore.total"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Plus, Edit, Delete, Search } from "@element-plus/icons-vue";
import { useActionFragmentStore } from "@/stores/actionFragmentStore";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { ElMessageBox, ElMessage } from "element-plus";
import { formatDateTime } from "@/utils/formatter";
import { useTablePagination, useTableHelper } from "@/composables/useTableManager";
import { confirmBatchDelete } from "@/utils/messageBox";

const router = useRouter();
const fragmentStore = useActionFragmentStore();
const categoryStore = useAtomCategoryStore();

// --- 使用组合式逻辑管理表格状态 ---
const { currentPage, pageSize, searchQuery, getPaginationParams, resetPagination } = useTablePagination(15);
const {
  tableRef,
  selection: selectedItems,
  handleSelectionChange,
  handleRowClick,
  handleRowDblClick
} = useTableHelper("fragmentId", "ActionFragmentEditor");

const categoryFilter = ref<number | null>(null);

const fetchData = () => {
  fragmentStore.fetchFragments({
    ...getPaginationParams(),
    categoryId: categoryFilter.value || undefined
  });
};

onMounted(() => {
  fetchData();
  categoryStore.fetchAllCategories();
});

const handleSearch = () => { resetPagination(); fetchData(); };
const handlePageChange = (page: number) => { currentPage.value = page; fetchData(); };
const handleCreate = () => router.push({ name: "ActionFragmentEditor" });
const handleEdit = (id: number) => router.push({ name: "ActionFragmentEditor", params: { fragmentId: id } });

const handleBatchDelete = () => {
  const names = selectedItems.value.map(i => i.name);
  confirmBatchDelete(names, "动作片段").then(async (ok) => {
    if (!ok) return;
    const ids = selectedItems.value.map(i => i.fragmentId);
    await fragmentStore.removeBatch(ids);
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
</script>

<style scoped>
.fragments-list-page { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.filter-bar { margin-bottom: 20px; }
.pagination { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>
