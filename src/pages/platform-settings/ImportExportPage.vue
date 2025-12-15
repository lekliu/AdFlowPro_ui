<template>
  <div class="import-export-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>数据导入/导出 (AF Pro v1.0)</span>
        </div>
      </template>

      <el-row :gutter="20">
        <!-- 导入面板 -->
        <el-col :span="12">
          <el-card shadow="hover" header="导入资产 (.afp 文件)">
            <p class="description">选择包含测试资产（原子操作、包、用例等）的 `.afp` 或 `.zip` 文件进行上传。导入将自动重映射所有 ID。</p>
            <el-upload
                ref="uploadRef"
                :auto-upload="false"
                :limit="1"
                :on-change="handleFileChange"
                :on-exceed="handleExceed"
                :http-request="uploadFile"
                :disabled="isImporting"
                accept=".afp,.zip"
            >
              <template #trigger>
                <el-button type="primary" :icon="Upload">选择文件 (.afp / .zip)</el-button>
              </template>
              <el-button style="margin-left: 10px" type="success" :icon="Check" @click="submitUpload" :loading="isImporting" :disabled="!fileToUpload">
                {{ isImporting ? '导入中...' : '开始导入' }}
              </el-button>
            </el-upload>
            <div v-if="importSummary" class="import-summary">
              <h4>导入结果：</h4>
              <div v-for="(item, index) in importSummary.imported" :key="index" class="success-item">
                <el-icon><SuccessFilled /></el-icon> {{ item }}
              </div>
              <div v-if="importSummary.errors.length" class="error-item">
                <el-icon><WarningFilled /></el-icon> 导入错误: {{ importSummary.errors.join('; ') }}
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 导出面板 -->
        <el-col :span="12">
          <el-card shadow="hover" header="选择性导出">
            <p class="description">选择要导出的资产类型，后续在列表页选择具体的资产 ID。</p>

            <el-form label-position="top">
              <el-form-item label="选择导出类型">
                <el-select v-model="exportType" placeholder="请选择资产类型" style="width: 100%">
                  <el-option label="原子操作 (Atom)" value="atoms" />
                  <el-option label="测试包 (Package)" value="packages" />
                  <el-option label="测试用例 (Case)" value="cases" />
                  <el-option label="测试套件 (Suite)" value="suites" />
                </el-select>
              </el-form-item>
              <el-form-item v-if="exportType" label="资产 ID 列表">
                <el-input v-model="exportIdsInput" type="textarea" :rows="4" placeholder="输入要导出的资产ID，以逗号分隔，例如: 101, 102, 105" />
              </el-form-item>
              <el-form-item>
                <el-button type="warning" :icon="Download" @click="handleExport" :loading="isExporting" :disabled="!isExportValid">
                  开始导出 (.afp)
                </el-button>
              </el-form-item>
            </el-form>

          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "ImportExport",
});

import { ref, computed } from 'vue';
import { Upload, Check, Download, SuccessFilled, WarningFilled } from '@element-plus/icons-vue';
import type { UploadInstance, UploadRawFile, UploadFile, UploadProgressEvent } from 'element-plus';
import { ElMessage, ElMessageBox } from 'element-plus';
import { importExportService } from '@/api/importExportService';

interface ImportSummary {
  imported: string[];
  errors: string[];
}

// --- 导入状态 ---
const uploadRef = ref<UploadInstance>();
const isImporting = ref(false);
const fileToUpload = ref<File | null>(null);
const importSummary = ref<ImportSummary | null>(null);

const handleExceed = (files: File[]) => {
  uploadRef.value!.clearFiles();
  const file = files[0] as UploadRawFile;
  uploadRef.value!.handleStart(file);
  fileToUpload.value = file;
};

const handleFileChange = (file: UploadFile) => {
  fileToUpload.value = file.raw || null;
  importSummary.value = null; // Reset summary on new file selection
};

const submitUpload = () => {
  if (!fileToUpload.value) {
    ElMessage.warning('请先选择文件');
    return;
  }
  uploadFile();
};

const uploadFile = async () => {
  if (!fileToUpload.value) return;

  isImporting.value = true;
  importSummary.value = null;

  try {
    const summary = await importExportService.importAssets(fileToUpload.value);
    importSummary.value = summary;
    ElMessage.success('资产导入成功！请刷新列表页查看。');
    uploadRef.value?.clearFiles();
    fileToUpload.value = null;
  } catch (error: any) {
    if (error.response && error.response.data && error.response.data.detail) {
      ElMessage.error(`导入失败: ${error.response.data.detail}`);
      importSummary.value = { imported: [], errors: [error.response.data.detail] };
    } else {
      ElMessage.error(`导入失败: ${error.message || '未知错误'}`);
      importSummary.value = { imported: [], errors: [error.message || '未知错误'] };
    }
  } finally {
    isImporting.value = false;
  }
};

// --- 导出状态 ---
const exportType = ref<'atoms' | 'packages' | 'cases' | 'suites' | null>(null);
const exportIdsInput = ref('');
const isExporting = ref(false);

const exportIds = computed(() => {
  return exportIdsInput.value
      .split(',')
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id) && id > 0);
});

const isExportValid = computed(() => {
  return exportType.value && exportIds.value.length > 0;
});

const handleExport = async () => {
  if (!isExportValid.value) {
    ElMessage.warning('请选择导出类型并输入有效的 ID 列表。');
    return;
  }

  const ids = exportIds.value;
  isExporting.value = true;
  try {
    let blob: Blob;
    let filename = `${exportType.value}_export.afp`;

    switch (exportType.value) {
      case 'atoms':
        blob = await importExportService.exportAtoms(ids);
        filename = `atoms_export_${ids.length}.afp`;
        break;
      case 'packages':
        blob = await importExportService.exportPackages(ids);
        filename = `packages_export_${ids.length}.afp`;
        break;
      case 'cases':
        blob = await importExportService.exportCases(ids);
        filename = `cases_export_${ids.length}.afp`;
        break;
      case 'suites':
        blob = await importExportService.exportSuites(ids);
        filename = `suites_export_${ids.length}.afp`;
        break;
      default:
        throw new Error('Invalid export type');
    }

    // Trigger download
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    ElMessage.success('文件导出成功！');

  } catch (error) {
    ElMessage.error('导出失败，请检查 ID 是否有效或服务器日志。');
    console.error('Export error:', error);
  } finally {
    isExporting.value = false;
  }
};
</script>

<style scoped>
.import-export-page {
  padding: 20px;
}
.card-header {
  font-weight: bold;
}
.description {
  margin-bottom: 20px;
  font-size: 14px;
  color: var(--el-text-color-regular);
}
.import-summary {
  margin-top: 20px;
  padding: 10px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
}
.import-summary h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
}
.success-item {
  color: var(--el-color-success);
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.error-item {
  color: var(--el-color-danger);
  display: flex;
  align-items: center;
  gap: 5px;
}
</style>