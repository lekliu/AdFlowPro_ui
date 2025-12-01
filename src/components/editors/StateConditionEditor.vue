<template>
  <div class="state-condition-editor">
    <el-form label-position="top">
      <el-form-item label="条件类型">
        <el-select v-model="editableCondition.conditionType" style="width: 150%">
          <el-option label="变量/公式比较" value="variable_comparison" />
          <el-option label="App前后台状态" value="app_foreground_check" />
        </el-select>
      </el-form-item>

      <!-- Variable Comparison Editor -->
      <div v-if="editableCondition.conditionType === 'variable_comparison'">
        <div class="comparison-row">
          <el-select v-model="editableCondition.parameters.leftSource" placeholder="来源" style="width: 300px">
            <el-option label="变量" value="variable" />
            <el-option label="公式" value="expression" />
          </el-select>
          <el-input v-model="editableCondition.parameters.leftValue" placeholder="变量名 / 公式" />
          <el-select v-model="editableCondition.parameters.comparisonOperator" placeholder="操作符" style="width: 250px">
            <el-option label=">" value=">" />
            <el-option label=">=" value=">=" />
            <el-option label="<" value="<" />
            <el-option label="<=" value="<=" />
            <el-option label="==" value="==" />
            <el-option label="!=" value="!=" />
            <el-option label="包含" value="contains" />
          </el-select>
          <el-select v-model="editableCondition.parameters.rightSource" placeholder="来源" style="width: 300px">
            <el-option label="固定值" value="value" />
            <el-option label="变量" value="variable" />
          </el-select>
          <el-input v-model="editableCondition.parameters.rightValue" placeholder="值 / 变量名" />
        </div>
      </div>

      <!-- App Foreground Check Editor -->
      <div v-if="editableCondition.conditionType === 'app_foreground_check'">
        <el-form-item label="期望状态">
          <el-radio-group v-model="editableCondition.parameters.expectedState">
            <el-radio value="foreground">前台</el-radio>
            <el-radio value="background">后台</el-radio>
          </el-radio-group>
        </el-form-item>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue";
import type { StateCondition } from "@/types/api";

const props = defineProps<{
  modelValue: StateCondition;
}>();

const emit = defineEmits(["update:modelValue"]);

const createDefaultCondition = (): StateCondition => ({
  conditionType: "variable_comparison",
  parameters: {
    leftSource: "variable",
    comparisonOperator: "==",
    rightSource: "value",
  },
});

const editableCondition = reactive(JSON.parse(JSON.stringify(props.modelValue || createDefaultCondition())));

watch(
  () => editableCondition.conditionType,
  (newType) => {
    // Reset parameters when type changes to avoid carrying over old values
    if (newType === 'variable_comparison') {
      editableCondition.parameters = {
        leftSource: "variable",
        comparisonOperator: "==",
        rightSource: "value",
      };
    } else if (newType === 'app_foreground_check') {
      editableCondition.parameters = {
        expectedState: 'foreground'
      };
    }
  }
);

watch(
  editableCondition,
  (newVal) => {
    emit("update:modelValue", newVal);
  },
  { deep: true }
);
</script>

<style scoped>
.comparison-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
