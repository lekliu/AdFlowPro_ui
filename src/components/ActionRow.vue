<template>
  <div class="action-row">
    <!-- Action Type Selector -->
    <el-select v-model="editableAction.action" placeholder="选择动作" class="action-selector">
      <el-option-group v-for="group in actionOptions" :key="group.label" :label="group.label">
        <el-option v-for="item in group.options" :key="item.value" :label="item.label" :value="item.value" />
      </el-option-group>
    </el-select>

    <!-- Parameters Area -->
    <div class="parameters">
      <!-- Selector-based Actions -->
      <SelectorInput v-if="needsSelector" v-model="editableAction.selector" />

      <!-- Input Text -->
      <el-input v-if="editableAction.action === 'input_text'" v-model="editableAction.parameters.text" placeholder="输入要填充的文本" />

      <!-- Tap -->
      <el-row v-if="editableAction.action === 'tap'" :gutter="10">
        <el-col :span="12"><el-input-number v-model="editableAction.parameters.startX" placeholder="X 坐标" controls-position="right" /></el-col>
        <el-col :span="12"><el-input-number v-model="editableAction.parameters.startY" placeholder="Y 坐标" controls-position="right" /></el-col>
      </el-row>

      <el-row v-if="editableAction.action === 'tap_relative'" :gutter="10">
        <el-col :span="12"><el-input-number v-model="editableAction.parameters.offsetX" placeholder="X 偏移量" controls-position="right" /></el-col>
        <el-col :span="12"><el-input-number v-model="editableAction.parameters.offsetY" placeholder="Y 偏移量" controls-position="right" /></el-col>
      </el-row>

      <!-- Swipe -->
      <el-row v-if="editableAction.action === 'swipe'" :gutter="10">
        <el-col :span="6"><el-input-number v-model="editableAction.parameters.startX" placeholder="Start X" controls-position="right" /></el-col>
        <el-col :span="6"><el-input-number v-model="editableAction.parameters.startY" placeholder="Start Y" controls-position="right" /></el-col>
        <el-col :span="6"><el-input-number v-model="editableAction.parameters.endX" placeholder="End X" controls-position="right" /></el-col>
        <el-col :span="6"><el-input-number v-model="editableAction.parameters.endY" placeholder="End Y" controls-position="right" /></el-col>
      </el-row>

      <!-- Wait -->
      <el-input-number
        v-if="editableAction.action === 'wait'"
        v-model="editableAction.parameters.duration"
        :min="100"
        placeholder="等待毫秒数"
        controls-position="right"
      />

      <!-- Press Key -->
      <el-select v-if="editableAction.action === 'press_key'" v-model="editableAction.parameters.keyCode" placeholder="选择按键">
        <el-option label="Home" value="home" />
        <el-option label="Back" value="back" />
        <el-option label="Recents" value="recents" />
      </el-select>

      <el-input v-if="editableAction.action === 'report_value'" v-model="editableAction.parameters.reportLabel" placeholder="输入要上报的数据标签" />

      <!-- Assert Text Equals -->
      <el-input v-if="editableAction.action === 'assert_text_equals'" v-model="editableAction.parameters.text" placeholder="输入期望的文本" />

      <!-- No visible parameters for wait_dynamic, wake_up, etc. -->
      <el-input v-if="isParameterlessAction" disabled placeholder="此动作用于流程控制，无参数" />
    </div>

    <!-- Controls -->
    <div class="controls">
      <el-icon class="drag-handle" v-if="mode === 'editor'"><Rank /></el-icon>
      <el-button type="danger" :icon="Delete" circle @click="emit('remove')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch, nextTick } from "vue";
import { Delete, Rank } from "@element-plus/icons-vue";
import type { PerformActionPayload, Selector } from "@/types/api/common";
import SelectorInput from "@/components/SelectorInput.vue";

const props = defineProps<{
  modelValue: PerformActionPayload & { id: string };
  mode: "editor" | "standalone";
}>();

const emit = defineEmits(["update:modelValue", "remove"]);

const editableAction = reactive(JSON.parse(JSON.stringify(props.modelValue)));

const actionOptions = [
  {
    label: "UI 交互",
    options: [
      { value: "click", label: "Click (by Selector)" },
      { value: "long_click", label: "Long Click (by Selector)" },
      { value: "input_text", label: "Input Text (by Selector)" },
      { value: "tap", label: "Tap (by Coordinate)" },
      { value: "tap_relative", label: "Tap Relative (to Anchor)" },
      { value: "swipe", label: "Swipe (by Coordinate)" },
    ],
  },
  {
    label: "流程控制",
    options: [
      { value: "wait", label: "Wait (Fixed Time)" },
      { value: "wait_dynamic", label: "Wait (Dynamic)" },
      { value: "report_value", label: "Report Value (from Regex)" },
      { value: "end_case", label: "End Case" },
      { value: "reopen_app_if_needed", label: "Reopen App If Needed" },
    ],
  },
  {
    label: "设备控制",
    options: [
      { value: "press_key", label: "Press Key" },
      { value: "wake_up", label: "Wake Up" },
      { value: "sleep", label: "Sleep" },
    ],
  },
  {
    label: "断言",
    options: [
      { value: "assert_element_exists", label: "Assert Element Exists" },
      { value: "assert_text_equals", label: "Assert Text Equals" },
    ],
  },
];

const needsSelector = computed(() => ["click", "long_click", "input_text"].includes(editableAction.action));

const isParameterlessAction = computed(() =>
  ["wait_dynamic", "end_case", "reopen_app_if_needed", "wake_up", "sleep", "assert_element_exists"].includes(editableAction.action)
);

watch(
  editableAction,
  (newVal) => {
    // Reset parameters when action type changes
    if (newVal.action !== props.modelValue.action) {
      newVal.parameters = {};
      if (!needsSelector.value) {
        newVal.selector = undefined;
      } else if (!newVal.selector) {
        newVal.selector = { index: 0 };
      }
    }

    // Ensure selector and parameters objects exist when needed
    if (needsSelector.value && !newVal.selector) {
      newVal.selector = { index: 0 };
    }
    if (!newVal.parameters) {
      newVal.parameters = {};
    }

    emit("update:modelValue", newVal);
  },
  { deep: true }
);
</script>

<style scoped>
.action-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-bottom: 1px solid var(--el-border-color-light);
}
.action-selector {
  width: 220px;
  flex-shrink: 0;
}
.parameters {
  flex-grow: 1;
}
.controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.drag-handle {
  cursor: grab;
  color: var(--el-text-color-placeholder);
}
.el-row {
  width: 100%;
}
.el-input-number {
  width: 100%;
}
</style>
