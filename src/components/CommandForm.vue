<template>
  <el-form :model="commandForm" label-width="120px" ref="commandFormRef">
    <el-form-item label="Device ID">
      <el-input :value="deviceId" disabled />
    </el-form-item>

    <el-form-item label="Action Type" prop="actionPayload.action">
      <el-select
        v-model="commandForm.actionPayload.action"
        placeholder="Select action"
      >
        <el-option label="Tap (by Coordinate)" value="tap" />
        <el-option label="Click (by Selector)" value="click" />
        <el-option label="Swipe" value="swipe" />
        <el-option label="Input Text" value="input_text" />
        <el-option label="Press Hotkey" value="press_key" />
      </el-select>
    </el-form-item>

    <!-- 当 Action Type 为 press_key 时，显示热键选择器 -->
    <template v-if="commandForm.actionPayload.action === 'press_key'">
      <el-form-item label="Hotkey" prop="actionPayload.parameters.keyCode">
        <el-select
          v-model="commandForm.actionPayload.parameters.keyCode"
          placeholder="Select a hotkey"
        >
          <el-option label="Home" value="home" />
          <el-option label="Back" value="back" />
          <el-option label="Recents (App Switcher)" value="recents" />
        </el-select>
      </el-form-item>
    </template>

    <template
      v-if="
        commandForm.actionPayload.action &&
        !['tap', 'swipe', 'press_key'].includes(
          commandForm.actionPayload.action
        )
      "
    >
      <!-- Selector Fields -->
      <el-form-item label="Selector Type">
        <el-radio-group v-model="commandForm.selectorType">
          <el-radio-button label="resourceId">Resource ID</el-radio-button>
          <el-radio-button label="text">Text</el-radio-button>
          <el-radio-button label="contentDesc">Content Desc.</el-radio-button>
          <el-radio-button label="xpath">XPath</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item
        :label="commandForm.selectorType"
        v-if="commandForm.selectorType"
      >
        <el-input
          v-model="commandForm.selectorValue"
          :placeholder="`Enter ${commandForm.selectorType}`"
        />
      </el-form-item>
    </template>

    <!-- 输入文本逻辑 -->
    <template v-if="commandForm.actionPayload.action === 'input_text'">
      <el-form-item label="Text to Input" prop="actionPayload.parameters.text">
        <el-input
          v-model="commandForm.actionPayload.parameters.text"
          type="textarea"
        />
      </el-form-item>
    </template>

    <!-- Unified Coordinate Inputs for Tap & Swipe -->
    <template
      v-if="
        commandForm.actionPayload.action === 'swipe' ||
        commandForm.actionPayload.action === 'tap'
      "
    >
      <el-row :gutter="10">
        <el-col :span="12">
          <el-form-item
            :label="
              commandForm.actionPayload.action === 'tap'
                ? 'Tap X (px)'
                : 'Start X (px)'
            "
            prop="actionPayload.parameters.startX"
          >
            <el-input-number
              v-model="commandForm.actionPayload.parameters.startX"
              :precision="0"
              :step="10"
              :min="0"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item
            :label="
              commandForm.actionPayload.action === 'tap'
                ? 'Tap Y (px)'
                : 'Start Y (px)'
            "
            prop="actionPayload.parameters.startY"
          >
            <el-input-number
              v-model="commandForm.actionPayload.parameters.startY"
              :precision="0"
              :step="10"
              :min="0"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <template v-if="commandForm.actionPayload.action === 'swipe'">
        <el-row :gutter="10">
          <el-col :span="12">
            <el-form-item
              label="End X (px)"
              prop="actionPayload.parameters.endX"
            >
              <el-input-number
                v-model="commandForm.actionPayload.parameters.endX"
                :precision="0"
                :step="10"
                :min="0"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item
              label="End Y (px)"
              prop="actionPayload.parameters.endY"
            >
              <el-input-number
                v-model="commandForm.actionPayload.parameters.endY"
                :precision="0"
                :step="10"
                :min="0"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item
          label="Duration (ms)"
          prop="actionPayload.parameters.duration"
        >
          <el-input-number
            v-model="commandForm.actionPayload.parameters.duration"
            :min="50"
          />
        </el-form-item>
      </template>
    </template>

    <el-form-item>
      <el-button type="primary" @click="submitCommand" :loading="isSubmitting"
        >Send Action</el-button
      >
      <el-button @click="resetForm">Reset</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
// Script part remains the same as the first version in this response.
import { ref, reactive, watch, defineProps, defineEmits } from "vue";
import type { FormInstance } from "element-plus";
import { ElMessage } from "element-plus";
import { commandService } from "@/api/commandService";
import type { PerformActionPayload } from "@/types/api";

const props = defineProps<{ deviceId: string }>();
const emit = defineEmits(["commandSent"]);

const commandFormRef = ref<FormInstance>();
const isSubmitting = ref(false);

const initialActionPayload: Partial<PerformActionPayload> = {
  action: undefined,
  selector: {},
  parameters: {},
};

const commandForm = reactive({
  actionPayload: { ...initialActionPayload } as PerformActionPayload,
  selectorType: "" as "resourceId" | "text" | "contentDesc" | "xpath" | "",
  selectorValue: "",
});

const onActionTypeChange = () => {
  commandForm.selectorType = "";
  commandForm.selectorValue = "";
  commandForm.actionPayload.parameters = {}; // Reset parameters on action change
};

watch(
  () => commandForm.actionPayload.action,
  () => {
    onActionTypeChange();
  }
);

watch(
  () => [commandForm.selectorType, commandForm.selectorValue],
  () => {
    if (!commandForm.actionPayload.selector) {
      commandForm.actionPayload.selector = {};
    }
    commandForm.actionPayload.selector.resourceId = undefined;
    commandForm.actionPayload.selector.text = undefined;
    commandForm.actionPayload.selector.contentDesc = undefined;
    commandForm.actionPayload.selector.xpath = undefined;

    if (commandForm.selectorType && commandForm.selectorValue) {
      (commandForm.actionPayload.selector as any)[commandForm.selectorType] =
        commandForm.selectorValue;
    }
  }
);

const submitCommand = async () => {
  if (!commandFormRef.value) return;
  await commandFormRef.value.validate(async (valid) => {
    if (valid) {
      isSubmitting.value = true;
      try {
        // Validate action type
        if (!commandForm.actionPayload.action) {
          ElMessage.error("Please select an action type.");
          isSubmitting.value = false;
          return;
        }

        // 3. 在发送前清理 payload
        const payloadToSend = JSON.parse(
          JSON.stringify(commandForm.actionPayload)
        ) as PerformActionPayload;

        // 根据 action 类型清理不需要的字段
        if (["tap", "swipe", "press_key"].includes(payloadToSend.action)) {
          // 这些动作不需要 selector
          delete payloadToSend.selector;
        } else {
          if (payloadToSend.action !== "input_text") {
            delete payloadToSend.parameters;
          }
        }

        // 确保 `press_key` 发送时 `parameters` 里只有 `keyCode`
        if (payloadToSend.action === "press_key" && payloadToSend.parameters) {
          const keyCode = payloadToSend.parameters.keyCode;
          payloadToSend.parameters = { keyCode }; // 只保留 keyCode
        }

        const response = await commandService.sendPerformActionCommand(
          props.deviceId,
          payloadToSend
        );

        ElMessage.success(
          `Action '${payloadToSend.action}' sent! CorrID: ${
            response?.correlation_id || "N/A"
          }`
        );
        emit("commandSent", true);
      } catch (error) {
        console.error("Error sending command:", error);
        ElMessage.error("Failed to send command.");
        emit("commandSent", false);
      } finally {
        isSubmitting.value = false;
      }
    } else {
      console.log("Command form validation failed");
      return false;
    }
  });
};

const resetForm = () => {
  if (!commandFormRef.value) return;
  commandFormRef.value.resetFields();
  commandForm.actionPayload = {
    ...initialActionPayload,
  } as PerformActionPayload;
  commandForm.selectorType = "";
  commandForm.selectorValue = "";
};
</script>
