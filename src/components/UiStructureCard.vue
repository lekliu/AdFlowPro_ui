<template>
  <el-card class="ui-structure-card-root">
    <template #header>
      <div class="card-header">
        <span>UI 结构</span>
        <div class="header-filter-group" style="display: flex; align-items: center; gap: 10px; margin-left: 20px; flex: 1;">
          <!-- [新增] 全文显示切换开关 -->
          <el-button
              size="small"
              :type="showFullText ? 'primary' : ''"
              :icon="Document"
              @click="showFullText = !showFullText"
          >全文</el-button>

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

    <!-- 核心布局：左右分屏容器 -->
    <div class="split-container">
      <!-- 左侧：UI 树 -->
      <div class="tree-panel custom-scrollbar" v-loading="isLoading">
        <UiTreeNode v-if="filteredStructure" :node="filteredStructure" :root-package-name="filteredStructure.packageName" :is-expanded-override="isAllExpanded" />
        <el-empty v-else description="暂无符合筛选条件的UI节点" :image-size="80" />
      </div>

      <!-- 右侧：全文预览 (受 showFullText 控制显示隐藏) -->
      <transition name="slide">
        <div v-if="showFullText" class="full-text-panel">
          <div class="panel-header">
            <div class="header-label-group">
              <strong>预览:</strong>
              <div class="content-toggle-group">
                <el-tooltip content="文本 (Text)" placement="top">
                  <div :class="['toggle-item', { active: contentFilter.text }]" @click="contentFilter.text = !contentFilter.text">T</div>
                </el-tooltip>
                <el-tooltip content="描述 (Description)" placement="top">
                  <div :class="['toggle-item', { active: contentFilter.desc }]" @click="contentFilter.desc = !contentFilter.desc">D</div>
                </el-tooltip>
                <el-tooltip content="资源ID (ID)" placement="top">
                  <div :class="['toggle-item', { active: contentFilter.id }]" @click="contentFilter.id = !contentFilter.id">I</div>
                </el-tooltip>
              </div>
            </div>
            <el-button link type="primary" :icon="CopyDocument" @click="handleCopyText(fullText)">复制全文</el-button>
          </div>
          <pre class="full-text-content custom-scrollbar"><code>{{ fullText }}</code></pre>
        </div>
      </transition>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Search, CopyDocument, Document } from "@element-plus/icons-vue";
import { ref, computed, reactive } from "vue";
import UiTreeNode from "./UiTreeNode.vue";
import type { UiNode } from "@/types/api/device";
import { ElMessage } from "element-plus";
import { copyToClipboard } from "@/utils/clipboard";

const showFullText = ref(true); // 控制全文预览面板显示

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

// 内容过滤状态 (T: Text, D: Desc, I: ID)
const contentFilter = reactive({
  text: true,
  desc: true,
  id: true
});

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

const handleCopyText = async (text: string) => {
  if (!text) return;
  if (await copyToClipboard(text)) {
    ElMessage.success({ message: "文本已成功复制", duration: 1500 });
  }
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
    // 1. 文本 (Text)
    if (contentFilter.text && node.text && node.text.trim()) lines.push(node.text);

    // 2. 描述 (Description)
    if (contentFilter.desc && node.contentDescription && node.contentDescription.trim()) lines.push(node.contentDescription);

    // 3. ID 短名称
    if (contentFilter.id && node.viewIdResourceName) {
      const shortId = node.viewIdResourceName.split("/").pop();
      if (shortId) lines.push(shortId);
    }

    if (node.children) {
      node.children.forEach(traverse);
    }
  };

  traverse(filteredStructure.value); // 使用过滤后的树进行遍历
  return lines.join("\n");
});

const handleCopyStructure = async () => {
  if (!props.structure) return;
  const jsonString = JSON.stringify(props.structure, null, 2);
  if (await copyToClipboard(jsonString)) ElMessage.success("复制成功");
};
</script>

<style scoped>
/* 1. 根容器自适应布局：占满视口高度减去页眉高度 */
.ui-structure-card-root {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  border: 1px solid #ebeef5;
  overflow: hidden !important;
  margin-bottom: 0 !important;
}

/* 穿透修改 Element 内部样式，让 body 区域撑开并取消内边距 */
:deep(.el-card__body) {
  padding: 0 !important;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden !important;
}

/* 容器布局 */
.split-container {
  display: flex;
  flex: 1;
  min-height: 0;
  border-top: 1px solid #ebeef5;
  overflow: hidden !important;
}

/* 左侧 UI 树面板 */
.tree-panel {
  flex: 1; /* 自动撑满剩余空间 */
  min-width: 0;
  padding: 15px;
  overflow: auto;
  font-family: "Fira Code", "Courier New", monospace;
  font-size: 13px;
  background-color: #ffffff;
  display: block;
}

/* 右侧全文预览面板 */
.full-text-panel {
  width: 300px;
  border-left: 1px solid #dcdfe6;
  background-color: #f8f9fa;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 8px 12px;
  background-color: #f0f2f5;
  border-bottom: 1px solid #dcdfe6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #606266;
}

.header-label-group {
  display: flex;
  align-items: center;
}

.content-toggle-group {
  display: flex;
  gap: 2px;
  background: #ebeef5;
  padding: 2px;
  border-radius: 4px;
  margin-left: 8px;
}

.toggle-item {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
  background: #fff;
  color: #909399;
  border-radius: 2px;
  transition: all 0.2s;
}

.toggle-item:hover {
  color: #409eff;
}

.toggle-item.active {
  background: #409eff;
  color: #fff;
}

.full-text-content {
  margin: 0;
  padding: 14px;
  overflow: auto;
  flex: 1;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #303133;
  white-space: pre-wrap; /* 保证换行符生效并自动折行 */
  word-break: break-all;
}

.full-text-content code {
  background-color: transparent !important;
  padding: 0 !important;
  border: none !important;
  color: inherit;
}

/* 面板滑入滑出动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-enter-from,
.slide-leave-to {
  width: 0;
  opacity: 0;
  border-left-width: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-actions {
  display: flex;
  align-items: center;
}

/* 商业级滚动条美化 - 加粗版 */
.custom-scrollbar::-webkit-scrollbar {
  width: 10px;  /* 纵向滚动条宽度从 6px 增加到 10px */
  height: 10px; /* 横向滚动条高度从 6px 增加到 10px */
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #dcdfe6; /* 稍微深一点的颜色，增强可见度 */
  border-radius: 10px;
  border: 2px solid transparent; /* 技巧：通过透明边框增加“槽感”，让滚动条看起来精致 */
  background-clip: padding-box;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc; /* 悬停时加深颜色 */
}

/* 核心修复：彻底去除图中那种文字碎块的灰色背景 */
.preview-content code {
  background-color: transparent !important; /* 去除背景 */
  padding: 0 !important;                   /* 去除内边距 */
  border: none !important;                 /* 去除边框 */
  color: inherit;                          /* 继承父级文字颜色 */
}

.preview-title {
  font-size: 11px;
  font-weight: bold;
  color: #909399;
  text-transform: uppercase;
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