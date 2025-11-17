<template>
  <div class="atoms-list-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>原子操作管理</span>
          <el-button type="primary" :icon="Plus" @click="handleCreate">新建原子操作</el-button>
        </div>
      </template>

      <div class="filter-container">
        <el-input v-model="searchQuery" placeholder="按名称或描述搜索" clearable @keyup.enter="handleSearch" style="width: 250px; margin-right: 10px">
          <template #append>
            <el-button :icon="Search" @click="handleSearch" />
          </template>
        </el-input>
        <el-select v-model="categoryFilter" placeholder="按分类筛选" clearable @change="handleSearch" style="width: 200px">
          <el-option
            v-for="category in categoryStore.allCategories"
            :key="category.categoryId"
            :label="category.name"
            :value="category.categoryId"
          />
        </el-select>
      </div>

      <el-table :data="atomStore.atoms" v-loading="atomStore.isLoading || categoryStore.isLoading" style="width: 100%" border stripe>
        <el-table-column prop="atomId" label="ID" width="80" sortable />
        <el-table-column prop="name" label="名称" width="200" sortable />
        <el-table-column prop="categoryName" label="分类" width="150" sortable>
          <template #default="scope">
            <el-tag v-if="scope.row.categoryName" type="info">{{ scope.row.categoryName }}</el-tag>
            <span v-else>--</span>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="110" sortable align="center" />
        <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="createdAt" width="180" sortable>
          <template #default="scope">{{ formatDate(scope.row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" :icon="Edit" @click="handleEdit(scope.row.atomId)" />
            <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(scope.row.atomId, scope.row.name)" />
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="atomStore.totalAtoms > 0"
        class="pagination-container"
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="atomStore.totalAtoms"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "AtomsList",
});

import { ref, onMounted, onActivated } from "vue";
import { useRouter } from "vue-router";
import { useAtomStore } from "@/stores/atomStore";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Edit, Delete, Search } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const router = useRouter();
const atomStore = useAtomStore();
const categoryStore = useAtomCategoryStore();

const currentPage = ref(1);
const pageSize = ref(10);
const searchQuery = ref("");
const categoryFilter = ref<number | "">("");

const fetchData = () => {
  const params = {
    skip: (currentPage.value - 1) * pageSize.value,
    limit: pageSize.value,
    search: searchQuery.value || undefined,
    categoryId: categoryFilter.value || undefined,
  };
  atomStore.fetchAtoms(params);
};

onActivated(() => {
  if (atomStore.needsRefresh) {
    fetchData();
    atomStore.setNeedsRefresh(false);
  }
});

onMounted(() => {
  fetchData();
  categoryStore.fetchAllCategories();
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
  router.push({ name: "AtomEditor" });
};

const handleEdit = (atomId: number) => {
  router.push({ name: "AtomEditor", params: { atomId } });
};

const handleDelete = async (atomId: number, name: string) => {
  try {
    await ElMessageBox.confirm(`确定要删除原子操作 "${name}" 吗？`, "确认删除", {
      type: "warning",
    });
    await atomStore.deleteAtom(atomId);
    ElMessage.success("删除成功！");
    if (atomStore.atoms.length === 0 && currentPage.value > 1) {
      currentPage.value--;
    }
    fetchData();
  } catch (error) {
    if (error !== "cancel") {
      // API error handled by interceptor
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
.atoms-list-page {
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
