<template>
  <div class="system-settings-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">系统全局配置 (仅超级管理员)</span>
          <el-button :icon="Refresh" circle @click="fetchData" :loading="loading" />
        </div>
      </template>

      <el-table :data="settings" v-loading="loading" border stripe style="width: 100%">
        <el-table-column prop="key" label="配置项 (Key)" width="220">
          <template #default="{row}">
            <code class="key-code">{{ row.key }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="value" label="当前值" min-width="150">
          <template #default="{row}">
            <el-tag effect="plain">{{ row.value }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="配置说明" min-width="250" />
        <el-table-column label="最后修改" width="180">
          <template #default="{row}">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{row}">
            <el-button type="primary" link :icon="Edit" @click="handleEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="editDialog.visible" title="修改配置值" width="400px">
      <el-form :model="editDialog.form" label-position="top">
        <el-form-item :label="`配置项: ${editDialog.form.key}`">
          <el-input v-model="editDialog.form.value" placeholder="请输入新的配置值" />
        </el-form-item>
        <div class="tip-text">{{ editDialog.form.description }}</div>
      </el-form>
      <template #footer>
        <el-button @click="editDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitUpdate" :loading="submitting">保存变更</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { Refresh, Edit } from '@element-plus/icons-vue';
import { systemSettingsService, type SystemSetting } from '@/api/systemSettingsService';
import { ElMessage } from 'element-plus';
import { formatDateTime } from '@/utils/formatter';

const settings = ref<SystemSetting[]>([]);
const loading = ref(false);
const submitting = ref(false);

const editDialog = reactive({
  visible: false,
  form: { key: '', value: '', description: '' }
});

const fetchData = async () => {
  loading.value = true;
  try {
    settings.value = await systemSettingsService.getSettings();
  } finally { loading.value = false; }
};

const handleEdit = (row: SystemSetting) => {
  editDialog.form = { ...row };
  editDialog.visible = true;
};

const submitUpdate = async () => {
  if (!editDialog.form.value) return ElMessage.warning("值不能为空");
  submitting.value = true;
  try {
    await systemSettingsService.updateSetting(editDialog.form.key, editDialog.form.value);
    ElMessage.success('配置已更新');
    editDialog.visible = false;
    fetchData();
  } finally { submitting.value = false; }
};

onMounted(fetchData);
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 16px; font-weight: bold; }
.key-code { 
  background: #f4f4f5; color: #409eff; padding: 2px 6px; 
  border-radius: 4px; font-family: monospace; 
}
.tip-text { 
  font-size: 12px; color: #909399; margin-top: -10px; 
  background: #f8f9fa; padding: 8px; border-radius: 4px;
}
</style>
