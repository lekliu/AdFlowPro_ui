<template>
  <div class="cases-list-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>测试用例管理</span>
          <el-button type="primary" :icon="Plus" @click="handleCreate">新建测试用例</el-button>
        </div>
      </template>

      <div class="filter-container">
        <el-input v-model="searchQuery" placeholder="按名称或描述搜索" clearable @keyup.enter="handleSearch" style="width: 300px; margin-right: 10px">
          <template #append>
            <el-button :icon="Search" @click="handleSearch" />
          </template>
        </el-input>
      </div>

      <el-table :data="caseStore.cases" v-loading="caseStore.isLoading" style="width: 100%" border stripe>
        <el-table-column type="index" width="50" label="序号" />
        <el-table-column prop="name" label="名称" width="200" sortable />
        <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="createdAt" width="180" sortable>
          <template #default="scope">{{ formatDate(scope.row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" :icon="Edit" @click="handleEdit(scope.row.caseId)" />
            <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(scope.row.caseId, scope.row.name)" />
          </template>
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
import { useRouter } from "vue-router";
import { useCaseStore } from "@/stores/caseStore";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Edit, Delete, Search } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const router = useRouter();
const caseStore = useCaseStore();

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
  justify-content: space-between;
  align-items: center;
}
.filter-container {
  margin-bottom: 20px;
}
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
