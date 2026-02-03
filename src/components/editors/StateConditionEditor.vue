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
          <el-input v-model="editableCondition.parameters.leftValue" placeholder="左值 (支持公式/变量{v})" />
          <el-select v-model="editableCondition.parameters.comparisonOperator" placeholder="操作符" style="width: 250px">
            <el-option label=">" value=">" />
            <el-option label=">=" value=">=" />
            <el-option label="<" value="<" />
            <el-option label="<=" value="<=" />
            <el-option label="==" value="==" />
            <el-option label="!=" value="!=" />
            <el-option label="包含" value="contains" />
          </el-select>
          <el-input v-model="editableCondition.parameters.rightValue" placeholder="右值 (支持公式/变量{v})" />
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
    comparisonOperator: "==",
  },
});

const editableCondition = reactive(JSON.parse(JSON.stringify(props.modelValue || createDefaultCondition())));

// 核心修复：监听父组件 modelValue 的变化，确保代码模式解析后能同步到 UI
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      // 使用 JSON 对比防止不必要的循环更新
      if (JSON.stringify(newVal) !== JSON.stringify(editableCondition)) {
        Object.assign(editableCondition, JSON.parse(JSON.stringify(newVal)));
      }
    }
  },
  { deep: true }
);

watch(
  () => editableCondition.conditionType,
  (newType) => {
    // Reset parameters when type changes to avoid carrying over old values
    if (newType === 'variable_comparison') {
      editableCondition.parameters = {
        comparisonOperator: "==",
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
