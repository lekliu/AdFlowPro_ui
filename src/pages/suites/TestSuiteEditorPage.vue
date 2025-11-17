<template>
  <div class="suite-editor-page">
    <el-page-header @back="goBack" :content="isEditMode ? '编辑测试套件' : '新建测试套件'" class="sticky-header">
      <template #extra>
        <div class="header-actions">
          <el-button @click="goBack">取消</el-button>
          <el-button type="primary" @click="handleSave" :loading="isSaving">保存</el-button>
        </div>
      </template>
    </el-page-header>

    <div v-loading="isLoading" class="editor-content-wrapper">
      <el-card class="box-card">
        <template #header>
          <span>基础信息</span>
        </template>
        <el-form :model="form" ref="formRef" label-width="200px" :rules="rules">
          <el-form-item label="套件名称" prop="name">
            <el-input v-model="form.name" placeholder="例如: V1.2.0 版本回归测试"></el-input>
          </el-form-item>
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
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "TestSuiteEditor",
});
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import draggable from "vuedraggable";
import { Delete, Rank, DocumentCopy, QuestionFilled, Edit } from "@element-plus/icons-vue";

import { useCaseStore } from "@/stores/caseStore";
import { useSuiteStore } from "@/stores/suiteStore";
import { useTabStore } from "@/stores/tabStore";
import type { TestSuiteCreatePayload, TestSuiteUpdatePayload, TestCaseListPublic } from "@/types/api";

const route = useRoute();
const router = useRouter();
// const router = useRouter();
const caseStore = useCaseStore();
const suiteStore = useSuiteStore();
const tabStore = useTabStore();

const suiteId = computed(() => (route.params.suiteId ? Number(route.params.suiteId) : null));
const isEditMode = computed(() => !!suiteId.value);
const isLoading = ref(false);
const isSaving = ref(false);

const formRef = ref<FormInstance>();
const form = reactive<{
  name: string;
  description: string;
  targetAppPackage: string;
  defocusGuardTimeoutS: number | undefined;
  noMatchDelayMs: number | undefined;
  postActionDelayMs: number | undefined;
  screenshotQuality: number | undefined;
  cases: TestCaseListPublic[];
}>({
  name: "",
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

onMounted(async () => {
  isLoading.value = true;
  await caseStore.fetchCases({ skip: 0, limit: 2000 });

  if (isEditMode.value) {
    const suite = await suiteStore.fetchSuiteById(suiteId.value!);
    if (suite) {
      form.name = suite.name;
      form.description = suite.description || "";
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

const handleSave = async () => {
  await formRef.value?.validate();
  isSaving.value = true;
  try {
    const payload = {
      name: form.name,
      description: form.description,
      targetAppPackage: form.targetAppPackage,
      defocusGuardTimeoutS: form.defocusGuardTimeoutS ?? null,
      noMatchDelayMs: form.noMatchDelayMs ?? null,
      postActionDelayMs: form.postActionDelayMs ?? null,
      screenshotQuality: form.screenshotQuality ?? null,
      caseIds: form.cases.map((c) => c.caseId),
    };
    if (isEditMode.value) {
      await suiteStore.updateSuite(suiteId.value!, payload as TestSuiteUpdatePayload);
    } else {
      await suiteStore.addSuite(payload as TestSuiteCreatePayload);
    }
    // After saving successfully, set the refresh flag.
    suiteStore.setNeedsRefresh(true);
    ElMessage.success("保存成功！");
    goBack();
  } catch (error) {
  } finally {
    isSaving.value = false;
  }
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
  font-size: 16px;
}
/* Reduce header height */
:deep(.sticky-header .el-page-header__header) {
  height: 32px;
  line-height: 32px;
}

.suite-editor-page {
  padding: 0;
}
.editor-content-wrapper {
  padding: 0px;
}
.pool-card,
.build-card {
  height: 600px;
  display: flex;
  flex-direction: column;
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