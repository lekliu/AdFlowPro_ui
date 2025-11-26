<template>
  <div class="multi-text-input" @click="focusInput">
    <el-tag v-for="(tag, index) in modelValue" :key="index" class="tag-item" closable @close="removeTag(index)">
      {{ tag }}
    </el-tag>
    <input
      ref="inputRef"
      v-model="inputValue"
      class="input-field"
      type="text"
      :placeholder="placeholder"
      @keydown.enter.prevent="addTag"
      @blur="addTag"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  modelValue: string[];
  placeholder?: string;
}>();

const emit = defineEmits(["update:modelValue"]);

const inputValue = ref("");
const inputRef = ref<HTMLInputElement | null>(null);

const addTag = () => {
  const text = inputValue.value.trim();
  if (text) {
    if (!props.modelValue.includes(text)) {
      const newTags = [...props.modelValue, text];
      emit("update:modelValue", newTags);
    }
  }
  inputValue.value = "";
};

const removeTag = (index: number) => {
  const newTags = [...props.modelValue];
  newTags.splice(index, 1);
  emit("update:modelValue", newTags);
};

const focusInput = () => {
  inputRef.value?.focus();
};
</script>

<style scoped>
.multi-text-input {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-input-bg-color, var(--el-fill-color-blank));
  cursor: text;
  transition: border-color 0.2s;
  width: 100%;
  box-sizing: border-box;
}

.multi-text-input:hover {
  border-color: var(--el-border-color-hover);
}

.tag-item {
  margin: 2px 0;
}

.input-field {
  flex-grow: 1;
  border: none;
  outline: none;
  padding: 2px;
  background-color: transparent;
  color: var(--el-text-color-primary);
  min-width: 120px;
  font-size: 14px;
}
</style>
