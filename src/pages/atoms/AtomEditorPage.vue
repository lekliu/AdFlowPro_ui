<template>
  <div class="atom-editor-page">
    <el-page-header @back="goBack" :content="isEditMode ? '编辑原子操作' : '新建原子操作'" class="sticky-header">
      <template #extra>
        <div class="header-actions">
          <!-- 第一组：资产与代码工具 -->
          <el-button-group>

            <el-button v-if="isEditMode" :icon="FolderAdd" @click="openAddToPkg">归属包</el-button>
            <el-button :icon="Monitor" @click="openCodeMode">代码模式</el-button>
            <el-button
                v-if="isEditMode"
                :icon="PieChart"
                @click="openUsageDialog"
            >
              引用分析
            </el-button>
          </el-button-group>

          <!-- 第二组：核心测试动作 (独立突出) -->
          <el-button type="success" :icon="MagicStick" plain @click="openFullAtomTestDialog" style="margin-left: 12px">
            测试原子
          </el-button>

          <el-divider direction="vertical" />

          <!-- 第三组：退出与保存动作 -->
          <el-button :icon="Close" @click="goBack" style="margin-right: 12px">取消</el-button>

          <el-button-group>
            <el-button type="primary" plain :icon="Document" @click="handleSave(false)" :loading="isSaving">
              仅保存
            </el-button>
            <el-button type="primary" :icon="Select" @click="handleSave(true)" :loading="isSaving">
              保存并退出
            </el-button>
          </el-button-group>
        </div>
      </template>
    </el-page-header>

    <div v-loading="isLoading" class="editor-content-wrapper">
      <el-card class="box-card">
        <template #header>
          <div class="card-header">
            <span>基础信息</span>
          </div>
        </template>
        <el-form :model="form" ref="formRef" label-position="top" :rules="rules">
          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="名称" prop="name">
                <el-input v-model="form.name" placeholder="为这个原子操作起一个明确的名称"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="所属分类" prop="categoryId">
                <el-select
                    v-model="form.categoryId"
                    placeholder="选择或创建一个分类"
                    clearable
                    filterable
                    allow-create
                    default-first-option
                    @change="handleCategoryChange"
                    style="width: 100%"
                >
                  <el-option v-for="cat in categoryStore.allCategories" :key="cat.categoryId" :label="cat.name" :value="cat.categoryId" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item prop="priority">
                <template #label>
                  <span>优先级</span>
                  <el-tooltip content="数值越小, 优先级越高。默认50。" placement="top">
                    <el-icon class="form-item-tooltip"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </template>
                <el-input-number v-model="form.priority" :min="0" :max="100" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>

          </el-row>
          <el-row :gutter="20">

            <el-col :span="6">
              <el-form-item prop="executionCountLimit">
                <template #label>
                  <span>最大执行次数</span>
                  <el-tooltip content="在一个用例中, 此原子操作最多被触发的次数。" placement="top">
                    <el-icon class="form-item-tooltip"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </template>
                <el-input-number v-model="form.executionCountLimit" :min="1" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>


            <el-col :span="6">
              <el-form-item prop="continueAfterMatch">
                <template #label>
                  <span>匹配后继续扫描</span>
                  <el-tooltip content="开启后, 执行成功后会立即扫描后续低优先级原子操作。" placement="top">
                    <el-icon class="form-item-tooltip"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </template>
                <el-switch v-model="form.continueAfterMatch" />
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item>
                <template #label>
                  <span>动作序列循环次数</span>
                  <el-tooltip content="场景匹配成功后, 连续执行内部动作序列的次数。" placement="top">
                    <el-icon class="form-item-tooltip"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </template>
                <el-input-number v-model="form.actionLoopCount" :min="1" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>

            <el-col :span="8">
              <el-form-item prop="supportedDevices">
                <template #label>
                  <span>适用机型 (可选)</span>
                  <el-tooltip placement="top">
                    <template #content>
                      <div>留空则适用于所有机型。<br/>支持普通文本(包含匹配)或正则。<br/>例如: "Pixel", "regex:^HUAWEI.*"</div>
                    </template>
                    <el-icon class="form-item-tooltip"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </template>
                <MultiTextInput v-model="form.supportedDevices" placeholder="输入机型关键字或 'regex:...' 后回车" />
              </el-form-item>
            </el-col>

          </el-row>
          <el-row>
            <el-col :span="24">
              <el-form-item label="描述" prop="description">
                <el-input v-model="form.description" type="textarea" placeholder="描述此操作的用途和上下文"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </el-card>

      <el-row :gutter="16" class="main-editor-row">
        <el-col :span="10">
          <el-card>
            <template #header>
              <div class="card-header-flex">
                <div style="display: flex; align-items: center; gap: 15px">
                  <span class="decorated-title">触发条件</span>
                  <!-- 缩小尺寸以节省空间 -->
                  <el-radio-group v-model="form.triggerType" size="small">
                    <el-radio-button value="scene">场景触发</el-radio-button>
                    <el-radio-button value="state">状态触发</el-radio-button>
                  </el-radio-group>
                </div>
                <!-- 仅在场景触发时显示测试按钮 -->
                <el-button
                    v-if="form.triggerType === 'scene'"
                    type="success"
                    link
                    :icon="MagicStick"
                    @click="openValidationDialog"
                >
                  测试匹配
                </el-button>
              </div>
            </template>
            <template v-if="form.triggerType === 'scene'">
              <div class="matchers-list">
                <div class="matcher-container-bg">
                  <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
                    <span style="font-size: 13px; font-weight: bold; color: #606266;">主匹配器 (Primary)</span>
                    <!-- 改为单选按钮组 -->
                    <el-radio-group v-model="form.sceneSnapshotJson.primaryMatcher.matchTargetType" size="small">
                      <el-radio-button value="text">文本</el-radio-button>
                      <el-radio-button value="image">图元</el-radio-button>
                      <el-radio-button value="pixel">像素</el-radio-button>
                      <el-radio-button value="ai_detect">AI</el-radio-button>
                    </el-radio-group>
                  </div>
                  <el-form label-position="top">
                    <component :is="primaryMatcherComponent" v-model="form.sceneSnapshotJson.primaryMatcher" />

                    <!-- Common Filters -->
                    <el-form-item label="屏幕区域 (可选)">
                      <div class="region-selector-container">
                        <ScreenRegionSelector v-model="form.sceneSnapshotJson.primaryMatcher.screenRegion" />
                        <el-tooltip content="约束匹配到的元素的中心点必须位于屏幕的指定区域内。" placement="top">
                          <el-icon class="form-item-tooltip"><QuestionFilled /></el-icon>
                        </el-tooltip>
                      </div>
                    </el-form-item>

                    <template v-if="form.sceneSnapshotJson.primaryMatcher.matchTargetType === 'text'">
                      <el-button
                          v-if="!form.sceneSnapshotJson.primaryMatcher.spatialRelation"
                          type="primary"
                          link
                          :icon="Plus"
                          @click="addSpatialRelation"
                      >
                        添加空间约束
                      </el-button>
                      <div v-else class="spatial-relation-box">
                        <div class="spatial-header">
                          <span>空间约束</span>
                          <el-button type="danger" link :icon="Delete" @click="removeSpatialRelation">移除</el-button>
                        </div>
                        <el-form-item label="关系">
                          <el-select v-model="form.sceneSnapshotJson.primaryMatcher.spatialRelation.operator" style="width: 100%">
                            <el-option label="在...的右侧" value="RIGHT_OF" />
                            <el-option label="在...的左侧" value="LEFT_OF" />
                            <el-option label="在...的上方" value="ABOVE" />
                            <el-option label="在...的下方" value="BELOW" />
                            <el-option label="在...的附近" value="NEAR" />
                          </el-select>
                        </el-form-item>
                        <el-form-item label="锚点匹配文本">
                          <MultiTextInput v-model="anchorMatcherText" placeholder="输入备选锚点文本后按回车" />
                        </el-form-item>
                      </div>
                    </template>
                  </el-form>
                </div>

                <template v-if="form.sceneSnapshotJson.primaryMatcher.matchTargetType === 'text'">
                  <div v-for="(matcher, index) in form.sceneSnapshotJson.secondaryMatchers" :key="index" class="matcher-item">
                    <el-card shadow="never" class="matcher-card">
                      <template #header>
                        <div class="card-header">
                          <el-divider content-position="left">次级匹配器 {{ index + 1 }}</el-divider>
                          <el-button type="danger" :icon="Delete" circle plain size="small" @click="removeSecondaryMatcher(index)" />
                        </div>
                      </template>
                      <el-form label-position="top">
                        <el-form-item label="匹配类型">
                          <el-switch v-model="matcher.isExclusion" active-text="排除 (NOT)" inactive-text="包含 (AND)" />
                        </el-form-item>
                        <el-form-item label="匹配文本">
                          <MultiTextInput
                              :model-value="getSecondaryMatcherText(index)"
                              @update:model-value="setSecondaryMatcherText(index, $event)"
                              placeholder="输入备选文本后按回车"
                          />
                        </el-form-item>
                      </el-form>
                    </el-card>
                  </div>
                  <el-button @click="addSecondaryMatcher" :icon="Plus" type="primary" plain>添加次级匹配条件</el-button>
                </template>
              </div>

              <!-- 新增：数据提取器区域 -->

              <el-divider content-position="center">数据提取 (Extractors)</el-divider>
              <div class="extractors-container-bg">
              <div class="extractors-list">
                <div v-for="(extractor, index) in form.sceneSnapshotJson.extractors" :key="index" class="extractor-row">
                  <el-input v-model="extractor.name" placeholder="变量名" style="width: 120px" />
                  <span class="eq-sign">=</span>
                  <el-input v-model="extractor.regex" placeholder="正则 (e.g. 余额:(\d+))" style="flex-grow: 1" />
                  <el-select v-model="extractor.scope" placeholder="范围" style="width: 110px">
                    <el-option label="当前节点" value="matched_node" />
                    <el-option label="全屏文本" value="full_screen" />
                  </el-select>
                  <el-button type="danger" :icon="Delete" circle plain size="small" @click="removeExtractor(index)" />
                </div>
                <div v-if="form.sceneSnapshotJson.extractors.length === 0" class="empty-tip">
                  暂无提取规则
                </div>
                <el-button type="primary" link :icon="Plus" @click="addExtractor">添加提取规则</el-button>
              </div>
              </div>
            </template>
            <StateConditionEditor v-else v-model="form.stateCondition" />
          </el-card>
        </el-col>
        <el-col :span="14">
          <ActionSequenceEditor mode="editor" v-model="form.actionsJson" />
        </el-col>
      </el-row>

     </div>

    <AddToPackageDialog ref="addToPkgDialog" />
    <el-dialog v-model="liveTestDialog.visible" :title="dialogTitle" width="400px">
      <el-form label-position="top">
        <el-form-item label="选择一个在线设备进行验证">
          <el-select v-model="liveTestDialog.targetDeviceId" placeholder="请选择设备" style="width: 100%" :loading="deviceStore.isLoading">
            <el-option
                v-for="device in onlineDevices"
                :key="device.deviceId"
                :label="`${device.deviceName} (${device.deviceId})`"
                :value="device.deviceId"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="liveTestDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="handleLiveTest" :disabled="!liveTestDialog.targetDeviceId"> 开始 </el-button>
      </template>
    </el-dialog>
    <!-- [新增] 引用分析弹窗 -->
    <el-dialog
        v-model="usageDialogVisible"
        title="资产血缘与引用分析"
        width="800px"
        destroy-on-close
        append-to-body
    >
      <div style="padding: 10px 0;">
        <p style="margin-bottom: 20px; color: #909399; font-size: 13px;">
          <el-icon><InfoFilled /></el-icon>
          正在分析当前原子操作被哪些测试用例和测试包所引用。
        </p>
        <!-- 引入原有的分析组件 -->
        <AtomUsagePanel :atom-id="atomIdNum!" />
      </div>
      <template #footer>
        <el-button @click="usageDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
    <DslEditorDialog
        v-model="codeDialog.visible"
        v-model:code="codeDialog.code"
        title="原子操作 DSL 配置"
        helpText="支持一行一条指令，格式如 config(name='Val')"
        @apply="handleApplyCode"
        @editor-mount="handleDslEditorMount"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AtomEditor" });
import { ref, reactive, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { v4 as uuidv4 } from "uuid";
import StateConditionEditor from "@/components/editors/StateConditionEditor.vue";
import { Delete, Plus, QuestionFilled, MagicStick, Select, Close, FolderAdd, Monitor, Document,PieChart } from "@element-plus/icons-vue";
import AddToPackageDialog from "@/components/dialogs/AddToPackageDialog.vue";
import ScreenRegionSelector from "@/components/ScreenRegionSelector.vue";
import MultiTextInput from "@/components/MultiTextInput.vue";
import ActionSequenceEditor from "@/components/ActionSequenceEditor.vue";
import DslEditorDialog from "@/components/dialogs/DslEditorDialog.vue";
import { cleanupActionSequence, cleanupSceneSnapshot, cleanupStateCondition } from "@/utils/payloadCleaner";
import { useAtomStore } from "@/stores/atomStore";
import { useTabStore } from "@/stores/tabStore";
import type { AtomicOperationCreatePayload, AtomicOperationUpdatePayload, Matcher, SecondaryMatcher, Extractor, PerformActionPayload, StateCondition } from "@/types/api";
import TextMatcherEditor from "@/components/editors/TextMatcherEditor.vue";
import ImageMatcherEditor from "@/components/editors/ImageMatcherEditor.vue";
import PixelMatcherEditor from "@/components/editors/PixelMatcherEditor.vue";
import AiMatcherEditor from "@/components/editors/AiMatcherEditor.vue";
import { useDeviceStore } from "@/stores/deviceStore";
import AtomUsagePanel from "@/components/AtomUsagePanel.vue";
import { wsService } from "@/services/wsService";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { useWebSocketStore } from "@/stores/webSocketStore";
import { imageTemplateService } from "@/api/imageTemplateService";
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import { generateCode, parseCode } from "@/utils/dslService";

const props = defineProps<{ atomId?: string | number }>();
const route = useRoute();
const router = useRouter();
const atomStore = useAtomStore();
const tabStore = useTabStore();
const deviceStore = useDeviceStore();
const addToPkgDialog = ref<InstanceType<typeof AddToPackageDialog> | null>(null);
const wsStore = useWebSocketStore();
const categoryStore = useAtomCategoryStore();
const formRef = ref<FormInstance>();

const atomIdNum = computed(() => (props.atomId ? Number(props.atomId) : null));
const isEditMode = computed(() => !!atomIdNum.value);

const isLoading = ref(false);
const isSaving = ref(false);
const liveTestDialog = reactive({ visible: false, targetDeviceId: "", testType: "matcher" as "matcher" | "full_atom" });
const onlineDevices = computed(() => deviceStore.devices.filter((d) => d.isConnectedWs));

// --- [新增] 控制引用分析弹窗的状态 ---
const usageDialogVisible = ref(false);

const openUsageDialog = () => {
  usageDialogVisible.value = true;
};

const createNewPrimaryMatcher = (): Matcher => ({
  matchTargetType: "text",
  sceneType: "ui",
  text: [],
  matchMode: "fuzzy",
  screenRegion: [],
  spatialRelation: null,
  coordinates: undefined,
  templateId: null,
  publicUrl: "",
  matchThreshold: 0.8,
  imageMatchStrategy: "best",
  modelId: "",
  targetLabel: "",
  minConfidence: 0.5,
});
const createNewSecondaryMatcher = (): SecondaryMatcher => ({ text: [], isExclusion: false });
const createNewExtractor = (): Extractor => ({ name: "", regex: "", scope: "matched_node" });
const createNewFormState = () => ({
  name: "",
  description: "",
  categoryId: null as number | null,
  triggerType: "scene" as "scene" | "state",
  priority: 50,
  executionCountLimit: 100,
  continueAfterMatch: false,
  actionLoopCount: 1,
  supportedDevices: [] as string[],
  sceneSnapshotJson: { primaryMatcher: createNewPrimaryMatcher(), secondaryMatchers: [] as SecondaryMatcher[], extractors: [] as Extractor[] },
  actionsJson: [] as (PerformActionPayload & { id: string })[],
  stateCondition: { conditionType: "variable_comparison", parameters: {} } as StateCondition,
});

const form = reactive(createNewFormState());

const rules = reactive<FormRules>({ name: [{ required: true, message: "请输入原子操作名称", trigger: "blur" }] });
const dialogTitle = computed(() => (liveTestDialog.testType === "matcher" ? "实时匹配验证" : "测试完整原子操作"));

const primaryMatcherComponent = computed(() => {
  const type = form.sceneSnapshotJson.primaryMatcher.matchTargetType;
  if (type === "text") return TextMatcherEditor;
  if (type === "image") return ImageMatcherEditor;
  if (type === "pixel") return PixelMatcherEditor;
  if (type === "ai_detect") return AiMatcherEditor;
  return TextMatcherEditor;
});

watch(
    () => form.triggerType,
    (newType) => {
      if (newType === 'scene') {
        form.stateCondition = { conditionType: 'variable_comparison', parameters: {} };
      } else {
        form.sceneSnapshotJson = createNewFormState().sceneSnapshotJson;
      }
    }
);

watch(
    () => form.sceneSnapshotJson.primaryMatcher.matchTargetType,
    (newType, oldType) => {
      if (newType === oldType) return;
      const pm = form.sceneSnapshotJson.primaryMatcher;
      if (newType === "image") {
        pm.text = [];
        pm.matchMode = "fuzzy";
        delete pm.coordinates;
        pm.spatialRelation = null;
        form.sceneSnapshotJson.secondaryMatchers = [];
      } else if (newType === "text") {
        pm.templateId = null;
        pm.publicUrl = "";
        pm.matchThreshold = 0.8;
        pm.imageMatchStrategy = "best";
        pm.sceneType = pm.sceneType || "ui";
      }
    }
);

const anchorMatcherText = computed({
  get: () => {
    const r = form.sceneSnapshotJson.primaryMatcher.spatialRelation;
    if (!r) return [];
    const t = r.anchorMatcher.text;
    return Array.isArray(t) ? (t as string[]) : t ? [t] : [];
  },
  set: (v) => {
    const r = form.sceneSnapshotJson.primaryMatcher.spatialRelation;
    if (r) r.anchorMatcher.text = v;
  },
});

const getSecondaryMatcherText = (i: number): string[] => {
  const m = form.sceneSnapshotJson.secondaryMatchers[i];
  if (!m) return [];
  const t = m.text;
  return Array.isArray(t) ? (t as string[]) : t ? [t] : [];
};

const setSecondaryMatcherText = (i: number, v: string[]) => {
  const m = form.sceneSnapshotJson.secondaryMatchers[i];
  if (m) m.text = v;
};

const loadAtomData = async (id: number) => {
  isLoading.value = true;
  try {
    const atom = await atomStore.fetchAtomById(id);
    if (atom) {
      form.name = atom.name;
      form.description = atom.description || "";
      form.categoryId = atom.categoryId || null;
      form.triggerType = atom.triggerType || "scene";
      form.priority = atom.priority;
      form.executionCountLimit = atom.executionCountLimit;
      form.continueAfterMatch = atom.continueAfterMatch;
      form.actionLoopCount = atom.actionLoopCount || 1;
      form.supportedDevices = atom.supportedDevices || [];
      form.actionsJson = atom.actionsJson.map((a) => ({ ...a, id: uuidv4() }));

      if (atom.sceneSnapshotJson) {
        const snapshot = atom.sceneSnapshotJson as any;
        const normalizeTextOnLoad = (matcher: { text?: string | string[] }) => {
          if (typeof matcher.text === "string") {
            matcher.text = [matcher.text];
          }
        };
        if (snapshot.primaryMatcher) {
          normalizeTextOnLoad(snapshot.primaryMatcher);
          if (snapshot.primaryMatcher.spatialRelation?.anchorMatcher) {
            normalizeTextOnLoad(snapshot.primaryMatcher.spatialRelation.anchorMatcher);
          }
        }
        if (snapshot.secondaryMatchers) {
          snapshot.secondaryMatchers.forEach(normalizeTextOnLoad);
        }
        if (!snapshot.extractors) {
          snapshot.extractors = [];
        }
        if (!snapshot.primaryMatcher.matchTargetType) snapshot.primaryMatcher.matchTargetType = "text";
        if (snapshot.type && !snapshot.primaryMatcher.sceneType) snapshot.primaryMatcher.sceneType = snapshot.type;
        delete snapshot.type;
        form.sceneSnapshotJson = snapshot;
      }

      if (atom.stateCondition) {
        form.stateCondition = atom.stateCondition;
      }

      const pm = form.sceneSnapshotJson.primaryMatcher;
      if (pm.matchTargetType === "image" && pm.templateId) {
        try {
          const templateDetails = await imageTemplateService.getTemplateById(String(pm.templateId));
          if (templateDetails) {
            pm.publicUrl = templateDetails.publicUrl || "";
          }
        } catch (e) {
          console.error(`Failed to fetch publicUrl for templateId ${pm.templateId}`, e);
          ElMessage.error(`加载图元预览(ID: ${pm.templateId})失败`);
        }
      }

      tabStore.updateTabTitle(route.fullPath, atom.name);
    }
  } catch (error) {
    console.error("Failed to load atom data:", error);
    ElMessage.error("加载原子操作数据失败");
  } finally {
    isLoading.value = false;
  }
};

const openAddToPkg = () => {
  if (atomIdNum.value) {
    addToPkgDialog.value?.open(atomIdNum.value);
  }
};

onMounted(() => {
  if (isEditMode.value) {
    loadAtomData(atomIdNum.value!);
  } else {
    isLoading.value = false;
    tabStore.updateTabTitle(route.fullPath, "新建原子操作");
  }
});

onMounted(() => categoryStore.fetchAllCategories());

const openValidationDialog = () => {
  deviceStore.fetchDevices({ limit: 1000 });
  liveTestDialog.targetDeviceId = "";
  liveTestDialog.testType = "matcher";
  liveTestDialog.visible = true;
};
const openFullAtomTestDialog = () => {
  deviceStore.fetchDevices({ limit: 1000 });
  liveTestDialog.targetDeviceId = "";
  liveTestDialog.testType = "full_atom";
  liveTestDialog.visible = true;
};
const handleLiveTest = () => {
  if (!liveTestDialog.targetDeviceId) {
    ElMessage.error("请选择一个目标设备");
    return;
  }
  if (!wsStore.isLogPanelVisible) {
    wsStore.toggleLogPanel();
  }
  switch (liveTestDialog.testType) {
    case "matcher": {
      const cleanedSnapshot = cleanupSceneSnapshot(JSON.parse(JSON.stringify(form.sceneSnapshotJson)));
      wsService.sendValidateMatcher(liveTestDialog.targetDeviceId, cleanedSnapshot);
      ElMessage.info("匹配验证请求已发送，请在底部状态栏查看结果。");
      break;
    }
    case "full_atom": {
      // Use cleanup logic based on trigger type
      let cleanedSnapshot = undefined;
      let cleanedStateCondition = undefined;

      if (form.triggerType === 'scene') {
          cleanedSnapshot = cleanupSceneSnapshot(JSON.parse(JSON.stringify(form.sceneSnapshotJson)));
      } else {
          cleanedStateCondition = cleanupStateCondition(JSON.parse(JSON.stringify(form.stateCondition)));
      }

      const cleanedActions = cleanupActionSequence(JSON.parse(JSON.stringify(form.actionsJson)));

      wsService.sendTestFullAtom(liveTestDialog.targetDeviceId, {
        triggerType: form.triggerType,
        sceneSnapshotJson: cleanedSnapshot,
        stateCondition: cleanedStateCondition,
        actionsJson: cleanedActions
      });
      ElMessage.info("完整原子操作测试请求已发送，请在底部状态栏查看结果。");
      break;
    }
  }
  liveTestDialog.visible = false;
};
const addSpatialRelation = () => {
  form.sceneSnapshotJson.primaryMatcher.spatialRelation = { operator: "RIGHT_OF", anchorMatcher: { text: [] } };
};
const removeSpatialRelation = () => {
  form.sceneSnapshotJson.primaryMatcher.spatialRelation = null;
};
const addSecondaryMatcher = () => form.sceneSnapshotJson.secondaryMatchers.push(createNewSecondaryMatcher());
const removeSecondaryMatcher = (index: number) => form.sceneSnapshotJson.secondaryMatchers.splice(index, 1);
const addExtractor = () => form.sceneSnapshotJson.extractors.push(createNewExtractor());
const removeExtractor = (index: number) => form.sceneSnapshotJson.extractors.splice(index, 1);
const goBack = () => tabStore.removeTab(route.fullPath);

const handleCategoryChange = async (value: number | string) => {
  if (typeof value === "string") {
    // User is creating a new category
    try {
      const newCategory = await categoryStore.addCategory({ name: value });
      form.categoryId = newCategory.categoryId; // Set the new ID
      ElMessage.success(`新分类 "${value}" 已创建！`);
    } catch (error) {
      form.categoryId = null; // Revert on failure
    }
  }
};

const handleSave = async (shouldExit = true) => {
  if (!formRef.value) return;
  await formRef.value.validate();

  if (form.triggerType === 'scene') {
    const pm = form.sceneSnapshotJson.primaryMatcher;
    if (pm.matchTargetType === "text") {
      const t = Array.isArray(pm.text) ? pm.text : [pm.text];
      if (!t || t.length === 0) {
        ElMessage.error("主匹配器的“匹配文本”不能为空。");
        return;
      }
    } else if (pm.matchTargetType === "image") {
      if (!pm.templateId) {
        ElMessage.error("主匹配器为图元模式时，必须选择一个图元模板。");
        return;
      }
    }
    if (
        pm.spatialRelation &&
        (!pm.spatialRelation.anchorMatcher.text ||
            (Array.isArray(pm.spatialRelation.anchorMatcher.text) && pm.spatialRelation.anchorMatcher.text.length === 0))
    ) {
      ElMessage.error("空间约束中的“锚点匹配文本”不能为空。");
      return;
    }
    if (form.sceneSnapshotJson.secondaryMatchers.some((m) => !m.text || (Array.isArray(m.text) && m.text.length === 0))) {
      ElMessage.error("所有次级匹配器的“匹配文本”不能为空。");
      return;
    }
  }
  if (form.actionsJson.length === 0) {
    ElMessage.error("必须添加至少一个执行动作。");
    return;
  }
  isSaving.value = true;
  try {
    const payload = JSON.parse(JSON.stringify(form));
    // Clean based on trigger type
    if (payload.triggerType === 'scene') {
      payload.sceneSnapshotJson = cleanupSceneSnapshot(payload.sceneSnapshotJson);
      payload.stateCondition = null;
    } else {
      payload.stateCondition = cleanupStateCondition(payload.stateCondition);
      payload.sceneSnapshotJson = null;
    }
    payload.actionsJson = cleanupActionSequence(payload.actionsJson);
    if (isEditMode.value) {
      await atomStore.updateAtom(atomIdNum.value!, payload as AtomicOperationUpdatePayload);
      ElMessage.success("已保存更新");
      // [核心修复] 保存成功后，立即同步更新标签页标题，反映最新的原子操作名称
      tabStore.updateTabTitle(route.fullPath, form.name);
    } else {
      const oldPath = route.fullPath;
      const res = await atomStore.addAtom(payload as AtomicOperationCreatePayload);
      ElMessage.success("创建成功");
      if (!shouldExit && res && res.atomId) {
        // 仅在不退出时执行标签变身
        const newPath = router.resolve({ name: 'AtomEditor', params: { atomId: res.atomId } }).fullPath;
        tabStore.morphTab(oldPath, newPath, form.name);
        router.replace(newPath);
      }
    }
    atomStore.setNeedsRefresh(true);

    if (shouldExit) {
      goBack();
    }

  } catch (error) {
  } finally {
    isSaving.value = false;
  }
};

// --- Code Mode State ---
const codeDialog = reactive({
  visible: false,
  code: "",
});

const openCodeMode = () => {
  // 1. 生成代码
  codeDialog.code = generateCode(form, atomIdNum.value);
  codeDialog.visible = true;
};

const handleApplyCode = () => {
  try {
    // 2. 解析代码
    const updatedForm = parseCode(codeDialog.code, form);

    // 3. 应用变更 (Object.assign 保持响应式引用)
    // 注意：我们需要深拷贝回来的属性，特别是数组
    Object.assign(form, updatedForm);

    // 4. 特殊处理：如果是 actionsJson，需要确保 ID 存在 (dslService已经生成了临时ID)
    // 但为了保险，我们可以重新生成一下 UUID
    form.actionsJson = updatedForm.actionsJson.map((a: any) => ({
      ...a,
      id: a.id || uuidv4()
    }));

    ElMessage.success("代码配置已应用，界面已更新！");
    codeDialog.visible = false;
  } catch (error) {
    console.error(error);
    ElMessage.error("代码解析失败，请检查语法格式。");
  }
};

// 定义 DSL 智能提示数据
const createDependencyProposals = (range: any, monaco: any) => {
  return [
    // 1. 顶层指令
    {
      label: 'config',
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: '基础配置',
      insertText: 'config(name="${1:名称}", priority=${2:50})',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: range
    },
    {
      label: 'description',
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: '描述信息',
      insertText: 'description("${1:描述内容}")',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: range
    },
    {
      label: 'action',
      kind: monaco.languages.CompletionItemKind.Module,
      documentation: '动作命名空间',
      insertText: 'action',
      range: range
    },
    {
      label: 'match',
      kind: monaco.languages.CompletionItemKind.Module,
      documentation: '匹配命名空间',
      insertText: 'match',
      range: range
    },
    {
      label: 'filter',
      kind: monaco.languages.CompletionItemKind.Module,
      documentation: '过滤器命名空间',
      insertText: 'filter',
      range: range
    },
    {
      label: 'state',
      kind: monaco.languages.CompletionItemKind.Module,
      documentation: '状态触发命名空间',
      insertText: 'state',
      range: range
    },
    {
      label: 'and_match',
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: '包含条件 (AND)',
      insertText: 'and_match(text="${1:text}")',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: range
    },
    {
      label: 'not_match',
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: '排除条件 (NOT)',
      insertText: 'not_match(text="${1:text}")',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: range
    },
    {
      label: 'extract',
      kind: monaco.languages.CompletionItemKind.Function,
      documentation: '数据提取',
      insertText: 'extract(name="${1:varName}", regex="${2:(.*)}", scope="${3:matched_node}")',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: range
    }
  ];
};

const createActionProposals = (range: any, monaco: any) => {
  const actions = [
    { label: 'click', args: 'text="${1:text}"', doc: '点击元素' },
    { label: 'input_text', args: 'text="${1:text}"', doc: '输入文本' },
    { label: 'wait', args: 'ms=${1:1000}', doc: '等待毫秒' },
    { label: 'swipe', args: 'start_x=${1:500}, start_y=${2:1000}, end_y=${3:200}, ms=${4:500}', doc: '滑动' },
    { label: 'tap', args: 'x=${1:0}, y=${2:0}', doc: '坐标点击' },
    { label: 'press_key', args: 'keyCode="${1:home}"', doc: '按物理键' },
    { label: 'assert_text_equals', args: 'text="${1:text}"', doc: '断言文本相等' },
    { label: 'report_value', args: 'var="${1:key}", val="${2:value}"', doc: '上报数据' },
    { label: 'kill_app', args: 'package="${1:com.example}"', doc: '杀进程' },
    { label: 'wake_up', args: '', doc: '唤醒屏幕' },
    { label: 'sleep', args: '', doc: '熄屏' },
  ];

  return actions.map(act => ({
    label: act.label,
    kind: monaco.languages.CompletionItemKind.Method,
    documentation: act.doc,
    insertText: `${act.label}(${act.args})`,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range: range
  }));
};

const createMatchProposals = (range: any, monaco: any) => {
  return [
    { label: 'ui', insertText: 'ui(text="${1:text}", mode="fuzzy")', doc: '匹配UI元素。Mode: fuzzy, exact, all_match, not_all_match' },
    { label: 'ocr', insertText: 'ocr(text="${1:text}")', doc: '匹配OCR文本。Mode: fuzzy, exact, regex' },
    { label: 'image', insertText: 'image(id="${1:templateId}")', doc: '匹配图元' },
  ].map(m => ({
    label: m.label,
    kind: monaco.languages.CompletionItemKind.Method,
    documentation: m.doc,
    insertText: m.insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range: range
  }));
};

const createFilterProposals = (range: any, monaco: any) => {
  return [
    { label: 'region', insertText: 'region("${1:BOTTOM_CENTER}")', doc: '屏幕区域过滤' },
    { label: 'spatial', insertText: 'spatial(op="${1:RIGHT_OF}", anchor="${2:text}")', doc: '空间位置过滤' },
  ].map(m => ({
    label: m.label,
    kind: monaco.languages.CompletionItemKind.Method,
    documentation: m.doc,
    insertText: m.insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range: range
  }));
};

const createStateProposals = (range: any, monaco: any) => {
  return [
    {
      label: 'var',
      insertText: 'var(var="${1:left}", op="${2:==}", val="${3:right}")',
      doc: '变量或公式比较触发器'
    },
    {
      label: 'app',
      insertText: 'app(status="${1:foreground}")',
      doc: '应用前后台状态触发器 (foreground/background)'
    },
  ].map(m => ({
    label: m.label,
    kind: monaco.languages.CompletionItemKind.Method,
    documentation: m.doc,
    insertText: m.insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range: range
  }));
};

// 编辑器加载完成后的回调
const handleDslEditorMount = ({ editor, monaco: monacoInstance }: any) => {
  // 1. 注册自动补全提供者
  monacoInstance.languages.registerCompletionItemProvider('python', {
    triggerCharacters: ['.'], // 键入 . 时触发
    provideCompletionItems: function (model: any, position: any) {
      // 获取当前行直到光标位置的文本
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      });

      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      // 1. 如果输入了 'action.'，提示动作
      if (textUntilPosition.match(/action\.$/)) {
        return { suggestions: createActionProposals(range, monacoInstance) };
      }
      // 2. 如果输入了 'match.'，提示匹配器
      if (textUntilPosition.match(/match\.$/)) {
        return { suggestions: createMatchProposals(range, monacoInstance) };
      }
      // 3. 如果输入了 'filter.'，提示过滤器
      if (textUntilPosition.match(/filter\.$/)) {
        return { suggestions: createFilterProposals(range, monacoInstance) };
      }
      // 4. 如果输入了 'state.'，提示状态触发器
      if (textUntilPosition.match(/state\.$/)) {
        return { suggestions: createStateProposals(range, monacoInstance) };
      }

      // 4. 默认提示顶层指令 (不在注释行内)
      if (!textUntilPosition.trim().startsWith('#') && !textUntilPosition.includes('.')) {
        return { suggestions: createDependencyProposals(range, monacoInstance) };
      }

      return { suggestions: [] };
    }
  });

  // 2. 绑定 Ctrl+S 保存快捷键
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

/* Adjust the font size of the page header content to be more compact */
:deep(.sticky-header .el-page-header__content) {
  margin-top: 5px;
  font-size: 14px;
}
/* Reduce header height */
:deep(.sticky-header .el-page-header__header) {
  height: 32px;
  line-height: 32px;
}


.atom-editor-page {
  padding: 0; /* REMOVE PADDING FROM ROOT */
}
.editor-content-wrapper {
  padding: 0px; /* ADD PADDING TO CONTENT WRAPPER */
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.matchers-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.matcher-card {
  border: 1px solid #dcdfe6;
}
.form-item-tooltip {
  margin-left: 8px;
  color: #909399;
  cursor: help;
}
.spatial-relation-box {
  border: 1px dashed #b1b3b8;
  border-radius: 4px;
  padding: 10px;
  margin-top: 10px;
  background-color: #fcfcfc;
}
.spatial-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: 500;
  color: #606266;
}
.region-selector-container {
  display: flex;
  align-items: center;
  gap: 8px;
}
:deep(.matcher-type-switch .el-radio-button__inner) {
  min-width: 55px;
  padding: 8px 8px;
  font-size: 13px;
  text-align: center;
}
/* 修改后的数据提取区域背景样式（淡桃红/淡红色） */
.extractors-container-bg {
  /* 使用 Element Plus 规范的危险/错误色系的极浅色 */
  background-color: #fef0f0;
  /* 配合浅粉色的边框 */
  border: 1px solid #fde2e2;

  padding: 15px;
  border-radius: 8px;
  margin-top: 10px;
}
.extractor-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  background-color: transparent;
}
.eq-sign {
  font-weight: bold;
  color: var(--el-text-color-secondary);
}
.empty-tip {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  margin-bottom: 8px;
}

/* 确保顶栏容器不换行且垂直居中 */
.header-actions {
  display: flex;
  align-items: center;
}

/* 按钮组内部文字稍微缩小一点点，增加精致感 */
.header-actions :deep(.el-button) {
  padding: 8px 15px;
  font-weight: 500;
}

/* 垂直分割线的间距 */
.el-divider--vertical {
  margin: 0 15px;
  height: 24px;
}

/* 修正 Label 中图标的间距 */
.help-icon {
  margin-left: 4px;
  color: #909399;
  font-size: 14px;
  vertical-align: middle;
  cursor: help;
}

/* 强行让 Switch 在 Form Item 里垂直居中，不破坏整体高度 */
.switch-container {
  height: 32px; /* 对应输入框的标准高度 */
  display: flex;
  align-items: center;
}

/* 统一卡片内边距，增加呼吸感 */
.box-card :deep(.el-card__body) {
  padding: 20px 25px;
}

/* 统一卡片头部布局 */
.card-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* 蓝色指示条标题 */
.decorated-title {
  position: relative;
  padding-left: 12px;
  font-weight: 700;
  color: #1f2f3d;
  font-size: 14px;
}
.decorated-title::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 14px;
  background: #409eff;
  border-radius: 2px;
}

/* 内部匹配器区块稍微压暗，形成层次 */
.matcher-container-bg {
  background-color: #fdf6ec;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #faecd8;
  margin-bottom: 15px;
}

/* 修正卡片 Body 的内边距 */
.full-height-card :deep(.el-card__body) {
  padding: 15px;
}
</style>