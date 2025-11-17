<template>
  <div class="image-matcher-editor">
    <el-form-item label="选择图元">
      <div class="image-selector-container">
        <div class="image-preview" @click="openImageSelectDialog">
          <el-image v-if="editableMatcher.publicUrl" :src="editableMatcher.publicUrl" fit="contain" />
          <div v-else class="image-placeholder">
            <el-icon><Picture /></el-icon>
            <span>点击选择图元</span>
          </div>
        </div>
        <div class="image-controls">
          <el-button type="primary" @click="openImageSelectDialog">从图元库选择</el-button>
          <span v-if="editableMatcher.templateId" class="image-name"> ID: {{ editableMatcher.templateId }} </span>
        </div>
      </div>
    </el-form-item>

    <el-form-item label="搜图模式">
      <el-radio-group v-model="editableMatcher.imageMatchMode">
        <el-tooltip content="速度快，基于像素精确匹配，对缩放、旋转敏感。" placement="top">
          <el-radio-button value="template">像素匹配</el-radio-button>
        </el-tooltip>
        <el-tooltip content="更鲁棒，基于特征点匹配，能抵抗一定的缩放和旋转变化，但速度稍慢。" placement="top">
          <el-radio-button value="orb">特征点匹配</el-radio-button>
        </el-tooltip>
      </el-radio-group>
    </el-form-item>

    <template v-if="editableMatcher.imageMatchMode === 'template'">
      <el-form-item label="匹配阈值 (0.1 - 1.0)">
        <el-slider v-model="editableMatcher.matchThreshold" :min="0.1" :max="1.0" :step="0.05" show-input />
      </el-form-item>
    </template>

    <el-form-item label="多目标策略">
      <el-radio-group v-model="editableMatcher.imageMatchStrategy">
        <el-radio value="best">最佳匹配 (默认)</el-radio>
        <el-radio value="first">第一个 (从上到下)</el-radio>
      </el-radio-group>
      <el-tooltip content="当高级算法找到多个目标时，决定使用哪一个。" placement="top">
        <el-icon class="form-item-tooltip"><QuestionFilled /></el-icon>
      </el-tooltip>
    </el-form-item>

    <el-form-item>
      <template #label>
        <span>高级算法</span>
        <el-tooltip placement="top">
          <template #content>
            <div v-if="editableMatcher.imageMatchMode === 'template'">启用后将进行多尺度搜索，能抵抗分辨率差异，但速度较慢。</div>
            <div v-else>启用后将进行特征点聚类，能从多个相同目标中识别，但速度较慢。</div>
          </template>
          <el-icon class="form-item-tooltip"><QuestionFilled /></el-icon>
        </el-tooltip>
      </template>
      <el-switch v-model="editableMatcher.enableAdvancedAlgorithm" />
    </el-form-item>

    <el-dialog v-model="dialogVisible" title="选择或上传图元" width="80%" top="5vh">
      <ImageTemplateBrowser mode="select" @image-selected="handleImageSelected" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import { Picture, QuestionFilled } from "@element-plus/icons-vue";
import type { ImageTemplate } from "@/types/api/imageTemplate";
import ImageTemplateBrowser from "@/components/browsers/ImageTemplateBrowser.vue";
import type { Matcher } from "@/types/api";

const props = defineProps<{
  modelValue: Matcher;
}>();

const emit = defineEmits(["update:modelValue"]);

const dialogVisible = ref(false);
const editableMatcher = reactive<Matcher>(JSON.parse(JSON.stringify(props.modelValue)));

// Initialize defaults for new fields if they are missing
const initializeDefaults = (matcher: Matcher) => {
  if (matcher.imageMatchMode === undefined) matcher.imageMatchMode = "template";
  if (matcher.enableAdvancedAlgorithm === undefined) matcher.enableAdvancedAlgorithm = false;
  if (matcher.imageMatchStrategy === undefined) matcher.imageMatchStrategy = "best";
  if (matcher.matchThreshold === undefined) matcher.matchThreshold = 0.8;
};
initializeDefaults(editableMatcher);

watch(
  () => props.modelValue,
  (newVal) => {
    // Basic loop prevention
    if (JSON.stringify(newVal) !== JSON.stringify(editableMatcher)) {
      Object.assign(editableMatcher, newVal);
      initializeDefaults(editableMatcher);
    }
  },
  { deep: true }
);

watch(
  editableMatcher,
  (newVal) => {
    emit("update:modelValue", newVal);
  },
  { deep: true }
);

const openImageSelectDialog = () => {
  dialogVisible.value = true;
};

const handleImageSelected = (image: ImageTemplate) => {
  editableMatcher.templateId = image.templateId;
  editableMatcher.publicUrl = image.publicUrl;
  dialogVisible.value = false;
};
</script>

<style scoped>
.image-selector-container {
  display: flex;
  align-items: center;
  gap: 15px;
}
.image-preview {
  width: 150px;
  height: 100px;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-color: #fafafa;
}
.image-preview:hover {
  border-color: var(--el-color-primary);
}
.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--el-text-color-placeholder);
}
.image-placeholder .el-icon {
  font-size: 28px;
}
.image-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
.image-name {
  font-size: 12px;
  color: #909399;
}
</style>
