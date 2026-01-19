<!-- src/components/editors/AiMatcherEditor.vue -->
<template>
  <div class="ai-matcher-editor" v-if="modelValue">
    <el-form-item label="选择模型">
      <el-select
          :model-value="modelValue.modelId"
          placeholder="从模型库选择"
          filterable
          @change="handleModelChange"
      >
        <el-option
            v-for="m in modelStore.models"
            :key="m.modelId"
            :label="m.name"
            :value="m.modelId || m.model_id"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="目标标签 (Label)">
      <el-select
          :model-value="modelValue.targetLabel"
          placeholder="选择识别目标"
          :disabled="!currentModelLabels.length"
          @change="handleLabelChange"
      >
        <el-option v-for="l in currentModelLabels" :key="l" :label="l" :value="l" />
      </el-select>
    </el-form-item>

    <el-form-item label="置信度阈值">
      <el-slider
          :model-value="modelValue.minConfidence"
          :min="0.05" :max="1.0" :step="0.05"
          show-input
          @input="handleConfChange"
      />
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useAiModelStore } from "@/stores/aiModelStore";

const props = defineProps<{ modelValue: any }>();
const emit = defineEmits(["update:modelValue"]);
const modelStore = useAiModelStore();

const currentModelLabels = computed(() => {
  const model = modelStore.models.find(m => m.modelId === props.modelValue.modelId);
  return model?.labels || [];
});

const handleModelChange = (val: string) => {
  // 必须发射一个全新的对象，确保父组件能检测到变更
  emit("update:modelValue", {
    ...props.modelValue,
    modelId: val,
    targetLabel: ""
  });
};

const handleLabelChange = (val: string) => {
  emit("update:modelValue", { ...props.modelValue, targetLabel: val });
};

const handleConfChange = (val: any) => {
  // el-slider 的 input 事件返回 number | number[]，这里强制取值
  const value = Array.isArray(val) ? val[0] : val;
  emit("update:modelValue", { ...props.modelValue, minConfidence: value });
};

// 在 <script setup> 找到这部分代码并修改
onMounted(async () => {
  await modelStore.fetchModels(); // 确保加载完成
  // 打印整个数组到控制台
  console.log(">>> [DEBUG] AI Models in Store:", JSON.parse(JSON.stringify(modelStore.models)));

  // 打印第一个模型的所有键名
  if (modelStore.models.length > 0) {
    console.log(">>> [DEBUG] Model Keys:", Object.keys(modelStore.models[0]));
  }
});


</script>