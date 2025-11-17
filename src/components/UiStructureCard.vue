<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>UI 结构</span>
        <div class="header-actions">
          <el-switch v-model="isAllExpanded" inline-prompt active-text="全部展开" inactive-text="折叠" style="margin-right: 15px" />
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
    <!-- >>>>>>>>>> 修改这里的显示逻辑 <<<<<<<<<< -->
    <div class="ui-structure-container" v-loading="isLoading">
      <UiTreeNode v-if="structure" :node="structure" :root-package-name="structure.packageName" :is-expanded-override="isAllExpanded" />
      <el-empty v-else description="暂无UI结构, 请点击按钮获取" :image-size="80" />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Search } from "@element-plus/icons-vue";
import { ref } from "vue";
import UiTreeNode from "./UiTreeNode.vue";
import type { UiNode } from "@/types/api/device";

const props = defineProps<{
  structure: UiNode | null;
  isLoading: boolean;
  isConnected: boolean;
}>();

defineEmits(["fetchUiStructure"]);

const isAllExpanded = ref<boolean | null>(null);
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
}
</style>