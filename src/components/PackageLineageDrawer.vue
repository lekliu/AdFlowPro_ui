<template>
  <el-drawer v-model="visible" title="资产血缘与影响评估" size="450px" destroy-on-close>
    <div v-loading="loading" class="lineage-container">
      <div class="impact-header">
        <el-statistic title="变更影响半径 (Blast Radius)" :value="data.blastRadius">
          <template #suffix><el-icon><Warning /></el-icon></template>
        </el-statistic>
        <p class="impact-desc">修改此包将直接波及以上数量的业务场景</p>
      </div>

      <el-divider content-position="left">上游溯源 (Inbound)</el-divider>

      <div class="lineage-section">
        <h4>引用此包的测试用例</h4>
        <el-empty v-if="!data.upstream?.cases.length" :image-size="40" description="暂无关联用例" />
        <div v-for="c in data.upstream?.cases" :key="c.id" class="lineage-card case-link" @click="jump('case', c.id)">
          <el-icon><Document /></el-icon> {{ c.name }}
        </div>

        <h4>包含此包的父测试包</h4>
        <el-empty v-if="!data.upstream?.packages.length" :image-size="40" description="暂无父包" />
        <div v-for="p in data.upstream?.packages" :key="p.id" class="lineage-card pkg-link" @click="jump('package', p.id)">
          <el-icon><FolderOpened /></el-icon> {{ p.name }}
        </div>
      </div>

      <el-divider content-position="left">下游依赖 (Outbound)</el-divider>

      <div class="lineage-section">
        <h4>依赖的原子操作</h4>
        <div v-for="a in data.downstream?.atoms" :key="a.id" class="lineage-card atom-tag">
          <el-icon><Operation /></el-icon> {{ a.name }}
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from "@/api/apiClient";
// 重点：补齐图标导入
import { Warning, Document, FolderOpened, Operation } from "@element-plus/icons-vue";

const visible = ref(false);
const loading = ref(false);
const data = ref<any>({});
const router = useRouter();

const open = async (id: number) => {
  visible.value = true;
  loading.value = true;
  try {
    data.value = await apiClient.get(`/packages/${id}/lineage`);
  } finally { loading.value = false; }
};

const jump = (type: 'case' | 'package', id: number) => {
  const routeName = type === 'case' ? 'TestCaseEditor' : 'TestPackageEditor';
  const paramKey = type === 'case' ? 'caseId' : 'packageId';

  // 使用 router 获取 URL
  const routeData = router.resolve({
    name: routeName,
    params: { [paramKey]: id }
  });
  window.open(routeData.href, '_blank');
};

defineExpose({ open });
</script>

<style scoped>
.lineage-container { padding: 0 10px; }
.impact-header { background: #fff2f0; padding: 20px; border-radius: 8px; border: 1px solid #ffccc7; margin-bottom: 20px; text-align: center; }
.impact-desc { font-size: 12px; color: #ff4d4f; margin-top: 8px; }
.lineage-card {
  display: flex; align-items: center; gap: 8px; padding: 10px;
  background: #f5f5f5; border-radius: 6px; margin-bottom: 8px;
  font-size: 13px; cursor: pointer; transition: all 0.2s;
}
.case-link:hover { background: #e6f7ff; color: #1890ff; }
.pkg-link:hover { background: #f9f0ff; color: #722ed1; }
.atom-tag { cursor: default; background: #f0f5ff; color: #2f54eb; }
</style>