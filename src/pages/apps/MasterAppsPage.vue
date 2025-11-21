<!-- AdFlowPro_ui\src/pages/MasterAppsPage.vue -->
<template>
  <div class="master-apps-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>主应用目录管理</span>
          <el-button type="primary" :icon="Plus" @click="handleOpenDialog(null)"> 新增应用 </el-button>
          <el-button :icon="Refresh" @click="handleRefresh" :loading="appStore.isLoading"> 刷新 </el-button>
        </div>
      </template>

      <div class="filter-container">
        <el-input
          v-model="searchQuery"
          placeholder="按应用名称或包名搜索"
          clearable
          @keyup.enter="handleSearch"
          style="width: 300px; margin-right: 10px"
        >
          <template #append>
            <el-button :icon="Search" @click="handleSearch" />
          </template>
        </el-input>
      </div>

      <el-table :data="appStore.apps" v-loading="appStore.isLoading" style="width: 100%" border stripe>
        <el-table-column type="index" width="50" label="序号" />
        <el-table-column prop="appName" label="应用名称" width="120" sortable />
        <el-table-column prop="packageName" label="应用包名" min-width="180" sortable />
        <el-table-column prop="versionName" label="版本" width="100" />
        <el-table-column prop="weight" label="权重" width="100" sortable />
        <el-table-column prop="defaultSuiteName" label="默认测试套件" min-width="150" show-overflow-tooltip>
          <template #default="scope">
            <el-tag v-if="scope.row.defaultSuiteName" type="info">{{ scope.row.defaultSuiteName }}</el-tag>
            <span v-else>--</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="120" show-overflow-tooltip />
        <el-table-column prop="apkUrl" label="下载地址" min-width="150" show-overflow-tooltip />

        <el-table-column label="操作" width="260" fixed="right">
          <template #default="scope">
            <el-button size="small" type="warning" :icon="Upload" @click="handleOpenPullDialog(scope.row)">拉取</el-button>
            <el-button size="small" type="success" :icon="Download" :disabled="!scope.row.apkUrl" @click="handleOpenInstallDialog(scope.row)"
              >分发</el-button
            >
            <el-button size="small" type="primary" :icon="Edit" @click="handleOpenDialog(scope.row)" />
            <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(scope.row.appId)" />
          </template>
        </el-table-column>
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

    <!-- 新增/编辑对话框 -->
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
            <el-form-item label="权重" prop="weight">
              <el-input-number v-model="form.weight" :min="0" :max="100000" step="100" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

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

    <!-- 拉取APK对话框 (新增) -->
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

    <!-- 分发/安装对话框 (修改) -->
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
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "MasterApps",
});

import { ref, onMounted, computed, reactive, h, onBeforeUnmount } from "vue";
import { useMasterAppStore } from "@/stores/masterAppStore";
import { deviceService } from "@/api/deviceService";
import { masterAppService } from "@/api/masterAppService"; // 引入 masterAppService
import type { MasterAppPublic, DevicePublic, MasterAppCreatePayload, MasterAppUpdatePayload } from "@/types/api"; // 引入 DevicePublic
import { ElMessage, ElMessageBox, ElCheckbox, type FormInstance, type FormRules } from "element-plus";
import { Plus, Edit, Delete, Search, Download, Upload, Refresh } from "@element-plus/icons-vue";
import { useSuiteStore } from "@/stores/suiteStore"; 

const appStore = useMasterAppStore();
const suiteStore = useSuiteStore();

// --- 分页和搜索状态 ---
const currentPage = ref(1);
const pageSize = ref(10);
const searchQuery = ref("");

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
  weight: 10000,
  apkUrl: "",
  defaultSuiteId: undefined as number | undefined,
  defaultSuiteType: "linear" as "linear" | "flow" | null, // Kept for radio button, but logic simplified
});
const dialogTitle = computed(() => (form.appId ? "编辑应用" : "新增应用"));
const rules = reactive<FormRules>({
  appName: [{ required: true, message: "请输入应用名称", trigger: "blur" }],
  packageName: [{ required: true, message: "请输入应用包名", trigger: "blur" }],
});

// --- DYNAMIC SUITE LIST ---
const availableSuites = computed(() => {
  return suiteStore.allSuites;
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

// --- 数据获取方法 ---
const fetchData = () => {
  const params = {
    skip: (currentPage.value - 1) * pageSize.value,
    limit: pageSize.value,
    search: searchQuery.value || undefined,
  };
  appStore.fetchApps(params);
};

const handleRefresh = () => {
  ElMessage.info("正在刷新应用列表...");
  fetchData(); // 直接调用现有的数据获取方法
};

onMounted(() => {
  fetchData();
  suiteStore.fetchAllSuites();
  window.addEventListener("apk_pull_complete", handleApkPullComplete);
});

onBeforeUnmount(() => {
  // 移除事件监听器以防内存泄漏
  window.removeEventListener("apk_pull_complete", handleApkPullComplete);
});

// --- 事件处理器 ---
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

const resetForm = () => {
  form.appId = null;
  form.appName = "";
  form.packageName = "";
  form.description = "";
  form.versionName = "";
  form.versionCode = undefined;
  form.weight = 10000;
  form.apkUrl = "";
  form.defaultSuiteId = undefined;
  form.defaultSuiteType = "linear";
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
    form.apkUrl = app.apkUrl || "";
    form.defaultSuiteId = app.defaultSuiteId || undefined;
    form.defaultSuiteType = "linear"; // Always linear now
  }
  dialogVisible.value = true;
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
        apkUrl: form.apkUrl,
        defaultSuiteId: form.defaultSuiteId || null,
      };

      // For create, we also need packageName
      if (!isEdit) {
        (payload as MasterAppCreatePayload).packageName = form.packageName;
      }

      try {
        await (isEdit ? appStore.editApp(form.appId!, payload) : appStore.addApp(payload as MasterAppCreatePayload));
        if (!isEdit) currentPage.value = 1;
        fetchData();
        dialogVisible.value = false;
      } catch (e) {
        // Even if the API fails, we want to see the log
        console.error("Error during store action:", e);
      }
    }
  });
};

const handleDelete = async (appId: number) => {
  const deleteFilesFlag = ref(true);
  try {
    // 使用 ElMessageBox 的 VNode 功能来创建带复选框的弹窗
    await ElMessageBox({
      title: "删除应用",
      // 使用 VNode 作为消息内容
      message: () =>
        h("div", null, [
          h("p", { style: "margin-bottom: 10px;" }, "确定要删除这个应用吗？此操作不可逆！"),
          h(ElCheckbox, {
            // 3. 绑定到我们新创建的局部 ref
            modelValue: deleteFilesFlag.value,
            "onUpdate:modelValue": (val) => {
              // 4. onUpdate 事件现在可以正确地修改这个 ref 的值
              if (typeof val === "boolean") {
                deleteFilesFlag.value = val;
              }
            },
            label: "同时删除存储中的所有版本APK文件",
            size: "large",
            border: true, // 加个边框更好看
          }),
        ]),
      showCancelButton: true,
      confirmButtonText: "确定删除",
      cancelButtonText: "取消",
      type: "warning",
    });

    // 用户点击了“确定删除”
    await appStore.removeApp(appId, deleteFilesFlag.value); // <<< 将复选框的值传给action

    if (appStore.apps.length === 0 && currentPage.value > 1) {
      currentPage.value--;
    }
    fetchData();
  } catch (error) {
    if (error === "cancel") {
      ElMessage.info("已取消删除");
    }
    // 其他错误由拦截器处理
  }
};

const handleOpenPullDialog = async (app: MasterAppPublic) => {
  pullDialog.app = app;
  pullDialog.selectedDeviceId = "";
  pullDialog.isLoadingSources = true;
  pullDialog.visible = true;
  try {
    // 调用后端API获取可拉取的源设备列表
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
  // Optional: Check if the update is relevant to the currently viewed page
  // For now, any pull completion will trigger a refresh.
  ElMessage.success(`应用 '${detail.appName}' (v${detail.versionName}) 已成功拉取，列表将自动刷新！`);
  fetchData(); // Refresh the list
};

const handleOpenInstallDialog = async (app: MasterAppPublic) => {
  installDialog.app = app;
  installDialog.selectedDeviceIds = [];
  installDialog.isLoadingTargets = true;
  installDialog.visible = true;
  try {
    if (app.packageName && app.versionCode != null) {
      // 调用后端API获取需要安装此版本的设备列表
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
    // Call the updated service method with appId and deviceIds
    await deviceService.installApp(installDialog.app.appId, installDialog.selectedDeviceIds);
    ElMessage.success("所有分发指令已成功发送！");
    installDialog.visible = false;
  } catch (error) {
    // API client interceptor will handle the error message
  }
};
</script>

<style scoped>
.master-apps-page {
  padding: 0px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
.filter-container {
  margin-bottom: 20px;
}
</style>
