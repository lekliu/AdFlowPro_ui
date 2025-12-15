<template>
  <div class="cases-list-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">测试用例管理</span>

          <!-- 批量操作和新建 -->
          <el-button-group class="header-button-group">
            <el-button :icon="Plus" type="primary" @click="handleCreate">新建用例</el-button>
            <el-button :icon="Edit" type="primary" @click="handleEditSelected" :disabled="selectedCases.length !== 1">编辑</el-button>
            <el-button :icon="Delete" type="danger" @click="handleDeleteSelected" :disabled="selectedCases.length === 0">删除</el-button>
          </el-button-group>

          <!-- 搜索和筛选器 (推到最右侧) -->
          <div class="filter-group-auto">
            <el-input v-model="searchQuery" placeholder="按名称或描述搜索" clearable @keyup.enter="handleSearch" style="width: 300px; margin-right: 10px">
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
          ref="caseTableRef">
        <el-table-column type="selection" width="40" />
        <el-table-column prop="caseId" label="ID" width="90" sortable />
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
        <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="createdAt" width="180" sortable>
          <template #default="scope">{{ formatDate(scope.row.createdAt) }}</template>
        </el-table-column>

      </el-table>

      <el-pagination
          v-if="caseStore.totalCases > 0"
          class="pagination-container"
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="caseStore.totalCases"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "TestCasesList",
});
import { ref, onMounted, onActivated } from "vue";
import type { ElTable } from "element-plus";
import { useRouter } from "vue-router";
import { useCaseStore } from "@/stores/caseStore";
import type { TestCaseListPublic } from "@/types/api";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Edit, Delete, Search } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const router = useRouter();
const caseStore = useCaseStore();
const caseTableRef = ref<InstanceType<typeof ElTable>>();
const selectedCases = ref<TestCaseListPublic[]>([]);

const currentPage = ref(1);
const pageSize = ref(10);
const searchQuery = ref("");

const fetchData = () => {
  const params = {
    skip: (currentPage.value - 1) * pageSize.value,
    limit: pageSize.value,
    search: searchQuery.value || undefined,
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
});

const handleSearch = () => {
  currentPage.value = 1;
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

const handleCreate = () => {
  router.push({ name: "TestCaseEditor" });
};

const handleSelectionChange = (selection: TestCaseListPublic[]) => {
  selectedCases.value = selection;
};

// 点击行时触发选中/取消选中
const handleRowClick = (row: TestCaseListPublic) => {
  if (caseTableRef.value) {
    const isSelected = selectedCases.value.some(item => item.caseId === row.caseId);
    caseTableRef.value.toggleRowSelection(row, !isSelected);
  }
};

// 双击行进入编辑页面
const handleRowDblClick = (row: TestCaseListPublic) => {
  if (row && row.caseId) {
    handleEdit(row.caseId);
  }
};

const handleEditSelected = () => {
  if (selectedCases.value.length === 1) {
    handleEdit(selectedCases.value[0].caseId);
  } else {
    ElMessage.warning("请选择且只选择一个测试用例进行编辑。");
  }
};

const handleDeleteSelected = async () => {
  if (selectedCases.value.length === 0) return;
  const names = selectedCases.value.map(a => a.name).join(', ');
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedCases.value.length} 个测试用例吗？\n涉及: ${names}`, "确认批量删除", {
      type: "warning",
      dangerouslyUseHTMLString: true,
    });

    const deletePromises = selectedCases.value.map(c => caseStore.deleteCase(c.caseId));

    // 注意：如果有依赖冲突的错误，这里会捕获到第一个错误并终止，然后抛出。
    await Promise.all(deletePromises);

    ElMessage.success(`成功删除 ${selectedCases.value.length} 个测试用例！`);
    fetchData(); // 重新加载数据以更新列表
  } catch (error) {
    if (error === 'cancel') ElMessage.info("已取消删除");
    // 其他错误（如依赖冲突）由 API 拦截器处理
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

const formatDate = (dateString: string | Date): string => {
  if (!dateString) return "N/A";
  return dayjs.utc(dateString).local().format("YYYY-MM-DD HH:mm:ss");
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