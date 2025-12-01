<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>UI 结构</span>
        <div class="header-actions">
          <el-switch v-model="isAllExpanded" inline-prompt active-text="全部展开" inactive-text="折叠" style="margin-right: 15px" />
          <el-button :icon="CopyDocument" @click="handleCopyStructure" :disabled="!structure" plain>复制</el-button>
          <el-button
              type="success"
              :icon="Search"
              @click="$emit('fetchUiStructure')"
              :loading="isLoading"
              :disabled="!isConnected"
          >
            {{ isLoading ? "获取中..." : "获取UI结构" }}
          </el-button>
        </div>
      </div>
    </template>

    <div v-if="fullText" class="full-text-preview">
      <strong>Full Text Preview:</strong>
      <pre>{{ fullText }}</pre>
    </div>
    <div class="ui-structure-container" v-loading="isLoading">
      <UiTreeNode v-if="structure" :node="structure" :root-package-name="structure.packageName" :is-expanded-override="isAllExpanded" />
      <el-empty v-else description="暂无UI结构, 请点击按钮获取" :image-size="80" />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Search, CopyDocument } from "@element-plus/icons-vue";
import { ref, computed } from "vue";
import UiTreeNode from "./UiTreeNode.vue";
import type { UiNode } from "@/types/api/device";
import { ElMessage } from "element-plus";

const props = defineProps<{
  structure: UiNode | null;
  isLoading: boolean;
  isConnected: boolean;
}>();

defineEmits(["fetchUiStructure"]);

const isAllExpanded = ref<boolean | null>(null);

const fullText = computed(() => {
  if (!props.structure) return "";
  const lines: string[] = [];
  
  const traverse = (node: UiNode) => {
    if (node.text) lines.push(node.text);
    else if (node.contentDescription) lines.push(node.contentDescription);
    
    if (node.children) {
      node.children.forEach(traverse);
    }
  };
  
  traverse(props.structure);
  return lines.join("  ");
});

const handleCopyStructure = async () => {
  if (!props.structure) {
    ElMessage.warning("没有可复制的UI结构数据。");
    return;
  }
  try {
    const jsonString = JSON.stringify(props.structure, null, 2);
    await navigator.clipboard.writeText(jsonString);
    ElMessage.success("UI结构已成功复制到剪贴板！");
  } catch (err) {
    console.error("Failed to copy UI structure:", err);
    ElMessage.error("复制失败，您的浏览器可能不支持或未授权剪贴板访问。");
  }
};
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-actions {
  display: flex;
  align-items: center;
}
.ui-structure-container {
  background-color: #f8f9fa;
  color: #303133;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  overflow-x: auto;
  font-family: "Fira Code", "Courier New", monospace;
  font-size: 13px;
  position: relative; /* Fix for overflow issue in flex context */
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.full-text-preview {
  margin-bottom: 10px;
  padding: 15px;
  background-color: #f0f2f5;
  border-radius: 14px;
  font-size: 14px;
  color: #606266;
  white-space: normal;
  word-break: break-all;
}

.full-text-preview pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0px;
}
</style>