<!-- AdFlowPro_ui/src/pages/platform-settings/AccessKeysPage.vue -->
<template>
  <div class="access-keys-page">
    <el-card>
      <template #header>
        <div class="flex-header">
          <div class="header-left">
            <span class="title">接入码管理 (经营中心)</span>
            <!-- 新增刷新按钮 -->
            <el-button
                :icon="Refresh"
                circle
                size="small"
                @click="fetchKeys"
                :loading="loading"
                style="margin-left: 10px"
                title="刷新列表"
            />
          </div>
          <div class="header-right">
            <el-button type="success" :icon="Download" @click="openExportDialog" plain>生成并导出 TXT</el-button>
            <el-button type="primary" :icon="Plus" @click="openDialog">仅批量生成</el-button>
          </div>
        </div>
      </template>

      <div class="stats-overview">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-statistic title="累计生成" :value="stats.total" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="待激活(货架)" :value="stats.unused" value-style="color: #409eff" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="已激活(在保)" :value="stats.used" value-style="color: #67c23a" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="7天内到期" :value="stats.expiringSoon" value-style="color: #f56c6c" />
          </el-col>
        </el-row>
      </div>

      <el-table :data="keys" v-loading="loading" border stripe size="small">
        <el-table-column prop="keyCode" label="接入码" width="220">
          <template #default="{row}">
            <div class="code-container">
              <code class="key-code">{{ row.keyCode }}</code>
              <el-tooltip content="点击复制" placement="top">
                <el-button 
                  link 
                  type="primary" 
                  :icon="CopyDocument" 
                  @click="handleCopy(row.keyCode)"
                />
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="durationDays" label="有效期" width="100">
          <template #default="{row}">{{ row.durationDays }} 天</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{row}">
            <el-tag :type="row.isUsed ? 'info' : 'success'">
              {{ row.isUsed ? '已激活' : '待使用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="usedByDevice" label="使用者" min-width="150" show-overflow-tooltip />
        <el-table-column label="激活时间" width="180">
          <!-- 修改点：使用自定义 formatDate 函数显示本地时间 -->
          <template #default="{row}">{{ formatDate(row.usedAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.isExport ? '生成并导出接入码' : '批量生成接入码'" width="400px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="授权天数">
          <el-input-number v-model="form.duration_days" :min="1" />
        </el-form-item>
        <el-form-item label="生成数量">
          <el-input-number v-model="form.count" :min="1" :max="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button
            :type="dialog.isExport ? 'success' : 'primary'"
            @click="dialog.isExport ? handleExportGenerate() : handleGenerate()"
            :loading="generating"
        >
          {{ dialog.isExport ? '立即生成并下载' : '立即生成' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { Plus, CopyDocument, Download, Refresh } from '@element-plus/icons-vue';
import apiClient from '@/api/apiClient';
import { ElMessage } from 'element-plus';
// 引入时间处理库
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

// 初始化 dayjs 插件
dayjs.extend(utc);

const keys = ref([]);
const loading = ref(false);
const generating = ref(false);
const dialog = reactive({ visible: false });

// 新增：时间格式化工具函数（UTC转当地时间）
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return dayjs.utc(dateString).local().format("YYYY-MM-DD HH:mm:ss");
};

const openDialog = () => {
  dialog.isExport = false;
  dialog.visible = true;
};

const openExportDialog = () => {
  dialog.isExport = true;
  dialog.visible = true;
};

// [核心新增] 生成并导出逻辑
const handleExportGenerate = async () => {
  generating.value = true;
  try {
    // 关键点：请求文件流需要特殊处理
    // 虽然我们的 apiClient 默认返回 response.data，但对于文件下载，我们需要原始 Blob
    const response = await apiClient.post('/system/tenants/keys/batch-export', form, {
      responseType: 'blob' // 告诉 axios 我们要二进制数据
    });

    // 处理文件下载
    const blob = new Blob([response]); // response 此时已经是文件内容
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // 尝试从 header 获取文件名，或者给个默认名
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `AdFlowPro_Keys_Batch_${date}.txt`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    ElMessage.success('授权码生成成功，文件已开始下载');
    dialog.visible = false;
    fetchKeys(); // 刷新列表
  } catch (error) {
    console.error("Export failed:", error);
  } finally {
    generating.value = false;
  }
};

const form = reactive({ duration_days: 30, count: 1 });

const fetchKeys = async () => {
  loading.value = true;
  try {
    const res = await apiClient.get('/system/tenants/keys');
    keys.value = res.items;
  } finally { loading.value = false; }
};

const handleGenerate = async () => {
  generating.value = true;
  try {
    await apiClient.post('/system/tenants/keys', form);
    ElMessage.success('接入码生成成功');
    dialog.visible = false;
    fetchKeys();
  } finally { generating.value = false; }
};

const handleCopy = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板');
  }).catch(() => {
    ElMessage.error('复制失败，请手动选择复制');
  });
};

const stats = reactive({ total: 0, used: 0, unused: 0, expiringSoon: 0 });

const fetchStats = async () => {
  const res = await apiClient.get('/system/tenants/keys/stats');
  Object.assign(stats, res);
};

onMounted(() => {
  fetchKeys();
  fetchStats();
});

</script>

<style scoped>
.flex-header { display: flex; justify-content: space-between; align-items: center; }
.code-container { display: flex; align-items: center; gap: 8px; }
.key-code { background: #f4f4f5; color: #409eff; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: bold; }
.stats-overview { padding: 10px 0; text-align: center; }
</style>