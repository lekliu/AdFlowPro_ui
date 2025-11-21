<template>
  <div class="region-selector-wrapper">
    <div class="grid-container" :class="orientation">
      <div
        v-for="region in regions"
        :key="region"
        :class="['grid-cell', { 'is-active': modelValue.includes(region) }]"
        @click="selectRegion(region)"
      ></div>
    </div>
    <div class="controls">
      <el-button @click="toggleOrientation" :icon="Refresh" circle title="切换方向" />
      <el-button type="info" link @click="emit('update:modelValue', [])" :disabled="modelValue.length === 0">清除选择</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Refresh } from "@element-plus/icons-vue";
import type { ScreenRegion } from "@/types/api";

const props = defineProps<{
  modelValue: ScreenRegion[];
}>();

const emit = defineEmits(["update:modelValue"]);

const orientation = ref<"portrait" | "landscape">("portrait");

const regions: ScreenRegion[] = [
  "TOP_LEFT",
  "TOP_CENTER",
  "TOP_RIGHT",
  "MIDDLE_LEFT",
  "CENTER",
  "MIDDLE_RIGHT",
  "BOTTOM_LEFT",
  "BOTTOM_CENTER",
  "BOTTOM_RIGHT",
];

const toggleOrientation = () => {
  orientation.value = orientation.value === "portrait" ? "landscape" : "portrait";
};

const selectRegion = (region: ScreenRegion) => {
  const newSelection = [...props.modelValue];
  const index = newSelection.indexOf(region);
  if (index > -1) {
    newSelection.splice(index, 1); // Remove if already selected
  } else {
    newSelection.push(region); // Add if not selected
  }
  emit("update:modelValue", newSelection);
};
</script>

<style scoped>
.region-selector-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.grid-container.portrait {
  width: 120px;
  height: 200px; /* Approx 10:16 ratio */
}

.grid-container.landscape {
  width: 200px;
  height: 120px;
}

.grid-cell {
  border-right: 1px solid #e4e7ed;
  border-bottom: 1px solid #e4e7ed;
  cursor: pointer;
  transition: background-color 0.2s;
}

/* Remove borders from the last row and column */
.grid-cell:nth-child(3n) {
  border-right: none;
}
.grid-cell:nth-child(n + 7) {
  border-bottom: none;
}

.grid-cell:hover {
  background-color: #ecf5ff;
}

.grid-cell.is-active {
  background-color: var(--el-color-primary);
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
}

.controls {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
