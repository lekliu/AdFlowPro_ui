<template>
  <div class="master-apps-page" @click="closeContextMenu">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">主应用目录管理</span>
          <div class="header-actions">
            <!-- 顶部操作按钮组 -->
            <el-button-group class="header-button-group">
              <el-button type="primary" :icon="Plus" @click="handleOpenDialog(null)">新增</el-button>
              <el-button type="success" :icon="VideoPlay" @click="handleRunSelected" :disabled="selectedApps.length !== 1">运行</el-button>
              <el-button type="warning" :icon="Upload" @click="handlePullSelected" :disabled="selectedApps.length !== 1">拉取</el-button>
              <el-button type="info" :icon="Download" @click="handleInstallSelected" :disabled="selectedApps.length !== 1">分发</el-button>
              <el-button type="primary" :icon="Edit" @click="handleEditSelected" :disabled="selectedApps.length !== 1">编辑</el-button>
              <el-button type="danger" :icon="Delete" @click="handleDeleteSelected" :disabled="selectedApps.length === 0">删除</el-button>
            </el-button-group>
            <el-divider direction="vertical" />
            <el-button :icon="Refresh" circle @click="handleRefresh" :loading="appStore.isLoading" title="刷新列表" />
          </div>
        </div>
      </template>

      <!-- 搜索栏 -->
      <div class="filter-container">
        <el-input
            v-model="searchQuery"
            placeholder="按应用名称或包名搜索"
            clearable
            @keyup.enter="handleSearch"
            style="width: 300px;"
        >
          <template #append>
            <el-button :icon="Search" @click="handleSearch" />
          </template>
        </el-input>

        <!-- 套件筛选 (下拉框) -->
        <el-select
            v-model="suiteFilter"
            placeholder="按默认套件筛选"
            clearable
            filterable
            @change="handleSearch"
            style="width: 200px; margin-left: 10px;"
        >
          <el-option label="[仅显示未配置]" value="__NULL__" style="color: #E6A23C" />
          <el-option v-for="suite in availableSuites" :key="suite.suiteId" :label="suite.name" :value="suite.name" />
        </el-select>
      </div>

      <!-- 数据表格 -->
      <el-table
          :data="appStore.apps"
          v-loading="appStore.isLoading"
          style="width: 100%"
          border
          stripe
          ref="appTableRef"
          row-key="appId"
          @selection-change="handleSelectionChange"
          @row-click="handleRowClick"
          @row-dblclick="handleRowDblClick"
          @row-contextmenu="handleRowContextMenu"
      >
        <el-table-column type="selection" width="40" align="center" />
        <el-table-column prop="appId" label="ID" width="65" sortable align="center" />
        <el-table-column prop="appName" label="应用名称" width="120" sortable show-overflow-tooltip />
        <el-table-column prop="packageName" label="应用包名" min-width="180" sortable show-overflow-tooltip />
        <el-table-column prop="versionName" label="版本" width="80" show-overflow-tooltip />
        <el-table-column label="推荐权重" width="150" align="center">
          <template #default="scope">
            <el-tag effect="dark" :type="scope.row.weight + scope.row.weightAdjustment > 0 ? 'success' : 'info'">
              {{ scope.row.weight + scope.row.weightAdjustment }}
            </el-tag>
            <div style="font-size: 10px; color: #909399">({{ scope.row.weight }} + {{ scope.row.weightAdjustment }})</div>
          </template>
        </el-table-column>
        <el-table-column prop="defaultSuiteName" label="默认测试套件" min-width="120" show-overflow-tooltip>
          <template #default="scope">
            <el-tag v-if="scope.row.defaultSuiteName" type="info" size="small">{{ scope.row.defaultSuiteName }}</el-tag>
            <span v-else class="text-placeholder">未配置</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
        <el-table-column prop="apkUrl" label="下载地址" min-width="100" show-overflow-tooltip />
      </el-table>

      <el-pagination
          v-if="appStore.totalApps > 0"
          class="pagination-container"
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="appStore.totalApps"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- 1. 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" @close="resetForm">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="应用名称" prop="appName">
          <el-input v-model="form.appName" placeholder="例如：微信" />
        </el-form-item>
        <el-form-item label="应用包名" prop="packageName">
          <el-input v-model="form.packageName" placeholder="例如：com.tencent.mm" :disabled="!!form.appId" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="版本名称" prop="versionName">
              <el-input v-model="form.versionName" placeholder="例如: 8.0.48" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="版本号" prop="versionCode">
              <el-input-number v-model="form.versionCode" :min="0" controls-position="right" style="width: 100%" placeholder="例如: 2460" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="权重修正" prop="weightAdjustment">
          <el-input-number v-model="form.weightAdjustment" :step="100" controls-position="right" style="width: 100%" />
          <div style="font-size: 12px; color: #909399; line-height: 1.4; margin-top: 4px;">
            正数增加推荐优先级，负数降低。最终分 = 全网平均分 + 修正分。
          </div>
        </el-form-item>

        <el-form-item label="默认测试套件" prop="defaultSuiteId">
          <el-select
              v-model="form.defaultSuiteId"
              placeholder="选择一个默认测试套件"
              clearable
              filterable
              style="width: 100%"
              v-loading="suiteStore.isLoading"
          >
            <el-option v-for="suite in availableSuites" :key="suite.suiteId" :label="suite.name" :value="suite.suiteId" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" placeholder="可选的应用描述" />
        </el-form-item>
        <el-form-item label="下载地址" prop="apkUrl">
          <el-input v-model="form.apkUrl" type="textarea" placeholder="可选，用于远程安装的APK下载链接" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="appStore.isLoading">确 定</el-button>
      </template>
    </el-dialog>

    <!-- 2. 运行任务对话框 (新增) -->
    <el-dialog v-model="runDialog.visible" title="运行测试任务" width="500px">
      <div v-if="runDialog.app">
        <el-form label-position="top">
          <el-form-item label="目标应用">
            <el-input :value="runDialog.app.appName" disabled />
          </el-form-item>
          <el-form-item label="测试套件 (默认)">
            <el-input :value="runDialog.app.defaultSuiteName" disabled>
              <template #append>ID: {{ runDialog.app.defaultSuiteId }}</template>
            </el-input>
          </el-form-item>
          <el-form-item label="执行设备 (仅显示已安装此应用的在线设备)">
            <el-select v-model="runDialog.targetDeviceId" placeholder="请选择设备" style="width: 100%" v-loading="runDialog.isLoadingDevices">
              <el-option
                  v-for="device in runDialog.availableDevices"
                  :key="device.deviceId"
                  :label="`${device.deviceName || device.deviceId}`"
                  :value="device.deviceId"
              />
            </el-select>
            <el-empty v-if="!runDialog.isLoadingDevices && runDialog.availableDevices.length === 0" :image-size="40" description="未找到符合条件的在线设备" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="runDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmRun" :disabled="!runDialog.targetDeviceId" :loading="runDialog.isSubmitting">开始测试</el-button>
      </template>
    </el-dialog>

    <!-- 3. 拉取APK对话框 -->
    <el-dialog v-model="pullDialog.visible" title="从设备拉取APK" width="500px">
      <div v-if="pullDialog.app">
        <p>
          将拉取 <strong>{{ pullDialog.app.appName }}</strong> 的安装包。
        </p>
        <el-select
            v-model="pullDialog.selectedDeviceId"
            placeholder="请选择来源设备"
            style="width: 100%"
            filterable
            v-loading="pullDialog.isLoadingSources"
        >
          <el-option
              v-for="device in pullDialog.sourceDevices"
              :key="device.deviceId"
              :label="`${device.deviceName || device.deviceId}`"
              :value="device.deviceId"
          />
        </el-select>
        <el-empty v-if="!pullDialog.isLoadingSources && pullDialog.sourceDevices.length === 0" description="没有找到安装了此应用的在线设备" />
      </div>
      <template #footer>
        <el-button @click="pullDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="handlePull" :disabled="!pullDialog.selectedDeviceId">开始拉取</el-button>
      </template>
    </el-dialog>

    <!-- 4. 分发/安装对话框 -->
    <el-dialog v-model="installDialog.visible" title="分发应用" width="500px">
      <div v-if="installDialog.app">
        <p>
          将分发
          <strong>{{ installDialog.app.appName }} v{{ installDialog.app.versionName || "未知" }}</strong>
        </p>
        <el-select
            v-model="installDialog.selectedDeviceIds"
            placeholder="请选择目标设备"
            style="width: 100%"
            multiple
            collapse-tags
            filterable
            v-loading="installDialog.isLoadingTargets"
        >
          <el-option
              v-for="device in installDialog.targetDevices"
              :key="device.deviceId"
              :label="`${device.deviceName || device.deviceId}`"
              :value="device.deviceId"
          />
        </el-select>
        <el-empty v-if="!installDialog.isLoadingTargets && installDialog.targetDevices.length === 0" description="没有找到需要安装此版本的在线设备" />
      </div>
      <template #footer>
        <el-button @click="installDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="handleInstall" :disabled="installDialog.selectedDeviceIds.length === 0">开始分发</el-button>
      </template>
    </el-dialog>

    <!-- 5. 右键菜单 -->
    <div
        v-show="contextMenu.visible"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div class="menu-item" @click="handleRunFromMenu">
        <el-icon><VideoPlay /></el-icon> 运行
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item" @click="handleEditFromMenu">
        <el-icon><Edit /></el-icon> 编辑
      </div>
      <div class="menu-item" @click="handlePullFromMenu">
        <el-icon><Upload /></el-icon> 拉取 APK
      </div>
      <div class="menu-item" @click="handleInstallFromMenu">
        <el-icon><Download /></el-icon> 分发应用
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
  name: "MasterApps",
});

import { ref, onMounted, computed, reactive, onBeforeUnmount } from "vue";
import { useMasterAppStore } from "@/stores/masterAppStore";
import { deviceService } from "@/api/deviceService";
import { masterAppService } from "@/api/masterAppService";
import { jobService } from "@/api/jobService";
import type { MasterAppPublic, DevicePublic, MasterAppCreatePayload, MasterAppUpdatePayload } from "@/types/api";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules, type ElTable } from "element-plus";
import { Plus, Edit, Delete, Search, Download, Upload, Refresh, VideoPlay } from "@element-plus/icons-vue";
import { useSuiteStore } from "@/stores/suiteStore";
import { useRouter } from "vue-router";

const appStore = useMasterAppStore();
const suiteStore = useSuiteStore();
const router = useRouter();

// --- 分页和搜索状态 ---
const currentPage = ref(1);
const pageSize = ref(10);
const searchQuery = ref("");
const suiteFilter = ref("");
const appTableRef = ref<InstanceType<typeof ElTable>>();
const selectedApps = ref<MasterAppPublic[]>([]);

// --- 对话框状态 ---
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({
  appId: null as number | null,
  appName: "",
  packageName: "",
  description: "",
  versionName: "",
  versionCode: undefined as number | undefined,
  weight: 0,
  weightAdjustment: 0,
  apkUrl: "",
  defaultSuiteId: undefined as number | undefined,
});
const dialogTitle = computed(() => (form.appId ? "编辑应用" : "新增应用"));
const rules = reactive<FormRules>({
  appName: [{ required: true, message: "请输入应用名称", trigger: "blur" }],
  packageName: [{ required: true, message: "请输入应用包名", trigger: "blur" }],
});

// --- 动态套件列表 ---
const availableSuites = computed(() => {
  return suiteStore.allSuites;
});

// --- 运行对话框状态 ---
const runDialog = reactive({
  visible: false,
  app: null as MasterAppPublic | null,
  availableDevices: [] as DevicePublic[],
  targetDeviceId: "",
  isLoadingDevices: false,
  isSubmitting: false,
});

// --- 拉取APK对话框相关状态 ---
const pullDialog = reactive({
  visible: false,
  isLoadingSources: false,
  app: null as MasterAppPublic | null,
  sourceDevices: [] as DevicePublic[],
  selectedDeviceId: "" as string,
});

// --- 分发/安装对话框相关状态 ---
const installDialog = reactive({
  visible: false,
  isLoadingTargets: false,
  app: null as MasterAppPublic | null,
  targetDevices: [] as DevicePublic[],
  selectedDeviceIds: [] as string[],
});

// --- 右键菜单状态 ---
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  row: null as MasterAppPublic | null,
});

// --- 数据获取方法 ---
const fetchData = () => {
  const params = {
    skip: (currentPage.value - 1) * pageSize.value,
    limit: pageSize.value,
    search: searchQuery.value || undefined,
    suiteSearch: suiteFilter.value || undefined
  };

  appStore.fetchApps(params);
};

const handleRefresh = () => {
  ElMessage.info("正在刷新应用列表...");
  fetchData();
};

onMounted(() => {
  fetchData();
  suiteStore.fetchAllSuites();
  window.addEventListener("apk_pull_complete", handleApkPullComplete);
  window.addEventListener("click", closeContextMenu); // 监听全局点击以关闭菜单
});

onBeforeUnmount(() => {
  window.removeEventListener("apk_pull_complete", handleApkPullComplete);
  window.removeEventListener("click", closeContextMenu);
});

// --- 表格交互 ---
const handleSelectionChange = (selection: MasterAppPublic[]) => {
  selectedApps.value = selection;
};

const handleRowClick = (row: MasterAppPublic) => {
  if (appTableRef.value) {
    // 切换当前行的选中状态
    appTableRef.value.toggleRowSelection(row, undefined);
  }
};

const handleRowDblClick = (row: MasterAppPublic) => {
  handleOpenDialog(row);
};

const handleRowContextMenu = (row: MasterAppPublic, column: any, event: MouseEvent) => {
  event.preventDefault();
  // 右键点击时，如果当前行未被选中，则清除其他选中并选中当前行
  if (appTableRef.value) {
    const isSelected = selectedApps.value.some(item => item.appId === row.appId);
    if (!isSelected) {
      appTableRef.value.clearSelection();
      appTableRef.value.toggleRowSelection(row, true);
    }
  }

  contextMenu.row = row;
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.visible = true;
};

const closeContextMenu = () => {
  contextMenu.visible = false;
};

// --- 分页与搜索 ---
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

// --- 编辑/新增逻辑 ---
const resetForm = () => {
  form.appId = null;
  form.appName = "";
  form.packageName = "";
  form.description = "";
  form.versionName = "";
  form.versionCode = undefined;
  form.weight = 0;
  form.apkUrl = "";
  form.defaultSuiteId = undefined;
  formRef.value?.clearValidate();
};

const handleOpenDialog = (app: MasterAppPublic | null) => {
  resetForm();
  if (app) {
    form.appId = app.appId;
    form.appName = app.appName;
    form.packageName = app.packageName;
    form.description = app.description || "";
    form.versionName = app.versionName || "";
    form.versionCode = app.versionCode;
    form.weight = app.weight;
    form.weightAdjustment = app.weightAdjustment || 0;
    form.apkUrl = app.apkUrl || "";
    form.defaultSuiteId = app.defaultSuiteId || undefined;
  }
  dialogVisible.value = true;
};

const handleEditSelected = () => {
  if (selectedApps.value.length === 1) {
    handleOpenDialog(selectedApps.value[0]);
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      const isEdit = !!form.appId;
      const payload: MasterAppUpdatePayload = {
        appName: form.appName,
        description: form.description,
        versionName: form.versionName,
        versionCode: form.versionCode,
        weight: form.weight,
        weightAdjustment: form.weightAdjustment,
        apkUrl: form.apkUrl,
        defaultSuiteId: form.defaultSuiteId || null,
      };

      if (!isEdit) {
        (payload as MasterAppCreatePayload).packageName = form.packageName;
      }

      try {
        await (isEdit ? appStore.editApp(form.appId!, payload) : appStore.addApp(payload as MasterAppCreatePayload));
        if (!isEdit) currentPage.value = 1;
        fetchData();
        dialogVisible.value = false;
      } catch (e) {
        console.error("Error during store action:", e);
      }
    }
  });
};

// --- 删除逻辑 ---
const handleDeleteSelected = async () => {
  if (selectedApps.value.length === 0) return;

  try {
    const names = selectedApps.value.map(a => a.appName).join(', ');
    await ElMessageBox.confirm(
        `确定要删除选中的 ${selectedApps.value.length} 个应用吗？\n涉及: ${names}\n\n注意：这将同时永久删除云端存储的APK文件！`,
        "确认批量删除",
        {
          type: "warning",
          confirmButtonText: "确定删除",
          cancelButtonText: "取消",
        }
    );

    // 批量删除，强制 deleteFiles=true
    const deletePromises = selectedApps.value.map(app => appStore.removeApp(app.appId, true));
    await Promise.all(deletePromises);

    ElMessage.success("删除成功！");
    selectedApps.value = []; // 清空选中

    if (appStore.apps.length === 0 && currentPage.value > 1) {
      currentPage.value--;
    }
    fetchData();
  } catch (error) {
    if (error !== "cancel") {
      // API error handled by interceptor
    } else {
      ElMessage.info("已取消删除");
    }
  }
};

// --- 运行功能实现 ---
const handleRunSelected = async () => {
  if (selectedApps.value.length !== 1) return;
  const app = selectedApps.value[0];

  // 1. 检查是否有默认套件
  if (!app.defaultSuiteId) {
    ElMessage.warning(`应用 "${app.appName}" 未配置默认测试套件，请先编辑应用进行配置。`);
    return;
  }

  runDialog.app = app;
  runDialog.targetDeviceId = "";
  runDialog.availableDevices = [];
  runDialog.isLoadingDevices = true;
  runDialog.visible = true;

  try {
    // 2. 复用 getPullSources 接口获取安装了此应用的在线设备
    // 逻辑：返回所有在线且已安装该包名的设备
    runDialog.availableDevices = await masterAppService.getPullSources(app.packageName);
  } catch (error) {
    ElMessage.error("获取可用设备失败");
  } finally {
    runDialog.isLoadingDevices = false;
  }
};

const handleConfirmRun = async () => {
  if (!runDialog.app || !runDialog.app.defaultSuiteId || !runDialog.targetDeviceId) return;

  runDialog.isSubmitting = true;
  try {
    const createdJob = await jobService.createJob({
      suiteId: runDialog.app.defaultSuiteId,
      targetAppPackageName: runDialog.app.packageName,
      deviceId: runDialog.targetDeviceId,
    });
    ElMessage.success(`任务 #${createdJob.jobId} 已启动`);
    runDialog.visible = false;
    // 跳转到任务详情页
    router.push({ name: "JobDetail", params: { jobId: createdJob.jobId } });
  } catch (error) {
    // Interceptor handles error
  } finally {
    runDialog.isSubmitting = false;
  }
};

// --- 拉取逻辑 ---
const handlePullSelected = () => {
  if (selectedApps.value.length === 1) {
    handleOpenPullDialog(selectedApps.value[0]);
  }
};

const handleOpenPullDialog = async (app: MasterAppPublic) => {
  pullDialog.app = app;
  pullDialog.selectedDeviceId = "";
  pullDialog.isLoadingSources = true;
  pullDialog.visible = true;
  try {
    pullDialog.sourceDevices = await masterAppService.getPullSources(app.packageName);
  } catch (error) {
    console.error("Failed to fetch pull sources:", error);
    pullDialog.sourceDevices = [];
  } finally {
    pullDialog.isLoadingSources = false;
  }
};

const handlePull = async () => {
  if (!pullDialog.selectedDeviceId || !pullDialog.app) return;
  try {
    ElMessage.info(`正在向设备 ${pullDialog.selectedDeviceId} 发送拉取指令...`);
    await deviceService.pullApk(pullDialog.selectedDeviceId, pullDialog.app.packageName);
    pullDialog.visible = false;
  } catch (error) {
    // API 拦截器已处理错误消息
  }
};

const handleApkPullComplete = (event: Event) => {
  const detail = (event as CustomEvent).detail;
  ElMessage.success(`应用 '${detail.appName}' (v${detail.versionName}) 已成功拉取，列表将自动刷新！`);
  fetchData();
};

// --- 分发逻辑 ---
const handleInstallSelected = () => {
  if (selectedApps.value.length === 1) {
    handleOpenInstallDialog(selectedApps.value[0]);
  } else {
    ElMessage.warning("每次只能选择一个应用进行分发。");
  }
};

const handleOpenInstallDialog = async (app: MasterAppPublic) => {
  installDialog.app = app;
  installDialog.selectedDeviceIds = [];
  installDialog.isLoadingTargets = true;
  installDialog.visible = true;
  try {
    if (app.packageName && app.versionCode != null) {
      installDialog.targetDevices = await deviceService.getInstallTargets(app.packageName, app.versionCode);
    } else {
      installDialog.targetDevices = [];
      ElMessage.warning("此应用无归档版本信息，无法智能筛选可分发的设备。");
    }
  } catch (error) {
    console.error("Failed to fetch install targets:", error);
    installDialog.targetDevices = [];
  } finally {
    installDialog.isLoadingTargets = false;
  }
};

const handleInstall = async () => {
  if (installDialog.selectedDeviceIds.length === 0 || !installDialog.app?.apkUrl) return;
  ElMessage.info(`正在向 ${installDialog.selectedDeviceIds.length} 台设备分发应用...`);
  try {
    await deviceService.installApp(installDialog.app.appId, installDialog.selectedDeviceIds);
    ElMessage.success("所有分发指令已成功发送！");
    installDialog.visible = false;
  } catch (error) {
    // API client interceptor will handle the error message
  }
};

// --- 菜单项动作 ---
const handleRunFromMenu = () => {
  handleRunSelected();
  closeContextMenu();
};
const handleEditFromMenu = () => {
  handleEditSelected();
  closeContextMenu();
};
const handlePullFromMenu = () => {
  handlePullSelected();
  closeContextMenu();
};
const handleInstallFromMenu = () => {
  handleInstallSelected();
  closeContextMenu();
};
const handleDeleteFromMenu = () => {
  handleDeleteSelected();
  closeContextMenu();
};
</script>

<style scoped>
.master-apps-page {
  padding: 0;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-size: 16px;
  font-weight: bold;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
.filter-container {
  margin-bottom: 20px;
}
.text-placeholder {
  color: #909399;
  font-style: italic;
  font-size: 12px;
}

/* 上下文菜单样式 */
.context-menu {
  position: fixed;
  background-color: #fff;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  padding: 5px 0;
  z-index: 2000;
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