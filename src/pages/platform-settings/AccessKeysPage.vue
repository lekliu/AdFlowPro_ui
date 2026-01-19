<!-- AdFlowPro_ui/src/pages/platform-settings/AccessKeysPage.vue -->
<template>
  <div class="access-keys-page">
    <el-card>
      <template #header>
        <div class="flex-header">
          <span>接入码管理 (经营中心)</span>
          <el-button type="primary" :icon="Plus" @click="openDialog">批量生成接入码</el-button>
        </div>
      </template>

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
        <el-table-column label="激活时间" width="160">
          <template #default="{row}">{{ row.usedAt ? new Date(row.usedAt).toLocaleString() : '-' }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog.visible" title="生成接入码" width="400px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="授权天数">
          <el-input-number v-model="form.duration_days" :min="1" />
        </el-form-item>
        <el-form-item label="生成数量">
          <el-input-number v-model="form.count" :min="1" :max="50" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="handleGenerate" :loading="generating">立即生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { Plus, CopyDocument } from '@element-plus/icons-vue';
import apiClient from '@/api/apiClient';
import { ElMessage } from 'element-plus';

const keys = ref([]);
const loading = ref(false);
const generating = ref(false);
const dialog = reactive({ visible: false });
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

const openDialog = () => { dialog.visible = true; };
onMounted(fetchKeys);
</script>

<style scoped>
.flex-header { display: flex; justify-content: space-between; align-items: center; }
.code-container { display: flex; align-items: center; gap: 8px; }
.key-code { background: #f4f4f5; color: #409eff; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: bold; }
</style>