<template>
  <el-drawer v-model="visible" title="资产血缘与引用分析" size="450px" destroy-on-close>
    <div v-loading="loading" class="lineage-container">
      <div class="impact-header">
        <el-statistic title="累计引用次数" :value="data.usageCount">
          <template #suffix><el-icon><Share /></el-icon></template>
        </el-statistic>
        <p class="impact-desc">若删除此片段，上述引用位置的逻辑将失效</p>
      </div>

      <el-divider content-position="left">引用位置详情</el-divider>

      <div class="lineage-section">
        <h4>被以下“原子操作”引用</h4>
        <el-empty v-if="!data.referencedByAtoms?.length" :image-size="40" description="无直接原子引用" />
        <div v-for="a in data.referencedByAtoms" :key="a.id" class="lineage-card atom-link" @click="jump('atom', a.id)">
          <el-icon><Operation /></el-icon> {{ a.name }}
        </div>

        <h4 style="margin-top: 24px">被以下“动作片段”嵌套调用</h4>
        <el-empty v-if="!data.referencedByFragments?.length" :image-size="40" description="无父级片段引用" />
        <div v-for="f in data.referencedByFragments" :key="f.id" class="lineage-card frag-link" @click="jump('fragment', f.id)">
          <el-icon><MagicStick /></el-icon> {{ f.name }}
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from "@/api/apiClient";
import { Share, Operation, MagicStick } from "@element-plus/icons-vue";

const visible = ref(false);
const loading = ref(false);
const data = ref<any>({});
const router = useRouter();

const open = async (id: number) => {
  visible.value = true;
  loading.value = true;
  try {
    data.value = await apiClient.get(`/action-fragments/${id}/lineage`);
  } finally { loading.value = false; }
};

const jump = (type: 'atom' | 'fragment', id: number) => {
  const routeName = type === 'atom' ? 'AtomEditor' : 'ActionFragmentEditor';
  const paramKey = type === 'atom' ? 'atomId' : 'fragmentId';
  const routeData = router.resolve({ name: routeName, params: { [paramKey]: id } });
  window.open(routeData.href, '_blank');
};

defineExpose({ open });
</script>

<style scoped>
.lineage-container { padding: 0 10px; }
.impact-header { background: #f0f7ff; padding: 20px; border-radius: 8px; border: 1px solid #d1e9ff; margin-bottom: 20px; text-align: center; }
.impact-desc { font-size: 12px; color: #409eff; margin-top: 8px; }
.lineage-card {
  display: flex; align-items: center; gap: 8px; padding: 10px;
  background: #f8f9fa; border-radius: 6px; margin-bottom: 8px;
  font-size: 13px; cursor: pointer; transition: all 0.2s;
}
.atom-link:hover { background: #e6f7ff; color: #1890ff; }
.frag-link:hover { background: #f9f0ff; color: #722ed1; }
</style>