<!-- AdFlowPro_ui\src\pages\atoms\AtomsListPage.vue -->
<template>
  <div class="atoms-list-page">
    <el-card>
      <template #header>
        <div class="master-header-row">
          <span>原子操作管理</span>
          <el-button type="primary" :icon="Plus" @click="handleCreate">新建原子操作</el-button>

          <!-- 1. 批量操作按钮组 -->
          <el-button-group style="margin-left: 15px;">
            <el-button :icon="Edit" type="primary" @click="handleEditSelected" :disabled="selectedAtoms.length !== 1">编辑</el-button>
            <el-button :icon="CopyDocument" type="warning" @click="handleCopySelected" :disabled="selectedAtoms.length !== 1">复制</el-button>
            <el-button :icon="Delete" type="danger" @click="handleDeleteSelected" :disabled="selectedAtoms.length === 0">删除</el-button>
          </el-button-group>

          <!-- 2. 搜索和筛选器 (推到最右侧) -->
          <div class="filter-group-auto">
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
        </div>
      </template>

      <!-- 添加 @row-dblclick 事件监听 -->
      <el-table
          :data="atomStore.atoms"
          v-loading="atomStore.isLoading || categoryStore.isLoading"
          style="width: 100%"
          border
          stripe
          @selection-change="handleSelectionChange"
          @row-click="handleRowClick"
          @row-dblclick="handleRowDblClick"
          ref="atomTableRef">
        <el-table-column type="selection" width="40" />
        <el-table-column prop="atomId" label="ID" width="60" sortable />
        <el-table-column prop="name" label="名称" width="280" sortable />
        <el-table-column prop="categoryName" label="分类" width="100" sortable>
          <template #default="scope">
            <el-tag v-if="scope.row.categoryName" type="info">{{ scope.row.categoryName }}</el-tag>
            <span v-else>--</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalScans" label="扫描" width="80" sortable align="center">
          <template #default="scope">{{ scope.row.totalScans || 0 }}</template>
        </el-table-column>
        <el-table-column prop="totalMatches" label="命中" width="80" sortable align="center">
          <template #default="scope">{{ scope.row.totalMatches || 0 }}</template>
        </el-table-column>
        <el-table-column prop="hitRate" label="命中率" width="95" sortable align="center">
          <template #default="{ row }">
            <el-tag :type="getHitRateColor(row)" effect="plain">
              {{ row.hitRate ? (row.hitRate * 100).toFixed(2) + '%' : '0%' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="95" sortable align="center" />
        <el-table-column prop="description" label="描述" min-width="100" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="createdAt" width="180" sortable>
          <template #default="scope">{{ formatDate(scope.row.createdAt) }}</template>
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
import { useAtomStore } from "@/stores/atomStore";
import { useRouter } from "vue-router";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { ElMessage, ElMessageBox, ElTable } from "element-plus";
import { Plus, Edit, Delete, Search, CopyDocument } from "@element-plus/icons-vue";
import type { AtomicOperationCreatePayload } from "@/types/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const router = useRouter();

const atomTableRef = ref<InstanceType<typeof ElTable>>();
const selectedAtoms = ref<any[]>([]);
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

const handleSelectionChange = (selection: any[]) => {
  selectedAtoms.value = selection;
};

// 单击行：切换选中状态
const handleRowClick = (row: any) => {
  if (atomTableRef.value) {
    const isSelected = selectedAtoms.value.some(item => item.atomId === row.atomId);
    atomTableRef.value.toggleRowSelection(row, !isSelected);
  }
};

// 新增：双击行进入编辑页面
const handleRowDblClick = (row: any) => {
  if (row && row.atomId) {
    handleEdit(row.atomId);
  }
};

const handleEditSelected = () => {
  if (selectedAtoms.value.length === 1) {
    handleEdit(selectedAtoms.value[0].atomId);
  } else {
    ElMessage.warning("请选择且只选择一个原子操作进行编辑。");
  }
};

const handleCopySelected = () => {
  if (selectedAtoms.value.length === 1) {
    handleCopy(selectedAtoms.value[0].atomId);
  } else {
    ElMessage.warning("请选择且只选择一个原子操作进行复制。");
  }
};

const handleDeleteSelected = async () => {
  if (selectedAtoms.value.length === 0) return;
  const names = selectedAtoms.value.map(a => a.name).join(', ');
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedAtoms.value.length} 个原子操作吗？\n涉及: ${names}`, "确认批量删除", {
      type: "warning",
      dangerouslyUseHTMLString: true,
    });
    const deletePromises = selectedAtoms.value.map(atom => atomStore.deleteAtom(atom.atomId));
    await Promise.all(deletePromises);
    ElMessage.success(`成功删除 ${selectedAtoms.value.length} 个原子操作！`);
    fetchData(); // 重新加载数据以更新列表
  } catch (error) {
    if (error === 'cancel') ElMessage.info("已取消删除");
  }
};

const handleCopy = async (atomId: number) => {
  try {
    await ElMessageBox.confirm("确定要复制此原子操作吗？", "确认复制", {
      type: "info",
      confirmButtonText: "复制",
      cancelButtonText: "取消"
    });

    const atom = await atomStore.fetchAtomById(atomId);
    if (!atom) {
      ElMessage.error("获取原数据失败");
      return;
    }

    // 构造创建 Payload，剔除 ID，添加副本后缀
    // 使用 JSON 序列化确保深拷贝，断绝引用关系
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
  } catch (error) {
    if (error !== "cancel") {
      console.error("Copy failed:", error);
    }
  }
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

const getHitRateColor = (row: any) => {
  const scans = row.totalScans || 0;
  const rate = row.hitRate || 0;

  // 僵尸: 扫描了很多次，但从未命中
  if (scans > 500 && rate === 0) return 'danger';
  // 低效
  if (rate < 0.05 && rate > 0) return 'warning';
  // 健康
  return 'success';
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
.master-header-row {
  display: flex;
  align-items: center;
  gap: 15px; /* 增加元素之间的默认间隔 */
}

/* 将搜索/筛选器推到最右侧 */
.filter-group-auto {
  margin-left: auto;
}
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>