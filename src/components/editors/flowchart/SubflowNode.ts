// FILE: AdFlowPro_ui/src/components/editors/flowchart/SubflowNode.ts (New File)
import { RectNode, RectNodeModel, h } from "@logicflow/core";
import { getStandardAnchors } from "@/utils/flowchartUtils";

class SubflowNodeModel extends RectNodeModel {
    initNodeData(data: any) {
        // 1. 设置只读属性
        data.width = data.width || 140;
        data.height = data.height || 60;

        super.initNodeData(data);
        this.radius = 4;

        // 2. [核心修复] 确保文本坐标与节点坐标同步
        // 如果 data.text 只有 value 没有坐标，在此处纠偏
        if (this.text && (!this.text.x || !this.text.y)) {
            this.text.x = this.x;
            this.text.y = this.y;
        }

        this.properties.subCaseId = data.properties?.subCaseId || null;
        this.text.value = data.text?.value || "子流程";
    }

    getNodeStyle() {
        const style = super.getNodeStyle();
        style.fill = "#fff7e6"; // 橙黄色系，代表外部引用
        style.stroke = "#ffa940";
        style.strokeWidth = 2;
        return style;
    }

    // 实现双边框效果
    getOutlineStyle() {
        const style = super.getOutlineStyle();
        style.stroke = "#ffa940";
        return style;
    }

    getDefaultAnchor() {
        return getStandardAnchors(this.id, this.x, this.y, this.width, this.height);
    }
}

class SubflowNodeView extends RectNode {
    // 覆盖 getShape 增加内层边框装饰
    getShape(): any {
        const { model } = this.props;
        const { x, y, width, height, radius } = model;
        const style = model.getNodeStyle();

        return h("g", {}, [
            h("rect", { ...style, x: x - width / 2, y: y - height / 2, width, height, rx: radius, ry: radius }),
            // 内层装饰边框
            h("rect", {
                x: x - width / 2 + 4, y: y - height / 2 + 4,
                width: width - 8, height: height - 8,
                fill: "transparent", stroke: "#ffa940", strokeWidth: 1, rx: 2, ry: 2
            }),
            this.getText() // [核心修复] 显式渲染文本标签
        ]);
    }
}

export default {
    type: "SubflowNode",
    view: SubflowNodeView,
    model: SubflowNodeModel,
};