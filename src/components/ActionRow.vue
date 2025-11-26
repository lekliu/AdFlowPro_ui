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

      <!-- Conditional Tap (Enhanced) -->
      <div v-if="editableAction.action === 'conditional_tap'" class="conditional-tap-container">
        <!-- Row 1: Left Side + Operator -->
        <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
          <el-tag type="info" effect="plain" style="flex-shrink: 0">变量</el-tag>
          <el-input
              v-model="editableAction.parameters.leftValue"
              placeholder="变量名"
              style="flex-grow: 1"
          />
          <!-- Operator at end of Row 1 -->
          <el-select v-model="editableAction.parameters.comparisonOperator" placeholder="Op" style="width: 120px">
            <el-option label=">" value=">" />
            <el-option label=">=" value=">=" />
            <el-option label="<" value="<" />
            <el-option label="<=" value="<=" />
            <el-option label="==" value="==" />
            <el-option label="!=" value="!=" />
            <el-option label="包含" value="contains" />
          </el-select>
        </div>

        <!-- Row 2: Right Side -->
        <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
          <el-select v-model="editableAction.parameters.rightSource" placeholder="右值" style="width: 140px">
            <el-option label="固定值" value="value" />
            <el-option label="变量" value="variable" />
          </el-select>
          <el-input
              v-if="true" 
              v-model="editableAction.parameters.rightValue"
              placeholder="值/变量名"
              style="flex-grow: 1"
          />
        </div>

        <!-- Row 3: Coordinates (Existing) -->
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="font-size: 12px; color: #909399; flex-shrink: 0">点击坐标:</span>
          <el-input-number v-model="editableAction.parameters.startX" placeholder="X" controls-position="right" style="width: 110px" />
          <el-input-number v-model="editableAction.parameters.startY" placeholder="Y" controls-position="right" style="width: 110px" />
        </div>
      </div>

      <!-- Swipe -->
      <div v-if="editableAction.action === 'swipe'" class="swipe-coords-container">
        <el-row :gutter="10">
          <el-col :span="12"><el-input-number v-model="editableAction.parameters.startX" placeholder="Start X" controls-position="right" /></el-col>
          <el-col :span="12"><el-input-number v-model="editableAction.parameters.startY" placeholder="Start Y" controls-position="right" /></el-col>
        </el-row>
        <el-row :gutter="10">
          <el-col :span="12"><el-input-number v-model="editableAction.parameters.endX" placeholder="End X" controls-position="right" /></el-col>
          <el-col :span="12"><el-input-number v-model="editableAction.parameters.endY" placeholder="End Y" controls-position="right" /></el-col>
        </el-row>
      </div>
      <el-select v-if="editableAction.action === 'swipe_gesture'" v-model="editableAction.parameters.direction" placeholder="选择滑动方向">
        <el-option label="上滑" value="UP" />
        <el-option label="下滑" value="DOWN" />
        <el-option label="左滑" value="LEFT" />
        <el-option label="右滑" value="RIGHT" />
      </el-select>

      <!-- Wait -->
      <el-input-number
          v-if="editableAction.action === 'wait'"
          v-model="editableAction.parameters.duration"
          :min="100"
          placeholder="等待毫秒数"
          controls-position="right"
      />

      <!-- Wait Dynamic (Enhanced) -->
      <div v-if="editableAction.action === 'wait_dynamic'" style="display: flex; gap: 8px; align-items: center; width: 100%">
        <el-select v-model="editableAction.parameters.leftSource" placeholder="来源" style="width: 110px">
          <el-option label="变量" value="variable" />
          <el-option label="公式计算" value="expression" />
        </el-select>
        <el-input v-model="editableAction.parameters.leftValue" placeholder="变量名/公式 (单位: 秒)" style="flex-grow: 1" />
      </div>

      <!-- Press Key -->
      <el-select v-if="editableAction.action === 'press_key'" v-model="editableAction.parameters.keyCode" placeholder="选择按键">
        <el-option label="Home" value="home" />
        <el-option label="Back" value="back" />
        <el-option label="Recents" value="recents" />
      </el-select>

      <!-- Report Value (Enhanced) -->
      <div v-if="editableAction.action === 'report_value'" style="display: flex; gap: 8px; align-items: center; width: 100%">
        <el-input v-model="editableAction.parameters.reportLabel" placeholder="变量名/标签" style="width: 150px" />
        <span style="color: var(--el-text-color-regular); font-weight: bold">=</span>
        <el-select v-model="editableAction.parameters.leftSource" placeholder="来源" style="width: 110px">
          <el-option label="固定值" value="value" />
          <el-option label="变量" value="variable" />
          <el-option label="公式计算" value="expression" />
        </el-select>
        <el-input v-model="editableAction.parameters.leftValue" placeholder="值/变量名" style="flex-grow: 1" />
      </div>

      <!-- Calculate Value (New) -->
      <div v-if="editableAction.action === 'calculate_value'" style="display: flex; gap: 8px; align-items: center; width: 100%">
        <el-input v-model="editableAction.parameters.reportLabel" placeholder="变量名" style="width: 150px" />
        <span style="color: var(--el-text-color-regular); font-weight: bold">=</span>
        <el-select v-model="editableAction.parameters.leftSource" placeholder="来源" style="width: 110px">
          <el-option label="固定值" value="value" />
          <el-option label="变量" value="variable" />
          <el-option label="公式计算" value="expression" />
        </el-select>
        <el-input v-model="editableAction.parameters.leftValue" placeholder="值/变量名" style="flex-grow: 1" />
        <el-tooltip content="仅保存变量到内存，不上报给服务器。" placement="top">
          <el-icon style="color: #909399; cursor: help"><InfoFilled /></el-icon>
        </el-tooltip>
      </div>

      <!-- Assert Text Equals -->
      <el-input v-if="editableAction.action === 'assert_text_equals'" v-model="editableAction.parameters.text" placeholder="输入期望的文本" />

      <!-- No visible parameters for wait_dynamic, wake_up, etc. -->
      <el-input v-if="isParameterlessAction" disabled placeholder="此动作无参数" />
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
import { Delete, Rank, InfoFilled } from "@element-plus/icons-vue";
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
      { value: "conditional_tap", label: "Conditional Tap" },
      { value: "swipe", label: "Swipe (by Coordinate)" },
      { value: "swipe_gesture", label: "Swipe (by Gesture)" },
    ],
  },
  {
    label: "流程控制",
    options: [
      { value: "wait", label: "Wait (Fixed Time)" },
      { value: "wait_dynamic", label: "Wait (Dynamic)" },
      { value: "calculate_value", label: "Set / Calculate Variable" },
      { value: "report_value", label: "Report Value (Upload)" },
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
    ["end_case", "reopen_app_if_needed", "wake_up", "sleep", "assert_element_exists"].includes(editableAction.action)
);

watch(
    editableAction,
    (newVal) => {
      if (newVal.action !== props.modelValue.action) {
        // --- 核心修复：当动作类型改变时，重置并根据新类型初始化参数 ---
        newVal.parameters = {};
        newVal.selector = undefined;

        switch (newVal.action) {
          case 'click':
          case 'long_click':
          case 'input_text':
            newVal.selector = { index: 0 };
            break;
          case 'swipe_gesture':
            newVal.parameters = { direction: 'UP' };
            break;
          case 'conditional_tap':
            newVal.parameters = {
              leftSource: 'variable',
              comparisonOperator: '>',
              rightSource: 'value'
            };
            break;
          case 'report_value':
            newVal.parameters = {
              leftSource: 'variable'
            };
            break;
          case 'wait_dynamic':
            newVal.parameters = {
              leftSource: 'variable'
            };
            break;
          case 'calculate_value':
            newVal.parameters = {
              leftSource: 'variable'
            };
            break;
        }
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
  width: 180px;
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
.swipe-coords-container {
  display: flex;
  flex-direction: column;
  gap: 8px; /* Adds space between the start and end coordinate rows */
}
</style>