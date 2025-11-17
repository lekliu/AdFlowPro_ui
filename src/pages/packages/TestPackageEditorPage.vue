<!-- AdFlowPro_ui\src\pages\packages\TestPackageEditorPage.vue (最终修正版 V3.2.3.8) -->
<template>
  <div class="package-editor-page">
    <el-page-header @back="goBack" :content="isEditMode ? '编辑测试包' : '新建测试包'" class="sticky-header">
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
        <el-form :model="form" ref="formRef" label-width="120px" :rules="rules">
          <el-form-item label="名称" prop="name">
            <el-input v-model="form.name" placeholder="为测试包起一个明确的名称"></el-input>
          </el-form-item>
          <el-form-item label="描述" prop="description">
            <el-input v-model="form.description" type="textarea" placeholder="描述此测试包封装的流程"></el-input>
          </el-form-item>
          <el-form-item label="公共包">
            <el-switch v-model="form.isCommon" />
            <el-tooltip content="公共包在所有项目中都可见并可被引用" placement="top">
              <el-icon style="margin-left: 8px; color: #909399"><QuestionFilled /></el-icon>
            </el-tooltip>
          </el-form-item>
        </el-form>
      </el-card>

      <el-row :gutter="6" style="margin-top: 6px">
        <!-- 左侧: 原子操作池 -->
        <el-col :span="10">
          <el-card class="pool-card" body-style="padding: 0;">
            <template #header>
              <span>原子操作池</span>
            </template>
            <div class="pool-content">
              <el-input v-model="atomSearch" placeholder="搜索原子操作" clearable class="pool-search" />
              <draggable
                class="draggable-list"
                :list="availableAtoms"
                :group="{ name: 'atoms', pull: 'clone', put: false }"
                :sort="false"
                item-key="atomId"
                :clone="cloneAtom"
                tag="div"
              >
                <template #item="{ element }">
                  <div class="draggable-item" :class="{ 'is-disabled': element.disabled }">
                    <el-icon><Operation /></el-icon>
                    <span class="item-text">{{ element.name }}</span>
                  </div>
                </template>
              </draggable>
            </div>
          </el-card>
        </el-col>

        <!-- 右侧: 测试包构建区 -->
        <el-col :span="14">
          <el-card class="build-card" body-style="padding: 0;">
            <template #header>
              <span>测试包内容 (拖拽排序)</span>
            </template>
            <div class="pool-content">
              <draggable class="draggable-list" v-model="form.atoms" group="atoms" item-key="atomId" handle=".drag-handle" tag="div">
                <template #item="{ element, index }">
                  <div class="draggable-item-selected">
                    <el-icon class="drag-handle"><Rank /></el-icon>
                    <span class="item-text">{{ element.name }}</span>
                    <div>
                      <el-button type="primary" :icon="Edit" circle plain size="small" @click="handleEditAtom(element.atomId)" />
                      <el-button type="danger" :icon="Delete" circle plain size="small" @click="removeAtom(index)" />
                    </div>
                  </div>
                </template>
              </draggable>
              <el-empty v-if="form.atoms.length === 0" description="从左侧拖拽原子操作到此处" :image-size="80" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "TestPackageEditor",
});
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import draggable from "vuedraggable";
import { Delete, Rank, Operation, QuestionFilled, Edit } from "@element-plus/icons-vue";

import { useAtomStore } from "@/stores/atomStore";
import { usePackageStore } from "@/stores/packageStore";
import { useTabStore } from "@/stores/tabStore";
import type { TestPackageCreatePayload, TestPackageUpdatePayload, AtomicOperationPublic } from "@/types/api";

const route = useRoute();
const router = useRouter();
const atomStore = useAtomStore();
const packageStore = usePackageStore();
const tabStore = useTabStore();

const packageId = computed(() => (route.params.packageId ? Number(route.params.packageId) : null));
const isEditMode = computed(() => !!packageId.value);
const isLoading = ref(false);
const isSaving = ref(false);

const formRef = ref<FormInstance>();
const form = reactive<{
  name: string;
  description: string;
  isCommon: boolean;
  atoms: AtomicOperationPublic[];
}>({
  name: "",
  description: "",
  isCommon: false,
  atoms: [],
});

const rules = reactive<FormRules>({
  name: [{ required: true, message: "请输入测试包名称", trigger: "blur" }],
});

const atomSearch = ref("");

const selectedAtomIds = computed(() => new Set(form.atoms.map((a) => a.atomId)));

const availableAtoms = computed(() => {
  const searched = atomStore.atoms.filter(
    (atom) =>
      atom.name.toLowerCase().includes(atomSearch.value.toLowerCase()) ||
      (atom.description && atom.description.toLowerCase().includes(atomSearch.value.toLowerCase()))
  );

  return searched.map((atom) => ({
    ...atom,
    disabled: selectedAtomIds.value.has(atom.atomId),
  }));
});

const cloneAtom = (original: AtomicOperationPublic & { disabled: boolean }) => {
  if (original.disabled) {
    ElMessage.warning(`原子操作 "${original.name}" 已存在于测试包中。`);
    return undefined;
  }
  const { disabled, ...atomToClone } = original;
  return atomToClone;
};

onMounted(async () => {
  isLoading.value = true;
  await atomStore.fetchAtoms({ skip: 0, limit: 100 });

  if (isEditMode.value) {
    const pkg = await packageStore.fetchPackageById(packageId.value!);
    if (pkg) {
      form.name = pkg.name;
      form.description = pkg.description || "";
      form.isCommon = pkg.isCommon;
      form.atoms = pkg.atoms || [];
    }
  }
  isLoading.value = false;
});

const removeAtom = (index: number) => {
  form.atoms.splice(index, 1);
};

const goBack = () => {
  tabStore.removeTab(route.fullPath);
};

const handleEditAtom = (atomId: number) => {
  router.push({ name: "AtomEditor", params: { atomId } });
};

const handleSave = async () => {
  await formRef.value?.validate();
  isSaving.value = true;
  try {
    const payload = {
      name: form.name,
      description: form.description,
      isCommon: form.isCommon,
      atomIds: form.atoms.map((a) => a.atomId),
    };
    if (isEditMode.value) {
      await packageStore.updatePackage(packageId.value!, payload as TestPackageUpdatePayload);
    } else {
      await packageStore.addPackage(payload as TestPackageCreatePayload);
    }
    packageStore.setNeedsRefresh(true);
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
.package-editor-page {
  padding: 0; /* REMOVE PADDING FROM ROOT */
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
.draggable-item.is-disabled {
  cursor: not-allowed;
  background-color: #f5f7fa;
  color: #c0c4cc;
  border-color: #e4e7ed;
}
</style>
