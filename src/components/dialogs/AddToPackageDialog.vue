<template>
  <el-dialog v-model="visible" title="快捷归属到测试包" width="520px" append-to-body destroy-on-close>
    <div v-loading="loading">
      <div class="header-tip">
        <el-icon><InfoFilled /></el-icon>
        <span> 智能推荐：系统已为您匹配同分类及最近编辑的测试包。</span>
      </div>
      
      <el-table :data="recommendations" size="small" border stripe max-height="420px">
        <el-table-column prop="name" label="测试包名称" min-width="220" show-overflow-tooltip />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isJoined" type="info" size="small">已包含</el-tag>
            <el-tag v-else type="success" size="small">可选</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button v-if="!row.isJoined" type="primary" link :icon="Plus" @click="handleAction(row)" :loading="row.submitting">添加</el-button>
            <el-button v-else type="primary" link @click="jumpToPackage(row.packageId)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Plus, InfoFilled } from '@element-plus/icons-vue';
import apiClient from '@/api/apiClient';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';

const visible = ref(false);
const loading = ref(false);
const recommendations = ref<any[]>([]);
const currentAtomId = ref<number | null>(null);
const router = useRouter();

const open = async (atomId: number) => {
  currentAtomId.value = atomId;
  visible.value = true;
  loading.value = true;
  try {
    const res = await apiClient.get(`/packages/recommendations/for-atom/${atomId}`);
    recommendations.value = (res as any).map((item: any) => ({ ...item, submitting: false }));
  } finally {
    loading.value = false;
  }
};

const handleAction = async (row: any) => {
  row.submitting = true;
  try {
    await apiClient.post(`/packages/${row.packageId}/atoms/${currentAtomId.value}`);
    ElMessage.success(`已加入包: ${row.name}`);
    visible.value = false;
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
</style>
