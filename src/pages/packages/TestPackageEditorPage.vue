<template>
  <div class="package-editor-root">
    <div class="package-editor-page" v-loading="isLoading">
      <!-- 顶部操作栏 -->
      <el-page-header icon=null title="" :content="isEditMode ? '编辑测试包' : '新建测试包'" class="sticky-header">
        <template #extra>
          <div class="header-actions">
            <el-tooltip content="归属到包" placement="bottom">
              <el-button v-if="isEditMode" type="primary" plain :icon="FolderAdd" @click="openAddToPkg" />
            </el-tooltip>
            <el-tooltip content="测试此测试包" placement="bottom">
              <el-button type="success" :icon="MagicStick" @click="openTestDialog" />
            </el-tooltip>
            <el-tooltip content="代码模式 (DSL)" placement="bottom">
              <el-button type="warning" plain :icon="Monitor" @click="openCodeMode" />
            </el-tooltip>
            <el-tooltip content="取消并关闭" placement="bottom">
              <el-button :icon="Close" @click="goBack" />
            </el-tooltip>
            <el-tooltip content="仅保存草稿" placement="bottom">
              <el-button type="primary" plain :icon="Document" @click="handleSave(false)" :loading="isSaving" />
            </el-tooltip>
            <el-tooltip content="保存并退出" placement="bottom">
              <el-button type="primary" :icon="Select" @click="handleSave(true)" :loading="isSaving" />
            </el-tooltip>
          </div>
        </template>
      </el-page-header>

      <!-- 核心内容区：Tab 布局 -->
      <div class="editor-content-wrapper">
        <el-tabs v-model="activeTab" type="border-card" class="editor-tabs">



          <!-- Tab 2: 基础信息 -->
          <el-tab-pane label="基础信息" name="basic">
            <div class="tab-content-scroll">
              <el-form :model="form" ref="formRef" label-position="top" :rules="rules" style="max-width: 800px; margin: 0 auto;">
                <el-row :gutter="15">
                  <el-col :span="24">
                    <el-form-item label="名称" prop="name"><el-input v-model="form.name" placeholder="输入测试包名称" /></el-form-item>
                  </el-col>
                  <el-col :span="12">
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
                  <el-col :span="12">
                    <el-form-item label="公共包">
                      <el-switch v-model="form.isCommon" />
                      <el-tooltip content="公共包在所有项目中都可见并可被引用" placement="top">
                        <el-icon class="form-item-tooltip"><QuestionFilled /></el-icon>
                      </el-tooltip>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-form-item label="描述"><el-input v-model="form.description" type="textarea" :rows="4" placeholder="描述此测试包流程" /></el-form-item>
              </el-form>
            </div>
          </el-tab-pane>

          <!-- Tab 1: 编排序列 (默认显示，最常用) -->
          <el-tab-pane label="编排序列" name="sequence">
            <div class="tab-content-full">
              <!-- 工具栏 -->
              <div class="table-toolbar">
                <div class="left">
                  <span class="count-label">共 {{ form.mixedContent.length }} 步</span>
                  <el-input
                      v-model="localSearchQuery"
                      placeholder="搜索已选资产..."
                      prefix-icon="Search"
                      clearable
                      size="small"
                      style="width: 220px; margin-left: 15px"
                  />
                </div>
                <div class="right">
                  <el-button-group>
                    <el-tooltip content="刷新列表数据" placement="top">
                      <el-button :icon="Refresh" plain @click="handleRefreshContent" />
                    </el-tooltip>
                    <el-tooltip content="批量移除所选步" placement="top">
                      <el-button type="danger" :icon="Delete" :disabled="!selectedRows.length" @click="handleBatchRemove" />
                    </el-tooltip>
                    <el-tooltip content="按资产名称排序" placement="top">
                      <el-button type="info" plain :icon="Sort" @click="sortAtomsByName" />
                    </el-tooltip>
                  </el-button-group>
                </div>
              </div>

              <!-- 表格 -->
              <el-table
                  ref="orderTableRef"
                  :data="paginatedContent"
                  border
                  stripe
                  size="small"
                  @selection-change="handleTableSelectionChange"
                  row-key="uniqueId"
                  class="flex-table"
                  height="100%"
              >
                <el-table-column type="selection" width="45" align="center" />
                <el-table-column label="步骤" width="70" align="center">
                  <template #default="scope">
                    <span class="step-num">{{ calculateRealIndex(scope.$index) }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="资产名称" min-width="250">
                  <template #default="{ row }">
                    <div class="asset-info-cell">
                      <el-icon :class="row.type === 'package' ? 'color-pkg' : 'color-atom'">
                        <component :is="row.type === 'package' ? TakeawayBox : Operation" />
                      </el-icon>
                      <span class="asset-name">{{ row.name }}</span>
                      <el-tag v-if="row.type === 'package'" size="small" type="warning" effect="dark" class="mini-tag">子包</el-tag>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="分类" width="150">
                  <template #default="{ row }">
                    <el-tag size="small" type="info" effect="plain">{{ row.categoryName || '未分类' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="220" fixed="right">
                  <template #default="scope">
                    <el-button-group>
                      <el-tooltip content="编辑原始资产">
                        <el-button link type="primary" :icon="Edit" @click="handleEditAsset(scope.row)" />
                      </el-tooltip>
                      <el-tooltip content="上移">
                        <el-button link type="primary" :icon="CaretTop" @click="handleMove(scope.$index, -1)" :disabled="isFirst(scope.$index)" />
                      </el-tooltip>
                      <el-tooltip content="下移">
                        <el-button link type="primary" :icon="CaretBottom" @click="handleMove(scope.$index, 1)" :disabled="isLast(scope.$index)" />
                      </el-tooltip>
                      <el-tooltip content="精准跳转顺序">
                        <el-button link type="primary" :icon="Rank" @click="handleJumpMove(scope.$index)"></el-button>
                      </el-tooltip>
                      <el-button link type="danger" :icon="Delete" @click="handleRemoveItem(scope.row)" />
                    </el-button-group>
                  </template>
                </el-table-column>
              </el-table>

              <div class="table-footer">
                <el-pagination
                    v-model:current-page="currentPage"
                    v-model:page-size="pageSize"
                    :total="filteredContent.length"
                    :page-sizes="[10, 20, 50, 100]"
                    layout="total, sizes, prev, pager, next"
                    class="pagination"
                />
              </div>
            </div>
          </el-tab-pane>

        </el-tabs>
      </div>

      <!-- 悬浮添加按钮 (FAB) - 仅在序列页显示 -->
      <transition name="el-zoom-in-center">
        <el-tooltip v-if="activeTab === 'sequence'" content="添加资产至序列" placement="left">
          <el-button
              type="primary"
              :icon="Plus"
              circle
              class="floating-add-btn"
              @click="openAssetSelector"
          />
        </el-tooltip>
      </transition>

      <!-- 资产选择器弹窗 -->
      <el-dialog v-model="selectorVisible" title="选择资产添加至编排序列" width="950px" top="5vh" class="asset-selector-dialog" append-to-body>
        <div class="selector-layout">
          <!-- 分类树 -->
          <div class="selector-sidebar">
            <div class="sidebar-title">分类检索</div>
            <el-tree
                :data="categoryTree"
                :props="{ label: 'name' }"
                @node-click="handleCategoryTreeClick"
                highlight-current
                default-expand-all
            />
          </div>
          <!-- 资源主列表 -->
          <div class="selector-main">
            <div class="search-bar">
              <el-radio-group v-model="resourceType" size="small">
                <el-radio-button value="atom">原子操作</el-radio-button>
                <el-radio-button value="package">子测试包</el-radio-button>
              </el-radio-group>
              <el-input v-model="poolSearchQuery" placeholder="搜索资产名称..." prefix-icon="Search" size="small" style="width: 250px" clearable />
            </div>
            <el-table
                ref="poolTableRef"
                :data="poolData"
                height="100%"
                size="small"
                stripe
                v-loading="poolLoading"
                @selection-change="handlePoolSelectionChange"
                :row-class-name="poolRowClassName"
            >
              <el-table-column type="selection" width="45" />
              <el-table-column label="状态" width="85" align="center">
                <template #default="{ row }">
                  <el-tag v-if="checkIfAdded(row)" type="info" size="small" effect="plain">已在序列</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="name" label="名称" show-overflow-tooltip />
              <el-table-column prop="categoryName" label="分类" width="150" />
            </el-table>
            <div class="pool-pagination">
              <el-pagination
                  v-model:current-page="poolCurrentPage"
                  :page-size="poolPageSize"
                  layout="prev, pager, next, total"
                  :total="poolTotal"
                  @current-change="fetchPoolData"
                  size="small"
              />
            </div>
          </div>
          <!-- 已选篮子 -->
          <div class="selector-basket">
            <div class="basket-header">待添加队列 ({{ basket.length }})</div>
            <div class="basket-list">
              <div v-for="(item, idx) in basket" :key="idx" class="basket-item">
                <div class="item-info">
                  <el-icon :class="item.type === 'package' ? 'color-pkg' : 'color-atom'">
                    <component :is="item.type === 'package' ? TakeawayBox : Operation" />
                  </el-icon>
                  <span class="name">{{ item.name }}</span>
                </div>
                <el-button link type="danger" :icon="Close" @click="removeFromBasket(idx)" />
              </div>
              <el-empty v-if="basket.length === 0" description="未选资产" :image-size="40" />
            </div>
          </div>
        </div>
        <template #footer>
          <el-button @click="selectorVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmAddFromPool" :disabled="!basket.length">确认追加至末尾</el-button>
        </template>
      </el-dialog>

      <!-- 其他弹窗组件 -->
      <AddToPackageDialog ref="addToPkgDialog" />
      <el-dialog v-model="testDialog.visible" title="测试此测试包" width="400px" append-to-body>
        <el-form label-position="top">
          <el-form-item label="选择在线设备">
            <el-select v-model="testDialog.targetDeviceId" placeholder="请选择设备" style="width: 100%">
              <el-option v-for="d in onlineDevices" :key="d.deviceId" :label="d.deviceName || d.deviceId" :value="d.deviceId" />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="testDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="handleTestPackage" :disabled="!testDialog.targetDeviceId">开始执行</el-button>
        </template>
      </el-dialog>
      <DslEditorDialog
          v-model="codeDialog.visible"
          v-model:code="codeDialog.code"
          title="测试包 DSL 配置"
          helpText="使用 atom.call(id=xxx) 或 package.call(id=xxx) 编排序列"
          @apply="handleApplyCode"
          @editor-mount="handleDslEditorMount"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Delete, Rank, Operation, QuestionFilled, Edit, MagicStick, Document,
  Monitor, Sort, TakeawayBox, Select, Close, CaretTop, CaretBottom, FolderAdd, Plus, Refresh
} from "@element-plus/icons-vue";

import { useAtomStore } from "@/stores/atomStore";
import { usePackageStore } from "@/stores/packageStore";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { useTabStore } from "@/stores/tabStore";
import { useDeviceStore } from "@/stores/deviceStore";
import { useWebSocketStore } from "@/stores/webSocketStore";
import { wsService } from "@/services/wsService";
import { generatePackageCode, parsePackageCode } from "@/utils/dslService";
import { v4 as uuidv4 } from "uuid";
import AddToPackageDialog from "@/components/dialogs/AddToPackageDialog.vue";
import DslEditorDialog from "@/components/dialogs/DslEditorDialog.vue";

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
const poolTableRef = ref<any>(null);
const addToPkgDialog = ref<InstanceType<typeof AddToPackageDialog> | null>(null);

const packageIdNum = computed(() => (props.packageId ? Number(props.packageId) : null));
const isEditMode = computed(() => !!packageIdNum.value);
const isLoading = ref(true);
const isSaving = ref(false);

// 默认激活“编排序列”Tab，因为它最重要
const activeTab = ref("basic");

// --- 编排列表分页与过滤 ---
const localSearchQuery = ref("");
const currentPage = ref(1);
const pageSize = ref(10);
const selectedRows = ref<any[]>([]);

const filteredContent = computed(() => {
  if (!localSearchQuery.value) return form.mixedContent;
  const q = localSearchQuery.value.toLowerCase();
  return form.mixedContent.filter(item =>
      item.name.toLowerCase().includes(q) ||
      (item.categoryName && item.categoryName.toLowerCase().includes(q))
  );
});

const paginatedContent = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredContent.value.slice(start, end);
});

const calculateRealIndex = (pageIdx: number) => (currentPage.value - 1) * pageSize.value + pageIdx + 1;
const isFirst = (pageIdx: number) => calculateRealIndex(pageIdx) === 1;
const isLast = (pageIdx: number) => calculateRealIndex(pageIdx) === form.mixedContent.length;

// --- 资产选择器弹窗状态 ---
const selectorVisible = ref(false);
const poolLoading = ref(false);
const resourceType = ref<'atom' | 'package'>('atom');
const poolSearchQuery = ref("");
const poolCategoryFilter = ref<number | null>(null);
const poolCurrentPage = ref(1);
const poolPageSize = ref(15);
const basket = ref<any[]>([]);

const form = reactive({
  name: "", description: "", isCommon: false, categoryId: null as number | null,
  mixedContent: [] as any[],
});

const rules = { name: [{ required: true, message: "请输入名称", trigger: "blur" }] };
const testDialog = reactive({ visible: false, targetDeviceId: "" });
const codeDialog = reactive({ visible: false, code: "" });
const onlineDevices = computed(() => deviceStore.devices.filter(d => d.isConnectedWs));

// --- 核心方法：资产移动与排序 ---
const handleMove = (pageIdx: number, offset: number) => {
  const realIdx = calculateRealIndex(pageIdx) - 1;
  const targetIdx = realIdx + offset;
  const item = form.mixedContent.splice(realIdx, 1)[0];
  form.mixedContent.splice(targetIdx, 0, item);
};

const handleJumpMove = (pageIdx: number) => {
  const realIdx = calculateRealIndex(pageIdx) - 1;
  const currentItem = form.mixedContent[realIdx];
  ElMessageBox.prompt(`将第 ${realIdx + 1} 步 "${currentItem.name}" 移动至行号：`, '跨页跳转顺序', {
    inputPattern: /^[1-9]\d*$/,
    inputErrorMessage: '请输入有效的行号',
    inputValue: (realIdx + 1).toString()
  }).then(({ value }) => {
    let target = parseInt(value) - 1;
    if (target < 0) target = 0;
    if (target >= form.mixedContent.length) target = form.mixedContent.length - 1;

    const item = form.mixedContent.splice(realIdx, 1)[0];
    form.mixedContent.splice(target, 0, item);

    // 自动翻页到目标页
    currentPage.value = Math.floor(target / pageSize.value) + 1;
    ElMessage.success('顺序已更新');
  });
};

const sortAtomsByName = () => {
  const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });
  form.mixedContent.sort((a, b) => collator.compare(a.name, b.name));
  ElMessage.success('已按名称重新排序');
};

// --- 刷新列表逻辑 ---
const handleRefreshContent = async () => {
  if (isEditMode.value && packageIdNum.value) {
    await loadPackageData(packageIdNum.value);
    ElMessage.success("列表数据已刷新");
  } else {
    ElMessage.warning("仅在编辑模式下可用");
  }
};

// --- 资产选择器逻辑 ---
const openAssetSelector = () => {
  basket.value = [];
  poolCurrentPage.value = 1;
  poolSearchQuery.value = "";
  poolCategoryFilter.value = null;
  selectorVisible.value = true;
  fetchPoolData(); // 仅在打开弹窗时加载第一页
};

const categoryTree = computed(() => [{ categoryId: null, name: '全部分类' }, ...categoryStore.allCategories]);
const handleCategoryTreeClick = (node: any) => {
  poolCategoryFilter.value = node.categoryId;
  poolCurrentPage.value = 1;
  fetchPoolData();
};

const poolData = computed(() => resourceType.value === 'atom' ? atomStore.poolAtoms : packageStore.poolPackages);
const poolTotal = computed(() => resourceType.value === 'atom' ? atomStore.totalPoolAtoms : packageStore.totalPoolPackages);

const fetchPoolData = async () => {
  poolLoading.value = true;
  const params = {
    skip: (poolCurrentPage.value - 1) * poolPageSize.value,
    limit: poolPageSize.value,
    search: poolSearchQuery.value || undefined,
    categoryId: poolCategoryFilter.value || undefined
  };
  try {
    if (resourceType.value === 'atom') await atomStore.fetchPoolAtoms(params);
    else await packageStore.fetchPoolPackages(params);
  } finally {
    poolLoading.value = false;
  }
};

watch([resourceType, poolSearchQuery], () => {
  poolCurrentPage.value = 1;
  fetchPoolData();
});

// --- 状态标记逻辑 ---
const checkIfAdded = (item: any) => {
  const id = item.atomId || item.packageId;
  // 检查当前编排序列中是否存在该 ID 且类型一致的资产
  return form.mixedContent.some(existing => existing.id === id && existing.type === resourceType.value);
};

const poolRowClassName = ({ row }: { row: any }) => {
  // 为已添加的行增加一个淡色背景类（可选）
  return checkIfAdded(row) ? 'row-already-added' : '';
};

const handlePoolSelectionChange = (selection: any[]) => {
  selection.forEach(item => {
    const id = item.atomId || item.packageId;
    if (!basket.value.some(b => b.id === id && b.type === resourceType.value)) {
      basket.value.push({
        id,
        name: item.name,
        type: resourceType.value,
        categoryName: item.categoryName || item.category?.name
      });
    }
  });
};

const removeFromBasket = (index: number) => basket.value.splice(index, 1);

const confirmAddFromPool = () => {
  const newItems = basket.value.map(item => ({
    ...item,
    uniqueId: uuidv4()
  }));
  form.mixedContent.push(...newItems);
  selectorVisible.value = false;
  ElMessage.success(`已追加 ${newItems.length} 个资产`);
  // 自动翻到最后一页
  nextTick(() => {
    currentPage.value = Math.ceil(form.mixedContent.length / pageSize.value);
  });
};

const handleTableSelectionChange = (selection: any[]) => {
  selectedRows.value = selection;
};

const handleBatchRemove = () => {
  const idsToRemove = new Set(selectedRows.value.map(r => r.uniqueId));
  form.mixedContent = form.mixedContent.filter(item => !idsToRemove.has(item.uniqueId));
  selectedRows.value = [];
  ElMessage.success('批量删除成功');
};

// --- 原有保存/代码模式/测试逻辑 (适配重构) ---
const handleSave = async (shouldExit = true) => {
  if (formRef.value) {
    try { await formRef.value.validate(); } catch (e) { return; }
  }
  isSaving.value = true;
  try {
    const payload = {
      name: form.name, description: form.description, isCommon: form.isCommon, categoryId: form.categoryId,
      orderedContent: form.mixedContent.map(i => ({ id: Number(i.id), type: i.type })),
      atomIds: form.mixedContent.filter(i => i.type === 'atom').map(i => i.id),
      includedPackageIds: form.mixedContent.filter(i => i.type === 'package').map(i => i.id)
    };
    if (isEditMode.value) {
      // --- 编辑已有的包 ---
      await packageStore.updatePackage(packageIdNum.value!, payload as any);
      ElMessage.success("草稿已保存");

      // [关键修改] 同步更新 Tab 标题为最新的 form.name
      tabStore.updateTabTitle(route.fullPath, form.name);

    } else {
      const res = await packageStore.addPackage(payload as any);
      if (!shouldExit && res?.packageId) {
        const newPath = router.resolve({ name: 'TestPackageEditor', params: { packageId: res.packageId } }).fullPath;
        tabStore.morphTab(route.fullPath, newPath, form.name);
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

const openCodeMode = () => {
  const tempForm = { ...form, atoms: form.mixedContent.map(i => ({ id: Number(i.id), name: i.name, type: i.type })) };
  codeDialog.code = generatePackageCode(tempForm, packageIdNum.value);
  codeDialog.visible = true;
};

const handleApplyCode = () => {
  try {
    const updated = parsePackageCode(codeDialog.code, form, atomStore.atoms, packageStore.packages);
    form.name = updated.name;
    form.categoryId = updated.categoryId;
    form.isCommon = updated.isCommon;
    form.description = updated.description;
    form.mixedContent = updated.atoms.map((a:any) => ({
      id: Number(a.id || a.atomId || a.packageId), name: a.name, type: a.type || 'atom',
      categoryName: a.categoryName, uniqueId: uuidv4()
    }));
    codeDialog.visible = false;
    ElMessage.success('代码配置已同步到表格');
  } catch (e) { ElMessage.error("DSL 解析失败"); }
};

const handleDslEditorMount = ({ editor, monaco }: any) => {
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => handleApplyCode());
};

const openAddToPkg = () => {
  if (packageIdNum.value) addToPkgDialog.value?.open(packageIdNum.value);
};

const goBack = () => tabStore.removeTab(route.fullPath);


const handleRemoveItem = (row: any) => {
  const index = form.mixedContent.findIndex(item => item.uniqueId === row.uniqueId);
  if (index !== -1) {
    form.mixedContent.splice(index, 1);
  }
};

const handleEditAsset = (row: any) => {
  const routeName = row.type === 'package' ? 'TestPackageEditor' : 'AtomEditor';
  const paramKey = row.type === 'package' ? 'packageId' : 'atomId';
  const url = router.resolve({ name: routeName, params: { [paramKey]: row.id } }).href;
  window.open(url, '_blank');
};

const handleCategoryChange = async (value: number | string) => {
  if (typeof value === "string") {
    try {
      const newCategory = await categoryStore.addCategory({ name: value });
      form.categoryId = newCategory.categoryId;
      ElMessage.success(`新分类 "${value}" 已创建`);
    } catch (error) { form.categoryId = null; }
  }
};

const loadPackageData = async (id: number) => {
  isLoading.value = true;
  try {
    const pkg = await packageStore.fetchPackageById(id);
    if (pkg) {
      form.name = pkg.name; form.description = pkg.description || "";
      form.isCommon = pkg.isCommon; form.categoryId = pkg.categoryId || null;
      const combined = [
        ...((pkg as any).atoms || []).map((a:any) => ({ id: a.atomId, name: a.name, type: 'atom', order: a.executionOrder, categoryName: a.categoryName, uniqueId: uuidv4() })),
        ...((pkg as any).includedPackages || []).map((s:any) => ({ id: s.childPackageId, name: s.childPackage?.name, type: 'package', order: s.executionOrder, uniqueId: uuidv4() }))
      ];
      form.mixedContent = combined.sort((a, b) => (a.order || 0) - (b.order || 0));
      tabStore.updateTabTitle(route.fullPath, pkg.name);
    }
  } finally { isLoading.value = false; }
};

onMounted(async () => {
  await Promise.all([
    categoryStore.fetchAllCategories(),
    deviceStore.fetchDevices({ limit: 100 }) // 设备通常不多，缩减数量
  ]);
  // 不再在此处预加载 atomStore.poolAtoms 和 packageStore.poolPackages
  if (isEditMode.value) await loadPackageData(packageIdNum.value!);
  else isLoading.value = false;
});
</script>

<style scoped>
/* 1. 根容器占满全屏，禁止外层滚动 */
.package-editor-root {
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.package-editor-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 2. 头部固定 */
.sticky-header {
  flex-shrink: 0;
  background-color: #f0f2f5;
  padding: 5px 15px;
  z-index: 100;
  border-bottom: 1px solid #ddd;
}

/* 3. 内容包装器：关键是 min-height: 0，防止 Flex 子项无限撑大 */
.editor-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* 核心：允许子元素收缩以显示滚动条 */
  padding: 0;
  box-sizing: border-box;
}

/* 4. Tabs 组件：设为 Flex 列布局 */
.editor-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: none;
}

/* 5. 穿透修改 Element Plus 内部样式：打通高度链 */
:deep(.editor-tabs > .el-tabs__content) {
  flex: 1;
  min-height: 0;
  padding: 10px;
  background-color: #f5f7fa;
  overflow: hidden;
}

:deep(.editor-tabs .el-tab-pane) {
  height: 100%;       /* Tab Pane 必须占满 Content */
}

/* 6. 我们的自定义内容容器 */
.tab-content-full {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  overflow: hidden; /* 确保圆角不被溢出遮挡 */
}

/* 7. 表格区样式 */
.table-toolbar {
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  flex-shrink: 0; /* 防止工具栏被挤压 */
}

.table-toolbar .left { display: flex; align-items: center; }
.table-toolbar .count-label { font-weight: bold; color: #606266; font-size: 14px; }

/* 8. 表格本身：HTML 中必须有 height="100%" */
.flex-table {
  flex: 1;         /* 占据中间所有空间 */
  min-height: 0;   /* 触发内部滚动条的关键 */
}

.table-footer {
  padding: 8px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
  background-color: #fff;
  flex-shrink: 0; /* 防止分页被挤压 */
}

/* 其他辅助样式保持不变 */
.tab-content-scroll { height: 100%; overflow-y: auto; padding: 10px; background: #fff; border-radius: 4px; border: 1px solid #e4e7ed; }
.step-num { font-family: "JetBrains Mono", monospace; font-weight: bold; color: #a8abb2; font-size: 13px; }
.asset-info-cell { display: flex; align-items: center; gap: 10px; }
.asset-name { font-weight: 500; color: #303133; font-size: 14px; }
.mini-tag { transform: scale(0.9); margin-left: -4px; }
.color-atom { color: #409eff; }
.color-pkg { color: #b37feb; }
.row-already-added { background-color: #fafafa !important; color: #ccc; }
.floating-add-btn {
  position: fixed;
  right: 40px;
  bottom: 50px;
  width: 56px;
  height: 56px;
  font-size: 24px;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
  z-index: 99;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.floating-add-btn:hover {
  transform: scale(1.1) rotate(90deg);
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.6);
}
.selector-layout { display: flex; gap: 5px; height: 550px; }
.selector-sidebar { width: 200px; border-right: 1px solid #eee; overflow-y: auto; padding-right: 10px; }
.sidebar-title { font-size: 13px; color: #909399; margin-bottom: 10px; font-weight: bold; }
.selector-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.selector-basket { width: 220px; border-left: 1px solid #eee; display: flex; flex-direction: column; background: #fafafa; }
.search-bar { display: flex; gap: 10px; margin-bottom: 15px; }
.basket-header { padding: 12px; font-weight: bold; background: #f0f2f5; border-bottom: 1px solid #eee; font-size: 13px; }
.basket-list { flex: 1; overflow-y: auto; padding: 10px; }
.basket-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #fff; border: 1px solid #eee; border-radius: 4px; margin-bottom: 6px; font-size: 12px; }
.basket-item .item-info { display: flex; align-items: center; gap: 6px; overflow: hidden; }
.basket-item .name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pool-pagination { margin-top: 15px; display: flex; justify-content: center; }
.form-item-tooltip { margin-left: 8px; color: #909399; cursor: help; }
.header-actions { display: flex; gap: 2px; }
.el-button-group {display: flex; gap: 5px;}
:deep(.el-page-header__content) { font-size: 14px; font-weight: 600; color: #303133; }
:deep(.el-table .el-table__cell) { padding: 6px 0; }
</style>