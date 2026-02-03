<template>
  <div class="suite-editor-page">
    <el-page-header @back="goBack" :content="isEditMode ? '编辑测试套件' : '新建测试套件'" class="sticky-header">
      <template #extra>
        <div class="header-actions">
          <el-button type="warning" plain :icon="Monitor" @click="openCodeMode">代码模式</el-button>
          <el-button type="info" plain :icon="MagicStick" @click="openDebugDialog" :disabled="!isEditMode">调试运行</el-button>
          <el-button @click="goBack">取消</el-button>
          <el-button type="primary" plain @click="handleSave(false)" :loading="isSaving">保存草稿</el-button>
          <el-button type="success" :icon="Upload" @click="handleSaveAndPublish" :loading="isSaving">发布上线</el-button>
        </div>
      </template>
    </el-page-header>

    <div v-loading="isLoading" class="editor-content-wrapper">
      <el-card class="box-card">
        <template #header>
          <span>基础信息</span>
        </template>
        <el-form :model="form" ref="formRef" label-width="200px" :rules="rules">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="套件名称" prop="name">
                <el-input v-model="form.name" placeholder="例如: V1.2.0 版本回归测试"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="所属分类" prop="categoryId">
                <el-select v-model="form.categoryId" placeholder="选择分类" clearable filterable style="width: 100%">
                  <el-option v-for="cat in categoryStore.allCategories" :key="cat.categoryId" :label="cat.name" :value="cat.categoryId" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="目标App包名" prop="targetAppPackage">
            <el-input v-model="form.targetAppPackage" placeholder="可选, 如: com.example.app"></el-input>
          </el-form-item>
          <el-form-item label="描述" prop="description">
            <el-input v-model="form.description" type="textarea" placeholder="描述此套件的测试范围和目的"></el-input>
          </el-form-item>

          <el-divider content-position="left">执行参数 (可选)</el-divider>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="失焦守护超时(秒)" prop="defocusGuardTimeoutS">
                <div class="form-item-content">
                  <el-input-number
                    v-model="form.defocusGuardTimeoutS"
                    :min="0"
                    :step="1"
                    controls-position="right"
                    placeholder="默认 30"
                    style="width: 100%"
                  />
                  <el-tooltip content="应用失焦后, 等待多久开始自动恢复。留空使用默认值(30秒)。" placement="top">
                    <el-icon class="form-item-tooltip"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="无动作后固定延迟(ms)" prop="noMatchDelayMs">
                <div class="form-item-content">
                  <el-input-number
                    v-model="form.noMatchDelayMs"
                    :min="0"
                    :step="100"
                    controls-position="right"
                    placeholder="默认 1000"
                    style="width: 100%"
                  />
                  <el-tooltip content="未匹配到任何场景时, 下一轮匹配前的等待间隔。留空使用默认值(1秒)。" placement="top">
                    <el-icon class="form-item-tooltip"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="动作后固定延迟(ms)" prop="postActionDelayMs">
                <div class="form-item-content">
                  <el-input-number
                    v-model="form.postActionDelayMs"
                    :min="0"
                    :step="100"
                    controls-position="right"
                    placeholder="默认 500"
                    style="width: 100%"
                  />
                  <el-tooltip content="每个动作执行成功后的固定等待, 用于处理UI过渡动画。留空使用默认值(0.5秒)。" placement="top">
                    <el-icon class="form-item-tooltip"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="失败截图质量" prop="screenshotQuality">
                <div class="form-item-content">
                  <el-input-number
                    v-model="form.screenshotQuality"
                    :min="0"
                    :max="100"
                    controls-position="right"
                    placeholder="默认 70"
                    style="width: 100%"
                  />
                  <el-tooltip content="失败截图的JPEG压缩质量(0-100)。留空使用默认值(70)。" placement="top">
                    <el-icon class="form-item-tooltip"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </el-card>

      <el-row :gutter="6" style="margin-top: 6px">
        <el-col :span="10">
          <el-card class="pool-card" body-style="padding: 0;">
            <template #header>
              <span>测试用例池</span>
            </template>
            <div class="pool-content">
              <el-input v-model="caseSearch" placeholder="搜索测试用例" clearable class="pool-search" />
              <draggable
                class="draggable-list"
                :list="availableCases"
                :group="{ name: 'cases', pull: 'clone', put: false }"
                :sort="false"
                item-key="caseId"
                :clone="cloneCase"
                tag="div"
              >
                <template #item="{ element }">
                  <div class="draggable-item" :class="{ 'is-disabled': element.disabled }">
                    <el-icon><DocumentCopy /></el-icon>
                    <el-tag size="small" :type="element.caseType === 'flow' ? 'warning' : 'info'" disable-transitions>
                      {{ element.caseType === 'flow' ? "流" : "线" }}
                    </el-tag>
                    <span class="item-text">{{ element.name }}</span>
                  </div>
                </template>
              </draggable>
            </div>
          </el-card>
        </el-col>
        <el-col :span="14">
          <el-card class="build-card" body-style="padding: 0;">
            <template #header>
              <span>套件内容 (拖拽排序)</span>
            </template>
            <div class="pool-content">
              <draggable class="draggable-list" v-model="form.cases" group="cases" item-key="caseId" handle=".drag-handle" tag="div">
                <template #item="{ element, index }">
                  <div class="draggable-item-selected">
                    <el-icon class="drag-handle"><Rank /></el-icon>
                    <el-tag size="small" :type="element.caseType === 'flow' ? 'warning' : 'info'" disable-transitions>
                      {{ element.caseType === 'flow' ? "流" : "线" }}
                    </el-tag>
                    <span class="item-text">{{ element.name }}</span>
                    <div>
                      <el-button type="primary" :icon="Edit" circle plain size="small" @click="handleEditCase(element.caseId)" />
                      <el-button type="danger" :icon="Delete" circle plain size="small" @click="removeCase(index)" />
                    </div>
                  </div>
                </template>
              </draggable>
              <el-empty v-if="form.cases.length === 0" description="从左侧拖拽测试用例到此处" :image-size="80" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
    <DslEditorDialog
        v-model="codeDialog.visible"
        v-model:code="codeDialog.code"
        title="测试套件 DSL 配置"
        helpText="使用 case.call(id=xxx) 编排用例执行序列"
        @apply="handleApplyCode"
        @editor-mount="handleDslEditorMount"
    />

    <!-- 调试运行弹窗 -->
    <el-dialog v-model="debugDialog.visible" title="调试运行 (草稿模式)" width="450px">
      <p style="margin-bottom: 15px; color: #666; font-size: 13px">
        此模式将使用当前的草稿配置直接运行，<b>不更新</b>线上版本号，<b>不影响</b>其他设备。
      </p>
      <el-form label-position="top">
        <el-form-item label="目标设备 (在线)">
          <el-select v-model="debugDialog.deviceId" placeholder="选择设备" style="width: 100%">
            <el-option v-for="d in onlineDevices" :key="d.deviceId" :label="d.deviceName || d.deviceId" :value="d.deviceId" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标应用包名 (可选，覆盖默认)">
          <el-input v-model="debugDialog.targetApp" :placeholder="form.targetAppPackage || 'com.example.app'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="debugDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="handleDebugRun" :disabled="!debugDialog.deviceId" :loading="debugDialog.loading">
          立即调试
        </el-button>
      </template>
    </el-dialog>
  </div>

</template>

<script setup lang="ts">
import {useDeviceStore} from "@/stores/deviceStore";

defineOptions({
  name: "TestSuiteEditor",
});
import { ref, reactive, computed, onMounted, defineProps } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import draggable from "vuedraggable";
import { Delete, Rank, DocumentCopy, QuestionFilled, Edit,MagicStick } from "@element-plus/icons-vue";

import { useCaseStore } from "@/stores/caseStore";
import { useSuiteStore } from "@/stores/suiteStore";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { useTabStore } from "@/stores/tabStore";
import type { TestSuiteCreatePayload, TestSuiteUpdatePayload, TestCaseListPublic } from "@/types/api";
import DslEditorDialog from "@/components/dialogs/DslEditorDialog.vue";
import { generateSuiteCode, parseSuiteCode } from "@/utils/dslService";
import { Monitor, Upload } from "@element-plus/icons-vue";
import { suiteService } from "@/api/suiteService";
import {jobService} from "@/api/jobService";

const props = defineProps<{ suiteId?: string | number }>();

const route = useRoute();
const router = useRouter();
// const router = useRouter();
const caseStore = useCaseStore();
const categoryStore = useAtomCategoryStore();
const suiteStore = useSuiteStore();
const tabStore = useTabStore();

const suiteId = computed(() => (props.suiteId ? Number(props.suiteId) : null));
const isEditMode = computed(() => !!suiteId.value);
const isLoading = ref(false);
const isSaving = ref(false);

const formRef = ref<FormInstance>();
const form = reactive<{
  name: string;
  categoryId: number | null;
  description: string;
  targetAppPackage: string;
  defocusGuardTimeoutS: number | undefined;
  noMatchDelayMs: number | undefined;
  postActionDelayMs: number | undefined;
  screenshotQuality: number | undefined;
  cases: TestCaseListPublic[];
}>({
  name: "",
  categoryId: null,
  description: "",
  targetAppPackage: "",
  defocusGuardTimeoutS: 30,
  noMatchDelayMs: 1000,
  postActionDelayMs: 500,
  screenshotQuality: 70,
  cases: [],
});

const rules = reactive<FormRules>({
  name: [{ required: true, message: "请输入套件名称", trigger: "blur" }],
  defocusGuardTimeoutS: [{ type: "number", min: 0, message: "超时时间必须为非负数", trigger: "blur" }],
  noMatchDelayMs: [{ type: "number", min: 0, message: "延迟时间必须为非负数", trigger: "blur" }],
  postActionDelayMs: [{ type: "number", min: 0, message: "延迟时间必须为非负数", trigger: "blur" }],
  screenshotQuality: [{ type: "number", min: 0, max: 100, message: "质量值必须在 0 到 100 之间", trigger: "blur" }],
});

const caseSearch = ref("");
const deviceStore = useDeviceStore();

const onlineDevices = computed(() => deviceStore.devices.filter((d) => d.isConnectedWs));

const selectedCaseIds = computed(() => new Set(form.cases.map((c) => c.caseId)));

const availableCases = computed(() => {
  const searched = caseStore.cases.filter((c) => c.name.toLowerCase().includes(caseSearch.value.toLowerCase()) || (c.description && c.description.toLowerCase().includes(caseSearch.value.toLowerCase())));
  return searched.map((c) => ({
    ...c,
    disabled: selectedCaseIds.value.has(c.caseId),
  }));
});

const cloneCase = (original: TestCaseListPublic & { disabled: boolean }) => {
  if (original.disabled) {
    ElMessage.warning(`测试用例 "${original.name}" 已存在于套件中。`);
    return undefined;
  }
  const { disabled, ...caseToClone } = original;
  return caseToClone;
};

// Script 部分
const debugDialog = reactive({
  visible: false,
  deviceId: "",
  targetApp: "",
  loading: false
});

const openDebugDialog = () => {
  deviceStore.fetchDevices({ limit: 100 });
  debugDialog.deviceId = "";
  debugDialog.targetApp = form.targetAppPackage;
  debugDialog.visible = true;
};

const handleDebugRun = async () => {
  // 先自动保存草稿，确保后端取到最新数据（或者也可以改为前端直接传 JSON，但保存草稿更安全）
  await handleSave(false);

  debugDialog.loading = true;
  try {
    const res = await jobService.runDebugJob({
      suiteId: suiteId.value!,
      deviceId: debugDialog.deviceId,
      targetAppPackageName: debugDialog.targetApp || form.targetAppPackage
    });
    ElMessage.success(`调试任务 #${res.jobId} 已发送`);
    debugDialog.visible = false;
    // 可选：跳转到详情页监控
    // router.push({ name: "JobDetail", params: { jobId: res.jobId } });
  } catch (e) {
    // error handled
  } finally {
    debugDialog.loading = false;
  }
};

onMounted(async () => {
  isLoading.value = true;
  await caseStore.fetchCases({ skip: 0, limit: 2000 });
  await categoryStore.fetchAllCategories();

  if (isEditMode.value) {
    const suite = await suiteStore.fetchSuiteById(suiteId.value!);
    if (suite) {
      form.name = suite.name;
      form.description = suite.description || "";
      form.categoryId = suite.categoryId || null;
      form.targetAppPackage = suite.targetAppPackage || "";
      form.defocusGuardTimeoutS = suite.defocusGuardTimeoutS ?? 30;
      form.noMatchDelayMs = suite.noMatchDelayMs ?? 1000;
      form.postActionDelayMs = suite.postActionDelayMs ?? 500;
      form.screenshotQuality = suite.screenshotQuality ?? 70;
      form.cases = suite.cases || [];
    }
  }
  isLoading.value = false;
});

const removeCase = (index: number) => form.cases.splice(index, 1);
const goBack = () => {
  // 我们从 route 对象获取当前完整路径
  const currentPath = route.fullPath;
  // 然后我们告诉 tabStore 移除这个标签页。
  tabStore.removeTab(currentPath);
};

const handleEditCase = (caseId: number) => {
  router.push({ name: "TestCaseEditor", params: { caseId } });
};

const handleSave = async (isPublishing = false) => {
  await formRef.value?.validate();
  isSaving.value = true;
  let savedSuiteId = suiteId.value;

  try {
    const payload = {
      name: form.name,
      description: form.description,
      categoryId: form.categoryId,
      targetAppPackage: form.targetAppPackage,
      defocusGuardTimeoutS: form.defocusGuardTimeoutS ?? null,
      noMatchDelayMs: form.noMatchDelayMs ?? null,
      postActionDelayMs: form.postActionDelayMs ?? null,
      screenshotQuality: form.screenshotQuality ?? null,
      caseIds: form.cases.map((c) => c.caseId),
    };
    if (isEditMode.value) {
      await suiteStore.updateSuite(suiteId.value!, payload as TestSuiteUpdatePayload);
      ElMessage.success("草稿已保存");
    } else {
      // 如果是新建，需要获取返回的 ID
      // 注意：suiteStore.addSuite 目前没返回值，建议修改 store 让其返回 ID，或者这里先简化处理
      // 由于时间关系，这里假设如果是新建，不能直接发布，需要先保存一次
      await suiteStore.addSuite(payload as TestSuiteCreatePayload);
      ElMessage.success("创建成功，请进入编辑页进行发布");
      goBack();
      return; 
    }

    // After saving successfully, set the refresh flag.
    suiteStore.setNeedsRefresh(true);

    if (!isPublishing) {
      goBack();
    }
  } catch (error) {
    console.error(error);
  } finally {
    if (!isPublishing) isSaving.value = false;
  }
  return savedSuiteId;
};

const handleSaveAndPublish = async () => {
  if (!isEditMode.value) return ElMessage.warning("请先保存草稿");
  const id = await handleSave(true); // 先保存草稿
  if (id) {
    const res = await suiteService.publishSuite(id);
    ElMessage.success(`发布成功！当前版本: v${res.versionCode}`);
    goBack();
  }
  isSaving.value = false;
};

// --- Code Mode ---
const codeDialog = reactive({
  visible: false,
  code: "",
});

const openCodeMode = () => {
  codeDialog.code = generateSuiteCode(form, suiteId.value);
  codeDialog.visible = true;
};

const handleApplyCode = () => {
  try {
    // 传入 caseStore.cases 作为全量池
    const updatedForm = parseSuiteCode(codeDialog.code, form, caseStore.cases);
    Object.assign(form, updatedForm);
    ElMessage.success("代码配置已应用！");
    codeDialog.visible = false;
  } catch (error) {
    console.error(error);
    ElMessage.error("代码解析失败。");
  }
};

const handleDslEditorMount = ({ editor, monaco: monacoInstance }: any) => {
  monacoInstance.languages.registerCompletionItemProvider('python', {
    triggerCharacters: ['.', '('],
    provideCompletionItems: function (model: any, position: any) {
      const suggestions = [
        { label: 'config', insertText: 'config(name="${1:Name}", app="${2:com.pkg}")', kind: monacoInstance.languages.CompletionItemKind.Function },
        { label: 'params', insertText: 'params(timeout=${1:30}, delay=${2:1000})', kind: monacoInstance.languages.CompletionItemKind.Function },
        { label: 'case.call', insertText: 'case.call(id=${1:ID})', kind: monacoInstance.languages.CompletionItemKind.Function },
      ];
      return { suggestions };
    }
  });

  editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
    handleApplyCode();
  });
};
</script>

<style scoped>
.sticky-header {
  position: sticky;
  top: -10px; /* Counteract layout padding from parent */
  background-color: var(--el-bg-color-page, #f0f2f5);
  padding: 6px 20px;
  z-index: 10;
  margin: -10px -10px 0 -10px; /* Counteract padding and set bottom margin to 0 */
  border-bottom: 1px solid var(--el-border-color-light);
}

:deep(.sticky-header .el-page-header__content) {
  margin-top: 5px;
  font-size: 14px;
}
:deep(.sticky-header .el-page-header__header) {
  height: 32px;
  line-height: 32px;
}

.suite-editor-page {
  padding: 0;
}
.editor-content-wrapper {
  padding: 0;
}
.pool-card,
.build-card {
  height: calc(100vh - 460px); /* 套件的基础信息卡片更长，所以减去的数值更大一点 */
  min-height: 400px;
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
  gap: 8px;
}
.draggable-item-selected div {
  display: flex;
  justify-content: space-between;
}
.item-text {
  flex-grow: 1;
  font-size: 13px;
}
.drag-handle {
  cursor: grab;
}
.form-item-content {
  display: flex;
  align-items: center;
  width: 100%;
}
.form-item-tooltip {
  margin-left: 8px;
  color: #909399;
  cursor: help;
  flex-shrink: 0;
}
.header-actions {
  display: flex;
  gap: 10px;
}
.draggable-item.is-disabled {
  cursor: not-allowed;
  background-color: #f5f7fa;
  color: #c0c4cc;
  border-color: #e4e7ed;
}
</style>