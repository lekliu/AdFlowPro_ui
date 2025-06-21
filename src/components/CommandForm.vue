<template>
  <el-form :model="commandForm" label-width="120px" ref="commandFormRef">
    <el-form-item label="Device ID">
      <el-input :value="deviceId" disabled />
    </el-form-item>

    <el-form-item label="Command Type" prop="type">
      <el-select
        v-model="commandForm.type"
        placeholder="Select command type"
        @change="onCommandTypeChange"
      >
        <el-option label="Capture Screen" value="capture_screen" />
        <el-option label="Get UI Structure" value="ui_structure" />
        <el-option label="Perform Action" value="perform_action" />
      </el-select>
    </el-form-item>

    <!-- Fields for Capture Screen -->
    <template v-if="commandForm.type === 'capture_screen'">
      <el-form-item label="Format" prop="captureParams.format">
        <el-select v-model="commandForm.captureParams.format">
          <el-option label="JPEG" value="jpeg" />
          <el-option label="PNG" value="png" />
        </el-select>
      </el-form-item>
      <el-form-item label="Quality (1-100)" prop="captureParams.quality">
        <el-input-number
          v-model="commandForm.captureParams.quality"
          :min="1"
          :max="100"
        />
      </el-form-item>
      <el-form-item label="Max Width" prop="captureParams.maxWidth">
        <el-input-number
          v-model="commandForm.captureParams.maxWidth"
          :min="100"
          clearable
        />
      </el-form-item>
    </template>

    <!-- Fields for Perform Action -->
    <template v-if="commandForm.type === 'perform_action'">
      <el-form-item label="Action Type" prop="actionPayload.action">
        <el-select
          v-model="commandForm.actionPayload.action"
          placeholder="Select action"
        >
          <el-option label="Click" value="click" />
          <el-option label="Swipe" value="swipe" />
          <el-option label="Input Text" value="input_text" />
          <!-- Add more actions -->
        </el-select>
      </el-form-item>

      <!-- Selector Fields (common for many actions) -->
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

      <!-- Input Text Specific -->
      <template v-if="commandForm.actionPayload.action === 'input_text'">
        <el-form-item
          label="Text to Input"
          prop="actionPayload.parameters.text"
        >
          <el-input
            v-model="commandForm.actionPayload.parameters.text"
            type="textarea"
          />
        </el-form-item>
      </template>

      <!-- Swipe Specific -->
      <template v-if="commandForm.actionPayload.action === 'swipe'">
        <el-row :gutter="10">
          <el-col :span="12"
            ><el-form-item
              label="Start X (0-1)"
              prop="actionPayload.parameters.startX"
              ><el-input-number
                v-model="commandForm.actionPayload.parameters.startX"
                :precision="2"
                :step="0.01"
                :min="0"
                :max="1" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item
              label="Start Y (0-1)"
              prop="actionPayload.parameters.startY"
              ><el-input-number
                v-model="commandForm.actionPayload.parameters.startY"
                :precision="2"
                :step="0.01"
                :min="0"
                :max="1" /></el-form-item
          ></el-col>
        </el-row>
        <el-row :gutter="10">
          <el-col :span="12"
            ><el-form-item
              label="End X (0-1)"
              prop="actionPayload.parameters.endX"
              ><el-input-number
                v-model="commandForm.actionPayload.parameters.endX"
                :precision="2"
                :step="0.01"
                :min="0"
                :max="1" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item
              label="End Y (0-1)"
              prop="actionPayload.parameters.endY"
              ><el-input-number
                v-model="commandForm.actionPayload.parameters.endY"
                :precision="2"
                :step="0.01"
                :min="0"
                :max="1" /></el-form-item
          ></el-col>
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
        >Send Command</el-button
      >
      <el-button @click="resetForm">Reset</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive, watch, defineProps, defineEmits } from "vue";
import type { FormInstance } from "element-plus";
import { ElMessage } from "element-plus"; // For notifications
import { commandService } from "@/api/commandService"; // You need to create this
import type {
  RequestScreenCapturePayload,
  PerformActionPayload,
  SelectorModel,
  PerformActionParameters,
} from "@/types/api"; // Your API types

const props = defineProps<{ deviceId: string }>();
const emit = defineEmits(["commandSent"]);

const commandFormRef = ref<FormInstance>();
const isSubmitting = ref(false);

const initialCaptureParams: Partial<RequestScreenCapturePayload> = {
  format: "jpeg",
  quality: 80,
  maxWidth: undefined,
};
const initialActionPayload: Partial<PerformActionPayload> = {
  action: undefined,
  selector: {},
  parameters: {},
};

const commandForm = reactive({
  type: "" as "capture_screen" | "ui_structure" | "perform_action" | "",
  captureParams: { ...initialCaptureParams },
  actionPayload: { ...initialActionPayload } as PerformActionPayload, // Cast for type safety
  selectorType: "" as "resourceId" | "text" | "contentDesc" | "xpath" | "",
  selectorValue: "",
});

const onCommandTypeChange = () => {
  // Reset specific params when type changes
  commandForm.captureParams = { ...initialCaptureParams };
  commandForm.actionPayload = {
    ...initialActionPayload,
  } as PerformActionPayload;
  commandForm.selectorType = "";
  commandForm.selectorValue = "";
};

watch(
  () => [commandForm.selectorType, commandForm.selectorValue],
  () => {
    if (!commandForm.actionPayload.selector) {
      commandForm.actionPayload.selector = {};
    }
    // Clear other selector fields
    commandForm.actionPayload.selector.resourceId = undefined;
    commandForm.actionPayload.selector.text = undefined;
    commandForm.actionPayload.selector.contentDesc = undefined;
    commandForm.actionPayload.selector.xpath = undefined;

    if (commandForm.selectorType && commandForm.selectorValue) {
      commandForm.actionPayload.selector[commandForm.selectorType] =
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
        let response;
        switch (commandForm.type) {
          case "capture_screen":
            response = await commandService.sendCaptureScreenCommand(
              props.deviceId,
              commandForm.captureParams as RequestScreenCapturePayload
            );
            break;
          case "ui_structure":
            response = await commandService.sendUiStructureCommand(
              props.deviceId
            );
            break;
          case "perform_action":
            if (!commandForm.actionPayload.action) {
              ElMessage.error(
                "Please select an action type for Perform Action."
              );
              isSubmitting.value = false;
              return;
            }
            // Ensure parameters are correctly structured or nulled if not applicable
            if (
              commandForm.actionPayload.action !== "input_text" &&
              commandForm.actionPayload.action !== "swipe"
            ) {
              commandForm.actionPayload.parameters = undefined; // Or an empty object if API expects it
            } else if (
              commandForm.actionPayload.action === "input_text" &&
              !commandForm.actionPayload.parameters?.text
            ) {
              commandForm.actionPayload.parameters = {
                text: commandForm.actionPayload.parameters?.text || "",
              };
            } // Similar checks for swipe

            response = await commandService.sendPerformActionCommand(
              props.deviceId,
              commandForm.actionPayload
            );
            break;
          default:
            ElMessage.error("Invalid command type selected.");
            isSubmitting.value = false;
            return;
        }
        ElMessage.success(
          `Command '${commandForm.type}' sent! CorrID: ${
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
  onCommandTypeChange(); // Also reset specific params
};
</script>
