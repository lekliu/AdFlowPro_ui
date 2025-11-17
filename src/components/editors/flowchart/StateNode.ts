// FILE: AdFlowPro_ui/src/components/editors/flowchart/StateNode.ts

import { RectNode, RectNodeModel, h } from "@logicflow/core";

class StateNodeModel extends RectNodeModel {
  initNodeData(data: any) {
    super.initNodeData(data);
    this.width = 120;
    this.height = 60;
    this.radius = 8;
    this.text.value = data.text?.value || "状态节点";
  }

  getNodeStyle() {
    const style = super.getNodeStyle();
    style.fill = "#e1f3ff";
    style.stroke = "#84c1ff";
    style.strokeWidth = 2;
    return style;
  }

  getTextStyle() {
    const style = super.getTextStyle();
    style.fontSize = 14;
    style.fontWeight = "bold";
    return style;
  }

  // --- 关键修改: 使用 getDefaultAnchor 方法 ---
  getDefaultAnchor() {
    const { width, height, x, y, id } = this;
    const anchors = [
      // Top anchors
      { x: x - width / 4, y: y - height / 2, id: `${id}_anchor_top_left`, name: 'top_left' },
      { x: x,             y: y - height / 2, id: `${id}_anchor_top_center`, name: 'top_center' },
      { x: x + width / 4, y: y - height / 2, id: `${id}_anchor_top_right`, name: 'top_right' },
      // Bottom anchors
      { x: x - width / 4, y: y + height / 2, id: `${id}_anchor_bottom_left`, name: 'bottom_left' },
      { x: x,             y: y + height / 2, id: `${id}_anchor_bottom_center`, name: 'bottom_center' },
      { x: x + width / 4, y: y + height / 2, id: `${id}_anchor_bottom_right`, name: 'bottom_right' },
      // Left anchor
      { x: x - width / 2, y: y,              id: `${id}_anchor_left`, name: 'left' },
      // Right anchor
      { x: x + width / 2, y: y,              id: `${id}_anchor_right`, name: 'right' },
    ];
    return anchors;
  }
}

class StateNodeView extends RectNode {}

export default {
  type: "StateNode",
  view: StateNodeView,
  model: StateNodeModel,
};