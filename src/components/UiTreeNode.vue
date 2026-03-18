<template>
  <div class="ui-tree-node">
    <div class="node-content" :style="{ 'padding-left': `${node.depth * 20}px` }">
      <span v-if="hasChildren" class="toggle-icon" @click="isExpanded = !isExpanded">
        <el-icon><CaretRight :class="{ 'is-expanded': isExpanded }" /></el-icon>
      </span>
      <span v-else class="toggle-icon-placeholder"></span>

      <div class="node-info-wrapper">
        <div class="node-main-info">
          <!-- [新增] 如果是根节点且包含来源标记，显式展示 -->
          <el-tag v-if="node._source" size="small" type="danger" effect="dark" style="margin-right: 10px">
            {{ node._source === 'SYSTEM_RAW' ? '原始树' : '同源树' }}
          </el-tag>
          <span class="node-class">{{ getSimpleClassName(node.className) }}</span>
          <span v-if="node.contentDescription" class="node-desc" :title="node.contentDescription"
          >#{{ node.contentDescription }}</span
          >
          <span v-if="node.text" class="node-text" :title="node.text">"{{ node.text }}"</span>
          <el-tag v-if="node.viewIdResourceName" class="node-id" type="info" size="small" effect="plain">{{
              node.viewIdResourceName.split("/")[1]
            }}</el-tag>

          <!-- Display properties in a compact, single-line format -->
          <template v-if="Object.keys(displayProperties).length > 0">
            <el-tag 
              v-if="displayProperties.boundsInScreen" 
              class="prop-tag" 
              :type="isSmallElement ? 'primary' : 'warning'"
              size="small" 
              effect="plain"
            >
              {{ formatPropertyValue(displayProperties.boundsInScreen) }}
              <el-button
                  link
                  type="primary"
                  :icon="CopyDocument"
                  style="margin-left: 4px; padding: 0; height: auto;"
                  @click.stop="handleCopyBounds"
              />
            </el-tag>
            <el-tag v-for="flag in booleanFlags" :key="flag" class="prop-tag" type="success" size="small" effect="plain">
              {{ flag }}
            </el-tag>
            <el-tag v-if="otherPropsString" class="prop-tag" type="info" size="small" effect="plain" :title="otherPropsString">
              {{ otherPropsString }}
            </el-tag>
          </template>
        </div>
      </div>
    </div>
    <div v-if="hasChildren && isExpanded" class="node-children">
      <UiTreeNode
          v-for="(child, index) in node.children"
          :key="generateNodeKey(child, index)"
          :node="child"
          :parent-area="currentArea"
          :root-package-name="rootPackageName"
          :is-expanded-override="isExpandedOverride"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { CaretRight, CopyDocument } from "@element-plus/icons-vue";
import type { UiNode } from "@/types/api/device";
import { copyToClipboard } from "@/utils/clipboard";

const props = defineProps<{
  node: UiNode;
  rootPackageName?: string;
  parentArea?: number; // Receive parent area from parent component
  isExpandedOverride: boolean | null;
}>();

const handleCopyBounds = async () => {
  const bounds = props.node.boundsInScreen;
  if (!bounds) return;
  const className = props.node.className?.split('.').pop() || "View";
  const textToCopy = `${className} [${bounds.join(', ')}]`;
  if (await copyToClipboard(textToCopy)) ElMessage.success({ message: '坐标已复制', duration: 1000 });
};

// --- State ---
const isExpanded = ref(props.isExpandedOverride ?? props.node.depth < 5);

// --- Watcher for global expand/collapse ---
watch(
    () => props.isExpandedOverride,
    (newValue) => {
      if (newValue !== null) {
        isExpanded.value = newValue;
      }
    }
);

// --- Computed ---
const hasChildren = computed(() => props.node.children && props.node.children.length > 0);

const displayProperties = computed(() => {
  const { depth, children, className, text, viewIdResourceName, contentDescription, ...rest } = props.node;
  const filtered: Record<string, any> = {};
  for (const [key, value] of Object.entries(rest)) {
    // Only show properties that have a meaningful value
    if (value !== null && value !== false && value !== "" && !(Array.isArray(value) && (value as any[]).length === 0)) {
      filtered[key] = value;
    }
  }
  return filtered;
});

const booleanFlags = computed(() => {
  return Object.entries(displayProperties.value)
      .filter(([, value]) => typeof value === "boolean" && value === true)
      .map(([key]) => key.replace(/^is/, "").toLowerCase()); // 'isClickable' -> 'clickable'
});

const otherPropsString = computed(() => {
  return Object.entries(displayProperties.value)
      .filter(([key, value]) => typeof value !== "boolean" && key !== "boundsInScreen")
      .filter(([key, value]) => key !== "packageName" || value !== props.rootPackageName)
      .map(([key, value]) => `${key}: ${formatPropertyValue(value)}`)
      .join(", ");
});

// --- Area Calculation Helpers ---
const calculateArea = (bounds?: number[]) => {
  if (!bounds || bounds.length !== 4) return 0;
  const width = bounds[2] - bounds[0];
  const height = bounds[3] - bounds[1];
  return width * height;
};

const currentArea = computed(() => calculateArea(props.node.boundsInScreen));

const isSmallElement = computed(() => {
  // If no parent area (root node), or no bounds, it's not "small"
  if (!props.parentArea || !props.node.boundsInScreen) return false;
  
  const area = currentArea.value;
  if (area <= 0) return false;

  // Threshold: 1/4 of parent area
  return area < (props.parentArea / 4);
});

// --- Methods ---
const getSimpleClassName = (className?: string) => {
  if (!className) return "Unknown";
  return className.split(".").pop();
};

const formatPropertyValue = (value: any) => {
  if (Array.isArray(value)) {
    return `[${value.join(", ")}]`;
  }
  return String(value);
};

const generateNodeKey = (node: UiNode, index: number): string => {
  // Create a more stable and unique key for each node in the v-for loop
  const bounds = node.boundsInScreen ? node.boundsInScreen.join("") : "";
  return `${node.depth}-${index}-${node.className}-${bounds}`;
};
</script>

<style scoped>
.ui-tree-node {
  line-height: 1.6;
  white-space: nowrap; /* 核心：禁止文字和标签换行，强制产生横向长度 */
  width: max-content;  /* 核心：容器宽度随内容自适应，触发父级滚动条 */
  min-width: 100%;     /* 保证背景色能铺满整行 */
}

.node-content {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: default;
  border-radius: 3px;
  padding: 3px 4px;
  transition: background-color 0.2s;
}

.node-content:hover {
  background-color: #f0f2f5;
}

.toggle-icon {
  cursor: pointer;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toggle-icon .el-icon {
  transition: transform 0.2s ease-in-out;
}

.toggle-icon .el-icon.is-expanded {
  transform: rotate(90deg);
}

.toggle-icon-placeholder {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.node-info-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px; /* Space between main info and properties */
  min-width: 0; /* Important flexbox fix for overflow */
}

.node-main-info {
  display: flex;
  flex-wrap: nowrap; /* Keep it on one line */
  align-items: center;
  gap: 8px;
  overflow: hidden; /* Prevent long lines from breaking layout */
}

.node-class {
  color: #303133;
  font-weight: 500;
  flex-shrink: 0; /* Prevent class name from shrinking */
}

.node-text {
  color: #c0392b;
  font-style: italic;
  flex-shrink: 0;
}

.node-desc {
  color: #8e44ad; /* A purplish color for contentDescription */
  background-color: #f5eef8;
  border: 1px solid #e8daef;
  padding: 0 4px;
  border-radius: 3px;
  font-size: 12px;
}

.node-id {
  flex-shrink: 0;
}

.prop-tag {
  flex-shrink: 0;
}

.node-children {
  /* No styles needed, structure is handled by child nodes */
}
</style>