<template>
  <div class="atom-usage-panel" v-loading="isLoading">
    <div v-if="!report" class="empty-state">
      <el-button type="primary" plain @click="loadUsage">分析引用关系</el-button>
    </div>
    
    <div v-else>
      <div class="section-title">直接引用 (流程图用例)</div>
      <div v-if="report.directFlowCases.length === 0" class="no-data">无直接引用</div>
      <el-collapse v-else>
        <el-collapse-item v-for="flowCase in report.directFlowCases" :key="flowCase.caseId" :name="'flow-' + flowCase.caseId">
          <template #title>
            <el-icon class="icon-flow"><Share /></el-icon>
            <span class="case-name">{{ flowCase.name }}</span>
            <el-tag size="small" type="warning" effect="plain">流程图</el-tag>
            <el-button type="primary" link size="small" @click.stop="openCase(flowCase.caseId)" style="margin-left: auto">跳转</el-button>
          </template>
          <ul class="location-list">
            <li v-for="(loc, idx) in flowCase.locations" :key="idx">{{ loc }}</li>
          </ul>
        </el-collapse-item>
      </el-collapse>

      <div class="section-title" style="margin-top: 20px">间接引用 (通过测试包)</div>
      <div v-if="report.packages.length === 0" class="no-data">无间接引用</div>
      <el-collapse v-else>
        <el-collapse-item v-for="pkg in report.packages" :key="pkg.packageId" :name="'pkg-' + pkg.packageId">
          <template #title>
            <el-icon class="icon-pkg"><TakeawayBox /></el-icon>
            <span class="pkg-name">{{ pkg.name }}</span>
            <el-button type="primary" link size="small" @click.stop="openPackage(pkg.packageId)" style="margin-left: auto">跳转包</el-button>
          </template>
          
          <!-- Linear Cases using this package -->
          <div v-if="pkg.relatedLinearCases.length > 0" class="sub-section">
            <div class="sub-title">被线性用例引用:</div>
            <div v-for="lc in pkg.relatedLinearCases" :key="lc.caseId" class="usage-item">
              <span class="case-name">{{ lc.name }}</span>
              <el-button type="primary" link size="small" @click="openCase(lc.caseId)">跳转</el-button>
            </div>
          </div>

          <!-- Flow Cases using this package -->
          <div v-if="pkg.relatedFlowCases.length > 0" class="sub-section">
            <div class="sub-title">被流程图用例引用:</div>
            <div v-for="fc in pkg.relatedFlowCases" :key="fc.caseId" class="usage-item-flow">
              <div class="flow-header">
                <span class="case-name">{{ fc.name }}</span>
                <el-button type="primary" link size="small" @click="openCase(fc.caseId)">跳转</el-button>
              </div>
              <ul class="location-list">
                <li v-for="(loc, idx) in fc.locations" :key="idx">{{ loc }}</li>
              </ul>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Share, TakeawayBox } from '@element-plus/icons-vue';
import { atomService } from '@/api/atomService';
import type { AtomUsageReport } from '@/types/api';
import { useRouter } from 'vue-router';

const props = defineProps<{ atomId: number }>();
const router = useRouter();

const isLoading = ref(false);
const report = ref<AtomUsageReport | null>(null);

const loadUsage = async () => {
  isLoading.value = true;
  try {
    report.value = await atomService.getAtomUsage(props.atomId);
  } finally {
    isLoading.value = false;
  }
};

const openCase = (caseId: number) => {
  const route = router.resolve({ name: 'TestCaseEditor', params: { caseId } });
  window.open(route.href, '_blank');
};

const openPackage = (packageId: number) => {
  const route = router.resolve({ name: 'TestPackageEditor', params: { packageId } });
  window.open(route.href, '_blank');
};
</script>

<style scoped>
.section-title { font-weight: bold; margin-bottom: 10px; color: #606266; }
.no-data { color: #909399; font-size: 13px; font-style: italic; margin-bottom: 10px; }
.case-name, .pkg-name { margin-left: 5px; margin-right: 10px; font-weight: 500; }
.location-list { margin: 5px 0 5px 20px; padding: 0; font-size: 12px; color: #606266; }
.sub-section { margin: 10px 0 10px 20px; border-left: 2px solid #e4e7ed; padding-left: 10px; }
.sub-title { font-size: 12px; color: #909399; margin-bottom: 5px; }
.usage-item, .flow-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.icon-flow { color: #e6a23c; }
.icon-pkg { color: #409eff; }
</style>
