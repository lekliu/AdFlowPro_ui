<template>
  <div class="case-editor-page" style="padding: 0px">
    <el-page-header @back="goBack" :content="isEditMode ? '编辑测试用例' : '新建测试用例'" class="sticky-header">
      <template #extra>
        <div class="header-actions">
          <el-button v-if="isEditMode" type="success" :icon="MagicStick" plain @click="openTestDialog"> 测试此用例 </el-button>
          <el-button type="warning" plain :icon="Monitor" @click="openCodeMode">代码模式</el-button>
          <el-button @click="goBack">取消</el-button>
          <!-- 拆分为两个按钮 -->
          <el-button type="primary" plain @click="handleSave(false)" :loading="isSaving">仅保存</el-button>
          <el-button type="primary" @click="handleSave(true)" :loading="isSaving">保存并退出</el-button>
        </div>
      </template>
    </el-page-header>
    <div v-loading="isLoading" class="editor-content-wrapper">
      <el-card class="box-card">
        <template #header>
          <span>基础信息</span>
        </template>
        <el-form :model="form" ref="formRef" label-position="top" :rules="rules">
          <el-row :gutter="6">
            <el-col :span="8">
              <el-form-item label="名称" prop="name">
                <el-input v-model="form.name" placeholder="为用例起一个明确的业务场景名称"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="用例类型" prop="caseType">
                <el-radio-group v-model="form.caseType" :disabled="isEditMode">
                  <el-radio-button value="linear">线性用例</el-radio-button>
                  <el-radio-button value="flow">流程图用例</el-radio-button>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="所属分类" prop="categoryId">
                <el-select v-model="form.categoryId" placeholder="选择分类" clearable filterable style="width: 100%">
                  <el-option v-for="cat in categoryStore.allCategories" :key="cat.categoryId" :label="cat.name" :value="cat.categoryId" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="用例总超时(秒)" prop="totalTimeoutS">
                <el-input-number v-model="form.totalTimeoutS" :min="5" controls-position="right" placeholder="默认 600" style="width: 100%" />
                <el-tooltip content="单个用例执行的最长总时间。留空使用默认值 (30分钟)。" placement="top">
                  <el-icon style="margin-left: 8px; color: #909399; cursor: help"><QuestionFilled /></el-icon>
                </el-tooltip>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="描述" prop="description" style="margin-top: 10px">
            <el-input v-model="form.description" type="textarea" placeholder="描述此用例验证的端到端业务流程"></el-input>
          </el-form-item>
        </el-form>
      </el-card>

      <div class="editor-content">
        <!-- Linear Case Editor -->
        <el-row v-if="form.caseType === 'linear'" :gutter="6" style="margin-top: 6px">
          <el-col :span="10">
            <el-card class="pool-card" body-style="padding: 0;">
              <template #header>
                <div class="pool-header">
                  <span>测试包池</span>
                  <!-- 新增分类筛选 -->
                  <el-select v-model="packageCategoryFilter" placeholder="按分类筛选" clearable size="small" style="width: 150px">
                    <el-option v-for="cat in categoryStore.allCategories" :key="cat.categoryId" :label="cat.name" :value="cat.categoryId" />
                  </el-select>
                </div>
              </template>
              <div class="pool-content">
                <el-input v-model="packageSearch" placeholder="搜索测试包" clearable class="pool-search" />
                <draggable
                    class="draggable-list"
                    :list="availablePackages"
                    :group="{ name: 'packages', pull: 'clone', put: false }"
                    :sort="false"
                    item-key="packageId"
                    :clone="clonePackage"
                    tag="div"
                >
                  <template #item="{ element }">
                    <div class="draggable-item" :class="{ 'is-disabled': element.disabled }">
                      <el-icon><TakeawayBox /></el-icon>
                      <span class="item-text">{{ element.name }}</span>
                      <el-tag v-if="element.category" type="info" size="small">{{ element.category.name }}</el-tag>
                      <el-tag v-if="element.isCommon" size="small">公共</el-tag>
                    </div>
                  </template>
                </draggable>
              </div>
            </el-card>
          </el-col>
          <el-col :span="14">
            <el-card class="build-card" body-style="padding: 0;">
              <template #header><span>测试用例内容 (拖拽排序)</span></template>
              <div class="pool-content">
                <draggable class="draggable-list" v-model="form.packages" group="packages" item-key="packageId" handle=".drag-handle" tag="div">
                  <template #item="{ element, index }">
                    <div class="draggable-item-selected">
                      <el-icon class="drag-handle"><Rank /></el-icon>
                      <span class="item-text">{{ element.name }}</span>
                      <el-tag v-if="element.category" type="info" size="small">{{ element.category.name }}</el-tag>
                      <div>
                        <el-button type="primary" :icon="Edit" circle plain size="small" @click="handleEditPackage(element.packageId)" />
                        <el-button type="danger" :icon="Delete" circle plain size="small" @click="removePackage(index)" />
                      </div>
                    </div>
                  </template>
                </draggable>
                <el-empty v-if="form.packages.length === 0" description="从左侧拖拽测试包到此处" :image-size="80" />
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- Flow Case Editor -->
        <el-card v-else class="box-card" style="margin-top: 6px">
          <template #header>
            <span>流程图编辑器</span>
          </template>
          <FlowchartEditor ref="flowchartEditorRef" :graph-data="form.flowchartData" />
        </el-card>
      </div>
    </div>

    <!-- Live Test Dialog -->
    <el-dialog v-model="testDialog.visible" title="测试此测试用例" width="400px">
      <el-form label-position="top">
        <el-form-item label="选择一个在线设备执行">
          <el-select
            v-model="testDialog.targetDeviceId"
            placeholder="请选择设备"
            style="width: 100%"
            :loading="deviceStore.isLoading"
          >
            <el-option
              v-for="device in onlineDevices"
              :key="device.deviceId"
              :label="`${device.deviceName} (${device.deviceId})`"
              :value="device.deviceId" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="testDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="handleTestLinearCase" :disabled="!testDialog.targetDeviceId"> 开始执行 </el-button>
      </template>
    </el-dialog>

    <!-- 在 root div 的最后添加弹窗 -->
    <el-dialog
        v-model="codeDialog.visible"
        title="编程式配置 (Suite DSL)"
        width="800px"
        top="5vh"
        :close-on-click-modal="false"
    >
      <div class="code-editor-container" style="height: 60vh; border: 1px solid #dcdfe6">
        <vue-monaco-editor
            v-model:value="codeDialog.code"
            theme="vs"
            language="python"
            :options="{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true }"
            @mount="handleEditorMount"
        />
      </div>
      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center">
      <span style="color: #909399; font-size: 12px">
        提示：请确保 Case ID 真实存在。
      </span>
          <div>
            <el-button @click="codeDialog.visible = false">取消</el-button>
            <el-button type="primary" @click="handleApplyCode">运行并生成界面</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "TestCaseEditor",
});
import { ref, reactive, computed, onMounted, defineProps } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, type FormInstance, type FormRules, ElIcon } from "element-plus";
import draggable from "vuedraggable";
import { Delete, Rank, TakeawayBox, QuestionFilled, Edit, MagicStick, Monitor } from "@element-plus/icons-vue";

import FlowchartEditor from "@/components/editors/FlowchartEditor.vue";
import { usePackageStore } from "@/stores/packageStore";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { useAtomStore } from "@/stores/atomStore";
import { useCaseStore } from "@/stores/caseStore";
import { useTabStore } from "@/stores/tabStore";
import { useDeviceStore } from "@/stores/deviceStore";
import { useWebSocketStore } from "@/stores/webSocketStore";
import { wsService } from "@/services/wsService";
import type { TestCaseCreatePayload, TestCaseUpdatePayload, TestPackagePublic } from "@/types/api";
import type  GraphData  from "@logicflow/core";
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import { generateCaseCode, parseCaseCode } from "@/utils/dsl/caseDslService";

const props = defineProps<{ caseId?: string | number }>();
const route = useRoute();
const router = useRouter();
const packageStore = usePackageStore();
const categoryStore = useAtomCategoryStore();
const atomStore = useAtomStore();
const caseStore = useCaseStore();
const tabStore = useTabStore();
const deviceStore = useDeviceStore();
const wsStore = useWebSocketStore();

const caseId = computed(() => (props.caseId ? Number(props.caseId) : null));
const isEditMode = computed(() => !!caseId.value);
const isLoading = ref(false);
const isSaving = ref(false);

const formRef = ref<FormInstance>();
const flowchartEditorRef = ref<InstanceType<typeof FlowchartEditor> | null>(null);

const form = reactive<{
  name: string;
  description: string;
  totalTimeoutS: number | undefined;
  categoryId: number | null;
  packages: TestPackagePublic[];
  caseType: "linear" | "flow";
  flowchartData: any; // Allow any object for flowchart data
}>({
  name: "",
  description: "",
  totalTimeoutS: 1800, // 默认30分钟
  categoryId: null,
  packages: [],
  caseType: "linear",
  flowchartData: null
});

const rules = reactive<FormRules>({
  name: [{ required: true, message: "请输入测试用例名称", trigger: "blur" }],
  totalTimeoutS: [{ type: "number", min: 5, message: "超时时间必须不小于 5 秒", trigger: "blur" }],
});

const packageSearch = ref("");
const packageCategoryFilter = ref<number | "">("");

const testDialog = reactive({
  visible: false,
  targetDeviceId: "",
});

const onlineDevices = computed(() => deviceStore.devices.filter((d) => d.isConnectedWs));

const selectedPackageIds = computed(() => new Set(form.packages.map((p) => p.packageId)));

const availablePackages = computed(() => {
  const searched = packageStore.packages.filter(
      (pkg) =>
          (!packageCategoryFilter.value || pkg.category?.categoryId === packageCategoryFilter.value) &&
          (pkg.name.toLowerCase().includes(packageSearch.value.toLowerCase()) ||
          (pkg.description && pkg.description.toLowerCase().includes(packageSearch.value.toLowerCase())))
  );

  return searched.map((pkg) => ({
    ...pkg,
    disabled: selectedPackageIds.value.has(pkg.packageId),
  }));
});

const clonePackage = (original: TestPackagePublic & { disabled: boolean }) => {
  if (original.disabled) {
    ElMessage.warning(`测试包 "${original.name}" 已存在于用例中。`);
    return undefined;
  }
  const { disabled, ...pkgToClone } = original;
  return pkgToClone;
};

onMounted(async () => {
  isLoading.value = true;
  await Promise.all([
    packageStore.fetchPackages({ skip: 0, limit: 2000 }),
    atomStore.fetchAtoms({ skip: 0, limit: 2000 }),
    categoryStore.fetchAllCategories(),
    deviceStore.fetchDevices({ limit: 1000 }),
  ]);

  if (isEditMode.value) {
    const cs = await caseStore.fetchCaseById(caseId.value!);
    if (cs) {
      form.name = cs.name;
      form.description = cs.description || "";
      form.caseType = cs.caseType;
      form.totalTimeoutS = cs.totalTimeoutS || 600;
      form.categoryId = cs.categoryId || null;
      form.packages = cs.packages || [];
      form.flowchartData = (cs.flowchartData as GraphData) || null;
    }
  }
  isLoading.value = false;
});

const removePackage = (index: number) => {
  form.packages.splice(index, 1);
};

const handleEditPackage = (packageId: number) => {
  router.push({ name: "TestPackageEditor", params: { packageId } });
};

const goBack = () => {
  tabStore.removeTab(route.fullPath);
};

const openTestDialog = () => {
  testDialog.targetDeviceId = "";
  testDialog.visible = true;
};

const handleTestLinearCase = () => {
  if (!wsStore.isLogPanelVisible) {
    wsStore.toggleLogPanel();
  }
  wsService.sendValidateTestCase(caseId.value!, testDialog.targetDeviceId);
  ElMessage.info("测试用例验证请求已发送，请在底部状态栏查看结果。");
  testDialog.visible = false;
};

const handleSave = async (shouldExit = true) => {
  if (!formRef.value) return;
  await formRef.value.validate();

  isSaving.value = true;
  try {
    // 1. 定义一个临时的、可修改的 payload 变量
    let payload: TestCaseCreatePayload | TestCaseUpdatePayload;

    if (form.caseType === "flow") {
      const graphData = flowchartEditorRef.value?.getData();
      payload = {
        name: form.name,
        description: form.description,
        categoryId: form.categoryId,
        caseType: "flow",
        totalTimeoutS: form.totalTimeoutS,
        flowchartData: graphData,
      };
    } else {
      payload = {
        name: form.name,
        description: form.description,
        categoryId: form.categoryId,
        caseType: "linear",
        totalTimeoutS: form.totalTimeoutS,
        packageIds: form.packages.map((p) => p.packageId),
      };
    }

    // 2. 在调用 store 之前，打印这个 payload 的最终形态
    if (isEditMode.value) {
      await caseStore.updateCase(caseId.value!, payload as TestCaseUpdatePayload);
      ElMessage.success("已保存更新");
    } else {
      const res = await caseStore.addCase(payload as TestCaseCreatePayload);
      ElMessage.success("创建成功");
      //# [核心修复] 如果是新建，保存后将路由切换到编辑模式，防止重复创建
      //# [核心修复] 增加空值检查，且 res 现在有了正确的类型
      if (res && res.caseId) {
        router.replace({ name: 'TestCaseEditor', params: { caseId: res.caseId } });
      }
    }

    caseStore.setNeedsRefresh(true);

    if (shouldExit) {
      goBack();
    }
  } catch (error) {
    // API client interceptor handles the message
  } finally {
    isSaving.value = false;
  }
};

const codeDialog = reactive({
  visible: false,
  code: "",
});

const openCodeMode = () => {
  // Flowchart 数据需要从编辑器组件获取最新的
  if (form.caseType === 'flow' && flowchartEditorRef.value) {
    form.flowchartData = flowchartEditorRef.value.getData();
  }
  codeDialog.code = generateCaseCode(form, caseId.value);
  codeDialog.visible = true;
};

const handleApplyCode = () => {
  try {
    const updatedForm = parseCaseCode(codeDialog.code, form, packageStore.packages);

    // 关键：如果更新了 flowchart 数据，需要通知 LogicFlow 重新渲染
    // 通过重新赋值给 form.flowchartData，触子组件的 watch

    Object.assign(form, updatedForm);

    // 强制刷新 FlowchartEditor (如果存在)
    if (form.caseType === 'flow') {
      // 这里稍微 hack 一下，确保引用更新
      form.flowchartData = { ...updatedForm.flowchartData };
    }

    ElMessage.success("代码配置已应用！");
    codeDialog.visible = false;
  } catch (error) {
    console.error(error);
    ElMessage.error("代码解析失败。");
  }
};

const handleEditorMount = (editor: any, monacoInstance: any) => {
  // 注册 Case DSL 的智能提示
  monacoInstance.languages.registerCompletionItemProvider('python', {
    triggerCharacters: ['.', '('],
    provideCompletionItems: function (model: any, position: any) {
      const suggestions = [
        // 基础配置
        {
          label: 'config',
          kind: monacoInstance.languages.CompletionItemKind.Function,
          insertText: 'config(name="${1:Name}", type="${2:linear|flow}")',
          insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet
        },

        // 线性模式指令
        {
          label: 'package.call',
          kind: monacoInstance.languages.CompletionItemKind.Function,
          insertText: 'package.call(id=${1:ID})',
          insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet
        },

        // 流程图模式指令 - 节点
        {
          label: 'node.start',
          kind: monacoInstance.languages.CompletionItemKind.Function,
          insertText: 'node.start(id="${1:start_1}", x=${2:100}, y=${3:200})',
          insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet
        },
        {
          label: 'node.state',
          kind: monacoInstance.languages.CompletionItemKind.Function,
          insertText: 'node.state(id="${1:state_1}", text="${2:Login}", x=${3:300}, y=${4:200})',
          insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet
        },
        {
          label: 'node.end',
          kind: monacoInstance.languages.CompletionItemKind.Function,
          insertText: 'node.end(id="${1:end_1}", x=${2:600}, y=${3:200})',
          insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet
        },

        // 流程图模式指令 - 连线
        {
          label: 'edge',
          kind: monacoInstance.languages.CompletionItemKind.Function,
          insertText: 'edge(src="${1:id}", tgt="${2:id}", start="${3:right}", end="${4:left}")',
          insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet
        },

        // 流程图模式指令 - 全局触发器
        {
          label: 'global.atoms',
          kind: monacoInstance.languages.CompletionItemKind.Function,
          insertText: 'global.atoms([${1:101, 102}])',
          insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet
        },
      ];
      return { suggestions };
    }
  });

  // 绑定 Ctrl+S 快捷键
  editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
    handleApplyCode();
  });
};
</script>

<style scoped>
.sticky-header {
  position: sticky;
  top: -10px;
  background-color: var(--el-bg-color-page, #f0f2f5);
  padding: 6px 6px;
  z-index: 10;
  margin: -10px -10px 0 -10px;
  border-bottom: 1px solid var(--el-border-color-light);
}

:deep(.sticky-header .el-page-header__content) {
  margin-top: 5px;
  font-size: 14px;
}

.case-editor-page {
  padding: 0;
}
.editor-content-wrapper {
  margin-top: 0;
}
.pool-card,
.build-card {
  height: 600px;
  display: flex;
  flex-direction: column;
}
:deep(.pool-card .el-card__body),
:deep(.build-card .el-card__body) {
  flex-grow: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pool-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pool-content {
  flex-grow: 1;
  overflow-y: auto;
  padding: 10px;
}
.pool-search {
  margin: 0 10px 10px 10px;
  width: calc(100% - 20px);
}
.draggable-list {
  min-height: 50px;
}
.draggable-item,
.draggable-item-selected {
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  margin-bottom: 8px;
  background-color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}
.draggable-item {
  cursor: grab;
}
.draggable-item-selected {
  justify-content: space-between;
}
.draggable-item-selected {
  gap: 8px;
}
.draggable-item-selected div {
  display: flex;
}
.item-text {
  flex-grow: 1;
  font-size: 13px;
}
.drag-handle {
  cursor: grab;
}
.draggable-item.is-disabled {
  cursor: not-allowed;
  background-color: #f5f7fa;
  color: #c0c4cc;
  border-color: #e4e7ed;
}
.el-tag {
  margin-left: 8px;
}
</style>