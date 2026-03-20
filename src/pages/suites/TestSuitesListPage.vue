<template>
  <div class="af-page-container" ref="pageContainerRef">
    <el-card class="table-card" shadow="never">
      <!-- 顶部操作栏 -->
      <template #header>
        <div class="af-list-header">
          <div class="left">
            <el-button type="primary" :icon="Plus" @click="handleCreate">新建套件</el-button>

            <el-button-group class="ml-4">
              <el-button :icon="VideoPlay" type="success" plain @click="handleRunSelected" :disabled="selectedSuites.length !== 1">运行</el-button>
              <el-button :icon="Upload" type="warning" plain @click="handlePublishSelected" :disabled="selectedSuites.length !== 1">发布</el-button>
              <el-button :icon="Document" type="info" plain @click="handleViewPackageSelected" :disabled="selectedSuites.length !== 1">实时剧本</el-button>
              <el-button :icon="Edit" @click="handleEditSelected" :disabled="selectedSuites.length !== 1">编辑</el-button>
              <el-button :icon="Delete" type="danger" plain @click="handleDeleteSelected" :disabled="selectedSuites.length === 0">删除</el-button>
            </el-button-group>
          </div>

          <div class="right">
            <el-select v-model="categoryFilter" placeholder="按分类筛选" clearable @change="handleSearch" style="width: 150px">
              <el-option
                  v-for="cat in categoryStore.allCategories"
                  :key="cat.categoryId"
                  :label="cat.name"
                  :value="cat.categoryId"
              />
            </el-select>
            <el-input v-model="searchQuery" placeholder="搜索名称或描述..." clearable @keyup.enter="handleSearch" style="width: 220px">
              <template #append>
                <el-button :icon="Search" @click="handleSearch" />
              </template>
            </el-input>
          </div>
        </div>
      </template>

      <!-- 数据表格 -->
      <el-table
          :data="suiteStore.suites"
          v-loading="suiteStore.isLoading"
          style="width: 100%"
          border
          stripe
          class="custom-table"
          @selection-change="handleSelectionChange"
          @row-click="handleRowClick"
          @row-dblclick="handleRowDblClick"
          ref="tableRef"
      >
        <el-table-column type="selection" width="45" align="center" />

        <el-table-column prop="suiteId" label="ID" width="80" sortable align="center">
          <template #default="{row}">
            <span class="id-text">{{ row.suiteId }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="测试套件名称" min-width="200" sortable>
          <template #default="{row}">
            <div class="name-cell">
              <span class="main-name">{{ row.name }}</span>
              <el-tooltip :content="row.versionCode > 0 ? '点击查看该版本的已发布快照 (Cached)' : '未发布'" placement="top">
                <el-tag
                    size="small"
                    :type="row.versionCode > 0 ? 'success' : 'info'"
                    effect="plain"
                    class="version-tag ml-2"
                    @click.stop="handleViewPublishedPackage(row)"
                >
                  {{ row.versionCode > 0 ? `v${row.versionCode}` : 'Draft' }}
                </el-tag>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="categoryName" label="分类" width="120" sortable>
          <template #default="{row}">
            <el-tag v-if="row.categoryName" type="info" size="small" effect="light">{{ row.categoryName }}</el-tag>
            <span v-else class="text-placeholder">--</span>
          </template>
        </el-table-column>

        <el-table-column v-if="showExtraCols" prop="description" label="描述" min-width="180" show-overflow-tooltip />

        <el-table-column v-if="showExtraCols" prop="targetAppPackage" label="目标应用" min-width="180" show-overflow-tooltip>
          <template #default="{row}">
            <span class="app-package-text">{{ row.targetAppPackage || '--' }}</span>
          </template>
        </el-table-column>

        <el-table-column
            label="创建时间"
            prop="createdAt"
            width="180"
            sortable
            align="right"
            header-align="left"
        >
          <template #default="scope">
            <div class="action-swap-container">
              <span class="time-text-display">{{ formatDateTime(scope.row.createdAt) }}</span>

              <div class="row-floating-actions">
                <div class="action-mask-gradient"></div>
                <div class="action-buttons-inner">
                  <el-tooltip content="运行" placement="top" :show-after="500">
                    <el-button :icon="VideoPlay" circle class="btn-action btn-run" @click.stop="handleRunSuite(scope.row)" />
                  </el-tooltip>
                  <el-tooltip content="编辑" placement="top" :show-after="500">
                    <el-button :icon="Edit" circle class="btn-action btn-edit" @click.stop="handleEdit(scope.row.suiteId)" />
                  </el-tooltip>

                  <el-dropdown trigger="click" @command="(cmd) => handleActionCommand(cmd, scope.row)">
                    <el-button :icon="MoreFilled" circle class="btn-action btn-more" @click.stop />
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="publish" :icon="Upload">发布新版本</el-dropdown-item>
                        <el-dropdown-item command="viewDraft" :icon="Document">预览实时剧本</el-dropdown-item>
                        <el-dropdown-item command="delete" :icon="Delete" class="danger-text">删除套件</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="af-pagination-wrap">
        <el-pagination
            v-if="suiteStore.totalSuites > 0"
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="suiteStore.totalSuites"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 运行配置对话框 -->
    <el-dialog v-model="runDialog.visible" title="运行测试套件" width="500px" @close="resetRunDialog">
      <el-form v-if="runDialog.suite" :model="runDialog.form" ref="runFormRef" :rules="runDialog.rules" label-width="100px" label-position="top">
        <el-form-item label="测试套件">
          <el-input :value="runDialog.suite.name" disabled />
        </el-form-item>
        <el-form-item label="目标应用" prop="targetAppPackageName">
          <el-select v-model="runDialog.form.targetAppPackageName" filterable class="w-full" v-loading="masterAppStore.isLoading">
            <el-option v-for="app in masterAppStore.apps" :key="app.packageName" :label="`${app.appName} (${app.packageName})`" :value="app.packageName" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标设备" prop="deviceId">
          <el-select v-model="runDialog.form.deviceId" placeholder="选择在线设备" filterable class="w-full" v-loading="deviceStore.isLoading">
            <el-option v-for="d in onlineDevices" :key="d.deviceId" :label="d.deviceName || d.deviceId" :value="d.deviceId" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="runDialog.visible = false">取消</el-button>
        <el-button type="primary" :icon="VideoPlay" @click="confirmRun" :loading="runDialog.isSubmitting">开始测试</el-button>
      </template>
    </el-dialog>

    <!-- 剧本预览对话框 -->
    <el-dialog v-model="packageDialog.visible" :title="packageDialog.title" width="700px" top="8vh">
      <div v-loading="packageDialog.loading" class="package-content-wrap">
        <el-scrollbar height="60vh">
          <el-tree
              v-if="packageDialog.treeData.length"
              :data="packageDialog.treeData"
              :props="{ children: 'children', label: 'label' }"
              :expand-on-click-node="false"
              :default-expand-all="packageDialog.expandAll"
              node-key="id"
              ref="treeRef"
          />
          <el-empty v-else-if="!packageDialog.loading" description="暂无内容" />
        </el-scrollbar>
      </div>
      <template #footer>
        <div class="flex justify-between w-full">
          <el-button @click="toggleExpandAll">{{ packageDialog.expandAll ? '全部折叠' : '全部展开' }}</el-button>
          <div>
            <el-button type="primary" plain @click="handleCopyPackage" :disabled="!packageDialog.content">复制 JSON</el-button>
            <el-button @click="packageDialog.visible = false">关闭</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "TestSuitesList" });

import { ref, onMounted, computed, reactive, onActivated, nextTick, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useSuiteStore } from "@/stores/suiteStore";
import { useMasterAppStore } from "@/stores/masterAppStore";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { useDeviceStore } from "@/stores/deviceStore";
import { jobService } from "@/api/jobService";
import { suiteService } from "@/api/suiteService";
import { ElMessage, ElMessageBox, ElLoading, type FormInstance, type ElTree } from "element-plus";
import { Plus, Edit, Delete, Search, VideoPlay, Document, Upload, MoreFilled } from "@element-plus/icons-vue";
import { formatDateTime } from "@/utils/formatter";
import { useTablePagination, useTableHelper } from "@/composables/useTableManager";
import { confirmBatchDelete } from "@/utils/messageBox";

const router = useRouter();
const suiteStore = useSuiteStore();
const masterAppStore = useMasterAppStore();
const categoryStore = useAtomCategoryStore();
const deviceStore = useDeviceStore();

const { currentPage, pageSize, searchQuery, getPaginationParams, resetPagination } = useTablePagination(10);
const {
  tableRef,
  selection: selectedSuites,
  handleSelectionChange,
  handleRowClick,
  handleRowDblClick
} = useTableHelper("suiteId", "TestSuiteEditor");

const categoryFilter = ref<number | "">("");
const treeRef = ref<InstanceType<typeof ElTree>>();

const fetchData = () => {
  suiteStore.fetchSuites({ ...getPaginationParams(), categoryId: categoryFilter.value || undefined });
};

onMounted(() => {
  fetchData();
  categoryStore.fetchAllCategories();
  initResizeObserver();
});

onActivated(() => { if (suiteStore.needsRefresh) { fetchData(); suiteStore.setNeedsRefresh(false); } });

// --- 运行逻辑 ---
const runDialog = reactive({
  visible: false,
  isSubmitting: false,
  suite: null as any | null,
  form: { targetAppPackageName: "", deviceId: "" },
  rules: {
    targetAppPackageName: [{ required: true, message: "请选择目标应用", trigger: "change" }],
    deviceId: [{ required: true, message: "请选择目标设备", trigger: "change" }],
  }
});
const runFormRef = ref<FormInstance>();
const onlineDevices = computed(() => deviceStore.devices.filter(d => d.isConnectedWs));

const handleRunSuite = (suite: any) => {
  masterAppStore.fetchApps({ skip: 0, limit: 1000 });
  deviceStore.fetchDevices({ limit: 1000 });
  runDialog.suite = suite;
  runDialog.form.targetAppPackageName = suite.targetAppPackage || "";
  runDialog.visible = true;
};

const handleRunSelected = () => { if (selectedSuites.value.length === 1) handleRunSuite(selectedSuites.value[0]); };

const confirmRun = async () => {
  if (!runFormRef.value || !runDialog.suite) return;
  await runFormRef.value.validate(async (valid) => {
    if (!valid) return;
    runDialog.isSubmitting = true;
    try {
      const createdJob = await jobService.runDebugJob({
        suiteId: runDialog.suite!.suiteId,
        targetAppPackageName: runDialog.form.targetAppPackageName,
        deviceId: runDialog.form.deviceId,
      });
      ElMessage.success(`任务 #${createdJob.jobId} 已启动，正在跳转监控页...`);
      runDialog.visible = false;
      router.push({ name: "JobDetail", params: { jobId: createdJob.jobId } });
    } finally { runDialog.isSubmitting = false; }
  });
};

// --- 发布逻辑 (100% 还原原版 res.changed 逻辑) ---
const handlePublish = async (suite: any) => {
  try {
    await ElMessageBox.confirm(
        `确定要发布套件 "${suite.name}" 吗？\n发布后版本号将递增，并自动广播通知所有在线设备进行静默更新。`,
        "发布确认",
        { confirmButtonText: "立即发布", cancelButtonText: "取消", type: "info" }
    );
    const loading = ElLoading.service({ text: "正在编译并发布..." });
    const res = await suiteService.publishSuite(suite.suiteId);
    loading.close();

    // 关键逻辑：判断版本是否真的变了
    if (res.changed) ElMessage.success(`发布成功！新版本: v${res.versionCode}`);
    else ElMessage.info(`发布完成。内容未变更，版本保持 v${res.versionCode}`);

    fetchData();
  } catch (e) {}
};

const handlePublishSelected = () => { if (selectedSuites.value.length === 1) handlePublish(selectedSuites.value[0]); };

// --- 剧本预览逻辑 ---
const packageDialog = reactive({
  visible: false,
  loading: false,
  title: "剧本预览",
  content: null as any,
  treeData: [] as any[],
  expandAll: false,
});

const handleViewPackage = async (suite: any, mode: 'prod' | 'draft') => {
  packageDialog.title = mode === 'draft' ? `⚡ 实时剧本 (预览最新修改) - ${suite.name}` : `🔒 已发布快照 (v${suite.versionCode}) - ${suite.name}`;
  packageDialog.content = null;
  packageDialog.treeData = [];
  packageDialog.visible = true;
  packageDialog.loading = true;
  try {
    const data = await suiteService.getSuitePackage(suite.suiteId, mode);
    packageDialog.content = data;
    packageDialog.treeData = jsonToTree(data, `suite-${suite.suiteId}`);
    await nextTick();
    packageDialog.expandAll = false;
    toggleExpandAll();
  } catch (e) {
    ElMessage.error("加载剧本失败");
  } finally { packageDialog.loading = false; }
};

const handleViewPublishedPackage = (row: any) => {
  if (row.versionCode > 0) handleViewPackage(row, 'prod');
  else ElMessage.info("该套件尚未发布，无缓存快照，请查看实时剧本。");
};

const handleViewPackageSelected = () => { if (selectedSuites.value.length === 1) handleViewPackage(selectedSuites.value[0], 'draft'); };

const toggleExpandAll = () => {
  packageDialog.expandAll = !packageDialog.expandAll;
  const nodes = treeRef.value?.store.nodesMap;
  if (nodes) {
    for (const key in nodes) {
      nodes[key].expanded = packageDialog.expandAll;
    }
  }
};

const handleActionCommand = (command: string, row: any) => {
  switch (command) {
    case 'publish': handlePublish(row); break;
    case 'viewDraft': handleViewPackage(row, 'draft'); break;
    case 'delete': handleDelete(row.suiteId, row.name); break;
  }
};

// --- 辅助逻辑 ---
const handleSearch = () => { resetPagination(); fetchData(); };
const handleSizeChange = (val: number) => { pageSize.value = val; fetchData(); };
const handleCurrentChange = (val: number) => { currentPage.value = val; fetchData(); };
const handleCreate = () => router.push({ name: "TestSuiteEditor" });
const handleEdit = (id: number) => router.push({ name: "TestSuiteEditor", params: { suiteId: id } });
const handleEditSelected = () => { if (selectedSuites.value.length === 1) handleEdit(selectedSuites.value[0].suiteId); };

const handleDeleteSelected = async () => {
  const names = selectedSuites.value.map(s => s.name);
  if (await confirmBatchDelete(names, "测试套件")) {
    await Promise.all(selectedSuites.value.map(s => suiteStore.deleteSuite(s.suiteId)));
    ElMessage.success("批量删除成功");
    fetchData();
  }
};

const handleDelete = async (id: number, name: string) => {
  try {
    await ElMessageBox.confirm(`确定要删除测试套件 "${name}" 吗？`, "确认删除", { type: "warning" });
    await suiteStore.deleteSuite(id);
    ElMessage.success("删除成功");
    if (suiteStore.suites.length === 1 && currentPage.value > 1) currentPage.value--;
    fetchData();
  } catch (e) { if (e === 'cancel') ElMessage.info("已取消删除"); }
};

const jsonToTree = (obj: any, labelPrefix = ""): any[] => {
  let idCounter = 0;
  const transform = (value: any, key: string | number): any => {
    const nodeId = `${labelPrefix}-${key}-${idCounter++}`;
    if (value && typeof value === "object") {
      if (Array.isArray(value)) return { id: nodeId, label: `[${key}] (${value.length} items)`, children: value.map((v, i) => transform(v, i)) };
      return { id: nodeId, label: `{${key}}`, children: Object.entries(value).map(([k, v]) => transform(v, k)) };
    }
    return { id: nodeId, label: `${key}: ${JSON.stringify(value)}` };
  };
  return obj && typeof obj === "object" ? Object.entries(obj).map(([k, v]) => transform(v, k)) : [{ id: "root", label: JSON.stringify(obj) }];
};

const handleCopyPackage = async () => {
  await navigator.clipboard.writeText(JSON.stringify(packageDialog.content, null, 2));
  ElMessage.success("剧本JSON内容已成功复制到剪贴板！");
};

const resetRunDialog = () => runFormRef.value?.resetFields();

const pageContainerRef = ref<HTMLElement | null>(null);
const showExtraCols = ref(true);
let resizeObserver: ResizeObserver | null = null;
const initResizeObserver = () => {
  if (pageContainerRef.value) {
    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) showExtraCols.value = entry.contentRect.width >= 1050;
    });
    resizeObserver.observe(pageContainerRef.value);
  }
};
onUnmounted(() => resizeObserver?.disconnect());
</script>

<style scoped>
.af-page-container { padding: 20px; }
.table-card { border: none; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.05) !important; }
.af-list-header { display: flex; justify-content: space-between; align-items: center; }
.af-list-header .left, .af-list-header .right { display: flex; align-items: center; gap: 12px; }

.name-cell { display: flex; align-items: center; }
.id-text { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #909399; }
.version-tag { cursor: pointer; transition: all 0.2s; font-family: 'JetBrains Mono', monospace; }
.version-tag:hover { transform: translateY(-1px); font-weight: bold; background-color: var(--el-color-success-light-9); }
.app-package-text { color: #606266; font-size: 12px; font-family: 'JetBrains Mono', monospace; }
.text-placeholder { color: #dcdfe6; }

.action-swap-container { position: relative; display: flex; align-items: center; justify-content: flex-end; width: 100%; height: 32px; }
.time-text-display { transition: opacity 0.2s; color: #606266; font-size: 13px; font-family: 'JetBrains Mono', monospace; }

.row-floating-actions {
  position: absolute; top: 0; right: -10px; bottom: 0;
  display: flex; align-items: center; opacity: 0; pointer-events: none;
  transition: all 0.2s ease; z-index: 5;
}
.action-mask-gradient {
  width: 40px; height: 100%;
  background: linear-gradient(to right, rgba(255, 255, 255, 0), var(--el-table-row-hover-bg-color) 80%);
}
.action-buttons-inner { display: flex; align-items: center; gap: 4px; padding-right: 12px; background-color: var(--el-table-row-hover-bg-color); }
.action-buttons-inner :deep(.btn-action) { border: none; background: transparent; width: 34px; height: 34px; font-size: 20px !important;}

.action-buttons-inner :deep(.btn-run) { color: var(--el-color-success); }
.action-buttons-inner :deep(.btn-run:hover) { background-color: var(--el-color-success-light-9); }
.action-buttons-inner :deep(.btn-edit) { color: var(--el-color-primary); }
.action-buttons-inner :deep(.btn-edit:hover) { background-color: var(--el-color-primary-light-9); }
.action-buttons-inner :deep(.btn-more) { color: var(--el-text-color-regular); }
.action-buttons-inner :deep(.btn-more:hover) { background-color: var(--el-fill-color); }

:deep(.el-table__row:hover) .time-text-display { opacity: 0; }
:deep(.el-table__row:hover) .row-floating-actions { opacity: 1; pointer-events: auto; right: 0; }
:deep(.el-table__row:hover > td.el-table__cell) { background-color: var(--el-table-row-hover-bg-color) !important; }

.w-full { width: 100%; }
.af-pagination-wrap { margin-top: 20px; display: flex; justify-content: flex-end; }
.ml-4 { margin-left: 16px; }
.ml-2 { margin-left: 8px; }
.danger-text { color: var(--el-color-danger) !important; }
.package-content-wrap { border: 1px solid var(--el-border-color-lighter); border-radius: 4px; padding: 10px; }
</style>