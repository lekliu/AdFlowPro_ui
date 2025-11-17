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

  // Rule: This node cannot be deleted
  // isAllowDelete(): boolean {
  //   ElMessage.warning("开始节点不能被删除。");
  //   return false;
  // }
}

class StartNodeView extends RectNode {}

export default {
  type: "StartNode",
  view: StartNodeView,
  model: StartNodeModel,
};
