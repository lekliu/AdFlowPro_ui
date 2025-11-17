<template>
  <div class="case-editor-page">
    <el-page-header @back="goBack" :content="isEditMode ? '编辑测试用例' : '新建测试用例'" class="sticky-header">
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
        <el-form :model="form" ref="formRef" label-position="top" :rules="rules">
          <el-row :gutter="6">
            <el-col :span="10">
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
            <el-col :span="8">
              <el-form-item label="用例总超时(秒)" prop="totalTimeoutS">
                <el-input-number v-model="form.totalTimeoutS" :min="5" controls-position="right" placeholder="默认 600" style="width: 100%" />
                <el-tooltip content="单个用例执行的最长总时间。留空使用默认值 (30分钟)。" placement="top">
                  <el-icon style="margin-left: 8px; color: #909399; cursor: help"><QuestionFilled /></el-icon>
                </el-tooltip>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="描述" prop="description">
            <el-input v-model="form.description" type="textarea" placeholder="描述此用例验证的端到端业务流程"></el-input>
          </el-form-item>
        </el-form>
      </el-card>

      <div class="editor-content">
        <!-- Linear Case Editor -->
        <el-row v-if="form.caseType === 'linear'" :gutter="6" style="margin-top: 20px">
          <el-col :span="10">
            <el-card class="pool-card" body-style="padding: 0;">
              <template #header><span>测试包池</span></template>
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
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "TestCaseEditor",
});
import { ref, reactive, computed, onMounted, defineAsyncComponent } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, type FormInstance, type FormRules, ElIcon } from "element-plus";
import draggable from "vuedraggable";
import { Delete, Rank, TakeawayBox, QuestionFilled, Edit } from "@element-plus/icons-vue";

import FlowchartEditor from "@/components/editors/FlowchartEditor.vue";
import { usePackageStore } from "@/stores/packageStore";
import { useAtomStore } from "@/stores/atomStore";
import { useCaseStore } from "@/stores/caseStore";
import { useTabStore } from "@/stores/tabStore";
import type { TestCaseCreatePayload, TestCaseUpdatePayload, TestPackagePublic } from "@/types/api";
import type  GraphData  from "@logicflow/core";

const route = useRoute();
const router = useRouter();
const packageStore = usePackageStore();
const atomStore = useAtomStore();
const caseStore = useCaseStore();
const tabStore = useTabStore();

const caseId = computed(() => (route.params.caseId ? Number(route.params.caseId) : null));
const isEditMode = computed(() => !!caseId.value);
const isLoading = ref(false);
const isSaving = ref(false);

const formRef = ref<FormInstance>();
const flowchartEditorRef = ref<InstanceType<typeof FlowchartEditor> | null>(null);

const form = reactive<{
  name: string;
  description: string;
  totalTimeoutS: number | undefined;
  packages: TestPackagePublic[];
  caseType: "linear" | "flow";
  flowchartData: any; // Allow any object for flowchart data
}>({
  name: "",
  description: "",
  totalTimeoutS: 1800, // 默认30分钟
  packages: [],
  caseType: "linear",
  flowchartData: null
});

const rules = reactive<FormRules>({
  name: [{ required: true, message: "请输入测试用例名称", trigger: "blur" }],
  totalTimeoutS: [{ type: "number", min: 5, message: "超时时间必须不小于 5 秒", trigger: "blur" }],
});

const packageSearch = ref("");

const selectedPackageIds = computed(() => new Set(form.packages.map((p) => p.packageId)));

const availablePackages = computed(() => {
  const searched = packageStore.packages.filter(
      (pkg) =>
          pkg.name.toLowerCase().includes(packageSearch.value.toLowerCase()) ||
          (pkg.description && pkg.description.toLowerCase().includes(packageSearch.value.toLowerCase()))
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
  ]);

  if (isEditMode.value) {
    const cs = await caseStore.fetchCaseById(caseId.value!);
    if (cs) {
      form.name = cs.name;
      form.description = cs.description || "";
      form.caseType = cs.caseType;
      form.totalTimeoutS = cs.totalTimeoutS || 600;
      form.packages = cs.packages || [];
      form.flowchartData = (cs.flowchartData as GraphData) || null;
      console.log("[FINAL DEBUG] In TestCaseEditor onMounted, the flowchartData from store is:", JSON.parse(JSON.stringify(cs.flowchartData)));
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

const handleSave = async () => {
  console.log("[DEBUG] Entering handleSave. Current form state:", JSON.parse(JSON.stringify(form)));
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
        caseType: "flow",
        totalTimeoutS: form.totalTimeoutS,
        flowchartData: graphData,
      };
    } else {
      payload = {
        name: form.name,
        description: form.description,
        caseType: "linear",
        totalTimeoutS: form.totalTimeoutS,
        packageIds: form.packages.map((p) => p.packageId),
      };
    }

    // 2. 在调用 store 之前，打印这个 payload 的最终形态
    console.log("[DEBUG] Payload to be sent to store:", JSON.parse(JSON.stringify(payload)));

    if (isEditMode.value) {
      await caseStore.updateCase(caseId.value!, payload as TestCaseUpdatePayload);
    } else {
      await caseStore.addCase(payload as TestCaseCreatePayload);
    }
    caseStore.setNeedsRefresh(true);
    ElMessage.success("保存成功！");
    goBack();
  } catch (error) {
    // API client interceptor handles the message
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.sticky-header {
  position: sticky;
  top: -10px;
  background-color: var(--el-bg-color-page, #f0f2f5);
  padding: 6px 6px;
  z-index: 10;
  margin: -10px -10px 0 -10px; /* Counteract padding and set bottom margin to 0 */
  border-bottom: 1px solid var(--el-border-color-light);
}

/* Adjust the font size of the page header content to be more compact */
:deep(.sticky-header .el-page-header__content) {
  font-size: 15px; /* Slightly smaller font */
}
/* Reduce header height */
:deep(.sticky-header .el-page-header__header) {
  height: 32px; /* Force a more compact height */
  line-height: 32px;
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
.editor-content {
  margin-top: 20px;
}
</style>