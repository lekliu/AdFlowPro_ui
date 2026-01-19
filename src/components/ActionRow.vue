<template>
  <div class="action-row">
    <!-- Action Type Selector -->
    <el-cascader
      v-model="cascaderValue"
      :options="cascaderOptions"
      :props="{ expandTrigger: 'hover' }"
      popper-class="action-cascader-popper"
      placeholder="选择动作"
      class="action-selector"
      filterable
      :clearable="false"
      @change="(val: any) => handleCascaderChange(val)"
    />

    <!-- Parameters Area -->
    <div class="parameters">
      <!-- Selector-based Actions -->
      <SelectorInput v-if="needsSelector" v-model="editableAction.selector" :action="editableAction.action" />

      <!-- Input Text -->
      <el-input v-if="editableAction.action === 'input_text'" v-model="editableAction.parameters.text" placeholder="输入要填充的文本" />

      <!-- Tap -->
      <el-row v-if="['tap', 'hover', 'right_click', 'double_click'].includes(editableAction.action)" :gutter="10" style="margin-top: 8px">

        <el-col :span="12"><el-input-number v-model="editableAction.parameters.startX" placeholder="X 坐标" controls-position="right" /></el-col>
        <el-col :span="12"><el-input-number v-model="editableAction.parameters.startY" placeholder="Y 坐标" controls-position="right" /></el-col>
        <el-col :span="24" v-if="editableAction.action === 'tap'" style="margin-top: 8px">
          <el-input-number v-model="editableAction.parameters.duration" :min="0" :step="100" placeholder="点击时长 (ms, 默认100)" controls-position="right" style="width: 100%">
            <template #prefix><span style="font-size: 12px; color: #909399">时长:</span></template>
          </el-input-number>
        </el-col>
      </el-row>

      <div v-if="['tap', 'hover', 'right_click', 'double_click'].includes(editableAction.action)" class="pc-action-params">
        <div class="priority-tip">
          <el-tooltip placement="top">
            <template #content>
              <div style="line-height: 1.5">
                <b>PC 执行优先级：</b><br/>
                1. <b>坐标</b> (X/Y > 0 时优先点击坐标)<br/>
                2. <b>文本</b> (坐标为 0 时寻找 Selector 文本)<br/>
                3. <b>上下文</b> (以上皆空时自动吸附 Match 命中点)
              </div>
            </template>
            <el-icon class="info-icon"><InfoFilled /></el-icon>
          </el-tooltip>
          <span class="tip-text">坐标/文本双模 (坐标优先)</span>
        </div>
      </div>
      <el-row v-if="editableAction.action === 'tap_relative'" :gutter="10" style="margin-top: 8px">
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

        <!-- 满足条件时的点击 -->
        <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
          <el-tag size="small" type="success">若 True 点击</el-tag>
          <el-input-number v-model="editableAction.parameters.startX" placeholder="X1" controls-position="right" style="width: 110px" />
          <el-input-number v-model="editableAction.parameters.startY" placeholder="Y1" controls-position="right" style="width: 110px" />
          <span style="font-size: 11px; color: #C0C4CC;">(0则不点)</span>
        </div>

        <!-- 不满足条件时的点击 (新增) -->
        <div style="display: flex; gap: 8px; align-items: center;">
          <el-tag size="small" type="danger">若 False 点击</el-tag>
          <el-input-number v-model="editableAction.parameters.elseX" placeholder="X2" controls-position="right" style="width: 110px" />
          <el-input-number v-model="editableAction.parameters.elseY" placeholder="Y2" controls-position="right" style="width: 110px" />
          <span style="font-size: 11px; color: #C0C4CC;">(0则不点)</span>
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

      <!-- Clean App Data (PC Only) -->
      <div v-if="editableAction.action === 'clean_app_data'" class="env-action-container">
        <el-row :gutter="10">
          <el-col :span="8">
            <el-select v-model="editableAction.parameters.scope" placeholder="作用域">
              <el-option label="Roaming" value="Roaming" />
              <el-option label="Local" value="Local" />
              <el-option label="Temp" value="Temp" />
            </el-select>
          </el-col>
          <el-col :span="16">
            <el-input v-model="editableAction.parameters.packageName" placeholder="应用包名 (文件夹名)" />
          </el-col>
        </el-row>
      </div>

      <!-- Registry Reset (PC Only) -->
      <div v-if="editableAction.action === 'registry_reset'" class="env-action-container">
        <el-input v-model="editableAction.parameters.path" placeholder="注册表路径 (如: Software\MyApp)" style="margin-bottom: 8px" />
        <el-row :gutter="10">
          <el-col :span="12"><el-input v-model="editableAction.parameters.key" placeholder="键名 (可选)" /></el-col>
          <el-col :span="12"><el-input v-model="editableAction.parameters.value" placeholder="键值 (可选)" /></el-col>
        </el-row>
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

      <!-- Wait Random -->
      <div v-if="editableAction.action === 'wait_random'" style="display: flex; gap: 8px; align-items: center;">
        <el-input-number v-model="editableAction.parameters.minDuration" :min="0" placeholder="Min(ms)" controls-position="right" />
        <span style="color: #909399">-</span>
        <el-input-number v-model="editableAction.parameters.maxDuration" :min="0" placeholder="Max(ms)" controls-position="right" />
      </div>

      <!-- Scroll Until (App Only) -->
      <div v-if="editableAction.action === 'scroll_until'" style="display: flex; gap: 8px; align-items: center;">
        <el-select v-model="editableAction.parameters.direction" placeholder="方向" style="width: 100px">
          <el-option label="向下" value="DOWN" /><el-option label="向上" value="UP" />
        </el-select>
        <el-input v-model="editableAction.parameters.text" placeholder="目标文本 (OCR匹配)" style="flex-grow: 1" />
        <el-input-number v-model="editableAction.parameters.expectedCount" :min="1" :max="30" placeholder="Max" style="width: 100px" />
      </div>

      <!-- Data Generator -->
      <div v-if="editableAction.action === 'data_generator'" style="display: flex; gap: 8px; align-items: center;">
        <el-select v-model="editableAction.parameters.genType" placeholder="类型" style="width: 150px">
          <el-option label="手机号" value="PHONE" /><el-option label="姓名" value="NAME" />
          <el-option label="UUID" value="UUID" /><el-option label="随机整数" value="INT" />
        </el-select>
        <el-input v-model="editableAction.parameters.reportLabel" placeholder="存入变量名" style="flex-grow: 1" />
      </div>

      <!-- Shell Execute -->
      <div v-if="editableAction.action === 'shell_execute'" style="display: flex; flex-direction: column; gap: 8px;">
        <el-input v-model="editableAction.parameters.command" type="textarea" placeholder="输入 Shell/CMD 命令" />
        <el-input v-model="editableAction.parameters.reportLabel" placeholder="输出存入变量 (可选)" size="small" />
      </div>

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
      <el-cascader
        v-if="editableAction.action === 'press_key'"
        v-model="keyCodeCascaderValue"
        :options="keyCodeOptions"
        :props="{ expandTrigger: 'hover', emitPath: false }"
        placeholder="选择平台 / 按键"
        @change="handleKeyCodeChange"
        style="width: 100%"
      />

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
      { value: "wait_random", label: "Wait (Random Range)" },
      { value: "wait_dynamic", label: "Wait (Dynamic from Var)" },
      { value: "scroll_until", label: "Scroll Until (OCR Match)" },
      { value: "data_generator", label: "Data Generator (造数)" },
      { value: "shell_execute", label: "Shell Execute (系统命令)" },
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
  {
    label: "PC 专属",
    value: "pc_special",
    children: [
      { value: "hover", label: "Hover (鼠标悬停)" },
      { value: "right_click", label: "Right Click (右键点击)" },
      { value: "double_click", label: "Double Click (双击)" },
      { value: "key_down", label: "KeyDown (按下不弹起)" },
      { value: "key_up", label: "KeyUp (弹起按键)" },
      { value: "clean_app_data", label: "清理应用数据 (AppData)" },
      { value: "registry_reset", label: "重置注册表 (Registry)" },
      { value: "force_kill_family", label: "强杀进程树 (Force Kill)" },
    ],
  },
];

// --- [新增] 按键层级定义 ---
const keyCodeOptions = [
  {
    label: '手机按键 (Mobile)',
    value: 'mobile',
    children: [
      { label: 'Home (主页)', value: 'home' },
      { label: 'Back (返回)', value: 'back' },
      { label: 'Recents (最近任务)', value: 'recents' },
    ]
  },
  {
    label: '电脑按键 (PC)',
    value: 'pc',
    children: [
      { label: 'Enter (回车)', value: 'enter' },
      { label: 'Esc (取消)', value: 'esc' },
      { label: 'Tab (切换焦点)', value: 'tab' },
      { label: 'Space (空格)', value: 'space' },
      { label: 'Delete (删除)', value: 'delete' },
      { label: 'F5 (刷新)', value: 'f5' },
      { label: 'Ctrl + S (保存)', value: 'ctrl+s' },
      { label: 'Alt + F4 (关闭窗口)', value: 'alt+f4' },
    ]
  }
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

// --- [新增] 处理按键级联选择器回显与变更 ---
const keyCodeCascaderValue = computed({
  get: () => editableAction.parameters.keyCode,
  set: (val) => {} // 实际由下面的 handleKeyCodeChange 更新
});

const handleKeyCodeChange = (val: any) => {
  editableAction.parameters.keyCode = val;
};

const needsSelector = computed(() => ["click", "long_click", "input_text", "wait_for_vanish", "assert_element_count", "hover", "right_click", "double_click"].includes(editableAction.action));

const isParameterlessAction = computed(() =>
    ["reopen_app_if_needed", "return_to_entry_app", "wake_up", "sleep", "install_helper_app", "set_brightness_auto", "set_brightness_min", "force_kill_family"].includes(editableAction.action)
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
          case 'right_click':
          case 'double_click':
          case 'long_click':
          // case 'assert_element_exists':
          case 'input_text':
          case 'hover':
            newVal.selector = { index: 0 };
            break;
          case 'swipe_gesture':
            newVal.parameters = { direction: 'UP' };
            break;
          case 'tap':
            newVal.parameters = { startX: 0, startY: 0, duration: 100 };
            break;
          case 'key_down':
          case 'key_up':
            newVal.parameters = { keyCode: 'home' };
            break;
          case 'conditional_tap':
            // Simplified initialization
            newVal.parameters = {
              comparisonOperator: '>',
              startX: 0, startY: 0,
              elseX: 0, elseY: 0
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
          case 'wait':
            newVal.parameters = { duration: 1000 };
            break;
          case 'wait_random':
            newVal.parameters = { minDuration: 1000, maxDuration: 3000 };
            break;
          case 'wait_dynamic':
            newVal.parameters = {};
            break;
          case 'scroll_until':
            newVal.parameters = { direction: 'DOWN', text: '', expectedCount: 10 };
            break;
          case 'data_generator':
            newVal.parameters = { genType: 'PHONE', reportLabel: 'rand_val' };
            break;
          case 'shell_execute':
            newVal.parameters = { command: '', reportLabel: '' };
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
          case 'clean_app_data':
            newVal.parameters = { scope: 'Roaming', packageName: '' };
            break;
          case 'registry_reset':
            newVal.parameters = { path: '', key: '', value: '' };
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
/* 这里保留原有的组件内样式 */
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
  gap: 8px;
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

<!-- 新增一个不带 scoped 的 style 块，专门处理全局弹窗 -->
<style>
.action-cascader-popper .el-cascader-menu {
  height: 500px !important; /* 强制高度 */
  min-width: 220px;
}

.action-cascader-popper .el-cascader-menu__list {
  height: 100%;
}

.action-cascader-popper .el-cascader-node {
  height: 34px;
  line-height: 34px;
}
</style>

<!-- 全局样式覆盖 -->
<style>
/* 1. 设置菜单外层高度和宽度 */
.action-cascader-popper .el-cascader-menu {
  height: 500px !important;
  min-width: 220px;
  border-right: 1px solid #f0f0f0;
}

/* 2. 核心：隐藏内部滚动条容器的溢出和滚动条 */
.action-cascader-popper .el-cascader-menu__wrap {
  height: 100% !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
}

/* 3. 恢复滚动条可见性，并美化 */
.action-cascader-popper .el-scrollbar__bar.is-vertical {
  width: 6px !important;
  opacity: 1 !important;
}

/* 4. 调整节点间距，让布局更舒展 */
.action-cascader-popper .el-cascader-node {
  height: 40px !important;
  line-height: 40px !important;
  padding: 0 15px;
}

/* 5. 鼠标悬停时的背景色，增强反馈 */
.action-cascader-popper .el-cascader-node:hover {
  background-color: #f5f7fa;
}
</style>