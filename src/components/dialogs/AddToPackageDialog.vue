<template>
  <el-dialog v-model="visible" title="快捷归属到测试包" width="560px" append-to-body destroy-on-close>
    <div v-loading="loading">
      <div class="header-tip">
        <el-icon><InfoFilled /></el-icon>
        <span> {{ headerTipText }}</span>
      </div>
      
      <div class="filter-toolbar">
        <el-select 
          v-model="filterCategoryId" 
          placeholder="全部分类" 
          clearable 
          filterable
          style="width: 140px"
          @change="fetchData"
        >
          <el-option 
            v-for="cat in categoryStore.allCategories" 
            :key="cat.categoryId" 
            :label="cat.name" 
            :value="cat.categoryId" 
          />
        </el-select>
        <el-input 
          v-model="searchQuery" 
          placeholder="搜索包名..." 
          prefix-icon="Search" 
          clearable 
          style="width: 200px" 
          @keyup.enter="fetchData"
          @clear="fetchData"
        >
           <template #append><el-button icon="Search" @click="fetchData" /></template>
        </el-input>
      </div>

      <el-table 
        :data="recommendations" 
        size="small" 
        border 
        stripe 
        max-height="420px"
        :row-class-name="tableRowClassName"
      >
        <el-table-column prop="name" label="测试包名称" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isJoined" type="success" size="small" effect="dark">已包含</el-tag>
            <el-tag v-else type="info" size="small" effect="plain">未包含</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center">
          <template #default="{ row }">
            <el-button v-if="!row.isJoined" type="primary" link :icon="Plus" @click="handleAdd(row)" :loading="row.submitting">添加</el-button>
            <div v-else class="action-btns">
              <el-button type="danger" link :icon="Remove" @click="handleRemove(row)" :loading="row.submitting">移除</el-button>
              <el-button type="primary" link @click="jumpToPackage(row.packageId)">查看</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, Remove, InfoFilled, Search } from '@element-plus/icons-vue';
import apiClient from '@/api/apiClient';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';
import { useAtomCategoryStore } from '@/stores/atomCategoryStore';

const visible = ref(false);
const loading = ref(false);
const recommendations = ref<any[]>([]);
const currentAtomId = ref<number | null>(null);
const router = useRouter();
const categoryStore = useAtomCategoryStore();

const filterCategoryId = ref<number | null>(null);
const searchQuery = ref("");

const headerTipText = computed(() => {
  if (filterCategoryId.value || searchQuery.value) {
    return `搜索结果 (最多显示 50 条)`;
  }
  return "智能推荐：系统已为您匹配同分类及最近编辑的测试包。";
});

const tableRowClassName = ({ row }: { row: any }) => {
  return row.isJoined ? 'joined-row' : '';
};

const open = async (atomId: number) => {
  currentAtomId.value = atomId;
  filterCategoryId.value = null; // Reset
  searchQuery.value = "";
  visible.value = true;
  await fetchData();
};

const fetchData = async () => {
  if (!currentAtomId.value) return;
  loading.value = true;
  try {
    const params: any = {};
    if (filterCategoryId.value) params.categoryId = filterCategoryId.value;
    if (searchQuery.value) params.search = searchQuery.value;

    const res = await apiClient.get(`/packages/recommendations/for-atom/${currentAtomId.value}`, { params });
    recommendations.value = (res as any).map((item: any) => ({ ...item, submitting: false }));
  } finally {
    loading.value = false;
  }
};

const handleAdd = async (row: any) => {
  row.submitting = true;
  try {
    await apiClient.post(`/packages/${row.packageId}/atoms/${currentAtomId.value}`);
    ElMessage.success(`已添加至: ${row.name}`);
    row.isJoined = true;
  } finally {
    row.submitting = false;
  }
};

const handleRemove = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定从包 "${row.name}" 中移除此原子操作吗？`, '确认移除', {
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    });
    row.submitting = true;
    await apiClient.delete(`/packages/${row.packageId}/atoms/${currentAtomId.value}`);
    ElMessage.success('移除成功');
    row.isJoined = false;
  } catch (e) {
  } finally {
    row.submitting = false;
  }
};

const jumpToPackage = (id: number) => {
  const route = router.resolve({ name: 'TestPackageEditor', params: { packageId: id } });
  window.open(route.href, '_blank');
};

defineExpose({ open });
</script>

<style scoped>
.header-tip {
  background-color: #f0f9eb; border: 1px solid #e1f3d8; color: #67c23a;
  padding: 8px 12px; border-radius: 4px; font-size: 13px; margin-bottom: 15px;
  display: flex; align-items: center; gap: 8px;
}
.filter-toolbar {
  display: flex; gap: 10px; margin-bottom: 10px;
}
.action-btns { display: flex; align-items: center; justify-content: center; gap: 4px; }

:deep(.joined-row) {
  background-color: #f0f9eb !important;
}
:deep(.joined-row:hover > td) {
  background-color: #e1f3d8 !important;
}
</style>
