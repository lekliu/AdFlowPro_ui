<template>
  <div class="packages-list-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">测试包管理</span>

          <!-- 批量操作和新建 -->
          <el-button-group class="header-button-group">
            <el-button :icon="Plus" type="primary" @click="handleCreate">新建测试包</el-button>
            <el-button :icon="Edit" type="primary" @click="handleEditSelected" :disabled="selectedPackages.length !== 1">编辑</el-button>
            <el-button :icon="Delete" type="danger" @click="handleDeleteSelected" :disabled="selectedPackages.length === 0">删除</el-button>

          </el-button-group>

          <!-- 搜索和筛选器 (推到最右侧) -->
          <div class="filter-group-auto">
            <el-select v-model="categoryFilter" placeholder="按分类筛选" clearable @change="handleSearch" style="width: 150px">
              <el-option
                  v-for="category in categoryStore.allCategories"
                  :key="category.categoryId"
                  :label="category.name"
                  :value="category.categoryId"
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
          :data="packageStore.packages"
          v-loading="packageStore.isLoading"
          style="width: 100%"
          border
          stripe
          row-key="packageId"
          @selection-change="handleSelectionChange"
          @row-click="handleRowClick"
          @row-dblclick="handleRowDblClick"
          ref="packageTableRef">
        <el-table-column type="selection" width="40" />
        <el-table-column prop="packageId" label="ID" width="90" sortable />
        <el-table-column prop="name" label="名称" width="200" sortable />
        <el-table-column prop="category" label="分类" width="150" sortable>
          <template #default="scope">
            <el-tag v-if="scope.row.category" type="info">{{ scope.row.category.name }}</el-tag>
            <span v-else>--</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip>
             <template #default="scope">
               <el-button
                   size="small"
                   type="warning"
                   circle
                   :icon="Compass"
                   @click="openLineage(scope.row.packageId)"
                   title="血缘分析"
               />
               <span>{{ scope.row.description || '--' }}</span>
             </template>
        </el-table-column>
        <el-table-column label="是否公共" width="100" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.isCommon ? 'success' : 'info'">{{ scope.row.isCommon ? "是" : "否" }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createdAt" width="180" sortable>
          <template #default="scope">{{ formatDate(scope.row.createdAt) }}</template>
        </el-table-column>
      </el-table>

      <el-pagination
          v-if="packageStore.totalPackages > 0"
          class="pagination-container"
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="packageStore.totalPackages"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
      />
    </el-card>
    <!-- 在模板底部引入组件 -->
    <PackageLineageDrawer ref="lineageDrawer" />
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "TestPackagesList",
});

import { ref, onMounted, onActivated } from "vue";
import { useRouter } from "vue-router";
import { usePackageStore } from "@/stores/packageStore";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { ElMessage, ElMessageBox } from "element-plus";
import type { ElTable } from "element-plus";
import { Plus, Edit, Delete, Search,Compass } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// 1. 确保导入了组件，以便获取其类型
import PackageLineageDrawer from "@/components/PackageLineageDrawer.vue";

// 2. 为 ref 显式定义类型，告知编译器它具有 .open 方法
const lineageDrawer = ref<InstanceType<typeof PackageLineageDrawer> | null>(null);

// 3. 为 id 增加类型定义，并增加空值保护
const openLineage = (id: number) => {
  // 使用 ?. 可选链或 if 判断，确保组件已挂载
  lineageDrawer.value?.open(id);
};



dayjs.extend(utc);

const router = useRouter();
const packageStore = usePackageStore();
const categoryStore = useAtomCategoryStore();

const currentPage = ref(1);
const pageSize = ref(10);
const searchQuery = ref("");
const packageTableRef = ref<InstanceType<typeof ElTable>>();
const selectedPackages = ref<any[]>([]);
const categoryFilter = ref<number | "">("");


const fetchData = () => {
  const params = {
    skip: (currentPage.value - 1) * pageSize.value,
    limit: pageSize.value,
    search: searchQuery.value || undefined,
    categoryId: categoryFilter.value || undefined,
  };
  packageStore.fetchPackages(params);
};

onActivated(() => {
  if (packageStore.needsRefresh) {
    fetchData();
    packageStore.setNeedsRefresh(false);
  }
});

onMounted(() => {
  fetchData();
  categoryStore.fetchAllCategories();
});

const handleSearch = () => {
  currentPage.value = 1;
  // 核心修复：搜索前清空表格选中状态，防止 ID 错位
  if (packageTableRef.value) {
    packageTableRef.value.clearSelection();
  }
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
  router.push({ name: "TestPackageEditor" });
};

const handleEdit = (packageId: number) => {
  router.push({ name: "TestPackageEditor", params: { packageId } });
};

const handleSelectionChange = (selection: any[]) => {
  selectedPackages.value = selection;
};

// 新增：点击行时触发选中/取消选中
const handleRowClick = (row: any) => {
  if (packageTableRef.value) {
    const isSelected = selectedPackages.value.some(item => item.packageId === row.packageId);
    packageTableRef.value.toggleRowSelection(row, !isSelected);
  }
};

// 击行进入编辑页面
const handleRowDblClick = (row: any) => {
  if (row && row.packageId) {
    handleEdit(row.packageId);
  }
};

const handleEditSelected = () => {
  if (selectedPackages.value.length === 1) {
    handleEdit(selectedPackages.value[0].packageId);
  } else {
    ElMessage.warning("请选择且只选择一个测试包进行编辑。");
  }
};

const handleDeleteSelected = async () => {
  if (selectedPackages.value.length === 0) return;
  const names = selectedPackages.value.map(a => a.name).join(', ');
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedPackages.value.length} 个测试包吗？\n涉及: ${names}`, "确认批量删除", {
      type: "warning",
      dangerouslyUseHTMLString: true,
    });
    const deletePromises = selectedPackages.value.map(pkg => packageStore.deletePackage(pkg.packageId));

    // 注意：如果有依赖冲突的错误，这里会捕获到第一个错误并终止，然后抛出。
    await Promise.all(deletePromises);

    ElMessage.success(`成功删除 ${selectedPackages.value.length} 个测试包！`);
    fetchData(); // 重新加载数据以更新列表
  } catch (error) {
    if (error === 'cancel') ElMessage.info("已取消删除");
    // 其他错误（如依赖冲突）由 API 拦截器处理
  }
};

const handleDelete = async (packageId: number, name: string) => {
  try {
    await ElMessageBox.confirm(`确定要删除测试包 "${name}" 吗？`, "确认删除", {
      type: "warning",
    });
    await packageStore.deletePackage(packageId);
    ElMessage.success("删除成功！");
    if (packageStore.packages.length === 0 && currentPage.value > 1) {
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
.packages-list-page {
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