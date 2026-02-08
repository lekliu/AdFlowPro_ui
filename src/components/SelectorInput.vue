<!-- AdFlowPro_ui/src/components/SelectorInput.vue -->
<template>
  <div class="selector-input-container">
    <el-row :gutter="10" align="middle">
      <el-col :span="9">
        <el-select v-model="selectorType" placeholder="类型" @change="onTypeChange">
          <el-option v-for="opt in filteredOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </el-col>
      <el-col :span="15">
        <el-input v-model="selectorValue" :placeholder="`输入 ${selectorType} 值`" @input="onValueChange" clearable />
      </el-col>
    </el-row>

    <!-- [新业务逻辑] 仅在 PC 动作或文本模式下显示精确匹配切换 -->
    <el-row style="margin-top: 8px" v-if="selectorType === 'text' || selectorType === 'resourceId'">
      <el-radio-group v-model="matchMode" size="small" @change="onModeChange">
        <el-radio-button value="fuzzy">模糊</el-radio-button>
        <el-radio-button value="exact">精确</el-radio-button>
      </el-radio-group>
      <span class="mode-desc">
        {{ matchMode === 'exact' ? '完全相等' : '包含即可' }}
      </span>
    </el-row>

    <el-row class="property-checks" :gutter="10">
      <el-checkbox v-model="checkedState" @change="onPropertyChange('checked', $event as boolean)" :indeterminate="checkedState === undefined">
        Checked
      </el-checkbox>
      <el-checkbox v-model="enabledState" @change="onPropertyChange('enabled', $event as boolean)" :indeterminate="enabledState === undefined">
        Enabled
      </el-checkbox>
      <el-checkbox v-model="selectedState" @change="onPropertyChange('selected', $event as boolean)" :indeterminate="selectedState === undefined">
        Selected
      </el-checkbox>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { Selector } from "@/types/api/common";

const props = defineProps<{
  modelValue: Selector;
  action?: string;
}>();

const emit = defineEmits(["update:modelValue"]);

// 1. 配置常量
const allOptions = [
  { label: "Text", value: "text" },
  { label: "ID", value: "resourceId" },
  { label: "Desc", value: "contentDesc" },
  { label: "Class + Bounds", value: "class_and_bounds" },
];

// 2. 内部响应式状态
const selectorType = ref<"text" | "resourceId" | "contentDesc" | "class_and_bounds">("text");
const selectorValue = ref("");
const matchMode = ref("fuzzy");

const checkedState = ref<boolean | undefined>(undefined);
const enabledState = ref<boolean | undefined>(undefined);
const selectedState = ref<boolean | undefined>(undefined);

// 3. 核心：统一的数据提交函数
const emitUpdate = () => {
  const newSelector: Selector = {
    matchMode: matchMode.value
  };

  // 聚合配置属性
  if (checkedState.value !== undefined) newSelector.checked = checkedState.value;
  if (enabledState.value !== undefined) newSelector.enabled = enabledState.value;
  if (selectedState.value !== undefined) newSelector.selected = selectedState.value;

  // 聚合定位属性
  if (selectorType.value === 'class_and_bounds') {
    const match = selectorValue.value.match(/^([\w\.]+)\s*(\[.+\])$/);
    if (match) {
      newSelector.className = match[1];
      newSelector.bounds = match[2];
    } else {
      newSelector.className = selectorValue.value;
      newSelector.bounds = "";
    }
  } else {
    // 仅设置当前激活的 key (text, resourceId, 或 contentDesc)
    (newSelector as any)[selectorType.value] = selectorValue.value;
  }

  emit("update:modelValue", newSelector);
};

// 4. 界面交互处理
const filteredOptions = computed(() => {
  const pcActions = ['hover', 'right_click', 'double_click'];
  if (props.action && pcActions.includes(props.action)) {
    return allOptions.filter(opt => opt.value === 'text');
  }
  return allOptions;
});

const onValueChange = (val: string) => { selectorValue.value = val; emitUpdate(); };
const onTypeChange = (newType: any) => { selectorType.value = newType; selectorValue.value = ""; emitUpdate(); };
const onModeChange = (val: any) => { matchMode.value = val; emitUpdate(); };
const onPropertyChange = (prop: 'checked' | 'enabled' | 'selected', value: boolean | null) => {
  const val = value ?? undefined;
  if (prop === 'checked') checkedState.value = val;
  if (prop === 'enabled') enabledState.value = val;
  if (prop === 'selected') selectedState.value = val;
  emitUpdate();
};

// 5. 核心修复：数据回显逻辑 (Model -> UI)
watch(
    () => props.modelValue,
    (newVal) => {
      if (!newVal) return;

      // A. 恢复配置字段
      matchMode.value = newVal.matchMode || "fuzzy";
      checkedState.value = newVal.checked;
      enabledState.value = newVal.enabled;
      selectedState.value = newVal.selected;

      // B. 明确优先级判定类型和值
      if (newVal.bounds !== undefined && newVal.bounds !== null) {
        selectorType.value = "class_and_bounds";
        selectorValue.value = `${newVal.className || ""} ${newVal.bounds || ""}`.trim();
      } else if (newVal.resourceId !== undefined && newVal.resourceId !== null) {
        selectorType.value = "resourceId";
        selectorValue.value = newVal.resourceId;
      } else if (newVal.contentDesc !== undefined && newVal.contentDesc !== null) {
        selectorType.value = "contentDesc";
        selectorValue.value = newVal.contentDesc;
      } else {
        // 默认为 Text
        selectorType.value = "text";
        selectorValue.value = newVal.text || "";
      }
    },
    { immediate: true, deep: true }
);
</script>

<style scoped>
.selector-input-container { display: flex; flex-direction: column; gap: 8px; }
/* 修改后的 property-checks 容器样式 */
.property-checks {
  margin-top: 4px;
  display: flex;
  flex-wrap: nowrap;      /* 【核心】强制不换行 */
  gap: 8px;               /* 调整各项之间的间距为 8px */
  align-items: center;
}

/* 移除复选框组件自带的 30px 右边距 */
.property-checks :deep(.el-checkbox) {
  margin-right: 0;
  height: 24px;           /* 稍微压缩高度 */
}

/* 缩小图标与文字之间的距离 */
.property-checks :deep(.el-checkbox__label) {
  padding-left: 4px;      /* 原默认 8px，缩小到 4px */
  font-size: 12px;        /* 稍微缩小字号 */
  white-space: nowrap;    /* 防止文字内部换行 */
}
.mode-desc { font-size: 12px; color: #909399; margin-left: 10px; line-height: 24px; }
</style>