import { RectNode, RectNodeModel } from "@logicflow/core";
import { getStandardAnchors } from "@/utils/flowchartUtils";

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
    return getStandardAnchors(this.id, this.x, this.y, this.width, this.height);
  }
}

class StartNodeView extends RectNode {}

export default {
  type: "StartNode",
  view: StartNodeView,
  model: StartNodeModel,
};
