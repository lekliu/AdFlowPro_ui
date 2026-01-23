<template>
  <div class="package-editor-root">
    <div class="package-editor-page" v-loading="isLoading">
      <el-page-header @back="goBack" :content="isEditMode ? '编辑测试包' : '新建测试包'" class="sticky-header">
        <template #extra>
          <div class="header-actions">
            <el-button type="success" :icon="MagicStick" plain @click="openTestDialog"> 测试此包 </el-button>
            <el-button type="warning" plain :icon="Monitor" @click="openCodeMode">代码模式</el-button>
            <el-button @click="goBack">取消</el-button>
            <el-button type="primary" plain @click="handleSave(false)" :loading="isSaving">仅保存</el-button>
            <el-button type="primary" :icon="Select" @click="handleSave(true)" :loading="isSaving">保存并退出</el-button>
          </div>
        </template>
      </el-page-header>

      <div class="editor-content-wrapper">
        <el-card class="box-card" style="margin-bottom: 10px;">
          <template #header><span>基础信息</span></template>
          <el-form :model="form" ref="formRef" label-position="top" :rules="rules">
            <el-row :gutter="15">
              <el-col :span="8">
                <el-form-item label="名称" prop="name"><el-input v-model="form.name" placeholder="输入测试包名称" /></el-form-item>
              </el-col>
              <el-col :span="8">
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
              <el-col :span="8">
                <el-form-item label="公共包">
                  <el-switch v-model="form.isCommon" />
                  <el-tooltip content="公共包在所有项目中都可见并可被引用" placement="top">
                    <el-icon style="margin-left: 8px; color: #909399"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="描述"><el-input v-model="form.description" type="textarea" placeholder="描述此测试包流程" /></el-form-item>
          </el-form>
        </el-card>

        <el-row :gutter="6">
          <el-col :span="10">
            <el-card class="pool-card" body-style="padding: 0;">
              <template #header>
                <div class="pool-header">
                  <el-radio-group v-model="resourceType" size="small" style="margin-bottom: 10px">
                    <el-radio-button value="atom">原子操作</el-radio-button>
                    <el-radio-button value="package">子测试包</el-radio-button>
                  </el-radio-group>
                  <div style="display:flex; justify-content:space-between; align-items:center">
                    <span>{{ resourceType === 'atom' ? '原子池' : '可用子包' }}</span>
                    <el-select v-model="atomCategoryFilter" placeholder="分类筛选" clearable size="small" @change="handlePoolFilterChange" style="width: 130px">
                      <el-option v-for="cat in categoryStore.allCategories" :key="cat.categoryId" :label="cat.name" :value="cat.categoryId" />
                    </el-select>
                  </div>
                </div>
              </template>
              <div class="pool-content">
                <div v-if="resourceType === 'atom'" class="pool-inner">
                  <el-input v-model="atomSearch" placeholder="搜索原子..." clearable class="pool-search" @keyup.enter="handlePoolFilterChange" />
                  <draggable class="draggable-list" :list="availableAtoms" :group="{ name: 'mixed', pull: 'clone', put: false }" :sort="false" item-key="atomId" :clone="cloneAtom" tag="div">
                    <template #item="{ element }">
                      <div class="draggable-item" :class="{ 'is-disabled': element.disabled }">
                        <el-icon><Operation /></el-icon><span class="item-text">{{ element.name }}</span>
                        <el-tag v-if="element.categoryName" type="info" size="small">{{ element.categoryName }}</el-tag>
                      </div>
                    </template>
                  </draggable>
                  <div class="pool-pagination">
                    <el-pagination v-model:current-page="poolCurrentPage" :page-size="poolPageSize" layout="total, prev, next" :total="atomStore.totalAtoms" size="small" @current-change="handlePoolPageChange" />
                  </div>
                </div>
                <div v-else class="pool-inner">
                  <el-input v-model="packageSearch" placeholder="搜索包名..." clearable class="pool-search" />
                  <draggable class="draggable-list" :list="filteredSafePackages" :group="{ name: 'mixed', pull: 'clone', put: false }" :sort="false" item-key="packageId" :clone="clonePackage" tag="div">
                    <template #item="{ element }">
                      <div class="draggable-item" :class="{ 'is-disabled': element.disabled }">
                        <el-icon><TakeawayBox /></el-icon><span class="item-text">{{ element.name }}</span>
                      </div>
                    </template>
                  </draggable>
                </div>
              </div>
            </el-card>
          </el-col>

          <el-col :span="14">
            <el-card class="build-card" body-style="padding: 0;">
              <template #header>
                <div style="display:flex; justify-content:space-between">
                  <span>编排内容 (拖拽排序)</span>
                  <el-button size="small" type="primary" plain :icon="Sort" @click="sortAtomsByName">按名排序</el-button>
                </div>
              </template>
              <div class="pool-content">
                <draggable class="draggable-list" v-model="form.mixedContent" group="mixed" item-key="uniqueId" handle=".drag-handle" tag="div">
                  <template #item="{ element, index }">
                    <div class="mixed-item-group">
                      <div class="draggable-item-selected" :class="{'sub-pkg-card': element.type === 'package'}">
                        <el-icon class="drag-handle"><Rank /></el-icon>
                        <el-icon v-if="element.type === 'atom'"><Operation /></el-icon>
                        <el-icon v-else><TakeawayBox /></el-icon>
                        <span class="item-text">{{ element.name }}</span>
                        
                        <!-- [新增] 原子操作跳转按钮 -->
                        <el-button
                          v-if="element.type === 'atom'"
                          type="primary"
                          :icon="Edit"
                          circle
                          plain
                          size="small"
                          @click="handleEditAtom(element.id)"
                          title="跳转至原子操作详情"
                          style="margin-right: 8px"
                        />
                        
                        <!-- 亮点功能：透视按钮 -->
                        <el-button v-if="element.type === 'package'" link type="primary" @click="togglePreview(element)" :loading="element.loading">
                          <el-icon><ViewIcon /></el-icon>{{ element.showPreview ? '收起' : '透视' }}
                        </el-button>

                        <el-tag v-if="element.categoryName" type="info" size="small" style="margin-right: 8px">{{ element.categoryName }}</el-tag>
                        <el-button type="danger" :icon="Delete" circle plain size="small" @click="removeMixedItem(index)" />
                      </div>
                      <!-- 透视展开区 -->
                      <el-collapse-transition>
                        <NestedPreview v-if="element.showPreview" :children="element.childrenData" @toggle="togglePreview" />
                      </el-collapse-transition>
                    </div>
                  </template>
                </draggable>
                <el-empty v-if="form.mixedContent.length === 0" description="拖拽资源到此处" :image-size="80" />
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
      <!-- 弹窗组件 -->
      <el-dialog v-model="testDialog.visible" title="测试此测试包" width="400px" append-to-body>
        <el-select v-model="testDialog.targetDeviceId" placeholder="请选择设备" style="width: 100%">
          <el-option v-for="d in onlineDevices" :key="d.deviceId" :label="d.deviceName || d.deviceId" :value="d.deviceId" />
        </el-select>
        <template #footer>
          <el-button @click="testDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="handleTestPackage" :disabled="!testDialog.targetDeviceId">开始执行</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="codeDialog.visible" title="编程式配置 (Package DSL)" width="800px" top="5vh" append-to-body>
        <div style="height: 60vh; border: 1px solid #dcdfe6">
          <vue-monaco-editor v-model:value="codeDialog.code" theme="vs" language="python" @mount="handleEditorMount" />
        </div>
        <template #footer>
          <el-button @click="codeDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="handleApplyCode">应用并生成界面</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import draggable from "vuedraggable";
import {
  Delete, Rank, Operation, QuestionFilled, Edit, MagicStick,
  Search, Monitor, Sort, TakeawayBox, Select, View as ViewIcon
} from "@element-plus/icons-vue";

import { useAtomStore } from "@/stores/atomStore";
import { usePackageStore } from "@/stores/packageStore";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { useTabStore } from "@/stores/tabStore";
import { useDeviceStore } from "@/stores/deviceStore";
import { useWebSocketStore } from "@/stores/webSocketStore";
import { wsService } from "@/services/wsService";
import { generatePackageCode, parsePackageCode } from "@/utils/dslService";
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import NestedPreview from "@/components/NestedPreview.vue"; // 核心修复：引入递归组件
import { v4 as uuidv4 } from "uuid";

const props = defineProps<{ packageId?: string | number }>();
const route = useRoute();
const router = useRouter();
const atomStore = useAtomStore();
const packageStore = usePackageStore();
const tabStore = useTabStore();
const categoryStore = useAtomCategoryStore();
const deviceStore = useDeviceStore();
const wsStore = useWebSocketStore();

const formRef = ref<any>(null);
const packageIdNum = computed(() => (props.packageId ? Number(props.packageId) : null));
const isEditMode = computed(() => !!packageIdNum.value);
const isLoading = ref(true);
const isSaving = ref(false);
const resourceType = ref('atom');
const packageSearch = ref('');
const atomSearch = ref("");
const atomCategoryFilter = ref<number | "">("");
const poolCurrentPage = ref(1);
const poolPageSize = ref(10);

const form = reactive({
  name: "", description: "", isCommon: false, categoryId: null as number | null,
  mixedContent: [] as any[],
});

const rules = { name: [{ required: true, message: "请输入名称", trigger: "blur" }] };
const testDialog = reactive({ visible: false, targetDeviceId: "" });
const codeDialog = reactive({ visible: false, code: "" });
const onlineDevices = computed(() => deviceStore.devices.filter(d => d.isConnectedWs));

// --- 补回业务逻辑：重复检查 ---

const availableAtoms = computed(() => {
  const selectedIds = new Set(form.mixedContent.filter(i => i.type === 'atom').map(i => i.id));
  return atomStore.atoms.map(a => ({ ...a, disabled: selectedIds.has(a.atomId) }));
});

const filteredSafePackages = computed(() => {
  const selectedIds = new Set(form.mixedContent.filter(i => i.type === 'package').map(i => i.id));
  return packageStore.packages.map(p => ({
    ...p,
    disabled: packageStore.forbiddenIds.includes(p.packageId) || (form.isCommon && !p.isCommon) || selectedIds.has(p.packageId)
  })).filter(p => {
    // 1. 关键词搜索过滤
    const matchesSearch = p.name.toLowerCase().includes(packageSearch.value.toLowerCase());
    // 2. 分类筛选过滤 (核心修复)
    const matchesCategory = !atomCategoryFilter.value || p.categoryId === atomCategoryFilter.value;
    return matchesSearch && matchesCategory;
  });
});

// --- 补回业务逻辑：保存与测试 ---

const handleSave = async (shouldExit = true) => {
  if (formRef.value) {
    try { await formRef.value.validate(); } catch (e) { return; }
  }
  isSaving.value = true;
  try {
    // 核心修复：对所有 ID 进行严格的整数转换，并过滤掉无效条目
    const safeMixedContent = form.mixedContent.map(i => ({
      id: Number(i.id),
      type: i.type
    })).filter(i => !isNaN(i.id));

    const payload = {
      name: form.name, description: form.description, isCommon: form.isCommon, categoryId: form.categoryId,
      orderedContent: safeMixedContent,
      // 后端期望 atom_ids 是 List[int]
      atomIds: safeMixedContent.filter(i => i.type === 'atom').map(i => i.id),
      includedPackageIds: safeMixedContent.filter(i => i.type === 'package').map(i => i.id)
    };
    if (isEditMode.value) {
      await packageStore.updatePackage(packageIdNum.value!, payload as any);
      ElMessage.success("已保存更新");
    }
    else {
      const oldPath = route.fullPath;
      const res = await packageStore.addPackage(payload as any);
      ElMessage.success("创建成功");
      if (!shouldExit && res?.packageId) {
        const newPath = router.resolve({ name: 'TestPackageEditor', params: { packageId: res.packageId } }).fullPath;
        tabStore.morphTab(oldPath, newPath, `编辑 - ${form.name}`);
        router.replace(newPath);
      }
    }
    packageStore.setNeedsRefresh(true);
    if (shouldExit) goBack();
  } finally { isSaving.value = false; }
};

const openTestDialog = () => {
  if (!isEditMode.value) return ElMessage.warning("请先保存后再测试");
  testDialog.targetDeviceId = "";
  testDialog.visible = true;
};

const handleTestPackage = () => {
  if (!wsStore.isLogPanelVisible) wsStore.toggleLogPanel();
  wsService.sendValidateTestPackage(packageIdNum.value!, testDialog.targetDeviceId);
  ElMessage.info("测试请求已发送");
  testDialog.visible = false;
};

// --- 亮点逻辑：透视与代码模式 ---

const togglePreview = async (element: any) => {
  if (element.showPreview) {
    element.showPreview = false;
    return;
  }
  if (!element.childrenData) {
    if (!element.id || isNaN(Number(element.id))) {
      console.error("Invalid Package ID for peeking:", element.id);
      return;
    }
    element.loading = true;
    try {
      const pkg = await packageStore.fetchPackageById(element.id);
      // 核心修复：使用 API 返回的驼峰命名字段 (atomId, childPackageId, executionOrder)
      const combined = [
        ...((pkg as any).atoms || []).map((a:any) => ({ id: a.atomId, name: a.name, type: 'atom', order: a.executionOrder })),
        ...((pkg as any).includedPackages || []).map((s:any) => ({ id: s.childPackageId, name: s.childPackage?.name, type: 'package', order: s.executionOrder }))
      ];
      element.childrenData = combined.sort((a, b) => a.order - b.order);
    } finally { element.loading = false; }
  }
  element.showPreview = true;
};

const openCodeMode = () => {
  const tempForm = { ...form, atoms: form.mixedContent.map(i => ({ id: Number(i.id), name: i.name, type: i.type })) };
  codeDialog.code = generatePackageCode(tempForm, packageIdNum.value);
  codeDialog.visible = true;
};

const handleApplyCode = () => {
  try {
    const updated = parsePackageCode(codeDialog.code, form, atomStore.atoms, packageStore.packages);
    
    // [核心修复] 将 DSL 解析出的基础字段同步到 UI 表单
    form.name = updated.name;
    form.categoryId = updated.categoryId;
    form.isCommon = updated.isCommon;
    form.description = updated.description;

    // 处理复杂的混合内容映射
    form.mixedContent = updated.atoms.map((a:any) => ({
      id: Number(a.id || a.atomId || a.packageId), name: a.name, type: a.type || 'atom',
      categoryName: a.categoryName, uniqueId: uuidv4()
    }));
    codeDialog.visible = false;
  } catch (e) { ElMessage.error("DSL 解析失败"); }
};

const handleEditorMount = (editor: any, monaco: any) => {
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => handleApplyCode());
};

const sortAtomsByName = () => {
  const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });
  form.mixedContent.sort((a, b) => collator.compare(a.name, b.name));
};

// --- 通用辅助 ---

const cloneAtom = (atom: any) => ({ id: atom.atomId, name: atom.name, type: 'atom', categoryName: atom.categoryName, uniqueId: uuidv4() });
const clonePackage = (pkg: any) => pkg.disabled ? undefined : { id: pkg.packageId, name: pkg.name, type: 'package', uniqueId: uuidv4() };
const handlePoolFilterChange = () => { poolCurrentPage.value = 1; fetchAtomPool(); };
const handlePoolPageChange = (val: number) => { poolCurrentPage.value = val; fetchAtomPool(); };
const fetchAtomPool = () => atomStore.fetchAtoms({
  skip: (poolCurrentPage.value - 1) * poolPageSize.value,
  limit: poolPageSize.value,
  search: atomSearch.value || undefined,
  categoryId: atomCategoryFilter.value || undefined
});
const goBack = () => tabStore.removeTab(route.fullPath);
const removeMixedItem = (index: number) => form.mixedContent.splice(index, 1);

const handleCategoryChange = async (value: number | string) => {
  if (typeof value === "string") {
    // 用户输入了不存在的名称并回车
    try {
      const newCategory = await categoryStore.addCategory({ name: value });
      form.categoryId = newCategory.categoryId; // 自动选中新生成的 ID
      ElMessage.success(`新分类 "${value}" 已创建！`);
    } catch (error) {
      form.categoryId = null;
    }
  }
};
const handleEditAtom = (id: number) => router.push({ name: "AtomEditor", params: { atomId: id } });

// 核心修复：监听 ID 变化。解决 keep-alive 缓存组件后，切换不同测试包不刷新的问题
watch(() => props.packageId, (newId) => {
  if (newId) {
    const idNum = Number(newId);
    if (!isNaN(idNum)) {
      loadPackageData(idNum);
    }
  } else {
    // 如果没有 ID，重置为新建模式
    Object.assign(form, {
      name: "", description: "", isCommon: false, categoryId: null,
      mixedContent: []
    });
  }
}, { deep: true });

// 核心修复：提取独立的加载函数，供 onMounted 和 watch 复用
const loadPackageData = async (id: number) => {
  isLoading.value = true;
  try {
    await packageStore.fetchForbiddenAncestors(id);
    const pkg = await packageStore.fetchPackageById(id);
    if (pkg) {
      form.name = pkg.name; form.description = pkg.description || "";
      form.isCommon = pkg.isCommon; form.categoryId = pkg.categoryId || null;
      const combined = [
        ...((pkg as any).atoms || []).map((a:any) => ({ id: a.atomId, name: a.name, type: 'atom', order: a.executionOrder, categoryName: a.categoryName, uniqueId: uuidv4() })),
        ...((pkg as any).includedPackages || []).map((s:any) => ({ id: s.childPackageId, name: s.childPackage?.name, type: 'package', order: s.executionOrder, uniqueId: uuidv4() }))
      ];
      form.mixedContent = combined.sort((a, b) => (a.order || 0) - (b.order || 0));
      // 更新标签页标题
      tabStore.updateTabTitle(route.fullPath, `编辑 - ${pkg.name}`);
    }
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  await Promise.all([
    fetchAtomPool(),
    packageStore.fetchPackages({ skip: 0, limit: 1000 }),
    categoryStore.fetchAllCategories(),
    deviceStore.fetchDevices({ limit: 1000 })
  ]);
  if (isEditMode.value) {
    await loadPackageData(packageIdNum.value!);
  } else {
    isLoading.value = false; // [核心修复] 新建模式下手动关闭加载遮罩
  }
});
</script>

<style scoped>
.package-editor-root { height: 100%; width: 100%; }
.sticky-header {
  position: sticky; top: -10px; background-color: #f0f2f5; padding: 6px 20px; z-index: 10;
  margin: -10px -10px 0 -10px; border-bottom: 1px solid var(--el-border-color-light);
}
.sub-pkg-card { background-color: #f9f0ff !important; border: 1px dashed #b37feb !important; }
.pool-card, .build-card { height: 600px; display: flex; flex-direction: column; }
.pool-content { flex-grow: 1; overflow: hidden; padding: 10px; display: flex; flex-direction: column; }
.pool-inner { height: 100%; display: flex; flex-direction: column; }
.pool-search { margin-bottom: 10px; }
.draggable-list { flex-grow: 1; overflow-y: auto; min-height: 100px; }
.draggable-item, .draggable-item-selected {
  padding: 8px 12px; border: 1px solid #dcdfe6; border-radius: 4px; margin-bottom: 8px;
  background-color: #fff; display: flex; align-items: center; gap: 8px;
}
.draggable-item { cursor: grab; }
.draggable-item.is-disabled { opacity: 0.5; cursor: not-allowed; background-color: #f5f7fa; }
.item-text { flex-grow: 1; font-size: 13px; }
.drag-handle { cursor: grab; color: #909399; }
.pool-pagination { margin-top: 10px; text-align: center; }
.nested-preview-area {
  margin: 2px 0 8px 24px; padding: 4px 0 4px 12px; background: transparent;
  border-left: 2px solid #d3adf7; border-bottom-right-radius: 4px; border-bottom-left-radius: 4px;
}
.preview-line { display: flex; align-items: center; font-size: 12px; color: #722ed1; padding: 2px 0; }
.preview-item { margin-bottom: 2px; }
.line-dot { width: 4px; height: 4px; background: #b37feb; border-radius: 50%; margin-right: 8px; }
</style>