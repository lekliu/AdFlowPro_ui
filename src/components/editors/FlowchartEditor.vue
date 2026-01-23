<template>
  <div ref="dndPanel" class="dnd-panel"></div>
  <div class="flowchart-editor-wrapper" ref="editorWrapperRef">
    <div class="canvas-wrapper">
      <div ref="container" class="flowchart-container"></div>
      <el-tooltip content="切换全屏" placement="bottom">
        <el-button :icon="FullScreen" circle class="fullscreen-btn" @click="toggleFullscreen" />
      </el-tooltip>
    </div>
    <div class="properties-container">
      <PropertiesPanel
          :active-element="activeElement"
          :lf-instance="lf"
          :atom-pool="atomStore.atoms"
          :package-pool="packageStore.packages"
          :global-atom-ids="globalAtomIds"
          :global-package-ids="globalPackageIds"
          @update:global-atom-ids="handleGlobalAtomsChange"
          @update:global-package-ids="handleGlobalPackagesChange"
          @properties-change="handlePropertiesChange"
          @edit-atom="handleEditAtom"
          @refresh-data="handleRefreshData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, defineExpose } from "vue";
import LogicFlow, { type BaseNodeModel, type BaseEdgeModel } from "@logicflow/core";
import type GraphData from "@logicflow/core";

import "@logicflow/core/lib/style/index.css";
import "@logicflow/extension/lib/style/index.css";

import { FullScreen } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox, ElLoading } from "element-plus";

import StartNode from "./flowchart/StartNode";
import StateNode from "./flowchart/StateNode";
import EndNode from "./flowchart/EndNode";
import LogicNode from "./flowchart/LogicNode";
import SubflowNode from "./flowchart/SubflowNode";
import PropertiesPanel from "./flowchart/PropertiesPanel.vue";
import { useAtomStore } from "@/stores/atomStore";
import { usePackageStore } from "@/stores/packageStore";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { useRouter } from "vue-router";
import { v4 as uuidv4 } from "uuid";

const props = defineProps<{
  graphData: (GraphData & { globalAtomIds?: number[], globalPackageIds?: number[] }) | null;
}>();

const atomStore = useAtomStore();
const packageStore = usePackageStore();
const categoryStore = useAtomCategoryStore();
const router = useRouter();

const container = ref<HTMLElement | null>(null);
const dndPanel = ref<HTMLElement | null>(null);
let lf: LogicFlow | null = null;
let resizeObserver: ResizeObserver | null = null;

type ActiveElement = BaseNodeModel | BaseEdgeModel | null;
const activeElement = ref<ActiveElement>(null);

// --- 全局状态定义 ---
const globalAtomIds = ref<number[]>([]);
const globalPackageIds = ref<number[]>([]);

const editorWrapperRef = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);

const toggleFullscreen = () => {
  if (!editorWrapperRef.value) return;
  if (!document.fullscreenElement) {
    editorWrapperRef.value.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

const generateSequentialId = (type: string) => {
  if (!lf) return uuidv4();
  const prefixMap: Record<string, string> = {
    'StartNode': 'start',
    'StateNode': 'state',
    'EndNode': 'end'
  };
  const prefix = prefixMap[type] || 'node';
  const nodes = lf.getGraphRawData().nodes;
  let maxIndex = 0;
  const regex = new RegExp(`^${prefix}_(\\d+)$`);
  nodes.forEach((node: any) => {
    const match = node.id.match(regex);
    if (match) {
      const num = parseInt(match[1]);
      if (num > maxIndex) maxIndex = num;
    }
  });
  return `${prefix}_${maxIndex + 1}`;
};

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

onMounted(async () => {
  atomStore.fetchAtoms({ skip: 0, limit: 2000 });
  packageStore.fetchPackages({ skip: 0, limit: 2000 });
  categoryStore.fetchAllCategories();

  let DndPanel: any, SelectionSelect: any, Snapshot: any, Menu: any, Control: any;

  try {
    const globalDefine = (window as any).define;
    let storedAmd: any = undefined;
    if (globalDefine && globalDefine.amd) {
      storedAmd = globalDefine.amd;
      globalDefine.amd = false;
    }

    const extensionModule = await import("@logicflow/extension");
    DndPanel = extensionModule.DndPanel;
    SelectionSelect = extensionModule.SelectionSelect;
    Snapshot = extensionModule.Snapshot;
    Menu = extensionModule.Menu;
    Control = extensionModule.Control;

    LogicFlow.use(DndPanel);
    LogicFlow.use(SelectionSelect);
    LogicFlow.use(Snapshot);
    LogicFlow.use(Menu);
    LogicFlow.use(Control);

    if (globalDefine && storedAmd) {
      globalDefine.amd = storedAmd;
    }
  } catch (e) {
    console.error("Failed to load LogicFlow extensions:", e);
  }

  if (container.value) {
    resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0 && !lf) {
        lf = new LogicFlow({
          container: container.value as HTMLElement,
          grid: true,
          background: { backgroundColor: "#f7f9ff" },
          keyboard: { enabled: true },
        });

        lf.register(StartNode);
        lf.register(StateNode);
        lf.register(EndNode);
        lf.register(LogicNode);
        lf.register(SubflowNode);

        lf.setMenuConfig({
          nodeMenu: [
            { text: "编辑文本", callback: (node: any) => lf?.editText(node.id) },
            { text: "复制节点", callback: (node: any) => lf?.cloneNode(node.id) },
            { text: "删除节点", callback: (node: any) => handleConfirmAndDelete([node]) },
          ],
          edgeMenu: [
            { text: "编辑文本", callback: (edge: any) => lf?.editText(edge.id) },
            { text: "删除连接", callback: (edge: any) => handleConfirmAndDelete([edge]) },
          ],
          graphMenu: [],
        });

        if (dndPanel.value && lf.extension.dndPanel) {
          (lf.extension.dndPanel as any).setPatternItems([
            { type: "StartNode", label: "开始节点", className: "dnd-node-item start-node", icon: '/icons/start.png' },
            { type: "StateNode", label: "状态节点", className: "dnd-node-item state-node", icon: '/icons/rect.png' },
            { type: "EndNode", label: "结束节点", className: "dnd-node-item end-node", icon: '/icons/end.png' },
            { type: "LogicNode", label: "逻辑分支", className: "dnd-node-item logic-node", icon: '/icons/diamond.png' },
            { type: "SubflowNode", label: "子流程图", className: "dnd-node-item subflow-node", icon: '/icons/subflow.png' },
          ]);
        }

        lf.on("node:dnd-add", ({ data }) => {
          const { type, x, y, text, properties } = data;
          const newId = generateSequentialId(type);
          lf?.deleteNode(data.id);
          lf?.addNode({
            id: newId, type, x, y,
            text: typeof text === 'object' ? text.value : text,
            properties
          });
        });

        lf.on("node:delete", ({ data }) => { handleConfirmAndDelete([data]); return false; });
        lf.on("edge:delete", ({ data }) => { handleConfirmAndDelete([data]); return false; });
        lf.on("element:click", ({ data }) => {
          const model = lf?.getModelById(data.id);
          activeElement.value = model && (model.BaseType === "node" || model.BaseType === "edge") ? (model as ActiveElement) : null;
        });
        lf.on("blank:click", () => { activeElement.value = null; });

        if (props.graphData) {
          lf.render(props.graphData as any);
        } else {
          lf.render({ nodes: [], edges: [] });
        }
      }
      if (lf) lf.resize();
    });
    resizeObserver.observe(container.value);
  }
  document.addEventListener("fullscreenchange", handleFullscreenChange);
});

onUnmounted(() => {
  document.removeEventListener("fullscreenchange", handleFullscreenChange);
  if (resizeObserver && container.value) {
    resizeObserver.unobserve(container.value);
    resizeObserver.disconnect();
  }
  if (lf) {
    lf.destroy();
    lf = null;
  }
});

// --- 状态监听修复 ---
watch(
    () => props.graphData,
    (newData) => {
      // 核心修复：正确初始化全局 ID 数组，防止 Prop 校验报错
      globalAtomIds.value = Array.isArray(newData?.globalAtomIds) ? newData.globalAtomIds : [];
      globalPackageIds.value = Array.isArray(newData?.globalPackageIds) ? newData.globalPackageIds : [];

      if (lf) {
        if (newData && newData.nodes && newData.nodes.length > 0) {
          lf.render(newData as any);
          activeElement.value = null;
        } else {
          lf.clearData();
        }
      }
    },
    { deep: true, immediate: true }
);

const handleRefreshData = async () => {
  const loading = ElLoading.service({
    target: '.properties-container',
    text: '正在更新数据...',
    background: 'rgba(255, 255, 255, 0.7)',
  });
  try {
    await Promise.all([
      atomStore.fetchAtoms({ skip: 0, limit: 2000 }),
      packageStore.fetchPackages({ skip: 0, limit: 2000 }),
      categoryStore.fetchAllCategories()
    ]);
    ElMessage.success("触发器数据已刷新");
  } catch (error) {
    ElMessage.error("刷新失败");
  } finally {
    loading.close();
  }
};

const handlePropertiesChange = (id: string, newProps: any) => {
  const element = lf?.getModelById(id);
  if (element) {
    if (newProps.text !== undefined) element.updateText(newProps.text);
    element.setProperties(newProps);
  }
};

// --- 事件回调补全 ---
const handleGlobalAtomsChange = (newIds: number[]) => {
  globalAtomIds.value = newIds;
};

const handleGlobalPackagesChange = (newIds: number[]) => {
  globalPackageIds.value = newIds;
};

const handleEditAtom = (atomId: number) => {
  router.push({ name: "AtomEditor", params: { atomId } });
};

const handleConfirmAndDelete = (elements: any[]) => {
  if (!lf || !elements || elements.length === 0) return;
  const elementToDelete = elements[0];
  const model = lf.getModelById(elementToDelete.id);
  if (!model) return;

  if (model.type === 'StartNode') {
    const totalStartNodes = lf.graphModel.nodes.filter((n: any) => n.type === 'StartNode').length;
    if (totalStartNodes <= 1) {
      ElMessage.error("操作失败：必须至少保留一个“开始节点”。");
      return;
    }
  }

  ElMessageBox.confirm(`确定要删除 ${model.BaseType === "node" ? "节点" : "边"} "${(typeof model.text === "object" ? model.text?.value : model.text) || ""}" 吗？`, "确认删除", {
    confirmButtonText: "删除",
    cancelButtonText: "取消",
    type: "warning",
    appendTo: editorWrapperRef.value!,
  }).then(() => {
    if (model.BaseType === "node") lf?.deleteNode(model.id);
    else if (model.BaseType === "edge") lf?.deleteEdge(model.id);
    activeElement.value = null;
    ElMessage.success("删除成功");
  }).catch(() => {});
};

// --- 数据导出修复 ---
const getData = (): (any & { globalAtomIds?: number[], globalPackageIds?: number[] }) | null => {
  if (!lf) return null;
  const graphData = lf.getGraphRawData();
  // 核心修复：导出数据时必须包含 globalPackageIds，否则保存后会消失
  return {
    ...graphData,
    globalAtomIds: globalAtomIds.value,
    globalPackageIds: globalPackageIds.value
  } as any;
};

const getGraphModel = () => (lf ? lf.graphModel : null);

defineExpose({ getData, getGraphModel });
</script>

<style scoped>
.flowchart-editor-wrapper {
  display: flex;
  width: 100%;
  height: 600px;
  border: 1px solid var(--el-border-color);
  background-color: #f7f9ff;
  position: relative;
}
.dnd-panel {
  border-right: 1px solid var(--el-border-color);
  background-color: #fafafa;
  flex-shrink: 0;
  width: 100px;
}
.canvas-wrapper {
  flex-grow: 1;
  height: 100%;
  position: relative;
  min-width: 0;
}
.flowchart-container {
  width: 100%;
  height: 100%;
}
.properties-container {
  width: 280px;
  border-left: 1px solid var(--el-border-color);
  background-color: #fafafa;
  flex-shrink: 0;
}
.flowchart-editor-wrapper:fullscreen .properties-container {
  width: 300px;
  flex-shrink: 0;
}
.fullscreen-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
}
:deep(.dnd-node-item) {
  width: 100%;
  height: 48px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 5px;
  text-align: center;
  border-width: 2px;
  border-style: solid;
  border-radius: 4px;
  cursor: grab;
  font-weight: bold;
  font-size: 14px;
  box-sizing: border-box;
}
:deep(.start-node) { background-color: #f0f9eb; border-color: #67c23a; color: #529b2e; }
:deep(.state-node) { background-color: #e1f3ff; border-color: #84c1ff; color: #3375b9; }
:deep(.end-node) { background-color: #fef0f0; border-color: #f56c6c; color: #c45656; }
:deep(.logic-node) { background-color: #f9f0ff; border-color: #b37feb; color: #722ed1; }
:deep(.subflow-node) { background-color: #fff7e6; border-color: #ffa940; color: #d46b08; }
/* 1. 确保左侧拖拽项是横向排列（图标 + 文字） */
:deep(.lf-dnd-item) {
  display: flex !important;
  align-items: center !important;
  margin-bottom: 8px !important;
}
:deep(.lf-dnd-shape) {
  width: 20px !important;
  height: 20px !important;
  background-size: contain !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
  margin-right: 10px !important;
  flex-shrink: 0;
}

:deep(.lf-dnd-text) {
  position: static !important;
  transform: none !important;
  font-size: 13px !important;
  color: inherit !important;
}
</style>