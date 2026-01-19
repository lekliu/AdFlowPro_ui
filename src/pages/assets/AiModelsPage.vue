<!-- AdFlowPro_ui/src/pages/assets/AiModelsPage.vue (New File) -->
<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>AI 模型库 (YOLO ONNX/TFLite)</span>
          <el-button type="primary" :icon="Upload" @click="openUploadDialog">上传模型</el-button>
        </div>
      </template>

      <el-table :data="store.models" v-loading="store.isLoading" border stripe>
        <el-table-column prop="name" label="模型名称" width="180" />
        <el-table-column label="支持标签" min-width="200">
          <template #default="{ row }">
            <el-tag v-for="tag in row.labels" :key="tag" size="small" style="margin-right: 4px">{{ tag }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="inputSize" label="输入尺寸" width="100" align="center" />
        <el-table-column label="文件大小" width="120">
          <template #default="{ row }">{{ (row.fileSize / 1024 / 1024).toFixed(2) }} MB</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" link :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 上传对话框 -->
    <el-dialog v-model="dialogVisible" title="上传 AI 模型" width="500px">
      <el-form :model="form" ref="formRef" label-position="top">
        <el-form-item label="模型名称" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="分类标签 (逗号分隔)" required>
          <el-input v-model="form.labelInput" placeholder="例如: monster,boss,player" />
        </el-form-item>
        <el-form-item label="模型文件 (.onnx / .tflite)" required>
          <el-upload action="#" :auto-upload="false" :on-change="handleFileChange" :limit="1">
            <el-button type="primary">选择文件</el-button>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpload" :loading="isSubmitting">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useAiModelStore } from "@/stores/aiModelStore";
import { Upload, Delete } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import axios from "axios";
import { aiModelService } from "@/api/aiModelService";

const store = useAiModelStore();
const dialogVisible = ref(false);
const isSubmitting = ref(false);
const form = reactive({ name: "", labelInput: "", file: null as File | null });

onMounted(() => store.fetchModels());

const handleFileChange = (file: any) => form.file = file.raw;

const handleUpload = async () => {
  if (!form.file || !form.name || !form.labelInput) return ElMessage.warning("请填写完整信息");
  isSubmitting.value = true;
  try {
    // 1. 获取上传 URL
    const { uploadUrl, objectName } = await aiModelService.getUploadUrl(form.file.name);
    // 2. 直传 MinIO
    await axios.put(uploadUrl, form.file, { headers: { "Content-Type": "application/octet-stream" } });
    // 3. 通知服务器
    await store.addModel({
      name: form.name,
      labels: form.labelInput.split(",").map(s => s.trim()),
      objectName,
      fileSize: form.file.size,
      inputSize: 640
    });
    ElMessage.success("上传成功");
    dialogVisible.value = false;
  } finally {
    isSubmitting.value = false;
  }
};

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定删除模型 ${row.name} 吗？`).then(() => store.removeModel(row.model_id));
};

const openUploadDialog = () => { dialogVisible.value = true; };
</script>