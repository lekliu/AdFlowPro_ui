<template>
  <div class="action-row">
    <!-- Action Type Selector -->
    <el-cascader
      v-model="cascaderValue"
      :options="cascaderOptions"
      :props="{ expandTrigger: 'hover' }"
      placeholder="选择动作"
      class="action-selector"
      filterable
      :clearable="false"
      @change="(val: any) => handleCascaderChange(val)"
    />

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

      <!-- Wait For Vanish (Duration) -->
      <div v-if="editableAction.action === 'wait_for_vanish'" style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 12px; color: #909399; white-space: nowrap;">超时(ms):</span>
        <el-input-number
          v-model="editableAction.parameters.duration"
          :min="1000"
          :step="1000"
          placeholder="默认 5000"
          controls-position="right"
          style="flex-grow: 1;"
        />
      </div>

      <!-- Conditional Tap (Enhanced) -->
      <div v-if="editableAction.action === 'conditional_tap'" class="conditional-tap-container">
        <!-- Row 1: Left Side + Operator -->
        <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
          <span style="font-size: 12px; color: #909399; flex-shrink: 0">左值:</span>
          <el-input
              v-model="editableAction.parameters.leftValue"
              placeholder="变量 {v} / 公式 / 值"
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
          <span style="font-size: 12px; color: #909399; flex-shrink: 0">右值:</span>
          <el-input
              v-model="editableAction.parameters.rightValue"
              placeholder="变量 {v} / 公式 / 值"
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

      <!-- Conditional Tap Jump (New) -->
      <div v-if="editableAction.action === 'conditional_tap_jump'" class="conditional-tap-container">
        <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
          <span style="font-size: 12px; color: #909399; flex-shrink: 0">条件:</span>
          <el-input v-model="editableAction.parameters.leftValue" placeholder="左值" style="flex-grow: 1" />
          <el-select v-model="editableAction.parameters.comparisonOperator" placeholder="Op" style="width: 200px">
            <el-option label=">" value=">" /> <el-option label=">=" value=">=" />
            <el-option label="<" value="<" /> <el-option label="<=" value="<=" />
            <el-option label="==" value="==" /> <el-option label="!=" value="!=" />
            <el-option label="包含" value="contains" />
          </el-select>
          <el-input v-model="editableAction.parameters.rightValue" placeholder="右值" style="flex-grow: 1" />
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
          <span style="font-size: 12px; color: #909399; flex-shrink: 0">点击坐标:</span>
          <el-input-number v-model="editableAction.parameters.startX" placeholder="X" controls-position="right" style="width: 110px" />
          <el-input-number v-model="editableAction.parameters.startY" placeholder="Y" controls-position="right" style="width: 110px" />
          <span style="font-size: 11px; color: #C0C4CC;">(≤0则不点击)</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="font-size: 12px; color: #909399; flex-shrink: 0">跳转目标:</span>
          <el-input
              v-model="editableAction.parameters.targetStateLabel"
              placeholder="目标 State 标签 (填'结束'则退出Case)"
              style="flex-grow: 1"
          />
        </div>
      </div>

      <!-- End Case (Enhanced with Condition) -->
      <div v-if="editableAction.action === 'end_case'" class="conditional-container">
        <!-- 默认无条件 -->
        <div style="display: flex; ">
          <span style="font-size: 12px; color: #909399; width: 60px;">条件(可选):</span>
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center;">
          <el-input v-model="editableAction.parameters.leftValue" placeholder="左值 (如 {count})" style="flex-grow: 1" />
          <el-select v-model="editableAction.parameters.comparisonOperator" placeholder="Op" style="width: 100px">
            <el-option label="==" value="==" /> <el-option label="!=" value="!=" />
            <el-option label=">" value=">" /> <el-option label="<" value="<" />
          </el-select>
        </div>
        <div v-if="editableAction.parameters.leftValue" style="display: flex; gap: 8px; align-items: center;">
          <el-input v-model="editableAction.parameters.rightValue" placeholder="右值 (如 0)" style="flex-grow: 1" />
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
          <el-col :span="24" style="margin-top: 5px"><el-input-number v-model="editableAction.parameters.duration" :min="100" :step="100" placeholder="滑动时长(ms)" controls-position="right" style="width: 100%" /></el-col>
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
        <el-input v-model="editableAction.parameters.leftValue" placeholder="等待秒数，支持公式 (如 {count} * 0.5)" style="flex-grow: 1" />
      </div>

      <!-- Jump to State -->
      <el-input v-if="editableAction.action === 'jump_to_state'" v-model="editableAction.parameters.targetStateLabel" placeholder="输入目标状态的标签名" />

      <!-- Reopen App -->
      <el-input v-if="editableAction.action === 'reopen_app'" v-model="editableAction.parameters.packageName" placeholder="输入目标App的包名" />

      <!-- Return to Entry App -->
      <el-input v-if="editableAction.action === 'return_to_entry_app'" disabled placeholder="返回第一个跳转的应用" />

      <!-- Assert Text Equals (Custom Layout) -->
      <div v-if="editableAction.action === 'assert_text_equals'" class="assert-text-equals-container">
        <div class="assert-section">
          <div class="assert-label">1. 定位元素</div>
          <SelectorInput v-model="editableAction.selector" />
        </div>
        <div class="assert-section">
          <div class="assert-label">2. 验证文本</div>
          <el-input v-model="editableAction.parameters.text" placeholder="输入期望的完整文本" />
        </div>
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
        <el-input v-model="editableAction.parameters.leftValue" placeholder="值或公式 (如 {price} * 0.8)" style="flex-grow: 1" />
      </div>

      <!-- Calculate Value (New) -->
      <div v-if="editableAction.action === 'calculate_value'" style="display: flex; gap: 8px; align-items: center; width: 100%">
        <el-input v-model="editableAction.parameters.reportLabel" placeholder="变量名" style="width: 150px" />
        <span style="color: var(--el-text-color-regular); font-weight: bold">=</span>
        <el-input v-model="editableAction.parameters.leftValue" placeholder="公式 (如 {index} + 1)" style="flex-grow: 1" />
        <el-tooltip content="计算结果仅保存到内存变量，不上报。" placement="top">
          <el-icon style="color: #909399; cursor: help"><InfoFilled /></el-icon>
        </el-tooltip>
      </div>

      <!-- Assert Element Count -->
      <div v-if="editableAction.action === 'assert_element_count'" class="comparison-row">
        <el-select v-model="editableAction.parameters.comparisonOperator" placeholder="操作符" style="width: 120px">
          <el-option label="==" value="==" /> <el-option label="!=" value="!=" />
          <el-option label=">" value=">" /> <el-option label=">=" value=">=" />
          <el-option label="<" value="<" /> <el-option label="<=" value="<=" />
        </el-select>
        <el-input-number v-model="editableAction.parameters.expectedCount" :min="0" placeholder="期望数量" controls-position="right" style="flex-grow: 1" />
      </div>
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
import { computed, reactive, watch, ref } from "vue";
import { Delete, Rank, InfoFilled } from "@element-plus/icons-vue";
import type { PerformActionPayload, Selector } from "@/types/api/common";
import SelectorInput from "@/components/SelectorInput.vue";

const props = defineProps<{
  modelValue: PerformActionPayload & { id: string };
  mode: "editor" | "standalone";
}>();

const emit = defineEmits(["update:modelValue", "remove"]);

const editableAction = reactive(JSON.parse(JSON.stringify(props.modelValue)));

const cascaderOptions = [
  {
    label: "UI 交互",
    value: "ui_interaction",
    children: [
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
    value: "flow_control",
    children: [
      { value: "wait", label: "Wait (Fixed Time)" },
      { value: "wait_dynamic", label: "Wait (Dynamic from Var)" },
      { value: "wait_for_vanish", label: "Wait For Vanish" },
      { value: "calculate_value", label: "Set / Calculate Variable" },
      { value: "report_value", label: "Report Value (Upload)" },
      { value: "end_case", label: "End Case" },
      { value: "reopen_app_if_needed", label: "Reopen App If Needed" },
      { value: "reopen_app", label: "Reopen App (by PackageName)" },
      { value: "return_to_entry_app", label: "Return to Entry App" },
      { value: "jump_to_state", label: "Jump to State (Flow)" },
      { value: "conditional_tap_jump", label: "Conditional Tap & Jump" },
    ],
  },
  {
    label: "设备控制",
    value: "device_control",
    children: [
      { value: "press_key", label: "Press Key" },
      { value: "wake_up", label: "Wake Up" },
      { value: "sleep", label: "Sleep" },
      { value: "install_helper_app", label: "Install Helper App" },
      { value: "set_brightness_auto", label: "Set Brightness Auto" },
      { value: "set_brightness_min", label: "Set Brightness Min" },
    ],
  },
  {
    label: "断言",
    value: "assertion",
    children: [
      { value: "assert_text_equals", label: "Assert Text Equals" },
      { value: "assert_element_count", label: "Assert Element Count" },
    ],
  },
];

// 计算属性：根据当前的 action 值，反向查找它在级联菜单中的路径 [category, action]
// 用于 v-model 回显
const cascaderValue = computed({
  get: () => {
    const action = editableAction.action;
    for (const group of cascaderOptions) {
      if (group.children.some((child) => child.value === action)) {
        return [group.value, action];
      }
    }
    return [];
  },
  set: (val) => {
    // setter is handled by @change event, but required for v-model
  }
});

const handleCascaderChange = (val: string[]) => {
  if (val && val.length > 0) {
    // 取数组的最后一项作为实际的 action 值
    editableAction.action = val[val.length - 1];
  }
};

const needsSelector = computed(() => ["click", "long_click", "input_text", "wait_for_vanish", "assert_element_count"].includes(editableAction.action));

const isParameterlessAction = computed(() =>
    ["reopen_app_if_needed", "return_to_entry_app", "wake_up", "sleep", "install_helper_app", "set_brightness_auto", "set_brightness_min"].includes(editableAction.action)
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
          // case 'assert_element_exists':
          case 'input_text':
            newVal.selector = { index: 0 };
            break;
          case 'swipe_gesture':
            newVal.parameters = { direction: 'UP' };
            break;
          case 'tap':
            newVal.parameters = { startX: 0, startY: 0, endX: 0, endY: 0, duration: 1000 };
            break;
          case 'conditional_tap':
            // Simplified initialization
            newVal.parameters = {
              comparisonOperator: '>',
            };
            break;
          case 'conditional_tap_jump':
            newVal.parameters = {
              comparisonOperator: '==',
              startX: 0,
              startY: 0,
              targetStateLabel: '结束'
            };
            break;
          case 'report_value':
            newVal.parameters = {};
            break;
          case 'wait_dynamic':
            newVal.parameters = {};
            break;
          case 'calculate_value':
            newVal.parameters = {};
            break;
          case 'end_case':
            // Initialize with empty conditional parameters
            newVal.parameters = {
              comparisonOperator: '=='
            };
            break;
          case 'wait_for_vanish':
            newVal.selector = { index: 0 };
            newVal.parameters = { duration: 5000 };
            break;
          case 'jump_to_state':
            newVal.parameters = { targetStateLabel: '' };
            break;
          case 'assert_element_count':
            newVal.selector = { index: -1 };
            newVal.parameters = {
              comparisonOperator: '==',
              expectedCount: 1,
            };
            break;
        }
      }

      emit("update:modelValue", newVal);
    },
    { deep: true }
);

// Ensure parameters object exists to prevent v-model errors
if (!editableAction.parameters) {
  editableAction.parameters = {};
}
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
  width: 190px;
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
.comparison-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.assert-text-equals-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.assert-section {
  width: 100%;
}
.assert-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}
</style>