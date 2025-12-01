<template>
  <div class="selector-input-container">
    <el-row :gutter="10" align="middle">
      <!-- Part 1: Selector Type Dropdown -->
      <el-col :span="9">
        <el-select v-model="selectorType" placeholder="类型" @change="onTypeChange">
          <el-option label="Text" value="text" />
          <el-option label="ID" value="resourceId" />
          <el-option label="Desc" value="contentDesc" />
          <el-option label="Class + Bounds" value="class_bounds" />
        </el-select>
      </el-col>
      <!-- Part 2: Selector Value Input -->
      <el-col :span="15">
        <!-- Standard Single Input -->
        <el-input v-if="selectorType !== 'class_bounds'" v-model="selectorValue" :placeholder="`输入 ${selectorType} 值`" @input="onValueChange" clearable />

        <!-- Combined Input for Class + Bounds -->
        <div v-else style="display: flex; gap: 5px;">
          <el-input v-model="classNameValue" placeholder="类名 (e.g. TextView)" @input="onClassBoundsChange" style="flex: 1" />
          <el-input v-model="boundsValue" placeholder="[L, T, R, B]" @input="onClassBoundsChange" style="flex: 1" />
        </div>
      </el-col>
    </el-row>
    <el-row class="property-checks" :gutter="10">
        <el-checkbox v-model="checkedState" @change="onPropertyChange('checked', $event)" :indeterminate="checkedState === null">
          Checked
        </el-checkbox>
        <el-checkbox v-model="enabledState" @change="onPropertyChange('enabled', $event)" :indeterminate="enabledState === null">
          Enabled
        </el-checkbox>
        <el-checkbox v-model="selectedState" @change="onPropertyChange('selected', $event)" :indeterminate="selectedState === null">
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

type SelectorType = "text" | "resourceId" | "contentDesc" | "class_bounds";
const VALID_SELECTOR_TYPES: SelectorType[] = ["text", "resourceId", "contentDesc"]; // class_bounds handled separately

const selectorType = ref<SelectorType>("text");
const selectorValue = ref("");
const classNameValue = ref("");
const boundsValue = ref("");

const checkedState = ref<boolean | null>(null);
const enabledState = ref<boolean | null>(null);
const selectedState = ref<boolean | null>(null);

const onValueChange = (newValue: string) => {
  const newSelector: Selector = {};
  if (newValue) {
    (newSelector as any)[selectorType.value] = newValue;
  }
  emit("update:modelValue", newSelector);
};

const onClassBoundsChange = () => {
  const newSelector: Selector = {
    className: classNameValue.value,
    bounds: boundsValue.value
  };
  emit("update:modelValue", newSelector);
};

const onTypeChange = (newType: SelectorType) => {
  selectorValue.value = "";
  classNameValue.value = "";
  boundsValue.value = "";
  const newSelector: Selector = {};
  // The new value is empty, but we must keep the key to inform the watch block
  (newSelector as any)[newType] = "";
  emit("update:modelValue", newSelector);
};

const onPropertyChange = (prop: 'checked' | 'enabled' | 'selected', value: boolean | null) => {
  const newSelector = { ...props.modelValue };
  if (value === null) {
    // If state becomes indeterminate (null), remove the property from the selector
    delete newSelector[prop];
  } else {
    // Otherwise, set the boolean value
    newSelector[prop] = value;
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
    const activeKey = VALID_SELECTOR_TYPES.find((key) => model[key] !== undefined && model[key] !== null);

    if (model.bounds !== undefined) {
      selectorType.value = "class_bounds";
      classNameValue.value = model.className || "";
      boundsValue.value = model.bounds || "";
    } else if (activeKey) {
      selectorType.value = activeKey;
      selectorValue.value = model[activeKey] || "";
    } else {
      selectorType.value = "text";
      selectorValue.value = "";
    }

    // Sync property checkboxes
    checkedState.value = model.checked === undefined ? null : model.checked;
    enabledState.value = model.enabled === undefined ? null : model.enabled;
    selectedState.value = model.selected === undefined ? null : model.selected;
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
