<template>
  <div class="text-matcher-editor">
    <el-form-item label="场景类型">
      <el-radio-group v-model="editableMatcher.sceneType">
        <el-radio-button value="ui">UI元素场景</el-radio-button>
        <el-radio-button value="ocr">OCR文本场景</el-radio-button>
      </el-radio-group>
    </el-form-item>

    <el-form-item label="匹配模式">
      <el-select v-model="editableMatcher.matchMode">
        <el-option v-for="opt in availableMatchModes" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </el-form-item>

    <el-form-item label="锚点坐标" v-if="editableMatcher.matchMode === 'fuzzy_with_coords' && editableMatcher.coordinates">
      <el-row :gutter="10">
        <el-col :span="11">
          <el-input-number v-model="editableMatcher.coordinates.left" placeholder="Left (X)" style="width: 100%" />
        </el-col>
        <el-col :span="2" style="text-align: center">-</el-col>
        <el-col :span="11">
          <el-input-number v-model="editableMatcher.coordinates.top" placeholder="Top (Y)" style="width: 100%" />
        </el-col>
      </el-row>
    </el-form-item>

    <el-form-item label="匹配文本">
      <MultiTextInput v-model="matcherTextProxy" :placeholder="placeholderText" />
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, computed } from "vue";
import { QuestionFilled } from "@element-plus/icons-vue";
import MultiTextInput from "@/components/MultiTextInput.vue";
import type { Matcher } from "@/types/api";

const props = defineProps<{
  modelValue: Matcher;
}>();

const emit = defineEmits(["update:modelValue"]);

const editableMatcher = reactive<Matcher>(JSON.parse(JSON.stringify(props.modelValue)));

watch(
  () => props.modelValue,
  (newVal) => {
    // Update internal state only if it's different to prevent loops
    if (JSON.stringify(newVal) !== JSON.stringify(editableMatcher)) {
      Object.assign(editableMatcher, newVal);
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

const availableMatchModes = computed(() => {
  const modes = [
    { label: "模糊匹配", value: "fuzzy" },
    { label: "模糊匹配+坐标", value: "fuzzy_with_coords" },
    { label: "精准匹配 (Exact)", value: "exact" },
    { label: "全量匹配 (All Match)", value: "all_match" },
    { label: "非全量匹配 (Not All Match)", value: "not_all_match" },
    { label: "不包含 (Must Not Contain)", value: "must_not_contain" },
  ];
  
  // Only UI scene supports class name matching
  if (editableMatcher.sceneType === 'ui') {
    // Insert at a specific position for better ordering if needed
    modes.splice(3, 0, { label: "类名+坐标", value: "class_and_bounds" });
  }
  return modes;
});

const matcherTextProxy = computed({
  get: () => {
    const text = editableMatcher.text;
    return Array.isArray(text) ? text : text ? [text] : [];
  },
  set: (newValue: string[]) => {
    editableMatcher.text = newValue;
  },
});

const placeholderText = computed(() => {
  if (editableMatcher.matchMode === 'class_and_bounds') {
    return '例如: ImageView [100, 200, 300, 400]';
  }
  return '输入备选文本后按回车';
});

// Auto-reset matchMode if switching to OCR and current mode is incompatible
watch(() => editableMatcher.sceneType, (newType) => {
  if (newType === 'ocr' && editableMatcher.matchMode === 'class_and_bounds') {
    editableMatcher.matchMode = 'fuzzy';
  }
});

watch(
  () => editableMatcher.matchMode,
  (newMode) => {
    if (newMode === "fuzzy_with_coords" || newMode === "class_and_bounds") {
      if (!editableMatcher.coordinates) {
        editableMatcher.coordinates = { left: 0, top: 0 };
      }
    } else {
      delete editableMatcher.coordinates;
    }
  }
);
</script>

<style scoped>
.form-item-tooltip {
  margin-left: 8px;
  color: #909399;
  cursor: help;
}
</style>
