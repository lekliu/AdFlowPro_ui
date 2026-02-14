======================================================================
FILE: AdFlowPro_ui\src\components\LogicBlock.vue
======================================================================
<template>
  <div class="logic-block">
    <div class="logic-header">
      <el-tag size="small" type="warning" effect="dark">IF 逻辑判定</el-tag>
      <div class="condition-row">
        <el-input v-model="modelValue.parameters.leftValue" placeholder="变量 {v}" size="small" style="width: 130px" />
        <el-select v-model="modelValue.parameters.comparisonOperator" size="small" style="width: 85px">
          <el-option label="==" value="==" /><el-option label="!=" value="!=" />
          <el-option label=">" value=">" /><el-option label="<" value="<" />
          <el-option label="包含" value="contains" />
        </el-select>
        <el-input v-model="modelValue.parameters.rightValue" placeholder="值" size="small" style="width: 130px" />
      </div>
      <div class="header-controls">
        <el-icon class="drag-handle"><Rank /></el-icon>
        <el-button type="danger" link :icon="Delete" @click="$emit('remove')" />
      </div>
    </div>

    <div class="logic-body">
      <div class="branch-label then-label">满足条件时 (THEN)</div>
      <draggable
          v-model="modelValue.thenActions"
          group="actions"
          item-key="id"
          handle=".drag-handle"
          class="nested-drag-area"
          ghost-class="ghost"
      >
        <template #item="{ element, index }">
          <ActionRow
              :model-value="element"
              :mode="mode"
              :depth="depth + 1"
              @update:model-value="updateThenAction(index, $event)"
              @remove="removeThenAction(index)"
          />
        </template>
      </draggable>
      <div v-if="!modelValue.thenActions?.length" class="empty-placeholder">可拖入动作</div>
    </div>

    <div class="logic-footer">
      <div v-if="showElse" class="else-container">
        <div class="branch-divider">
          <span class="branch-label else-label">否则执行 (ELSE)</span>
          <el-button link type="info" size="small" @click="clearElse">移除 ELSE</el-button>
        </div>
        <draggable
            v-model="modelValue.elseActions"
            group="actions"
            item-key="id"
            handle=".drag-handle"
            class="nested-drag-area"
            ghost-class="ghost"
        >
          <template #item="{ element, index }">
            <ActionRow
                :model-value="element"
                :mode="mode"
                :depth="depth + 1"
                @update:model-value="updateElseAction(index, $event)"
                @remove="removeElseAction(index)"
            />
          </template>
        </draggable>
      </div>
      <div v-else class="add-else-btn" @click="addElse">
        <el-icon><Plus /></el-icon> 添加 ELSE 分支
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import draggable from "vuedraggable";
import { Delete, Plus, Rank } from "@element-plus/icons-vue";
import ActionRow from "./ActionRow.vue";

const props = defineProps<{
  modelValue: any;
  mode: "editor" | "standalone";
  depth: number;
}>();

const emit = defineEmits(["update:modelValue", "remove"]);

const showElse = ref(props.modelValue.elseActions?.length > 0);
const addElse = () => {
  if (!props.modelValue.elseActions) props.modelValue.elseActions = [];
  showElse.value = true;
};
const clearElse = () => {
  props.modelValue.elseActions = [];
  showElse.value = false;
};

const updateThenAction = (idx: number, val: any) => { props.modelValue.thenActions[idx] = val; };
const removeThenAction = (idx: number) => { props.modelValue.thenActions.splice(idx, 1); };
const updateElseAction = (idx: number, val: any) => { props.modelValue.elseActions[idx] = val; };
const removeElseAction = (idx: number) => { props.modelValue.elseActions.splice(idx, 1); };
</script>

<style scoped>
.logic-block { border: 1px solid #e6a23c; border-radius: 6px; margin: 4px 0; overflow: hidden; background: #fff; }
.logic-header { display: flex; align-items: center; gap: 10px; padding: 6px 12px; background-color: #fdf6ec; border-bottom: 1px solid #faecd8; }
.condition-row { display: flex; gap: 6px; align-items: center; flex-grow: 1; }
.nested-drag-area { min-height: 32px; padding: 4px; background-color: #fafafa; }
.branch-label { font-size: 11px; font-weight: bold; padding: 4px 8px; color: #909399; background: #f5f7fa; }
.empty-placeholder { text-align: center; font-size: 11px; color: #bbb; padding: 8px; border: 1px dashed #eee; margin: 4px; }
.add-else-btn { font-size: 12px; color: #e6a23c; cursor: pointer; padding: 6px; text-align: center; background: #fdf6ec; border-top: 1px solid #faecd8; }
.branch-divider { display: flex; justify-content: space-between; align-items: center; background: #f5f7fa; border-top: 1px solid #eee; }
.drag-handle { cursor: grab; color: #c0c4cc; }
</style>