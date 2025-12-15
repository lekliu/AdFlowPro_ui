import { RectNode, RectNodeModel } from "@logicflow/core";

class EndNodeModel extends RectNodeModel {
  initNodeData(data: any) {
    super.initNodeData(data);
    this.width = 100;
    this.height = 50;
    this.radius = 4;
    this.text.value = data.text?.value || "结束";
  }

  getNodeStyle() {
    const style = super.getNodeStyle();
    style.fill = "#fef0f0";
    style.stroke = "#f56c6c";
    style.strokeWidth = 2;
    return style;
  }

  getConnectedSourceRules() {
    const rules = super.getConnectedSourceRules();
    rules.push({
      message: "结束节点不能作为连线的起点",
      validate: () => false,
    });
    return rules;
  }

  getDefaultAnchor() {
    const { width, height, x, y, id } = this;
    return [
      { x: x, y: y - height / 2, id: `${id}_anchor_top`, name: 'top' },
      { x: x + width / 2, y: y, id: `${id}_anchor_right`, name: 'right' },
      { x: x, y: y + height / 2, id: `${id}_anchor_bottom`, name: 'bottom' },
      { x: x - width / 2, y: y, id: `${id}_anchor_left`, name: 'left' },
    ];
  }
}

class EndNodeView extends RectNode {}

export default {
  type: "EndNode",
  view: EndNodeView,
  model: EndNodeModel,
};
