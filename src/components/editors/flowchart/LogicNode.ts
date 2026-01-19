// FILE: AdFlowPro_ui/src/components/editors/flowchart/LogicNode.ts (New File)
import { DiamondNode, DiamondNodeModel } from "@logicflow/core";
import { getStandardAnchors } from "@/utils/flowchartUtils";

class LogicNodeModel extends DiamondNodeModel {
    initNodeData(data: any) {
        // 修正：在 super 之前或通过构造逻辑处理，避免直接修改只读属性
        data.width = data.width || 100;
        data.height = data.height || 80;
        super.initNodeData(data);

        // 初始化业务属性
        this.properties.branches = data.properties?.branches || []; // [{leftValue, operator, rightValue, targetId}]
        this.properties.defaultTargetId = data.properties?.defaultTargetId || "";
        this.text.value = data.text?.value || "逻辑判断";
    }

    getNodeStyle() {
        const style = super.getNodeStyle();
        style.fill = "#f9f0ff"; // 淡紫色，区分状态
        style.stroke = "#b37feb";
        style.strokeWidth = 2;
        return style;
    }

    getDefaultAnchor() {
        return getStandardAnchors(this.id, this.x, this.y, this.width, this.height);
    }
}

class LogicNodeView extends DiamondNode {}

export default {
    type: "LogicNode",
    view: LogicNodeView,
    model: LogicNodeModel,
};