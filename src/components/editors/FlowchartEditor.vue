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
          @update:global-atom-ids="handleGlobalAtomsChange"
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

// import { DndPanel, SelectionSelect, Snapshot, Menu, Control } from "@logicflow/extension";
import "@logicflow/core/lib/style/index.css";
import "@logicflow/extension/lib/style/index.css";

import { FullScreen, Delete } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox, ElLoading } from "element-plus";

import StartNode from "./flowchart/StartNode";
import StateNode from "./flowchart/StateNode";
import EndNode from "./flowchart/EndNode";
import LogicNode from "./flowchart/LogicNode";
import SubflowNode from "./flowchart/SubflowNode";
import PropertiesPanel from "./flowchart/PropertiesPanel.vue";
import { useAtomStore } from "@/stores/atomStore";
import { usePackageStore } from "@/stores/packageStore";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore"; // 新增引用
import { useRouter } from "vue-router";
import { v4 as uuidv4 } from "uuid";

// 全局静态注册插件
// LogicFlow.use(DndPanel);
// LogicFlow.use(SelectionSelect);
// LogicFlow.use(Snapshot);
// LogicFlow.use(Control);

const props = defineProps<{
  graphData: (GraphData & { globalAtomIds?: number[] }) | null;
}>();

const atomStore = useAtomStore();
const packageStore = usePackageStore();
const categoryStore = useAtomCategoryStore(); // 新增 Store
const router = useRouter();

const container = ref<HTMLElement | null>(null);
const dndPanel = ref<HTMLElement | null>(null);
let lf: LogicFlow | null = null;
let resizeObserver: ResizeObserver | null = null;

type ActiveElement = BaseNodeModel | BaseEdgeModel | null;
const activeElement = ref<ActiveElement>(null);
const globalAtomIds = ref<number[]>([]);

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

// [新增] ID 生成器辅助函数
const generateSequentialId = (type: string) => {
  if (!lf) return uuidv4();
  
  const prefixMap: Record<string, string> = {
    'StartNode': 'start',
    'StateNode': 'state',
    'EndNode': 'end'
  };
  const prefix = prefixMap[type] || 'node';
  
  // 获取当前画布所有节点
  const nodes = lf.getGraphRawData().nodes;
  let maxIndex = 0;
  // 正则匹配 prefix_数字 格式
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

// --- 3. 重写 onMounted ---
onMounted(async () => {
  atomStore.fetchAtoms({ skip: 0, limit: 2000 });
  packageStore.fetchPackages({ skip: 0, limit: 2000 });
  categoryStore.fetchAllCategories(); // 确保分类也加载

  // === 核心修复：动态加载 LogicFlow 扩展，并隔离 AMD 环境 ===
  let DndPanel: any, SelectionSelect: any, Snapshot: any, Menu: any, Control: any;

  try {
    // 1. 暂存 define.amd
    const globalDefine = (window as any).define;
    let storedAmd: any = undefined;

    if (globalDefine && globalDefine.amd) {
      storedAmd = globalDefine.amd;
      globalDefine.amd = false; // 暂时禁用 AMD，欺骗 rangy
    }

    // 2. 动态导入扩展库 (rangy 会在这里面执行)
    const extensionModule = await import("@logicflow/extension");
    DndPanel = extensionModule.DndPanel;
    SelectionSelect = extensionModule.SelectionSelect;
    Snapshot = extensionModule.Snapshot;
    Menu = extensionModule.Menu;
    Control = extensionModule.Control;

    // 3. 注册插件
    LogicFlow.use(DndPanel);
    LogicFlow.use(SelectionSelect);
    LogicFlow.use(Snapshot);
    LogicFlow.use(Menu);
    LogicFlow.use(Control);

    // 4. 恢复 define.amd
    if (globalDefine && storedAmd) {
      globalDefine.amd = storedAmd;
    }
  } catch (e) {
    console.error("Failed to load LogicFlow extensions:", e);
  }
  // ========================================================

  if (container.value) {
    resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0 && !lf) {
        lf = new LogicFlow({
          container: container.value as HTMLElement,
          grid: true,
          background: { backgroundColor: "#f7f9ff" },
          keyboard: { enabled: true },
          plugins: [DndPanel, SelectionSelect, Snapshot, Menu], // 使用动态加载的变量
        });

        // ... (lf.register, lf.setMenuConfig 等代码保持不变) ...

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
          // 注意：这里需要断言类型，因为 DndPanel 是动态导入的，TS 可能推断为 any
          (lf.extension.dndPanel as any).setPatternItems([
            // ... (PatternItems 保持不变) ...
            { type: "StartNode", label: "开始节点", className: "dnd-node-item start-node",
              icon: '/icons/start.png'
            },
            { type: "StateNode", label: "状态节点", className: "dnd-node-item state-node",
              icon: '/icons/rect.png'
            },
            { type: "EndNode", label: "结束节点", className: "dnd-node-item end-node",
              icon: '/icons/end.png'
            },
            { type: "LogicNode", label: "逻辑分支", className: "dnd-node-item logic-node",
              icon: '/icons/diamond.png'
            },
            { type: "SubflowNode", label: "子流程图", className: "dnd-node-item subflow-node",
              icon: '/icons/subflow.png'
            },
          ]);
        }

        // [新增] 监听拖拽添加事件，将 UUID 替换为顺序 ID
        lf.on("node:dnd-add", ({ data }) => {
          const { type, x, y, text, properties } = data;
          const newId = generateSequentialId(type);
          
          // 1. 删除自动生成的 UUID 节点
          lf?.deleteNode(data.id);
          
          // 2. 添加自定义 ID 的节点
          lf?.addNode({
            id: newId,
            type,
            x,
            y,
            text: typeof text === 'object' ? text.value : text,
            properties
          });
        });

        // ... (lf.on 监听器等保持不变) ...
        lf.on("node:delete", ({ data }) => { handleConfirmAndDelete([data]); return false; });
        lf.on("edge:delete", ({ data }) => { handleConfirmAndDelete([data]); return false; });
        lf.on("connection:not-allowed", (data) => { if (data.msg) ElMessage.warning(data.msg); });
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
      if (lf) {
        lf.resize();
      }
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

watch(
    () => props.graphData,
    (newData) => {
      if (newData && newData.globalAtomIds) {
        globalAtomIds.value = newData.globalAtomIds;
      } else {
        globalAtomIds.value = [];
      }
      if (lf) {
        if (newData && newData.nodes && newData.nodes.length > 0) {
          lf.render(props.graphData as any);
          // [新增] 渲染后清空选中状态，防止属性面板残留旧数据
          activeElement.value = null;
        } else {
          lf.clearData();
        }
      }
    },
    { deep: true, immediate: true }
);

// 新增：手动刷新数据处理
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
      categoryStore.fetchAllCategories() // 同时刷新分类数据
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

const handleGlobalAtomsChange = (newIds: number[]) => {
  globalAtomIds.value = newIds;
};

const handleEditAtom = (atomId: number) => {
  router.push({ name: "AtomEditor", params: { atomId } });
};

const handleConfirmAndDelete = (elements: any[]) => {
  if (!lf || !elements || elements.length === 0) return;

  // 因为一次只删除一个，所以直接取第一个元素
  const elementToDelete = elements[0];
  if (!elementToDelete || !elementToDelete.id) return;

  const model = lf.getModelById(elementToDelete.id);
  if (!model) return;

  // 检查是否正在删除最后一个“开始节点”
  if (model.type === 'StartNode') {
    const totalStartNodes = lf.graphModel.nodes.filter((n: any) => n.type === 'StartNode').length;
    if (totalStartNodes <= 1) {
      ElMessage.error("操作失败：必须至少保留一个“开始节点”。");
      return; // 阻止删除
    }
  }

  // 显示确认对话框
  const message = `确定要删除 ${model.BaseType === "node" ? "节点" : "边"} "${(typeof model.text === "object" ? model.text?.value : model.text) || ""}" 吗？`;

  ElMessageBox.confirm(message, "确认删除", {
    confirmButtonText: "删除",
    cancelButtonText: "取消",
    type: "warning",
    appendTo: editorWrapperRef.value!,
  }).then(() => {
    // 执行删除
    if (model.BaseType === "node") {
      lf?.deleteNode(model.id);
    } else if (model.BaseType === "edge") {
      lf?.deleteEdge(model.id);
    }
    activeElement.value = null;
    ElMessage.success("删除成功");
  }).catch(() => {
    ElMessage.info("已取消删除");
  });
};

const getData = (): (any & { globalAtomIds?: number[] }) | null => {
  if (!lf) return null;
  const graphData = lf.getGraphRawData();
  // Explicitly return as any to satisfy the return type requirement
  return { ...graphData, globalAtomIds: globalAtomIds.value } as any;
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
  min-width: 0; /* Important for flexbox shrinking */
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

/* This is the CSS-based fix. It tells the browser to maintain the panel's width when the wrapper is in fullscreen mode. */
.flowchart-editor-wrapper:fullscreen .properties-container {
  width: 300px;
  flex-shrink: 0;
}

:deep(.lf-dnd-panel) {
  padding: 10px;
  box-sizing: border-box;
}
:deep(.lf-dnd-item) {
  margin-bottom: 10px;
  padding: 0;
  border: none;
  background: transparent;
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
  color: inherit;
  box-sizing: border-box;
}

.fullscreen-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
}
.flowchart-editor-wrapper:fullscreen {
  background-color: #ffffff;
}

/* 核心修复：缩小 DnD 面板内的图标大小 */
:deep(.lf-dnd-item .lf-dnd-shape) {
  width: 20px !important;
  height: 20px !important;
  background-size: contain !important;
  flex-shrink: 0;
}

:deep(.start-node) {
  background-color: #f0f9eb;
  border-color: #67c23a;
  color: #529b2e;
}
:deep(.state-node) {
  background-color: #e1f3ff;
  border-color: #84c1ff;
  color: #3375b9;
}
:deep(.end-node) {
  background-color: #fef0f0;
  border-color: #f56c6c;
  color: #c45656;
}
/* Corrected Dnd Panel and its items layouting */
:deep(.lf-dnd-panel) {
  height: 100% !important;
}
:deep(.dnd-panel > div) {
  height: 100%;
}

:deep(.logic-node) {
  background-color: #f9f0ff;
  border-color: #b37feb;
  color: #722ed1;
}
:deep(.subflow-node) {
  background-color: #fff7e6;
  border-color: #ffa940;
  color: #d46b08;
}
</style>