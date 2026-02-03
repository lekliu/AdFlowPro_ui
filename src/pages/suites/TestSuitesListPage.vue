<template>
  <div class="suites-list-page" @click="closeContextMenu">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">测试套件管理</span>

          <!-- 批量操作和新建 -->
          <el-button-group class="header-button-group">
            <el-button :icon="Plus" type="primary" @click="handleCreate">新建套件</el-button>
            <el-button :icon="VideoPlay" type="success" @click="handleRunSelected" :disabled="selectedSuites.length !== 1">运行</el-button>
            <el-button :icon="Upload" type="warning" @click="handlePublishSelected" :disabled="selectedSuites.length !== 1" plain>发布</el-button>
            <el-button :icon="Document" type="info" @click="handleViewPackageSelected" :disabled="selectedSuites.length !== 1">剧本</el-button>
            <el-button :icon="Edit" type="primary" @click="handleEditSelected" :disabled="selectedSuites.length !== 1">编辑</el-button>
            <el-button :icon="Delete" type="danger" @click="handleDeleteSelected" :disabled="selectedSuites.length === 0">删除</el-button>
          </el-button-group>

          <!-- 搜索和筛选器 (推到最右侧) -->
          <div class="filter-group-auto">
            <el-select v-model="categoryFilter" placeholder="按分类筛选" clearable @change="handleSearch" style="width: 150px; margin-right: 10px">
              <el-option
                  v-for="cat in categoryStore.allCategories"
                  :key="cat.categoryId"
                  :label="cat.name"
                  :value="cat.categoryId"
              />
            </el-select>
            <el-input v-model="searchQuery" placeholder="按名称或描述搜索" clearable @keyup.enter="handleSearch" style="width: 200px; margin-right: 10px">
              <template #append>
                <el-button :icon="Search" @click="handleSearch" />
              </template>
            </el-input>
          </div>
        </div>
      </template>

      <el-table
          :data="suiteStore.suites"
          v-loading="suiteStore.isLoading"
          style="width: 100%"
          border
          stripe
          @selection-change="handleSelectionChange"
          @row-click="handleRowClick"
          @row-dblclick="handleRowDblClick"
          @row-contextmenu="handleRowContextMenu"
          ref="suiteTableRef"
      >
        <el-table-column type="selection" width="40" />
        <el-table-column prop="suiteId" label="ID" width="80" sortable />
        <el-table-column prop="name" label="名称" width="180" sortable />
        <el-table-column prop="categoryName" label="分类" width="120" sortable>
          <template #default="scope">
            <el-tag v-if="scope.row.categoryName" type="info">{{ scope.row.categoryName }}</el-tag>
            <span v-else>--</span>
          </template>
        </el-table-column>
        <el-table-column label="版本" width="80" align="center">
          <template #default="scope">
            <el-tag effect="plain" type="success" v-if="scope.row.versionCode > 0">v{{ scope.row.versionCode }}</el-tag>
            <el-tag effect="plain" type="info" v-else>Draft</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
        <el-table-column prop="targetAppPackage" label="目标App" min-width="180" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="createdAt" width="160" sortable>
          <template #default="scope">{{ formatDate(scope.row.createdAt) }}</template>
        </el-table-column>
      </el-table>

      <el-pagination
          v-if="suiteStore.totalSuites > 0"
          class="pagination-container"
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="suiteStore.totalSuites"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
      />
    </el-card>

    <el-dialog v-model="runDialog.visible" title="运行测试套件" width="500px" @close="resetRunDialog">
      <el-form v-if="runDialog.suite" :model="runDialog.form" ref="runFormRef" :rules="runDialog.rules" label-width="100px">
        <el-form-item label="测试套件">
          <el-input :value="runDialog.suite.name" disabled />
        </el-form-item>
        <el-form-item label="目标应用" prop="targetAppPackageName">
          <el-select
              v-model="runDialog.form.targetAppPackageName"
              placeholder="选择要测试的应用"
              filterable
              style="width: 100%"
              v-loading="masterAppStore.isLoading"
          >
            <el-option
                v-for="app in masterAppStore.apps"
                :key="app.packageName"
                :label="`${app.appName} (${app.packageName})`"
                :value="app.packageName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目标设备" prop="deviceId">
          <el-select v-model="runDialog.form.deviceId" placeholder="选择在线的设备" filterable style="width: 100%" v-loading="deviceStore.isLoading">
            <el-option
                v-for="device in onlineDevices"
                :key="device.deviceId"
                :label="`${device.deviceName || device.deviceId}`"
                :value="device.deviceId"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="runDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="confirmRun" :loading="runDialog.isSubmitting">开始测试</el-button>
      </template>
    </el-dialog>

    <!-- 剧本预览对话框 -->
    <el-dialog v-model="packageDialog.visible" title="剧本预览" width="60%" top="5vh">
      <div v-loading="packageDialog.loading" class="package-content">
        <el-scrollbar height="60vh">
          <!-- 使用 ElTree 组件 -->
          <el-tree
              v-if="packageDialog.treeData.length"
              :data="packageDialog.treeData"
              :props="{ children: 'children', label: 'label' }"
              :expand-on-click-node="false"
              :default-expand-all="packageDialog.expandAll"
              node-key="id"
              ref="treeRef"
          />
        </el-scrollbar>
      </div>
      <template #footer>
        <el-button @click="toggleExpandAll"> {{ packageDialog.expandAll ? '全部折叠' : '全部展开' }} </el-button>
        <el-button type="primary" @click="handleCopyPackage" :disabled="!packageDialog.content">复制内容</el-button>
        <el-button @click="packageDialog.visible = false">关闭</el-button>
      </template>
    </el-dialog>
    <!-- 2. 新增：右键菜单 -->
    <div
        v-show="contextMenu.visible"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div class="menu-item" @click="handleEditFromMenu">
        <el-icon><Edit /></el-icon> 编辑
      </div>
      <div class="menu-item" @click="handleRunFromMenu">
        <el-icon><VideoPlay /></el-icon> 运行
      </div>
      <div class="menu-item" @click="handlePublishFromMenu">
        <el-icon><Upload /></el-icon> 发布
      </div>
      <div class="menu-item" @click="handleViewPackageFromMenu">
        <el-icon><Document /></el-icon> 剧本
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item danger" @click="handleDeleteFromMenu">
        <el-icon><Delete /></el-icon> 删除
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "TestSuitesList",
});
import { ref, onMounted, computed, reactive, onActivated, nextTick, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useSuiteStore } from "@/stores/suiteStore";
import { useMasterAppStore } from "@/stores/masterAppStore";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { useDeviceStore } from "@/stores/deviceStore";
import { jobService } from "@/api/jobService";
import { ElMessage, ElMessageBox, ElLoading, type FormInstance, type FormRules, type ElTree } from "element-plus";
import type { ElTable } from "element-plus";
import { Plus, Edit, Delete, Search, VideoPlay, Document, Upload } from "@element-plus/icons-vue";
import type { TestSuiteListPublic } from "@/types/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { suiteService } from "@/api/suiteService";

dayjs.extend(utc);

const router = useRouter();
const suiteStore = useSuiteStore();
const masterAppStore = useMasterAppStore();
const categoryStore = useAtomCategoryStore();
const deviceStore = useDeviceStore();

const currentPage = ref(1);
const pageSize = ref(10);
const searchQuery = ref("");
const categoryFilter = ref<number | "">("");
const treeRef = ref<InstanceType<typeof ElTree>>();
const suiteTableRef = ref<InstanceType<typeof ElTable>>();
const selectedSuites = ref<TestSuiteListPublic[]>([]);

const fetchData = () => {
  const params = {
    skip: (currentPage.value - 1) * pageSize.value,
    limit: pageSize.value,
    search: searchQuery.value || undefined,
    categoryId: categoryFilter.value || undefined,
  };
  suiteStore.fetchSuites(params);
};

onActivated(() => {
  if (suiteStore.needsRefresh) {
    fetchData();
    suiteStore.setNeedsRefresh(false);
  }
});

onMounted(() => {
  fetchData();
  categoryStore.fetchAllCategories();
});

const handleSearch = () => {
  currentPage.value = 1;
  fetchData();
};

const handleSizeChange = (val: number) => {
  pageSize.value = val;
  fetchData();
};

const handleCurrentChange = (val: number) => {
  currentPage.value = val;
  fetchData();
};

const handleCreate = () => {
  router.push({ name: "TestSuiteEditor" });
};

const handleRunSelected = () => {
  if (selectedSuites.value.length === 1) {
    handleRunSuite(selectedSuites.value[0]);
  }
};

const handlePublishSelected = async () => {
  if (selectedSuites.value.length !== 1) return;
  const suite = selectedSuites.value[0];
  
  try {
    await ElMessageBox.confirm(
      `确定要发布套件 "${suite.name}" 吗？\n发布后版本号将递增，并自动广播通知所有在线设备进行静默更新。`,
      "发布确认",
      { confirmButtonText: "立即发布", cancelButtonText: "取消", type: "info" }
    );
    
    const loading = ElLoading.service({ text: "正在编译并发布..." });
    const res = await suiteService.publishSuite(suite.suiteId);
    loading.close();

    if (res.changed) ElMessage.success(`发布成功！新版本: v${res.versionCode}`);
    else ElMessage.info(`发布完成。内容未变更，版本保持 v${res.versionCode}`);
    
    fetchData(); // 刷新列表显示版本号
  } catch (e) { /* Cancelled or Error */ }
};

const handleViewPackageSelected = () => {
  if (selectedSuites.value.length === 1) {
    handleViewPackage(selectedSuites.value[0]);
  }
};

const handleEdit = (suiteId: number) => {
  router.push({ name: "TestSuiteEditor", params: { suiteId } });
};

const handleSelectionChange = (selection: TestSuiteListPublic[]) => {
  selectedSuites.value = selection;
};

// 点击行时触发选中/取消选中
const handleRowClick = (row: TestSuiteListPublic) => {
  if (suiteTableRef.value) {
    const isSelected = selectedSuites.value.some(item => item.suiteId === row.suiteId);
    suiteTableRef.value.toggleRowSelection(row, !isSelected);
  }
};

// 双击行进入编辑页面
const handleRowDblClick = (row: TestSuiteListPublic) => {
  if (row && row.suiteId) {
    handleEdit(row.suiteId);
  }
};

const handleEditSelected = () => {
  if (selectedSuites.value.length === 1) {
    handleEdit(selectedSuites.value[0].suiteId);
  } else {
    ElMessage.warning("请选择且只选择一个测试套件进行编辑。");
  }
};

const handleDeleteSelected = async () => {
  if (selectedSuites.value.length === 0) return;
  const names = selectedSuites.value.map(a => a.name).join(', ');
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedSuites.value.length} 个测试套件吗？\n涉及: ${names}`, "确认批量删除", {
      type: "warning",
      dangerouslyUseHTMLString: true,
    });

    const deletePromises = selectedSuites.value.map(s => suiteStore.deleteSuite(s.suiteId));

    await Promise.all(deletePromises);

    ElMessage.success(`成功删除 ${selectedSuites.value.length} 个测试套件！`);
    fetchData(); // 重新加载数据以更新列表
  } catch (error) {
    if (error === 'cancel') ElMessage.info("已取消删除");
    // 其他错误（如依赖冲突）由 API 拦截器处理
  }
};


const handleDelete = async (suiteId: number, name: string) => {
  try {
    await ElMessageBox.confirm(`确定要删除测试套件 "${name}" 吗？`, "确认删除", {
      type: "warning",
    });
    await suiteStore.deleteSuite(suiteId);
    ElMessage.success("删除成功！");
    if (suiteStore.suites.length === 0 && currentPage.value > 1) {
      currentPage.value--;
    }
    fetchData();
  } catch (error) {
    if (error !== "cancel") {
    } else {
      ElMessage.info("已取消删除");
    }
  }
};

const runDialog = reactive({
  visible: false,
  isSubmitting: false,
  suite: null as TestSuiteListPublic | null,
  form: {
    targetAppPackageName: "",
    deviceId: "",
  },
  rules: {
    targetAppPackageName: [{ required: true, message: "请选择目标应用", trigger: "change" }],
    deviceId: [{ required: true, message: "请选择目标设备", trigger: "change" }],
  } as FormRules,
});
const runFormRef = ref<FormInstance>();

const packageDialog = reactive({
  visible: false,
  loading: false,
  content: null as any | null,
  treeData: [] as any[],
  expandAll: false,
});

const onlineDevices = computed(() => deviceStore.devices.filter((d) => d.isConnectedWs));

const handleRunSuite = (suite: TestSuiteListPublic) => {
  masterAppStore.fetchApps({ skip: 0, limit: 1000 });
  deviceStore.fetchDevices({ limit: 1000 });
  runDialog.suite = suite;
  runDialog.form.targetAppPackageName = suite.targetAppPackage || "";
  runDialog.visible = true;
};

const jsonToTree = (obj: any, labelPrefix = ""): any[] => {
  let idCounter = 0;
  const transform = (value: any, key: string | number): any => {
    const nodeId = `${labelPrefix}-${key}-${idCounter++}`;
    if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        return {
          id: nodeId,
          label: `[${key}] (${value.length} items)`,
          children: value.map((item, index) => transform(item, index)),
        };
      } else {
        return {
          id: nodeId,
          label: `{${key}}`,
          children: Object.entries(value).map(([childKey, childValue]) => transform(childValue, childKey)),
        };
      }
    } else {
      return {
        id: nodeId,
        label: `${key}: ${JSON.stringify(value)}`,
      };
    }
  };
  if (obj && typeof obj === "object") {
    return Object.entries(obj).map(([key, value]) => transform(value, key));
  }
  return [{ id: "root", label: JSON.stringify(obj) }];
};

const toggleExpandAll = () => {
  packageDialog.expandAll = !packageDialog.expandAll;
  const nodes = treeRef.value?.store.nodesMap;
  if (nodes) {
    for (const key in nodes) {
      nodes[key].expanded = packageDialog.expandAll;
    }
  }
};

const handleViewPackage = async (suite: TestSuiteListPublic) => {
  packageDialog.content = null;
  packageDialog.treeData = [];
  packageDialog.loading = true;
  packageDialog.visible = true;
  try {
    const packageData = await suiteService.getSuitePackage(suite.suiteId);
    packageDialog.content = packageData;
    packageDialog.treeData = jsonToTree(packageData, `suite-${suite.suiteId}`);
    await nextTick(); // Wait for the DOM to update
    packageDialog.expandAll = false; // Set initial expand state
    toggleExpandAll(); // Then immediately toggle to collapse all
  } catch (error) {
    packageDialog.content = { error: "加载剧本失败。" };
    packageDialog.treeData = jsonToTree(packageDialog.content, `suite-${suite.suiteId}`);
  } finally {
    packageDialog.loading = false;
  }
};

const resetRunDialog = () => {
  runDialog.visible = false;
  runDialog.isSubmitting = false;
  runDialog.suite = null;
  runDialog.form.targetAppPackageName = "";
  runDialog.form.deviceId = "";
  runFormRef.value?.clearValidate();
};

const confirmRun = async () => {
  if (!runFormRef.value || !runDialog.suite) return;

  await runFormRef.value.validate(async (valid) => {
    if (valid) {
      runDialog.isSubmitting = true;
      try {
        // [核心修改] Web端发起的运行，统一走调试轨道 (Direct Push)
        // 这样用户无需先点击发布，也能立即运行最新修改
        const createdJob = await jobService.runDebugJob({
          suiteId: runDialog.suite!.suiteId,
          targetAppPackageName: runDialog.form.targetAppPackageName,
          deviceId: runDialog.form.deviceId,
        });
        ElMessage.success(`任务 #${createdJob.jobId} 已启动，正在跳转监控页...`);
        resetRunDialog();
        router.push({ name: "JobDetail", params: { jobId: createdJob.jobId } });
      } catch (error) {
        // API interceptor will handle error messages
      } finally {
        runDialog.isSubmitting = false;
      }
    }
  });
};

const handleCopyPackage = async () => {
  if (!packageDialog.content) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(packageDialog.content, null, 2));
    ElMessage.success("剧本JSON内容已成功复制到剪贴板！");
  } catch (err) {
    console.error("Failed to copy text: ", err);
    ElMessage.error("复制失败，您的浏览器可能不支持或未授权剪贴板访问。");
  }
};

const formatDate = (dateString: string | Date): string => {
  if (!dateString) return "N/A";
  return dayjs.utc(dateString).local().format("YYYY-MM-DD HH:mm:ss");
};

// --- 右键菜单状态 ---
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  row: null as TestSuiteListPublic | null,
});

// 处理右键点击
const handleRowContextMenu = (row: TestSuiteListPublic, column: any, event: MouseEvent) => {
  // 1. 阻止浏览器默认右键菜单
  event.preventDefault();

  // 2. 选中当前行 (可选，看交互习惯，通常右键点击也意味着关注该行)
  if (suiteTableRef.value) {
    suiteTableRef.value.clearSelection();
    suiteTableRef.value.toggleRowSelection(row, true);
    selectedSuites.value = [row];
  }

  // 3. 记录行数据和坐标
  contextMenu.row = row;
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;

  // 4. 显示菜单
  contextMenu.visible = true;
};

// 关闭菜单
const closeContextMenu = () => {
  contextMenu.visible = false;
};

// --- 菜单项动作 ---
const handleEditFromMenu = () => {
  if (contextMenu.row) {
    handleEdit(contextMenu.row.suiteId);
  }
  closeContextMenu();
};

const handleRunFromMenu = () => {
  if (contextMenu.row) {
    handleRunSuite(contextMenu.row);
  }
  closeContextMenu();
};

const handlePublishFromMenu = () => {
  if (contextMenu.row) {
    // 临时选中
    selectedSuites.value = [contextMenu.row];
    handlePublishSelected();
  }
  closeContextMenu();
};

const handleViewPackageFromMenu = () => {
  if (contextMenu.row) {
    handleViewPackage(contextMenu.row);
  }
  closeContextMenu();
};

const handleDeleteFromMenu = () => {
  if (contextMenu.row) {
    handleDelete(contextMenu.row.suiteId, contextMenu.row.name);
  }
  closeContextMenu();
};

// 监听滚动以关闭菜单 (防止菜单漂浮)
onMounted(() => {
  window.addEventListener('scroll', closeContextMenu, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', closeContextMenu, true);
});
</script>

<style scoped>
.suites-list-page {
  padding: 0;
}
.card-header {
  display: flex;
  align-items: center;
  gap: 15px;
}
.filter-group-auto {
  margin-left: auto;
}
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
.package-content pre {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  font-family: "Courier New", Courier, monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}
:deep(.el-tree-node__content) {
  height: auto;
  min-height: 26px;
  align-items: flex-start;
}

:deep(.el-tree-node__label) {
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
}
.context-menu {
  position: fixed;
  background-color: #fff;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  padding: 5px 0;
  z-index: 2000; /* 确保在最上层 */
  min-width: 120px;
}

.menu-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background-color: #ecf5ff;
  color: var(--el-color-primary);
}

.menu-item .el-icon {
  font-size: 14px;
}

.menu-divider {
  height: 1px;
  background-color: #ebeef5;
  margin: 5px 0;
}

.menu-item.danger {
  color: #f56c6c;
}

.menu-item.danger:hover {
  background-color: #fef0f0;
}
</style>