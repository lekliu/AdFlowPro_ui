<!-- AdFlowPro_ui/src/components/SelectorInput.vue -->
<template>
  <div class="selector-input-container">
    <el-row :gutter="10" align="middle">
      <el-col :span="8">
        <el-select v-model="selectorType" placeholder="类型" @change="onTypeChange">
          <el-option v-for="opt in allOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </el-col>
      <el-col :span="16">
        <!-- 核心修改：物理替换为 MultiTextInput，实现与匹配侧 100% 一致 -->
        <MultiTextInput
            v-model="selectorTextArray"
            :placeholder="placeholderText"
            @update:modelValue="emitUpdate"
        />
      </el-col>
    </el-row>

    <!-- 匹配模式切换 (仅对 Text 类型显示) -->
    <el-row style="margin-top: 8px" v-if="selectorType === 'text'">
      <el-radio-group v-model="matchMode" size="small" @change="onModeChange">
        <el-radio-button value="fuzzy">模糊</el-radio-button>
        <el-radio-button value="exact">精确</el-radio-button>
      </el-radio-group>
      <span class="mode-desc">
        {{ matchMode === 'exact' ? '完全相等' : '包含即可' }}
      </span>
    </el-row>

    <!-- 状态检查属性 (Checked, Enabled, Selected) 严格保留原逻辑 -->
    <el-row class="property-checks" :gutter="10">
      <el-checkbox
          :model-value="checkedState === true"
          :indeterminate="checkedState === undefined"
          @click.prevent="toggleTriState('checked')"
      >
        Checked
      </el-checkbox>

      <el-checkbox
          :model-value="enabledState === true"
          :indeterminate="enabledState === undefined"
          @click.prevent="toggleTriState('enabled')"
      >
        Enabled
      </el-checkbox>
      <el-checkbox
          :model-value="selectedState === true"
          :indeterminate="selectedState === undefined"
          @click.prevent="toggleTriState('selected')"
      >
        Selected
      </el-checkbox>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { Selector } from "@/types/api/common";
import MultiTextInput from "@/components/MultiTextInput.vue"; // 确保导入复用组件

const props = defineProps<{
  modelValue: Selector;
  action?: string;
}>();

const emit = defineEmits(["update:modelValue"]);

// 1. 类型常量定义
const allOptions = [
  { label: "Text (文本)", value: "text" },
  { label: "ID (资源ID)", value: "resourceId" },
  { label: "Desc (描述)", value: "contentDesc" },
  { label: "Class + Bounds", value: "class_and_bounds" },
];

// 2. 内部响应式状态
const selectorType = ref<"text" | "resourceId" | "contentDesc" | "class_and_bounds">("text");
const selectorTextArray = ref<string[]>([]);
const matchMode = ref("fuzzy");

const checkedState = ref<boolean | undefined>(undefined);
const enabledState = ref<boolean | undefined>(undefined);
const selectedState = ref<boolean | undefined>(undefined);

// 3. 计算占位符文本，实现引导
const placeholderText = computed(() => {
  switch (selectorType.value) {
    case 'class_and_bounds': return '输入 Class [L, T, R, B] 后回车';
    case 'resourceId': return '输入 Resource ID (如: btn_login) 后回车';
    default: return '输入备选文本后按回车';
  }
});

// 4. 数据提交：统一存入 text 数组并设置 matchMode
const emitUpdate = () => {
  const newSelector: Selector = {
    text: [...selectorTextArray.value],
    matchMode: matchMode.value
  };

  // 映射 matchMode
  if (selectorType.value === 'resourceId') {
    newSelector.matchMode = "resource_id";
  } else if (selectorType.value === 'class_and_bounds') {
    newSelector.matchMode = "class_and_bounds";
  }

  // 保留三态属性
  if (checkedState.value !== undefined) newSelector.checked = checkedState.value;
  if (enabledState.value !== undefined) newSelector.enabled = enabledState.value;
  if (selectedState.value !== undefined) newSelector.selected = selectedState.value;

  // 补充 contentDesc（虽然 App 侧现在也通过 text 匹配，但保留字段以作区分）
  if (selectorType.value === 'contentDesc' && selectorTextArray.value.length > 0) {
    newSelector.contentDesc = selectorTextArray.value[0];
  }

  emit("update:modelValue", newSelector);
};

const onTypeChange = (newType: any) => {
  selectorType.value = newType;
  // 切换类型时自动调整默认模式
  if (newType === 'resourceId') matchMode.value = 'resource_id';
  else if (newType === 'class_and_bounds') matchMode.value = 'class_and_bounds';
  else matchMode.value = 'fuzzy';

  emitUpdate();
};

const onModeChange = (val: any) => {
  matchMode.value = val;
  emitUpdate();
};

// 状态切换逻辑 (保持 100% 原始逻辑)
const toggleTriState = (prop: 'checked' | 'enabled' | 'selected') => {
  let targetRef = prop === 'checked' ? checkedState : prop === 'enabled' ? enabledState : selectedState;
  if (targetRef.value === undefined) targetRef.value = true;
  else if (targetRef.value === true) targetRef.value = false;
  else targetRef.value = undefined;
  emitUpdate();
};

// 5. 核心数据回显 (Model -> UI)
watch(
    () => props.modelValue,
    (newVal) => {
      if (!newVal) return;

      // [Fixed] 鲁棒性回显：兼容字符串、|分隔符或标准数组
      if (typeof newVal.text === 'string') {
        // 强制转换类型以调用 split，并显式指定 filter 参数类型
        const rawText = newVal.text as unknown as string;
        selectorTextArray.value = rawText.split('|').filter((s: string) => s);
      } else if (Array.isArray(newVal.text)) {
        selectorTextArray.value = [...newVal.text];
      } else {
        selectorTextArray.value = [];
      }

      matchMode.value = newVal.matchMode || "fuzzy";

      // C. 类型判断逻辑 (向 Matcher 风格对齐)
      // 2. 根据 matchMode 精准回显 UI 类型下拉框
      if (newVal.matchMode === 'class_and_bounds') {
        selectorType.value = 'class_and_bounds';
      } else if (newVal.matchMode === 'resource_id') {
        selectorType.value = 'resourceId';
      } else if (newVal.contentDesc) {
        selectorType.value = 'contentDesc';
        // 兼容性：如果只有 contentDesc 没 text 数组，为了 UI 显示，反填给数组
        if (selectorTextArray.value.length === 0) selectorTextArray.value = [newVal.contentDesc];
      } else {
        selectorType.value = 'text';
      }

      // D. 三态属性回显 (保留原始逻辑)
      const normalizeBool = (val: any) => (val === true || val === false) ? val : undefined;
      checkedState.value = normalizeBool(newVal.checked);
      enabledState.value = normalizeBool(newVal.enabled);
      selectedState.value = normalizeBool(newVal.selected);
    },
    { immediate: true, deep: true }
);
</script>

<style scoped>
.selector-input-container { display: flex; flex-direction: column; gap: 8px; }
.property-checks {
  margin-top: 4px;
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
}
.property-checks :deep(.el-checkbox) { margin-right: 0; height: 24px; }
.property-checks :deep(.el-checkbox__label) { padding-left: 4px; font-size: 12px; white-space: nowrap; }
.mode-desc { font-size: 12px; color: #909399; margin-left: 10px; line-height: 24px; }
</style>