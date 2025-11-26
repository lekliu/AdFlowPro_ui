<template>
  <el-row :gutter="10" align="middle">
    <!-- Part 1: Selector Type Dropdown -->
    <el-col :span="10">
      <el-select v-model="selectorType" placeholder="类型" @change="onTypeChange">
        <el-option label="Text" value="text" />
        <el-option label="ID" value="resourceId" />
        <el-option label="Desc" value="contentDesc" />
      </el-select>
    </el-col>
    <!-- Part 2: Selector Value Input (using our great MultiTextInput) -->
    <el-col :span="14">
      <el-input v-model="selectorValue" :placeholder="`输入 ${selectorType} 值`" @input="onValueChange" clearable />
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from "vue";
import type { Selector } from "@/types/api/common";

const props = defineProps<{
  modelValue: Selector;
}>();

const emit = defineEmits(["update:modelValue"]);

type SelectorType = "text" | "resourceId" | "contentDesc";
const VALID_SELECTOR_TYPES: SelectorType[] = ["text", "resourceId", "contentDesc"];

const selectorType = ref<SelectorType>("text");
const selectorValue = ref("");

const onValueChange = (newValue: string) => {
  const newSelector: Selector = {};
  if (newValue) {
    (newSelector as any)[selectorType.value] = newValue;
  }
  emit("update:modelValue", newSelector);
};

const onTypeChange = (newType: SelectorType) => {
  selectorValue.value = "";
  const newSelector: Selector = {};
  // The new value is empty, but we must keep the key to inform the watch block
  (newSelector as any)[newType] = "";
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

    if (activeKey) {
      selectorType.value = activeKey;
      selectorValue.value = model[activeKey] || "";
    } else {
      selectorType.value = "text";
      selectorValue.value = "";
    }
  },
  { immediate: true, deep: true }
);
</script>
