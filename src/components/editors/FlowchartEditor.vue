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
          :atom-pool="atomStore.atoms"
          :package-pool="packageStore.packages"
          :global-atom-ids="globalAtomIds"
          @update:global-atom-ids="handleGlobalAtomsChange"
          @properties-change="handlePropertiesChange"
          @edit-atom="handleEditAtom"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, defineExpose, defineAsyncComponent } from "vue";
import LogicFlow, { type BaseNodeModel, type BaseEdgeModel, type GraphConfigData, type GraphData } from "@logicflow/core";
import { DndPanel, SelectionSelect, Snapshot, Menu, Control } from "@logicflow/extension";
import "@logicflow/core/lib/style/index.css";
import "@logicflow/extension/lib/style/index.css";

import { FullScreen, Delete } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import StartNode from "./flowchart/StartNode";
import StateNode from "./flowchart/StateNode";
import EndNode from "./flowchart/EndNode";
import PropertiesPanel from "./flowchart/PropertiesPanel.vue";
import { useAtomStore } from "@/stores/atomStore";
import { usePackageStore } from "@/stores/packageStore";
import { useRouter } from "vue-router";

// 全局静态注册插件
LogicFlow.use(DndPanel);
LogicFlow.use(SelectionSelect);
LogicFlow.use(Snapshot);
LogicFlow.use(Control);

const props = defineProps<{
  graphData: (GraphData & { globalAtomIds?: number[] }) | null;
}>();

const atomStore = useAtomStore();
const packageStore = usePackageStore();
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

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

onMounted(() => {
  atomStore.fetchAtoms({ skip: 0, limit: 2000 });
  packageStore.fetchPackages({ skip: 0, limit: 2000 });

  if (container.value) {
    resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0 && !lf) {
        lf = new LogicFlow({
          container: container.value as HTMLElement,
          grid: true,
          background: { backgroundColor: "#f7f9ff" },
          keyboard: {   enabled: true,      },
          plugins: [DndPanel, SelectionSelect, Snapshot, Menu],
        });
        lf.register(StartNode);
        lf.register(StateNode);
        lf.register(EndNode);
        lf.setMenuConfig({
          nodeMenu: [
            { text: "编辑文本", callback: (node) => lf?.editText(node.id) },
            { text: "复制节点", callback: (node) => lf?.cloneNode(node.id) },
            { text: "删除节点", callback: (node) => handleConfirmAndDelete([node]) },
          ],
          edgeMenu: [
            { text: "编辑文本", callback: (edge) => lf?.editText(edge.id) },
            { text: "删除连接", callback: (edge) => handleConfirmAndDelete([edge]) },
          ],
          graphMenu: [],
        });
        if (dndPanel.value && lf.extension.dndPanel) {
          (lf.extension.dndPanel as DndPanel).setPatternItems([
            { type: "StartNode", label: "开始节点", className: "dnd-node-item start-node",
              icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAAH6ji2bAAAABGdBTUEAALGPC/xhBQAAAnBJREFUOBGdVL1rU1EcPfdGBddmaZLiEhdx1MHZQXApraCzQ7GKLgoRBxMfcRELuihWKcXFRcEWF8HBf0DdDCKYRZpnl7p0svLe9Zzbd29eQhTbC8nv+9zf130AT63jvooOGS8Vf9Nt5zxba7sXQwODfkWpkbjTQfCGUd9gIp3uuPP8bZ946g56dYQvnBg+b1HB8VIQmMFrazKcKSvFW2dQTxJnJdQ77urmXWOMBCmXM2Rke4S7UAW+/8ywwFoewmBps2tu7mbTdp8VMOkIRAkKfrVawalJTtIliclFbaOBqa0M2xImHeVIfd/nKAfVq/LGnPss5Kh00VEdSzfwnBXPUpmykNss4lUI9C1ga+8PNrBD5YeqRY2Zz8PhjooIbfJXjowvQJBqkmEkVnktWhwu2SM7SMx7Cj0N9IC0oQXRo8xwAGzQms+xrB/nNSUWVveI48ayrFGyC2+E2C+aWrZHXvOuz+CiV6iycWe1Rd1Q6+QUG07nb5SbPrL4426d+9E1axKjY3AoRrlEeSQo2Eu0T6BWAAr6COhTcWjRaYfKG5csnvytvUr/WY4rrPMB53Uo7jZRjXaG6/CFfNMaXEu75nG47X+oepU7PKJvvzGDY1YLSKHJrK7vFUwXKkaxwhCW3u+sDFMVrIju54RYYbFKpALZAo7sB6wcKyyrd+aBMryMT2gPyD6GsQoRFkGHr14TthZni9ck0z+Pnmee460mHXbRAypKNy3nuMdrWgVKj8YVV8E7PSzp1BZ9SJnJAsXdryw/h5ctboUVi4AFiCd+lQaYMw5z3LGTBKjLQOeUF35k89f58Vv/tGh+l+PE/wG0rgfIUbZK5AAAAABJRU5ErkJggg==',
            },
            { type: "StateNode", label: "状态节点", className: "dnd-node-item state-node",
              icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAYAAAEFVwZaAAAABGdBTUEAALGPC/xhBQAAAqlJREFUOBF9VM9rE0EUfrMJNUKLihGbpLGtaCOIR8VjQMGDePCgCCIiCNqzCAp2MyYUCXhUtF5E0D+g1t48qAd7CCLqQUQKEWkStcEfVGlLdp/fm3aW2QQdyLzf33zz5m2IsAZ9XhDpyaaIZkTS4ASzK41TFao88GuJ3hsr2pAbipHxuSYyKRugagICGANkfFnNh3HeE2N0b3nN2cgnpcictw5veJIzxmDamSlxxQZicq/mflxhbaH8BLRbuRwNtZp0JAhoplVRUdzmCe/vO27wFuuA3S5qXruGdboy5/PRGFsbFGKo/haRtQHIrM83bVeTrOgNhZReWaYGnE4aUQgTJNvijJFF4jQ8BxJE5xfKatZWmZcTQ+BVgh7s8SgPlCkcec4mGTmieTP4xd7PcpIEg1TX6gdeLW8rTVMVLVvb7ctXoH0Cydl2QOPJBG21STE5OsnbweVYzAnD3A7PVILuY0yiiyDwSm2g441r6rMSgp6iK42yqroI2QoXeJVeA+YeZSa47gZdXaZWQKTrG93rukk/l2Al6Kzh5AZEl7dDQy+JjgFahQjRopSxPbrbvK7GRe9ePWBo1wcU7sYrFZtavXALwGw/7Dnc50urrHJuTPSoO2IMV3gUQGNg87IbSOIY9BpiT9HV7FCZ94nPXb3MSnwHn/FFFE1vG6DTby+r31KAkUktB3Qf6ikUPWxW1BkXSPQeMHHiW0+HAd2GelJsZz1OJegCxqzl+CLVHa/IibuHeJ1HAKzhuDR+ymNaRFM+4jU6UWKXorRmbyqkq/D76FffevwdCp+jN3UAN/C9JRVTDuOxC/oh+EdMnqIOrlYteKSfadVRGLJFJPSB/ti/6K8f0CNymg/iH2gO/f0DwE0yjAFO6l8JaR5j0VPwPwfaYHqOqrCI319WzwhwzNW/aQAAAABJRU5ErkJggg=='
            },
            { type: "EndNode", label: "结束节点", className: "dnd-node-item end-node",
              icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAAH6ji2bAAAABGdBTUEAALGPC/xhBQAAA1BJREFUOBFtVE1IVUEYPXOf+tq40Y3vPcmFIdSjIorWoRG0ERWUgnb5FwVhYQSl72oUoZAboxKNFtWiwKRN0M+jpfSzqJAQclHo001tKkjl3emc8V69igP3znzfnO/M9zcDcKT67azmjYWTwl9Vn7Vumeqzj1DVb6cleQY4oAVnIOPb+mKAGxQmKI5CWNJ2aLPatxWa3aB9K7/fB+/Z0jUF6TmMlFLQqrkECWQzOZxYGjTlOl8eeKaIY5yHnFn486xBustDjWT6dG7pmjHOJd+33t0iitTPkK6tEvjxq4h2MozQ6WFSX/LkDUGfFwfhEZj1Auz/U4pyAi5Sznd7uKzznXeVHlI/Aywmk6j7fsUsEuCGADrWARXXwjxWQsUbIupDHJI7kF5dRktg0eN81IbiZXiTESic50iwS+t1oJgL83jAiBupLDCQqwziaWSoAFSeIR3P5Xv5az00wyIn35QRYTwdSYbz8pH8fxUUAtxnFvYmEmgI0wYXUXcCCSpeEVpXlsRhBnCEATxWylL9+EKCAYhe1NGstUa6356kS9NVvt3DU2fd+Wtbm/+lSbylJqsqkSm9CRhvoJVlvKPvF1RKY/FcPn5j4UfIMLn8D4UYb54BNsilTDXKnF4CfTobA0FpoW/LSp306wkXM+XaOJhZaFkcNM82ASNAWMrhrUbRfmyeI1FvRBTpN06WKxa9BK0o2E4Pd3zfBBEwPsv9sQBnmLVbLEIZ/Xe9LYwJu/Er17W6HYVBc7vmuk0xUQ+pqxdom5Fnp55SiytXLPYoMXNM4u4SNSCFWnrVIzKG3EGyMXo6n/BQOe+bX3FClY4PwydVhthOZ9NnS+ntiLh0fxtlUJHAuGaFoVmttpVMeum0p3WEXbcll94l1wM/gZ0Ccczop77VvN2I7TlsZCsuXf1WHvWEhjO8DPtyOVg2/mvK9QqboEth+7pD6NUQC1HN/TwvydGBARi9MZSzLE4b8Ru3XhX2PBxf8E1er2A6516o0w4sIA+lwURhAON82Kwe2iDAC1Watq4XHaGQ7skLcFOtI5lDxuM2gZe6WFIotPAhbaeYlU4to5cuarF1QrcZ/lwrLaCJl66JBocYZnrNlvm2+MBCTmUymPrYZVbjdlr/BxlMjmNmNI3SAAAAAElFTkSuQmCC'
            },
          ]);
        }
        lf.on("node:delete", ({ data }) => { handleConfirmAndDelete([data]); return false; });
        lf.on("edge:delete", ({ data }) => { handleConfirmAndDelete([data]); return false; });
        lf.on("connection:not-allowed", (data) => { if (data.msg) ElMessage.warning(data.msg); });
        lf.on("element:click", ({ data }) => {
          const model = lf?.getModelById(data.id);
          activeElement.value = model && (model.BaseType === "node" || model.BaseType === "edge") ? (model as ActiveElement) : null;
        });
        lf.on("blank:click", () => { activeElement.value = null; });
        if (props.graphData) {
          lf.render(props.graphData);
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
          lf.render(newData);
        } else {
          lf.clearData();
        }
      }
    },
    { deep: true, immediate: true }
);

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
    const totalStartNodes = lf.graphModel.nodes.filter(n => n.type === 'StartNode').length;
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
    appendTo: editorWrapperRef.value,
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

const getData = (): (GraphData & { globalAtomIds?: number[] }) | null => {
  if (!lf) return null;
  const graphData = lf.getGraphRawData();
  return { ...graphData, globalAtomIds: globalAtomIds.value };
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
  height: 60px;
  padding: 20px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0px;
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
</style>