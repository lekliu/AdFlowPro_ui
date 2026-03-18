<template>
  <div class="af-page-container">
    <el-card>
      <template #header>
        <div class="af-list-header">
          <div class="left">
          <!-- 批量操作和新建 -->
          <el-button-group class="header-button-group">
            <el-button :icon="Plus" type="primary" @click="handleCreate">新建用例</el-button>
            <el-button :icon="Edit" type="primary" @click="handleEditSelected" :disabled="selectedCases.length !== 1">编辑</el-button>
            <el-button :icon="Delete" type="danger" @click="handleDeleteSelected" :disabled="selectedCases.length === 0">删除</el-button>
          </el-button-group>
          </div>

          <!-- 搜索和筛选器 (推到最右侧) -->
          <div class="right">
            <el-select v-model="categoryFilter" placeholder="按分类筛选" clearable @change="handleSearch" style="width: 150px; margin-right: 10px">
              <el-option
                  v-for="cat in categoryStore.allCategories"
                  :key="cat.categoryId"
                  :label="cat.name"
                  :value="cat.categoryId"
              />
            </el-select>
            <el-input v-model="searchQuery" placeholder="按名称或描述搜索" clearable @keyup.enter="handleSearch" style="width: 200px; margin-right: 10px">
              <template #append>
                <el-button :icon="Search" @click="handleSearch" />
              </template>
            </el-input>
          </div>
        </div>
      </template>

      <el-table
          :data="caseStore.cases"
          v-loading="caseStore.isLoading"
          style="width: 100%"
          border stripe
          @selection-change="handleSelectionChange"
          @row-click="handleRowClick"
          @row-dblclick="handleRowDblClick"
          ref="tableRef">
        <el-table-column type="selection" width="40" />
        <el-table-column prop="caseId" label="ID" width="80" sortable />
        <el-table-column prop="name" label="名称" width="200" sortable>
          <template #default="scope">
            <div style="display: flex; align-items: center; gap: 8px">
              <el-tag size="small" :type="scope.row.caseType === 'flow' ? 'warning' : 'info'" disable-transitions>
                {{ scope.row.caseType === "flow" ? "流" : "线" }}
              </el-tag>
              <span>{{ scope.row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="categoryName" label="分类" width="120" sortable>
          <template #default="scope">
            <el-tag v-if="scope.row.categoryName" type="info">{{ scope.row.categoryName }}</el-tag>
            <span v-else>--</span>
          </template>
        </el-table-column>

        <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="createdAt" width="180" sortable>
          <template #default="scope">{{ formatDateTime(scope.row.createdAt) }}</template>
        </el-table-column>

      </el-table>

      <div class="af-pagination-wrap">
        <el-pagination
            v-if="caseStore.totalCases > 0"
          :current-page="currentPage"
          :page-size="pageSize"
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
defineOptions({
  name: "TestCasesList",
});
import { ref, onMounted, onActivated } from "vue";
import { useRouter } from "vue-router";
import { useCaseStore } from "@/stores/caseStore";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { ElMessage } from "element-plus";
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

const fetchData = () => {
  const params = {
    ...getPaginationParams(),
    categoryId: categoryFilter.value || undefined,
  };
  caseStore.fetchCases(params);
};

onActivated(() => {
  if (caseStore.needsRefresh) {
    fetchData();
    caseStore.setNeedsRefresh(false);
  }
});

onMounted(() => {
  fetchData();
  categoryStore.fetchAllCategories();
});

const handleSearch = () => {
  resetPagination();
  fetchData();
};

const handleSizeChange = (val: number) => { pageSize.value = val; fetchData(); };
const handleCurrentChange = (val: number) => { currentPage.value = val; fetchData(); };

const handleCreate = () => {
  router.push({ name: "TestCaseEditor" });
};

const handleEditSelected = () => {
  if (selectedCases.value.length === 1) {
    handleEdit(selectedCases.value[0].caseId);
  } else {
    ElMessage.warning("请选择一个测试用例进行编辑");
  }
};

const handleDeleteSelected = async () => {
  if (selectedCases.value.length === 0) return;
  const names = selectedCases.value.map(c => c.name);
  if (await confirmBatchDelete(names, "测试用例")) {
    const deletePromises = selectedCases.value.map(c => caseStore.deleteCase(c.caseId));

    // 注意：如果有依赖冲突的错误，这里会捕获到第一个错误并终止，然后抛出。
    await Promise.all(deletePromises);
    ElMessage.success(`成功删除 ${selectedCases.value.length} 个测试用例！`);
    fetchData();
  }
};

const handleEdit = (caseId: number) => {
  router.push({ name: "TestCaseEditor", params: { caseId } });
};
const handleDelete = async (caseId: number, name: string) => {
  try {
    await ElMessageBox.confirm(`确定要删除测试用例 "${name}" 吗？`, "确认删除", {
      type: "warning",
    });
    await caseStore.deleteCase(caseId);
    ElMessage.success("删除成功！");
    if (caseStore.cases.length === 0 && currentPage.value > 1) {
      currentPage.value--;
    }
    fetchData();
  } catch (error) {
    if (error !== "cancel") {
    } else {
      ElMessage.info("已取消删除");
    }
  }
};

</script>

<style scoped>
.cases-list-page {
  padding: 0px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 15px;
}
.filter-group-auto {
  margin-left: auto;
}
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>