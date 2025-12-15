// FILE: AdFlowPro_ui/src/utils/dsl/caseDslService.ts
import { v4 as uuidv4 } from "uuid";

// 在文件顶部添加
const isNodeTextUnique = (nodes: any[], text: string): boolean => {
    if (!text) return false;
    return nodes.filter(n => {
        const nodeText = typeof n.text === 'object' ? n.text.value : n.text;
        return nodeText === text;
    }).length === 1;
};

// 根据ID获取节点文本
const getNodeTextById = (nodes: any[], id: string): string | null => {
    const node = nodes.find(n => n.id === id);
    if (!node) return null;
    return typeof node.text === 'object' ? node.text.value : node.text;
};

// 1. 在文件顶部添加一个提取锚点方位的辅助函数
const getAnchorPosition = (nodeId: string, anchorId?: string): string | null => {
    if (!anchorId) return null;
    // 约定格式: {nodeId}_anchor_{position}
    const prefix = `${nodeId}_anchor_`;
    if (anchorId.startsWith(prefix)) {
        return anchorId.replace(prefix, '');
    }
    return null;
};

// 辅助函数：解析参数
const parseParams = (paramStr: string): Record<string, any> => {
    const result: Record<string, any> = {};
    const regex = /(\w+)=(?:"([^"]*)"|\[(.*?)\]|([^\s,]+))/g;
    let match;
    while ((match = regex.exec(paramStr)) !== null) {
        const key = match[1];
        const strVal = match[2];
        const arrayVal = match[3]; // 捕获数组内容 [1, 2, 3]
        const otherVal = match[4];

        if (strVal !== undefined) {
            result[key] = strVal;
        } else if (arrayVal !== undefined) {
            // 解析数组: "1, 2, 3" -> [1, 2, 3]
            result[key] = arrayVal.split(',').map(s => s.trim()).filter(s => s).map(Number);
        } else if (otherVal !== undefined) {
            if (!isNaN(Number(otherVal))) result[key] = Number(otherVal);
            else result[key] = otherVal;
        }
    }
    return result;
};

/**
 * 生成测试用例代码
 */
export const generateCaseCode = (form: any): string => {
    let code = `# AdFlowPro Case DSL\n\n`;

    // 1. Config
    let configParams = [`name="${form.name}"`, `type="${form.caseType}"`];
    if (form.totalTimeoutS) configParams.push(`timeout=${form.totalTimeoutS}`);
    code += `config(${configParams.join(', ')})\n`;
    if (form.description) code += `description("${form.description}")\n`;

    // 2. Linear Mode
    if (form.caseType === 'linear' && form.packages) {
        code += `\n# [Linear Sequence]\n`;
        form.packages.forEach((pkg: any) => {
            code += `package.call(id=${pkg.packageId}, name="${pkg.name}")\n`;
        });
    }
    // 3. Flow Mode (Graph Data)
    else if (form.caseType === 'flow' && form.flowchartData) {
        code += `\n# [Flowchart Nodes]\n`;
        const nodes = form.flowchartData.nodes || [];
        const edges = form.flowchartData.edges || [];

        nodes.forEach((node: any) => {
            let nodeType = 'state';
            if (node.type === 'StartNode') nodeType = 'start';
            else if (node.type === 'EndNode') nodeType = 'end';

            let text = typeof node.text === 'object' ? node.text.value : node.text;
            code += `node.${nodeType}(id="${node.id}", text="${text}", x=${node.x}, y=${node.y})\n`;
        });

        code += `\n# [Flowchart Edges]\n`;
        edges.forEach((edge: any) => {
            // 1. 获取源节点和目标节点的文本
            const srcText = getNodeTextById(nodes, edge.sourceNodeId);
            const tgtText = getNodeTextById(nodes, edge.targetNodeId);

            // 2. 决定使用 Text 还是 ID
            // 规则：如果不为空且在整个图中唯一，则使用 Text，否则使用 ID
            const srcVal = (srcText && isNodeTextUnique(nodes, srcText)) ? srcText : edge.sourceNodeId;
            const tgtVal = (tgtText && isNodeTextUnique(nodes, tgtText)) ? tgtText : edge.targetNodeId;

            let params = `src="${srcVal}", tgt="${tgtVal}"`;

            // [新增] 提取并生成锚点方位
            const startPos = getAnchorPosition(edge.sourceNodeId, edge.sourceAnchorId);
            const endPos = getAnchorPosition(edge.targetNodeId, edge.targetAnchorId);

            if (startPos) params += `, start="${startPos}"`;
            if (endPos) params += `, end="${endPos}"`;

            // [新增/修改] 迁移描述 (Text)
            if (edge.text && (typeof edge.text === 'string' ? edge.text : edge.text.value)) {
                params += `, text="${typeof edge.text === 'string' ? edge.text : edge.text.value}"`;
            }

            // 属性处理
            if (edge.properties) {
                // 触发器（原子操作）
                if (edge.properties.conditionAtomIds && edge.properties.conditionAtomIds.length > 0) {
                    params += `, atoms=[${edge.properties.conditionAtomIds.join(', ')}]`;
                }
                // [新增] 触发器（测试包）
                if (edge.properties.actionPackageId) {
                    params += `, pkg_id=${edge.properties.actionPackageId}`;
                }
            }

            code += `edge(${params})\n`;
        });

        // 全局触发器
        if (form.flowchartData.globalAtomIds && form.flowchartData.globalAtomIds.length > 0) {
            code += `\n# [Global Triggers]\n`;
            code += `global.atoms([${form.flowchartData.globalAtomIds.join(', ')}])\n`;
        }
    }

    return code;
};

/**
 * 解析测试用例代码
 */
export const parseCaseCode = (code: string, originalForm: any, allPackages: any[]): any => {
    const newForm = JSON.parse(JSON.stringify(originalForm));

    // 重置
    newForm.packages = [];
    if (newForm.caseType === 'flow') {
        newForm.flowchartData = { nodes: [], edges: [], globalAtomIds: [] };
    }

    const lines = code.split('\n');

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        const match = trimmed.match(/^([\w\.]+)\((.*)\)$/);
        if (!match) return;

        const method = match[1];
        const params = parseParams(match[2]);

        switch (method) {
            case 'config':
                if (params.name) newForm.name = params.name;
                if (params.type) newForm.caseType = params.type;
                if (params.timeout) newForm.totalTimeoutS = params.timeout;

                // 切换类型时初始化数据结构
                if (newForm.caseType === 'flow' && !newForm.flowchartData) {
                    newForm.flowchartData = { nodes: [], edges: [], globalAtomIds: [] };
                }
                break;

            case 'description':
                const descMatch = match[2].match(/"([^"]*)"/);
                if (descMatch) newForm.description = descMatch[1];
                break;

            // --- Linear Mode ---
            case 'package.call':
                if (newForm.caseType === 'linear' && params.id) {
                    const pkg = allPackages.find(p => p.packageId === params.id);
                    if (pkg) newForm.packages.push(pkg);
                }
                break;

            // --- Flow Mode: Nodes ---
            case 'node.start':
            case 'node.end':
            case 'node.state':
                if (newForm.caseType === 'flow') {
                    const typeMap: Record<string, string> = { 'node.start': 'StartNode', 'node.end': 'EndNode', 'node.state': 'StateNode' };
                    const nodeX = params.x || 100;
                    const nodeY = params.y || 100;

                    newForm.flowchartData.nodes.push({
                        id: params.id || uuidv4(),
                        type: typeMap[method],
                        x: nodeX,
                        y: nodeY,
                        text: {
                            value: params.text || (method === 'node.start' ? '开始' : '节点'),
                            x: nodeX, // 显式绑定文本坐标
                            y: nodeY
                        }
                    });
                }
                break;

            // --- Flow Mode: Edges ---
            case 'edge':
                if (newForm.caseType === 'flow' && params.src && params.tgt) {
                    // 辅助查找函数：通过 ID 或 Text 查找节点 ID
                    const findNodeId = (identifier: string): string | undefined => {
                        // 1. 尝试作为 ID 查找
                        const nodeById = newForm.flowchartData.nodes.find((n: any) => n.id === identifier);
                        if (nodeById) return nodeById.id;

                        // 2. 尝试作为 Text 查找
                        const nodeByText = newForm.flowchartData.nodes.find((n: any) => {
                            const t = typeof n.text === 'object' ? n.text.value : n.text;
                            return t === identifier;
                        });
                        return nodeByText?.id;
                    };

                    const sourceId = findNodeId(params.src);
                    const targetId = findNodeId(params.tgt);

                    if (sourceId && targetId) {
                        const newEdge: any = {
                            id: uuidv4(),
                            type: 'polyline',
                            sourceNodeId: sourceId,
                            targetNodeId: targetId,
                            text: { value: params.text || '' },
                            properties: {
                                conditionAtomIds: params.atoms || [],
                                actionPackageId: params.pkg_id || null
                            }
                        };

                        // 还原锚点 ID (注意：这里必须使用真实查找到的 ID，不能用 params.src)
                        if (params.start) {
                            newEdge.sourceAnchorId = `${sourceId}_anchor_${params.start}`;
                        }
                        if (params.end) {
                            newEdge.targetAnchorId = `${targetId}_anchor_${params.end}`;
                        }

                        newForm.flowchartData.edges.push(newEdge);
                    } else {
                        console.warn(`[DSL] Edge skipped: nodes not found for src="${params.src}" or tgt="${params.tgt}"`);
                    }
                }
                break;

            case 'global.atoms':
                // 特殊解析：global.atoms([1, 2])
                // 这里的正则可能没捕获到 key，因为是直接传数组
                // 简单处理：提取中括号内容
                const arrayMatch = match[2].match(/\[(.*?)\]/);
                if (arrayMatch && newForm.caseType === 'flow') {
                    newForm.flowchartData.globalAtomIds = arrayMatch[1].split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
                }
                break;
        }
    });

    return newForm;
};