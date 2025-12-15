import { RectNode, RectNodeModel } from "@logicflow/core";
import { ElMessage } from "element-plus";

class StartNodeModel extends RectNodeModel {
  initNodeData(data: any) {
    super.initNodeData(data);
    this.width = 100;
    this.height = 50;
    this.radius = 4;
    this.text.value = data.text?.value || "开始";
  }

  getNodeStyle() {
    const style = super.getNodeStyle();
    style.fill = "#f0f9eb";
    style.stroke = "#67c23a";
    style.strokeWidth = 2;
    return style;
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

class StartNodeView extends RectNode {}

export default {
  type: "StartNode",
  view: StartNodeView,
  model: StartNodeModel,
};
