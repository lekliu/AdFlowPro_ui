// FILE: AdFlowPro_ui/src/utils/dslService.ts
import { v4 as uuidv4 } from "uuid";

// 动作参数 (DSL -> UI Parameters)
const ACTION_PARAM_MAP: Record<string, string> = {
    x: "startX",
    y: "startY",
    start_x: "startX",
    start_y: "startY",
    end_x: "endX",
    end_y: "endY",
    offset_x: "offsetX",
    offset_y: "offsetY",
    ms: "duration",
    duration: "duration",
    min: "minDuration",
    max: "maxDuration",
    dir: "direction",
    type: "genType",
    cmd: "command",
    var: "leftValue",
    val: "rightValue",
    op: "comparisonOperator",
    report_label: "reportLabel",
    key: "keyCode",
    direction: "direction",
    value: "text",
};

// 选择器参数 (DSL -> UI Selector) - 仅保留您要求的核心字段
const SELECTOR_PARAM_MAP: Record<string, string> = {
    text: "text",
    id: "resourceId",
    desc: "contentDesc",
    mode: "matchMode",
    cls: "className",
    bounds: "bounds",
    // 状态
    checked: "checked",
    selected: "selected",
    enabled: "enabled"
};

// 反向映射 (UI -> DSL) - 用于生成代码
const REVERSE_ACTION_MAP: Record<string, string> = {
    startX: "x",
    startY: "y",
    endX: "end_x",
    endY: "end_y",
    offsetX: "offset_x",
    offsetY: "offset_y",
    duration: "ms",
    minDuration: "min",
    maxDuration: "max",
    leftValue: "var",
    rightValue: "val",
    comparisonOperator: "op",
    reportLabel: "report_label",
    keyCode: "key",
    direction: "direction",
    text: "value"
};

const REVERSE_SELECTOR_MAP: Record<string, string> = {
    resourceId: "id",
    contentDesc: "desc",
    matchMode: "mode",
    className: "cls",
    bounds: "bounds",
    checked: "checked",
    selected: "selected",
    enabled: "enabled",
    text: "text"
};

/**
 * 辅助函数：解析参数字符串
 */
const parseParams = (paramStr: string): Record<string, any> => {
    const result: Record<string, any> = {};
    const regex = /(\w+)=(?:"([^"]*)"|([^\s,]+))/g;
    let match;
    while ((match = regex.exec(paramStr)) !== null) {
        const key = match[1];
        const strVal = match[2];
        const otherVal = match[3];
        if (strVal !== undefined) {
            result[key] = strVal;
        } else if (otherVal !== undefined) {
            if (otherVal === 'true' || otherVal === 'True') result[key] = true;
            else if (otherVal === 'false' || otherVal === 'False') result[key] = false;
            else if (!isNaN(Number(otherVal))) result[key] = Number(otherVal);
            else result[key] = otherVal;
        }
    }
    return result;
};

/**
 * 生成器：Form -> Code
 */
export const generateCode = (form: any, id?: number | string | null): string => {
    const displayId = id || 'NEW';
    let code = `# AdFlowPro DSL id: ${displayId}\n`;

    // [Basic]
    code += `\n# [Basic]\n`;
    let configParams = [`name="${form.name}"`];
    if (form.categoryId) configParams.push(`category_id=${form.categoryId}`);
    if (form.priority !== 50) configParams.push(`priority=${form.priority}`);
    if (form.executionCountLimit !== 100) configParams.push(`limit=${form.executionCountLimit}`);
    if (form.actionLoopCount !== 1) configParams.push(`loop=${form.actionLoopCount}`);
    if (form.continueAfterMatch) configParams.push(`continue=True`);
    if (form.supportedDevices && form.supportedDevices.length > 0) {
        configParams.push(`devices="${form.supportedDevices.join('|')}"`);
    }
    code += `config(${configParams.join(', ')})\n`;
    if (form.description) code += `description("${form.description}")\n`;

    // [Trigger] ... (保持不变)
    if (form.triggerType === 'scene') {
        code += `\n# [Trigger]\n`;
        const pm = form.sceneSnapshotJson.primaryMatcher;
        if (pm.matchTargetType === 'text') {
            const textVal = Array.isArray(pm.text) ? pm.text.join("|") : pm.text;
            let paramsStr = `text="${textVal}"`;
            if (pm.matchMode !== 'fuzzy') paramsStr += `, mode="${pm.matchMode}"`;
            if (pm.coordinates) paramsStr += `, left=${pm.coordinates.left}, top=${pm.coordinates.top}`;
            const funcName = pm.sceneType === 'ocr' ? 'match.ocr' : 'match.ui';
            code += `${funcName}(${paramsStr})\n`;
        } else if (pm.matchTargetType === 'image') {
            code += `match.image(id="${pm.templateId}")\n`;
        } else if (pm.matchTargetType === 'pixel' && pm.pixelPoints) {
            pm.pixelPoints.forEach((pt: any) => {
                code += `match.pixel(x=${pt.x}, y=${pt.y}, color="${pt.color}", tol=${pt.tolerance})\n`;
            });
        } else if (pm.matchTargetType === 'ai_detect') {
            // 增加兜底保护
            const mId = pm.modelId || 'undefined';
            const label = pm.targetLabel || 'none';
            const conf = pm.minConfidence || 0.5;
            code += `match.ai(model="${mId}", label="${label}", conf=${conf})\n`;
        }

        if (pm.screenRegion && pm.screenRegion.length > 0) {
            code += `filter.region("${pm.screenRegion.join('|')}")\n`;
        }
        if (pm.spatialRelation && pm.spatialRelation.operator) {
            const anchorText = Array.isArray(pm.spatialRelation.anchorMatcher.text)
                ? pm.spatialRelation.anchorMatcher.text.join("|")
                : pm.spatialRelation.anchorMatcher.text;
            code += `filter.spatial(op="${pm.spatialRelation.operator}", anchor="${anchorText}")\n`;
        }
        if (form.sceneSnapshotJson.secondaryMatchers) {
            form.sceneSnapshotJson.secondaryMatchers.forEach((sm: any) => {
                const func = sm.isExclusion ? 'not_match' : 'and_match';
                const smText = Array.isArray(sm.text) ? sm.text.join("|") : sm.text;
                code += `${func}(text="${smText}")\n`;
            });
        }
        // [新增] 生成提取器代码
        if (form.sceneSnapshotJson.extractors) {
            form.sceneSnapshotJson.extractors.forEach((ext: any) => {
                let params = `name="${ext.name}", regex="${ext.regex}"`;
                if (ext.scope && ext.scope !== 'matched_node') params += `, scope="${ext.scope}"`;
                code += `extract(${params})\n`;
            });
        }
    }

    // [Actions] - 精简逻辑
    if (form.actionsJson && form.actionsJson.length > 0) {
        code += `\n# [Actions]\n`;
        form.actionsJson.forEach((act: any) => {
            let paramList: string[] = [];

            // 1. 处理 Selector (只处理 REVERSE_SELECTOR_MAP 中定义的 Key)
            if (act.selector) {
                Object.entries(act.selector).forEach(([key, value]) => {
                    // 过滤空值
                    if (value === null || value === undefined || value === "") return;
                    // 过滤掉 index=0 这种默认值，让代码更简洁
                    if (key === 'index' && value === 0) return;
                    // matchMode 只有在非默认值(exact)时才生成代码，保持简洁
                    if (key === 'matchMode' && value === 'fuzzy') return;

                    // 核心：只生成映射表中存在的 key
                    const dslKey = REVERSE_SELECTOR_MAP[key];
                    if (!dslKey) return;

                    if (typeof value === 'string') paramList.push(`${dslKey}="${value}"`);
                    else paramList.push(`${dslKey}=${value}`);
                });
            }

            // 2. 处理 Parameters
            if (act.parameters) {
                // [过滤逻辑]
                const ignoreCoordActions = ['click', 'long_click', 'input_text', 'assert_text_equals', 'tap_relative'];
                const ignoredParams = ['startX', 'startY', 'endX', 'endY'];

                Object.entries(act.parameters).forEach(([k, v]) => {
                    if (v === null || v === undefined || v === "") return;

                    if (ignoreCoordActions.includes(act.action) && ignoredParams.includes(k)) return;

                    // 这里的 k 是 "text"，查表 REVERSE_ACTION_MAP["text"] 得到 "value"
                    let dslKey = REVERSE_ACTION_MAP[k] || k;

                    // Swipe 特殊处理保持不变...
                    if (act.action === 'swipe') {
                        if (k === 'startX') dslKey = 'start_x';
                        if (k === 'startY') dslKey = 'start_y';
                    }

                    if (typeof v === 'string') paramList.push(`${dslKey}="${v}"`);
                    else paramList.push(`${dslKey}=${v}`);
                });
            }

            // 特殊处理 KeyDown/KeyUp 的参数名简化，保持代码整洁
            if (act.action === 'key_down' || act.action === 'key_up') {
                const key = act.parameters?.keyCode || '';
                code += `action.${act.action}(key="${key}")\n`;
            } else {
                code += `action.${act.action}(${paramList.join(', ')})\n`;
            }
        });
    }

    return code;
};

// ... (parseCode 函数保持不变，因为解析时多解析一些字段没有坏处) ...
export const parseCode = (code: string, originalForm: any): any => {
    // ... 原来的 parseCode 代码 ...
    // 这里不需要变动，原来的 parseCode 已经引用了新的 SELECTOR_PARAM_MAP
    // 而新的 SELECTOR_PARAM_MAP 已经去掉了 xpath/index，所以解析时也会自动忽略这些非核心字段

    // (为了完整性，这里复述一下 parseCode 的核心结构，确保你替换文件时不丢失)
    const newForm = JSON.parse(JSON.stringify(originalForm));
    newForm.priority = 50; newForm.executionCountLimit = 100; newForm.actionLoopCount = 1; newForm.continueAfterMatch = false; newForm.supportedDevices = []; newForm.categoryId = null; newForm.actionsJson = [];
    // [核心修复] 无条件强制重置场景列表数据
    // 无论当前 UI 处于什么状态，解析代码前都必须清空列表，防止脏数据追加
    if (!newForm.sceneSnapshotJson) {
        newForm.sceneSnapshotJson = { primaryMatcher: { matchTargetType: 'text' } };
    }
    newForm.sceneSnapshotJson.secondaryMatchers = [];
    newForm.sceneSnapshotJson.extractors = [];

    if (newForm.sceneSnapshotJson.primaryMatcher) {
        newForm.sceneSnapshotJson.primaryMatcher.pixelPoints = [];
    }

    if (!newForm.sceneSnapshotJson.primaryMatcher) {
        newForm.sceneSnapshotJson.primaryMatcher = { matchTargetType: 'text' };
    }
    newForm.sceneSnapshotJson.primaryMatcher.screenRegion = [];
    newForm.sceneSnapshotJson.primaryMatcher.spatialRelation = null;

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
                if (params.priority !== undefined) newForm.priority = params.priority;
                if (params.limit !== undefined) newForm.executionCountLimit = params.limit;
                if (params.loop !== undefined) newForm.actionLoopCount = params.loop;
                if (params.continue !== undefined) newForm.continueAfterMatch = params.continue;
                if (params.devices) newForm.supportedDevices = params.devices.split('|');
                if (params.category_id !== undefined) newForm.categoryId = params.category_id;
                break;
            case 'description':
                const descMatch = match[2].match(/"([^"]*)"/);
                if (descMatch) newForm.description = descMatch[1];
                break;
            case 'match.ui':
            case 'match.ocr':
                newForm.triggerType = 'scene';
                newForm.sceneSnapshotJson.primaryMatcher.matchTargetType = 'text';
                newForm.sceneSnapshotJson.primaryMatcher.sceneType = (method === 'match.ocr') ? 'ocr' : 'ui';
                if (params.text) newForm.sceneSnapshotJson.primaryMatcher.text = params.text.split('|');
                newForm.sceneSnapshotJson.primaryMatcher.matchMode = params.mode || 'fuzzy';
                if (params.left !== undefined && params.top !== undefined) {
                    newForm.sceneSnapshotJson.primaryMatcher.coordinates = { left: Number(params.left), top: Number(params.top) };
                } else if (newForm.sceneSnapshotJson.primaryMatcher.matchMode === 'fuzzy') {
                    delete newForm.sceneSnapshotJson.primaryMatcher.coordinates;
                }
                break;
            case 'match.pixel':
                newForm.triggerType = 'scene';
                newForm.sceneSnapshotJson.primaryMatcher.matchTargetType = 'pixel';
                if (!newForm.sceneSnapshotJson.primaryMatcher.pixelPoints) {
                    newForm.sceneSnapshotJson.primaryMatcher.pixelPoints = [];
                }
                newForm.sceneSnapshotJson.primaryMatcher.pixelPoints.push({
                    x: params.x || 0,
                    y: params.y || 0,
                    color: params.color || '#FFFFFF',
                    tolerance: params.tol || 15
                });
                break;
            case 'match.ai':
                newForm.triggerType = 'scene';
                newForm.sceneSnapshotJson.primaryMatcher.matchTargetType = 'ai_detect';
                newForm.sceneSnapshotJson.primaryMatcher.modelId = params.model;
                newForm.sceneSnapshotJson.primaryMatcher.targetLabel = params.label;
                newForm.sceneSnapshotJson.primaryMatcher.minConfidence = params.conf || 0.5;
                break;
            case 'match.image':
                newForm.triggerType = 'scene';
                newForm.sceneSnapshotJson.primaryMatcher.matchTargetType = 'image';
                if (params.id) newForm.sceneSnapshotJson.primaryMatcher.templateId = params.id;
                break;
            case 'filter.region':
                const regionStrMatch = match[2].match(/"([^"]*)"/);
                if (regionStrMatch) newForm.sceneSnapshotJson.primaryMatcher.screenRegion = regionStrMatch[1].split('|');
                break;
            case 'filter.spatial':
                if (params.op && params.anchor) {
                    newForm.sceneSnapshotJson.primaryMatcher.spatialRelation = { operator: params.op, anchorMatcher: { text: params.anchor.split('|') } };
                }
                break;
            case 'and_match':
            case 'not_match':
                newForm.sceneSnapshotJson.secondaryMatchers.push({ text: params.text ? params.text.split('|') : [], isExclusion: method === 'not_match' });
                break;
            case 'extract':
                if (params.name && params.regex) {
                    newForm.sceneSnapshotJson.extractors.push({
                        name: params.name,
                        regex: params.regex,
                        scope: params.scope || 'matched_node'
                    });
                }
                break;
            default:
                if (method.startsWith('action.')) {
                    const actionType = method.replace('action.', '');
                    const newAction: any = {
                        id: uuidv4(),
                        action: actionType,
                        parameters: {},
                        selector: {}
                    };

                    Object.entries(params).forEach(([k, v]) => {
                        // 1. Selector 映射
                        if (SELECTOR_PARAM_MAP[k]) {
                            const selectorKey = SELECTOR_PARAM_MAP[k];
                            newAction.selector[selectorKey] = v;
                        }
                        // 2. Parameters 映射
                        else {
                            // 这里 k 如果是 "value"，ACTION_PARAM_MAP["value"] -> "text"
                            const uiKey = ACTION_PARAM_MAP[k] || k;
                            newAction.parameters[uiKey] = v;
                        }
                    });

                    newForm.actionsJson.push(newAction);
                }
                break;
        }
    });
    return newForm;
};

/**
 * =================================================================
 *  Test Package DSL Logic
 * =================================================================
 */

/**
 * 生成测试包代码
 * Package Form -> DSL Code
 */
export const generatePackageCode = (form: any, id?: number | string | null): string => {
    const displayId = id || 'NEW';
    let code = `# AdFlowPro Package DSL id: ${displayId}\n\n`;

    // 1. Basic Config
    code += `# [Basic]\n`;
    let configParams = [`name="${form.name}"`];
    if (form.categoryId) configParams.push(`category_id=${form.categoryId}`);
    if (form.isCommon) configParams.push(`common=True`);
    code += `config(${configParams.join(', ')})\n`;

    if (form.description) {
        code += `description("${form.description}")\n`;
    }

    // 2. Atom Sequence
    if (form.atoms && form.atoms.length > 0) {
        code += `\n# [Atoms Sequence]\n`;
        form.atoms.forEach((atom: any) => {
            // name 是为了可读性，解析时主要看 id
            code += `atom.call(id=${atom.atomId}, name="${atom.name}")\n`;
        });
    }

    return code;
};

/**
 * 解析测试包代码
 * DSL Code -> Package Form
 * @param code 代码字符串
 * @param originalForm 原始表单（用于保留引用）
 * @param allAtoms 所有可用的原子操作列表（用于根据 ID 查找完整对象）
 */
export const parsePackageCode = (code: string, originalForm: any, allAtoms: any[]): any => {
    const newForm = JSON.parse(JSON.stringify(originalForm));

    // 重置默认值
    newForm.isCommon = false;
    newForm.categoryId = null;
    newForm.atoms = []; // 清空现有列表

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
                if (params.category_id !== undefined) newForm.categoryId = params.category_id;
                if (params.common !== undefined) newForm.isCommon = params.common;
                break;

            case 'description':
                const descMatch = match[2].match(/"([^"]*)"/);
                if (descMatch) newForm.description = descMatch[1];
                break;

            case 'atom.call':
                if (params.id) {
                    // 关键：根据 ID 从全量池中找到对应的 atom 对象
                    const atomObj = allAtoms.find(a => a.atomId === params.id);
                    if (atomObj) {
                        newForm.atoms.push(atomObj);
                    } else {
                        console.warn(`[DSL] Atom ID ${params.id} not found in available pool.`);
                        // 可选：创建一个占位对象，防止数据彻底丢失，虽然 UI 上可能显示不全
                        // newForm.atoms.push({ atomId: params.id, name: params.name || `Unknown Atom ${params.id}` });
                    }
                }
                break;
        }
    });

    return newForm;
};

/**
 * =================================================================
 *  Test Suite DSL Logic
 * =================================================================
 */

/**
 * 生成测试套件代码
 * Suite Form -> DSL Code
 */
export const generateSuiteCode = (form: any, id?: number | string | null): string => {
    const displayId = id || 'NEW';
    let code = `# AdFlowPro Suite DSL id: ${displayId}\n\n`;

    // 1. Basic Config
    code += `# [Basic]\n`;
    let configParams = [`name="${form.name}"`];
    if (form.targetAppPackage) configParams.push(`app="${form.targetAppPackage}"`);
    code += `config(${configParams.join(', ')})\n`;

    if (form.description) {
        code += `description("${form.description}")\n`;
    }

    // 2. Execution Params (Only generate if non-default or present)
    code += `\n# [Execution Parameters]\n`;
    let execParams = [];
    if (form.defocusGuardTimeoutS !== undefined) execParams.push(`timeout=${form.defocusGuardTimeoutS}`);
    if (form.noMatchDelayMs !== undefined) execParams.push(`delay=${form.noMatchDelayMs}`);
    if (form.postActionDelayMs !== undefined) execParams.push(`post_delay=${form.postActionDelayMs}`);
    if (form.screenshotQuality !== undefined) execParams.push(`quality=${form.screenshotQuality}`);

    if (execParams.length > 0) {
        code += `params(${execParams.join(', ')})\n`;
    }

    // 3. Case Sequence
    if (form.cases && form.cases.length > 0) {
        code += `\n# [Test Cases]\n`;
        form.cases.forEach((c: any) => {
            // 区分线性用例和流程图用例，仅作为注释或标记
            const typeLabel = c.caseType === 'flow' ? 'flow' : 'linear';
            code += `case.call(id=${c.caseId}, name="${c.name}", type="${typeLabel}")\n`;
        });
    }

    return code;
};

/**
 * 解析测试套件代码
 * DSL Code -> Suite Form
 * @param code 代码字符串
 * @param originalForm 原始表单
 * @param allCases 所有可用的测试用例列表 (用于 ID 查找)
 */
export const parseSuiteCode = (code: string, originalForm: any, allCases: any[]): any => {
    const newForm = JSON.parse(JSON.stringify(originalForm));

    // 重置
    newForm.cases = [];

    // 恢复默认参数，防止代码中删除了参数但表单还残留旧值
    newForm.defocusGuardTimeoutS = 30;
    newForm.noMatchDelayMs = 1000;
    newForm.postActionDelayMs = 500;
    newForm.screenshotQuality = 70;

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
                if (params.app) newForm.targetAppPackage = params.app;
                break;

            case 'description':
                const descMatch = match[2].match(/"([^"]*)"/);
                if (descMatch) newForm.description = descMatch[1];
                break;

            case 'params':
                if (params.timeout !== undefined) newForm.defocusGuardTimeoutS = params.timeout;
                if (params.delay !== undefined) newForm.noMatchDelayMs = params.delay;
                if (params.post_delay !== undefined) newForm.postActionDelayMs = params.post_delay;
                if (params.quality !== undefined) newForm.screenshotQuality = params.quality;
                break;

            case 'case.call':
                if (params.id) {
                    const caseObj = allCases.find(c => c.caseId === params.id);
                    if (caseObj) {
                        newForm.cases.push(caseObj);
                    } else {
                        console.warn(`[DSL] Case ID ${params.id} not found.`);
                    }
                }
                break;
        }
    });

    return newForm;
};