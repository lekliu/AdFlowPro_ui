<template>
  <div class="image-template-browser">
    <div class="header-controls">
      <el-button type="primary" :icon="Upload" @click="openUploadDialog">上传新图元</el-button>
      <div class="view-options">
        <el-slider
          v-if="viewMode === 'grid'"
          v-model="gridSizeValue"
          :step="50"
          show-stops
          :marks="{ 0: '小', 50: '中', 100: '大' }"
          class="size-slider"
        />
        <el-radio-group v-model="viewMode" class="view-mode-toggle">
          <el-radio-button value="grid"
            ><el-icon><Grid /></el-icon
          ></el-radio-button>
          <el-radio-button value="list"
            ><el-icon><Tickets /></el-icon
          ></el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- Grid View -->
    <div v-if="viewMode === 'grid'" v-loading="store.isLoading" class="grid-view">
      <div v-if="store.templates.length > 0" class="grid-container">
        <div
          v-for="item in store.templates"
          :key="item.templateId"
          :class="['image-card', `grid-${gridSize}`]"
          @click="handleItemClick(item)"
          :title="`点击${mode === 'select' ? '选择' : '预览'} '${item.name}'`"
        >
          <el-image :src="item.publicUrl" fit="contain" class="card-image" :preview-src-list="[item.publicUrl]" preview-teleported lazy @click.stop />
          <div class="card-footer">
            <span class="card-name" :title="item.name">{{ item.name }}</span>
            <el-dropdown trigger="click" @command="handleCommand($event, item)" @click.stop>
              <el-button text :icon="MoreFilled" class="more-button" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit" :icon="Edit">编辑</el-dropdown-item>
                  <el-dropdown-item command="delete" :icon="Delete" class="danger-text">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无图元数据，请点击左上角上传" />
    </div>

    <!-- List View -->
    <el-table v-else v-loading="store.isLoading" :data="store.templates" stripe style="width: 100%" @row-click="handleItemClick">
      <el-table-column label="预览" width="100">
        <template #default="{ row }">
          <el-image
            :src="row.publicUrl"
            fit="contain"
            style="width: 60px; height: 60px"
            :preview-src-list="[row.publicUrl]"
            preview-teleported
            lazy
          />
        </template>
      </el-table-column>
      <el-table-column prop="name" label="名称" sortable />
      <el-table-column prop="description" label="描述" />
      <el-table-column label="尺寸(WxH)" width="120">
        <template #default="{ row }">{{ row.imageWidth }}x{{ row.imageHeight }}</template>
      </el-table-column>
      <el-table-column label="大小" sortable prop="fileSize" width="120">
        <template #default="{ row }">{{ row.fileSize ? (row.fileSize / 1024).toFixed(2) + " KB" : "N/A" }}</template>
      </el-table-column>
      <el-table-column label="上传日期" sortable prop="createdAt" width="180">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link :icon="Edit" @click.stop="openEditDialog(row)">编辑</el-button>
          <el-button type="danger" link :icon="Delete" @click.stop="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="store.total > pagination.limit"
      background
      layout="prev, pager, next, total"
      :total="store.total"
      :current-page="pagination.page"
      :page-size="pagination.limit"
      @current-change="handlePageChange"
      class="pagination-container"
    />

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" @closed="resetForm" @paste.prevent="handlePaste">
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="图元名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="描述" prop="description"><el-input v-model="form.description" type="textarea" /></el-form-item>
        <el-form-item v-if="dialog.mode === 'upload'" label="图片文件" prop="file">
          <el-upload
            ref="uploadRef"
            action="#"
            :auto-upload="false"
            :on-change="handleFileChange"
            :limit="1"
            :on-exceed="handleFileExceed"
            accept="image/png,image/jpeg"
          >
            <template #trigger><el-button type="primary">选择文件</el-button></template>
            <template #tip><div class="el-upload__tip">仅支持 jpg/png 格式。或直接将图片粘贴到此对话框内 (Ctrl+V)。</div></template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="dialog.isSubmitting">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch, defineProps, defineEmits } from "vue";
import { useImageTemplateStore } from "@/stores/imageTemplateStore";
import { ElMessage, ElMessageBox, type FormInstance, type UploadInstance, type UploadProps, type UploadRawFile, type UploadFile } from "element-plus";
import { Upload, Grid, Tickets, MoreFilled, Edit, Delete } from "@element-plus/icons-vue";
import { imageTemplateService } from "@/api/imageTemplateService";
import type { ImageTemplate } from "@/types/api/imageTemplate";

const props = defineProps<{
  mode: "browse" | "select";
}>();

const emit = defineEmits(["image-selected"]);

const store = useImageTemplateStore();
const formRef = ref<FormInstance>();
const uploadRef = ref<UploadInstance>();

const viewMode = ref<"grid" | "list">("grid");
const gridSizeValue = ref(50);
const gridSize = computed(() => {
  if (gridSizeValue.value < 25) return "small";
  if (gridSizeValue.value > 75) return "large";
  return "medium";
});

const pagination = reactive({
  page: 1,
  limit: 12,
});

const dialog = reactive({
  visible: false,
  title: "",
  mode: "upload" as "upload" | "edit",
  isSubmitting: false,
  editId: null as string | null,
});

const form = reactive({
  name: "",
  description: "",
  file: null as File | null,
});

const rules = {
  name: [{ required: true, message: "请输入图元名称", trigger: "blur" }],
  file: [{ required: true, message: "请选择图片文件", trigger: "change" }],
};

const fetchList = () => {
  store.fetchTemplates({
    skip: (pagination.page - 1) * pagination.limit,
    limit: pagination.limit,
  });
};

onMounted(fetchList);

watch(viewMode, (newMode) => {
  pagination.limit = newMode === "grid" ? 12 : 10;
  pagination.page = 1;
  fetchList();
});

const handlePageChange = (page: number) => {
  pagination.page = page;
  fetchList();
};

const resetForm = () => {
  form.name = "";
  form.description = "";
  form.file = null;
  dialog.editId = null;
  uploadRef.value?.clearFiles();
  formRef.value?.clearValidate();
};

const openUploadDialog = () => {
  resetForm();
  dialog.mode = "upload";
  dialog.title = "上传新图元";
  dialog.visible = true;
};

const openEditDialog = (item: ImageTemplate) => {
  resetForm();
  dialog.mode = "edit";
  dialog.title = "编辑图元";
  dialog.editId = item.templateId;
  form.name = item.name;
  form.description = item.description || "";
  dialog.visible = true;
};

const handleFileChange: UploadProps["onChange"] = (uploadFile) => {
  form.file = uploadFile.raw as File;
  formRef.value?.validateField("file");
};

const handleFileExceed: UploadProps["onExceed"] = (files) => {
  uploadRef.value!.clearFiles();
  const file = files[0] as UploadRawFile;
  uploadRef.value!.handleStart(file);
  form.file = file;
};

const handlePaste = (event: ClipboardEvent) => {
  if (!dialog.visible || dialog.mode !== "upload") return;
  const items = event.clipboardData?.items;
  if (!items) return;

  let imageFile: File | null = null;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.includes("image")) {
      imageFile = item.getAsFile();
      break;
    }
  }

  if (imageFile) {
    const rawFile = imageFile as UploadRawFile;
    rawFile.uid = Date.now() + Math.floor(Math.random() * 1000);
    uploadRef.value?.clearFiles();
    uploadRef.value?.handleStart(rawFile);
    const mockUploadFile = { raw: rawFile } as UploadFile;
    handleFileChange(mockUploadFile, []);
    ElMessage.success("图片已从剪贴板粘贴！");
  } else {
    ElMessage.warning("剪贴板中未找到图片。");
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate();

  dialog.isSubmitting = true;
  try {
    let resultingTemplate: ImageTemplate | null = null;
    if (dialog.mode === "upload") {
      const { file, name, description } = form;
      if (!file) throw new Error("File not selected");
      const urlRes = await imageTemplateService.getUploadUrl({ fileName: file.name, contentType: file.type });
      await imageTemplateService.uploadFileToMinio(urlRes.uploadUrl, file);
      const { width, height } = await getImageDimensions(file);
      resultingTemplate = await store.addTemplate({
        name,
        description: description || null,
        objectName: urlRes.objectName,
        fileSize: file.size,
        imageWidth: width,
        imageHeight: height,
      });
      ElMessage.success("上传成功");
    } else {
      resultingTemplate = await store.updateTemplate(dialog.editId!, { name: form.name, description: form.description || undefined });
      ElMessage.success("更新成功");
    }

    dialog.visible = false;
    fetchList();

    if (props.mode === "select" && resultingTemplate) {
      emit("image-selected", resultingTemplate);
    }
  } catch (error: any) {
    if (error.response) {
      ElMessage.error(`操作失败: [${error.response.status}] ${error.response.data?.detail || error.response.statusText}.`);
    } else {
      ElMessage.error(`操作失败: ${error.message || "未知错误"}`);
    }
  } finally {
    dialog.isSubmitting = false;
  }
};

const handleDelete = (item: ImageTemplate) => {
  ElMessageBox.confirm(`确定要删除图元 "${item.name}" 吗？`, "警告", {
    confirmButtonText: "确定删除",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    try {
      await store.deleteTemplate(item.templateId);
      ElMessage.success("删除成功");
      fetchList();
    } catch (error) {}
  });
};

const handleCommand = (command: string, item: ImageTemplate) => {
  if (command === "edit") openEditDialog(item);
  if (command === "delete") handleDelete(item);
};

const handleItemClick = (item: ImageTemplate) => {
  if (props.mode === "select") {
    emit("image-selected", item);
  }
};

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
</script>

<style scoped>
.header-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.view-options {
  display: flex;
  align-items: center;
  gap: 20px;
}
.size-slider {
  width: 150px;
}
.pagination-container {
  margin-top: 20px;
}
.grid-view {
  min-height: 300px;
}
.grid-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.image-card {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}
.image-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: var(--el-box-shadow-light);
}
.grid-small {
  width: 120px;
}
.grid-medium {
  width: 180px;
}
.grid-large {
  width: 240px;
}
.card-image {
  width: 100%;
  height: 120px;
  background-color: #f5f7fa;
}
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
}
.card-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
}
.more-button {
  padding: 4px;
  height: auto;
}
.danger-text {
  color: var(--el-color-danger);
}
</style>
