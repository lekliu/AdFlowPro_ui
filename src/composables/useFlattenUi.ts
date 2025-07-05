import { ref, watch } from "vue";

// 定义 UI 节点的接口，与后端数据结构保持一致
interface UiNode {
  className?: string;
  packageName?: string;
  text?: string;
  contentDescription?: string;
  viewIdResourceName?: string;
  boundsInScreen?: [number, number, number, number];
  isClickable?: boolean;
  isEnabled?: boolean;
  isFocusable?: boolean;
  // ... 其他你关心的属性
  children?: UiNode[];
}

export function useFlattenUi(sourceJson: ref<object | null>) {
  const flattenedText = ref("");

  const flattenNode = (node: UiNode, level: number): string[] => {
    const lines: string[] = [];

    // >>>>>>>>>> 核心修改：手动挑选我们关心的字段 <<<<<<<<<<
    const displayInfo: Partial<UiNode> = {}; // 创建一个新对象用于显示

    // 按需添加你希望看到的字段
    if (node.className) displayInfo.className = node.className;
    if (node.text) displayInfo.text = node.text;
    if (node.viewIdResourceName)
      displayInfo.viewIdResourceName = node.viewIdResourceName;
    if (node.contentDescription)
      displayInfo.contentDescription = node.contentDescription;
    if (node.boundsInScreen) displayInfo.boundsInScreen = node.boundsInScreen;
    if (node.isClickable) displayInfo.isClickable = node.isClickable; // 只显示为 true 的，增加可读性
    if (node.isEnabled) displayInfo.isEnabled = node.isEnabled;
    if (node.isFocusable) displayInfo.isFocusable = node.isFocusable;

    // 如果 displayInfo 为空（即节点无任何我们关心的信息），可以给一个提示或跳过
    if (Object.keys(displayInfo).length === 0) {
      // 如果一个节点没有任何我们关心的信息，可以不显示它，或者只显示类名
      // 这里我们选择至少显示类名，如果存在的话
      if (node.className) {
        // lines.push(`${String(level).padStart(2, ' ')}| { "className": "${node.className}" }`);
      } else {
        // 或者完全不显示这个空节点
        // return [];
      }
    }

    // 1. 提取当前节点信息，并移除 children
    // const { children, ...nodeInfo } = node;
    const nodeInfoString = JSON.stringify(displayInfo);

    // 2. 格式化当前行
    // 使用 level 作为层级号，并用 padStart 保证对齐
    const prefix = `${String(level).padStart(2, " ")}| `;
    lines.push(prefix + nodeInfoString);

    // 3. 递归处理子节点
    if (node.children && node.children.length > 0) {
      for (const childNode of node.children) {
        lines.push(...flattenNode(childNode, level + 1));
      }
    }

    return lines;
  };

  const updateFlattenedText = () => {
    if (sourceJson.value) {
      try {
        // 服务端返回的已经是解析好的JSON对象
        const rootNode = sourceJson.value as UiNode;
        flattenedText.value = flattenNode(rootNode, 0).join("\n");
      } catch (error) {
        console.error("Failed to parse or flatten UI structure JSON:", error);
        flattenedText.value = "Error: Invalid UI structure format.";
      }
    } else {
      flattenedText.value = "";
    }
  };

  // 监听源 JSON 数据的变化，自动更新扁平化文本
  watch(sourceJson, updateFlattenedText, { immediate: true });

  return {
    flattenedText,
  };
}
