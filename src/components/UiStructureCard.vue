<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>UI 结构</span>
        <div class="header-filter-group" style="display: flex; align-items: center; gap: 10px; margin-left: 20px; flex: 1;">
          <div class="spatial-grid">
            <div
                v-for="i in 9"
                :key="i"
                :class="['grid-cell', { active: spatialRegion === i }]"
                @click="spatialRegion = (spatialRegion === i ? null : i)"
            ></div>
          </div>
          <span style="font-size: 12px; color: #909399;">{{ spatialRegion ? '区域 ' + spatialRegion : '全屏' }}</span>
          <el-divider direction="vertical" />
          <el-checkbox v-model="filterClickable" size="small">仅可点击</el-checkbox>
          <el-checkbox v-model="filterHasText" size="small">仅有内容</el-checkbox>
        </div>
        <div class="header-actions">
          <el-tooltip :content="isRawMode ? '当前：原生数据（含屏幕外节点，未纠偏）' : '当前：引擎同源数据（已纠偏并过滤不可见项）'">
            <el-switch
                v-model="isRawMode"
                active-text="原始"
                inactive-text="同源"
                inline-prompt
                style="margin-right: 15px"
            />
          </el-tooltip>
          <el-switch v-model="isAllExpanded" inline-prompt active-text="全部展开" inactive-text="折叠" style="margin-right: 15px" />
          <el-button :icon="CopyDocument" @click="handleCopyStructure" :disabled="!structure" plain>复制</el-button>
          <el-button
              type="success"
              :icon="Search"
              @click="$emit('fetchUiStructure', !!isRawMode)"
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
      <!-- 使用过滤后的数据 filteredStructure -->
      <UiTreeNode v-if="filteredStructure" :node="filteredStructure" :root-package-name="filteredStructure.packageName" :is-expanded-override="isAllExpanded" />
      <el-empty v-else description="暂无符合筛选条件的UI节点" :image-size="80" />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Search, CopyDocument } from "@element-plus/icons-vue";
import { ref, computed } from "vue";
import UiTreeNode from "./UiTreeNode.vue";
import type { UiNode } from "@/types/api/device";
import { ElMessage } from "element-plus";
import { copyToClipboard } from "@/utils/clipboard";

const props = defineProps<{
  structure: UiNode | null;
  isLoading: boolean;
  isConnected: boolean;
}>();

defineEmits(["fetchUiStructure"]);

// --- 声明筛选状态 ---
const spatialRegion = ref<number | null>(null);
const filterClickable = ref(false);
const filterHasText = ref(false);
const isAllExpanded = ref<boolean>(false);
const isRawMode = ref<boolean>(false);

// 3. 过滤算法
const checkSpatial = (bounds: [number, number, number, number] | undefined) => {
  if (!spatialRegion.value || !bounds) return true;
  const rootBounds = props.structure?.boundsInScreen;
  if (!rootBounds) return true;
  const screenW = rootBounds[2];
  const screenH = rootBounds[3];
  const centerX = (bounds[0] + bounds[2]) / 2;
  const centerY = (bounds[1] + bounds[3]) / 2;
  const xIdx = Math.floor((centerX / screenW) * 3);
  const yIdx = Math.floor((centerY / screenH) * 3);
  return (yIdx * 3 + xIdx + 1) === spatialRegion.value;
};

const getFilteredTree = (node: UiNode): UiNode | null => {
  const filteredChildren = node.children
      ? node.children.map(child => getFilteredTree(child)).filter(c => c !== null) as UiNode[]
      : [];
  const matchesFeature = (!filterClickable.value || node.isClickable) &&
      (!filterHasText.value || (node.text || node.contentDescription));
  const matchesSpatial = checkSpatial(node.boundsInScreen);
  if ((matchesFeature && matchesSpatial) || filteredChildren.length > 0) {
    return { ...node, children: filteredChildren };
  }
  return null;
};

const filteredStructure = computed(() => {
  if (!props.structure) return null;
  if (!spatialRegion.value && !filterClickable.value && !filterHasText.value) return props.structure;
  return getFilteredTree(props.structure);
});

const fullText = computed(() => {
  // 修改这里：从 props.structure 改为 filteredStructure.value
  if (!filteredStructure.value) return "";
  const lines: string[] = [];

  const traverse = (node: UiNode) => {
    if (node.text) lines.push(node.text);
    else if (node.contentDescription) lines.push(node.contentDescription);

    if (node.children) {
      node.children.forEach(traverse);
    }
  };

  traverse(filteredStructure.value); // 使用过滤后的树进行遍历
  return lines.join("  ");
});

const handleCopyStructure = async () => {
  if (!props.structure) return;
  const jsonString = JSON.stringify(props.structure, null, 2);
  if (await copyToClipboard(jsonString)) ElMessage.success("复制成功");
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

/* 九宫格容器布局 */
.header-filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 20px;
  flex: 1;
}

/* 九宫格方块容器 */
.spatial-grid {
  display: grid;
  grid-template-columns: repeat(3, 10px); /* 3列，每列10px */
  grid-template-rows: repeat(3, 10px);    /* 3行，每行10px */
  gap: 2px;
  padding: 3px;
  background: #ebeef5;
  border-radius: 4px;
  cursor: pointer;
  line-height: 0; /* 防止行高撑开方块 */
}

/* 每个小格子 */
.grid-cell {
  background: #fff;
  border-radius: 1px;
  width: 10px;
  height: 10px;
}

/* 激活状态（选中后变蓝） */
.grid-cell.active {
  background: #409eff !important;
}

/* 鼠标悬停效果 */
.grid-cell:hover {
  background: #dcdfe6;
}

.filter-label {
  font-size: 12px;
  color: #909399;
  min-width: 30px;
}
</style>