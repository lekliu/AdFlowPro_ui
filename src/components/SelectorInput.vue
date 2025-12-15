// FILE: AdFlowPro_ui\src\components\SelectorInput.vue
<template>
  <div class="selector-input-container">
    <el-row :gutter="10" align="middle">
      <!-- Part 1: Selector Type Dropdown -->
      <el-col :span="9">
        <el-select v-model="selectorType" placeholder="类型" @change="onTypeChange">
          <el-option label="Text" value="text" />
          <el-option label="ID" value="resourceId" />
          <el-option label="Desc" value="contentDesc" />
          <el-option label="Class + Bounds" value="class_and_bounds" />
        </el-select>
      </el-col>
      <!-- Part 2: Selector Value Input -->
      <el-col :span="15">
        <!-- Standard Single Input -->
        <el-input v-model="selectorValue" :placeholder="`输入 ${selectorType} 值`" @input="onValueChange" clearable />
        <!-- Now we use the same input for class_and_bounds, storing it in 'text' -->
      </el-col>
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
import { ref, computed, watch, reactive } from "vue";
import type { Selector } from "@/types/api/common";

const props = defineProps<{
  modelValue: Selector;
}>();

const emit = defineEmits(["update:modelValue"]);

type SelectorType = "text" | "resourceId" | "contentDesc" | "class_and_bounds";
const VALID_SELECTOR_TYPES: SelectorType[] = ["text", "resourceId", "contentDesc"];

const selectorType = ref<SelectorType>("text");
const selectorValue = ref("");
const classNameValue = ref("");
const boundsValue = ref("");

const checkedState = ref<boolean | undefined>(undefined);
const enabledState = ref<boolean | undefined>(undefined);
const selectedState = ref<boolean | undefined>(undefined);

const onValueChange = (newValue: string) => {
  const newSelector: Selector = {};

  if (selectorType.value === 'class_and_bounds') {
    // 核心修复: 无论输入内容是否合法，必须显式设置 bounds 字段。
    // 只要 bounds !== undefined，watcher 就不会自动切回 text 类型。
    newSelector.bounds = "";

    if (newValue) {
      const match = newValue.match(/^([\w\.]+)\s*(\[.+\])$/);
      if (match) {
        newSelector.className = match[1];
        newSelector.bounds = match[2];
      } else {
        // 解析失败（例如正在输入中），将全部内容暂存到 className
        newSelector.className = newValue;
      }
    } else {
      newSelector.className = "";
    }
  } else {
    if (newValue) {
      (newSelector as any)[selectorType.value] = newValue;
    } else {
      (newSelector as any)[selectorType.value] = "";
    }
  }
  emit("update:modelValue", newSelector);
};


const onTypeChange = (newType: SelectorType) => {
  selectorValue.value = "";
  classNameValue.value = "";
  boundsValue.value = "";
  const newSelector: Selector = {};

  // 核心修复：切换到 class_and_bounds 时，显式设置 bounds 字段
  if (newType === 'class_and_bounds') {
    newSelector.className = "";
    newSelector.bounds = ""; // 这里的空字符串是关键，它让 watcher 识别为 class_and_bounds 模式
  } else {
    (newSelector as any)[newType] = "";
  }
  emit("update:modelValue", newSelector);
};

const onPropertyChange = (prop: 'checked' | 'enabled' | 'selected', value: boolean | null) => {
  const newSelector = { ...props.modelValue };
  if (value === null || value === undefined) {
    // If state becomes indeterminate (null), remove the property from the selector
    delete (newSelector as any)[prop];
  } else {
    // Otherwise, set the boolean value
    (newSelector as any)[prop] = value;
  }
  emit("update:modelValue", newSelector);
};

watch(
    () => props.modelValue,
    (newVal, oldVal) => {
      // Basic guard against self-triggering loops
      if (JSON.stringify(newVal) === JSON.stringify(oldVal)) return;

      const model = newVal || {};

      // Type-safe way to find the active key
      const activeKey = VALID_SELECTOR_TYPES.find((key) => (model as any)[key] !== undefined && (model as any)[key] !== null);

      if (model.bounds !== undefined) {
        selectorType.value = "class_and_bounds";
        // Reconstruct the string for display
        selectorValue.value = `${model.className || ""} ${model.bounds || ""}`.trim();
      } else if (activeKey) {
        selectorType.value = activeKey;
        selectorValue.value = (model as any)[activeKey] || "";
      } else {
        selectorType.value = "text";
        selectorValue.value = "";
      }

      // Sync property checkboxes
      checkedState.value = model.checked;
      enabledState.value = model.enabled;
      selectedState.value = model.selected;
    },
    { immediate: true, deep: true }
);
</script>

<style scoped>
.selector-input-container {
  display: flex;
  flex-direction: column;
  gap: 8px; /* Space between the text input row and the checkbox row */
}
.property-checks {
  margin-top: 5px; /* Add some space above the checkboxes */
  display: flex;
  gap: 15px;
}
</style>