<!-- AdFlowPro_ui/src/pages/devices/DeviceDetailPage.vue -->
<template>
  <div class="device-detail-page" v-if="device" ref="pageRef">
    <el-page-header @back="goBack" :content="``" class="header-bar">
      <template #extra>
        <div class="header-actions">
          <!-- [核心新增] 受控模式切换 -->
          <div class="mode-switch-wrapper" style="margin-right: 20px; display: inline-flex; align-items: center; gap: 8px;">
            <span style="font-size: 14px; color: var(--el-text-color-regular)">受控/调试模式</span>
            <el-tooltip :content="device.isControlled ? '已开启受控模式：全量应用清单已落库，支持离线查看。' : '当前为标准模式：应用清单仅在内存比对，不占用数据库空间。'" placement="bottom">
              <el-switch v-model="device.isControlled" @change="handleToggleControlledMode" :loading="isTogglingMode" />
            </el-tooltip>
          </div>
          <el-button-group style="margin-right: 15px">
            <el-button :type="!isLandscape ? 'primary' : ''" @click="isLandscape = false">手机模式</el-button>
            <el-button :type="isLandscape ? 'primary' : ''" @click="isLandscape = true">横屏模式</el-button>
          </el-button-group>
          <el-tooltip content="切换全屏" placement="bottom">
            <el-button :icon="FullScreen" circle @click="toggleFullscreen" />
          </el-tooltip>
        </div>
      </template>
    </el-page-header>

    <div class="tabs-container">
      <el-tabs v-model="activeTab" type="border-card" class="device-tabs">
        <!-- Tab 1: 基础信息 -->
        <el-tab-pane label="基础信息" name="info">
          <div class="tab-content-scroll">
            <!-- 移除 el-row/el-col，改为垂直堆叠 -->
            <DeviceInfoCard :device="device" style="margin-bottom: 20px;" />
            <DebugControlCard
                :device-id="props.deviceId || ''"
                :is-controlled="device.isControlled"
            />
          </div>
        </el-tab-pane>

        <!-- Tab 2: 远程操控 (核心页) -->
        <el-tab-pane label="远程操控" name="control">
          <div class="tab-content-scroll">
            <el-row :gutter="15" :class="{ 'landscape-layout': isLandscape }">
              <!-- 左侧: 屏幕预览与OCR (较窄，适合竖屏截图) -->
              <el-col :span="isLandscape ? 24 : 9">
                <ScreenshotCard
                    :device-id="props.deviceId || ''"
                    :screenshot-url="screenshotUrl"
                    :ocr-result="ocrResult"
                    :is-capturing="isCapturing"
                    :is-connected="device?.isConnectedWs || false"
                    @capture="handleManualCapture"
                />
              </el-col>

              <!-- 右侧: 控制区 (较宽，适合编辑器) -->
              <el-col :span="isLandscape ? 24 : 15" :style="isLandscape ? 'margin-top: 15px' : ''">
                <!-- 1. 快捷操作 -->
                <QuickActionsCard
                    :device-id="props.deviceId"
                    :is-connected="device?.isConnectedWs || false"
                    :is-sending-screen-power-cmd="isSendingScreenPowerCmd"
                    :is-sending-hotkey="isSendingHotkey"
                    :is-adhoc-running="wsStore.currentAdhocTask?.deviceId === props.deviceId"
                    :is-aborting="wsStore.isAbortingAdhocTask"
                    @send-command="handleQuickCommand"
                    @abort-adhoc="handleAbortAdhoc"
                    style="margin-bottom: 15px;"
                />

                <!-- 2. 动作序列编辑器 -->
                <ActionSequenceEditor
                    mode="standalone"
                    :device-id="props.deviceId || ''"
                    v-model="standaloneActions"
                >
                  <template #header>
                    <span>发送即时指令序列</span>
                  </template>
                </ActionSequenceEditor>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>

        <!-- Tab 3: UI 结构 (Lazy加载以提升性能) -->
        <el-tab-pane label="UI 结构" name="ui" lazy>
          <div class="tab-content-full">
            <UiStructureCard
              :key="'ui-' + props.deviceId"
                :structure="uiStructure"
                :is-loading="isFetchingStructure"
                :is-connected="device?.isConnectedWs || false"
                @fetch-ui-structure="handleGetUiStructure"
                class="full-height-card"
            />
          </div>
        </el-tab-pane>

        <!-- Tab 4: 应用管理 (Lazy加载) -->
        <el-tab-pane label="已安装应用" name="apps" lazy>
          <div class="tab-content-full">
            <InstalledAppsCard
                :apps="installedApps"
                :is-loading="isFetchingApps"
                :is-connected="device.isConnectedWs || false"
                @refresh="fetchInstalledApps"
                @uninstall="handleUninstall"
                @add-to-master="handleAddToMaster"
                @run-app="handleRunApp"
                class="full-height-card"
            />
          </div>
        </el-tab-pane>

        <!-- Tab 5: 变量监控 (新增) -->
        <el-tab-pane label="变量监控" name="variables">
          <div class="tab-content-full">
            <VariableMonitorCard
              :key="'var-' + props.deviceId"
              :device-id="props.deviceId"
              :variables-data="deviceVariables"
              :is-loading="isFetchingVariables"
              :is-connected="device?.isConnectedWs || false"
              @fetch-variables="handleFetchVariables"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>

  <div v-else-if="isLoading">
    <el-skeleton :rows="5" animated />
  </div>
  <div v-else>
    <el-empty description="Device not found or failed to load." />
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "DeviceDetail",
});
import { ref, onMounted, computed, onBeforeUnmount, defineProps } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDeviceStore } from "@/stores/deviceStore";
import { useTabStore } from "@/stores/tabStore";
import { useMasterAppStore } from "@/stores/masterAppStore";
import { useWebSocketStore } from "@/stores/webSocketStore";
import type { DevicePublic, OcrPayload, PerformActionPayload, DeviceInstalledApp, UiNode } from "@/types/api";
import { ElMessage, ElMessageBox } from "element-plus";
import { commandService } from "@/api/commandService";
import { wsService } from "@/services/wsService";
import { deviceService } from "@/api/deviceService";
import { FullScreen } from "@element-plus/icons-vue";
import { jobService } from "@/api/jobService";

import DeviceInfoCard from "@/components/DeviceInfoCard.vue";
import QuickActionsCard from "@/components/QuickActionsCard.vue";
import UiStructureCard from "@/components/UiStructureCard.vue";
import VariableMonitorCard from "@/components/VariableMonitorCard.vue"; // 假设我们把 Tab 内容封装在这个组件中
import ScreenshotCard from "@/components/ScreenshotCard.vue";
import InstalledAppsCard from "@/components/InstalledAppsCard.vue";
import ActionSequenceEditor from "@/components/ActionSequenceEditor.vue";
import type { CommandResponse } from "@/types/api/common";
import DebugControlCard from "@/components/DebugControlCard.vue";
import apiClient from "@/api/apiClient";
import { v4 as uuidv4 } from "uuid";

// 为 standalone 模式的 ActionSequenceEditor 创建本地状态
type ActionWithId = PerformActionPayload & { id: string };
const standaloneActions = ref<ActionWithId[]>([]);

const props = defineProps<{ deviceId: string }>();

const route = useRoute();
const router = useRouter();
const deviceStore = useDeviceStore();
const tabStore = useTabStore();
const masterAppStore = useMasterAppStore();
const wsStore = useWebSocketStore();
const isLandscape = ref(false); // 新增横屏模式状态
const pageRef = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);
const isTogglingMode = ref(false); // 切换状态锁

const activeTab = ref("control"); // 默认打开“远程操控”页

const device = ref<DevicePublic | null>(null);
const isLoading = ref(false);

const isCapturing = ref(false);
const screenshotUrl = ref<string | null>(null);
const ocrResult = ref<OcrPayload | null>(null);

const activeVarRequestCid = ref<string | null>(null); // [核心新增] 用于追踪变量请求
const isFetchingStructure = ref(false);
const uiStructure = ref<UiNode | null>(null);

// [核心新增] 变量监控状态
const isFetchingVariables = ref(false);
const deviceVariables = ref<any>({}); // 用于存储变量数据

const isSendingScreenPowerCmd = ref(false);
const isSendingHotkey = ref(false);

const installedApps = ref<DeviceInstalledApp[]>([]);
const isFetchingApps = ref(false);

const goBack = () => tabStore.removeTab(route.fullPath);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchDetails = async () => {
  if (!props.deviceId) return;
  isLoading.value = true;
  try {
    // 调用 store action。这个 action 内部已经处理了错误，不会向外抛出
    await deviceStore.fetchDeviceDetails(props.deviceId);
    // 从 store 获取更新后的设备信息
    device.value = deviceStore.selectedDevice;

    if (device.value?.deviceModel === "Windows_PC") {
      isLandscape.value = true;
    }

    if (device.value) {
      const newTitle = `设备 - ${device.value.deviceName || device.value.deviceId}`;
      tabStore.updateTabTitle(route.fullPath, newTitle);
    }
  } catch (error) {
    console.error("Critical error in component during fetchDetails:", error);
    device.value = null;
  } finally {
    isLoading.value = false;
  }
};

// [核心新增] 切换受控模式的 API 调用
const handleToggleControlledMode = async (val: string | number | boolean) => {
  // 显式转为 boolean 以匹配业务逻辑
  const isEnabled = !!val;
  isTogglingMode.value = true;
  try {
    await deviceService.toggleControlledMode(props.deviceId, isEnabled);
    ElMessage.success(`受控模式已${isEnabled ? '开启' : '关闭'}`);

    device.value!.isControlled = isEnabled;

    // 如果开启了受控模式，主动触发一次应用刷新，以便让后端执行 Mark-and-Sweep 入库
    if (isEnabled) {
      fetchInstalledApps(true);
    }
  } catch (error) {
    device.value!.isControlled = !isEnabled; // 失败则回滚 UI
  } finally {
    isTogglingMode.value = false;
  }
};

const fetchInstalledApps = async (fromDevice: boolean = false) => {
  if (!props.deviceId) {
    console.warn("fetchInstalledApps: deviceId is missing in props.");
    return;
  }

  isFetchingApps.value = true;

  try {
    if (fromDevice) {
      if (!device.value?.isConnectedWs) {
        ElMessage.warning("设备未连接，无法从设备实时更新。将从服务器缓存加载。");
      } else {
        await deviceService.refreshApps(props.deviceId);
        ElMessage.info("应用列表更新指令已发送，等待设备实时响应...");
        return; // exit here and wait for the event.
      }
    }

    console.log(`Fetching installed apps for device: ${props.deviceId}`);
    const apps = await deviceService.getInstalledApps(props.deviceId);
    installedApps.value = apps;

    if (fromDevice) {
      ElMessage.success(`列表已从设备更新，共找到 ${apps.length} 个应用。`);
    }
  } catch (error: any) {
    console.error("Failed to fetch/refresh installed apps:", error);
    // 提取更具体的错误信息
    let errorMsg = "更新应用列表失败";
    if (error.response) {
      errorMsg += ` (${error.response.status}: ${error.response.statusText})`;
    } else if (error.message) {
      errorMsg += `: ${error.message}`;
    }
    ElMessage.error(errorMsg);
  } finally {
    if (!fromDevice) {
      isFetchingApps.value = false;
    }
  }
};

const fetchLastScreenshot = async () => {
  try {
    const blob = await deviceService.getLatestScreenshot(props.deviceId);
    if (screenshotUrl.value) URL.revokeObjectURL(screenshotUrl.value);
    screenshotUrl.value = blob.size > 0 ? URL.createObjectURL(blob) : null;
  } catch (error: any) {
    if (error.response?.status !== 404) console.error("Failed to fetch screenshot:", error);
    screenshotUrl.value = null;
  }
};

const fetchLastOcrResult = async () => {
  try {
    ocrResult.value = await deviceService.getLatestOcrResult(props.deviceId);
  } catch (error: any) {
    if (error.response?.status !== 404) {
      console.error("Failed to fetch ocr result:", error);
    }
    ocrResult.value = null;
  }
};

const fetchLastUiStructure = async () => {
  try {
    const structure = await deviceService.getLatestUiStructure(props.deviceId);
    uiStructure.value = structure;
  } catch (error: any) {
    if (error.response?.status !== 404) {
      console.error("Failed to fetch UI structure:", error);
    }
    uiStructure.value = null;
  }
};

const handleGetUiStructure = async () => {
  if (!device.value?.isConnectedWs) return ElMessage.error("设备未连接，无法发送指令。");
  isFetchingStructure.value = true;
  uiStructure.value = null;
  try {
    const res = await commandService.sendUiStructureCommand(props.deviceId);
    ElMessage.info(`UI结构请求已发送 (ID: ${res.correlationId})，等待设备实时响应...`);
  } catch (error) {
    console.error("Error sending UI structure command", error);
  } finally {
    isFetchingStructure.value = false;
  }
};

const handleManualCapture = async () => {
  if (!device.value?.isConnectedWs) return ElMessage.error("设备未连接，无法发送截图指令。");
  isCapturing.value = true;
  screenshotUrl.value = null;
  ocrResult.value = null;
  try {
    const res = await commandService.sendCaptureScreenCommand(props.deviceId);
    ElMessage.info(`截图指令已发送 (ID: ${res.correlationId})，等待设备实时响应...`);
  } catch (error) {
    console.error("Error sending capture command", error);
  } finally {
    isCapturing.value = false;
  }
};

const handleQuickCommand = async (command: "wake_up" | "sleep" | "home" | "back" | "recents" | "set_brightness_auto" | "set_brightness_min") => {
  const isPowerCmd = ["wake_up", "sleep"].includes(command);
  const loadingRef = isPowerCmd ? isSendingScreenPowerCmd : isSendingHotkey;

  loadingRef.value = true;
  try {
    let payload: PerformActionPayload;

    // 修复逻辑：明确指定哪些指令是 press_key，其余的直接作为 action 名称发送
    if (command === "home" || command === "back" || command === "recents") {
      payload = {
        action: "press_key",
        parameters: { keyCode: command },
      };
    } else {
      // wake_up, sleep, set_brightness_auto, set_brightness_min 等
      payload = { action: command };
    }
    const response = await commandService.sendPerformActionCommand(props.deviceId, payload);
    ElMessage.success(`指令 '${command}' 已发送 (ID: ${response.correlationId})`);
  } catch (error) {
    console.error(`Error sending command ${command}:`, error);
  } finally {
    loadingRef.value = false;
  }
};

const handleAbortAdhoc = () => {
  // 直接发送强制重置指令，不检查本地状态，确保能中止任何来源的 Ad-hoc 任务
  wsService.sendAbortAdhocTask(props.deviceId, "FORCE_RESET");
  // 可选：手动清理本地可能存在的任务状态显示
  wsStore.currentAdhocTask = null;
  ElMessage.warning("已发送强制重置指令");
};

const handleUninstall = async (packageName: string) => {
  try {
    await ElMessageBox.confirm(`确定要向设备发送卸载应用 [${packageName}] 的指令吗？这会立即从列表中移除记录。`, "卸载应用", {
      type: "warning",
    });

    ElMessage.info(`正在发送卸载指令并移除记录...`);
    await deviceService.uninstallApp(props.deviceId, packageName);
    ElMessage.success(`卸载指令已发送，记录已移除！请在设备端手动确认。`);

    const index = installedApps.value.findIndex((app) => app.packageName === packageName);
    if (index > -1) {
      installedApps.value.splice(index, 1);
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("Failed to send uninstall command:", error);
    } else {
      ElMessage.info("已取消卸载操作。");
    }
  }
};

const handleAddToMaster = async (app: DeviceInstalledApp) => {
  try {
    await ElMessageBox.confirm(`确定要将应用 "${app.appName}" 添加到主应用目录吗？`, "添加到主应用", {
      type: "info",
    });

    await masterAppStore.addApp({
      appName: app.appName,
      packageName: app.packageName,
      weight: 0
    });

    const appInList = installedApps.value.find((a) => a.packageName === app.packageName);
    if (appInList) {
      appInList.isInMaster = true;
    }
  } catch (error) {
    if (error !== "cancel") ElMessage.info("已取消操作");
  }
};

const handleRunApp = async (app: DeviceInstalledApp) => {
  if (!app.defaultSuiteId) {
    ElMessage.warning("该应用未配置默认测试套件，无法直接运行。");
    return;
  }
  try {
    ElMessage.info(`正在启动应用 "${app.appName}" 的测试任务...`);
    // [核心修改] 统一改为调用 runDebugJob (调试直通车)
    // 这样用户在 Web 端修改原子操作后，无需“发布”即可立即在设备页看到最新效果
    const createdJob = await jobService.runDebugJob({
      suiteId: app.defaultSuiteId,
      targetAppPackageName: app.packageName,
      deviceId: props.deviceId
    });
    ElMessage.success(`任务 #${createdJob.jobId} 已启动，正在跳转监控页...`);
    // 跳转到任务详情页
    router.push({ name: "JobDetail", params: { jobId: createdJob.jobId } });
  } catch (error) {
    // Error handled by interceptor
  }
};

// [核心新增] 变量获取逻辑
const handleFetchVariables = async () => {
  if (!device.value?.isConnectedWs) return ElMessage.error("设备未连接，无法获取变量。");
  isFetchingVariables.value = true;
  deviceVariables.value = {};
  try {
    const cid = uuidv4();
    activeVarRequestCid.value = cid; // [核心修复] 记录 ID 以便回调匹配
    // 增加 10s 超时保底
    setTimeout(() => {
      if (isFetchingVariables.value && activeVarRequestCid.value === cid) {
        isFetchingVariables.value = false;
      }
    }, 10000);
    const res = await apiClient.post<any, CommandResponse>(
        `/devices/${props.deviceId}/command/get_variables`,
        { correlationId: cid }
    );

    ElMessage.info(`变量读取指令已发送 (ID: ${res.correlationId})，等待设备回传...`);
  } catch (error) {
    console.error("Error sending get_variables command", error);
  }
  // Note: isFetchingVariables is cleared by the WebSocket response handler
};

const handleLiveVariablesReady = (event: Event) => {
  const detail = (event as CustomEvent).detail;

  // [核心修复] 改为校验 correlationId，因为后端回包中可能不包含 deviceId
  // 只要处于加载状态且收到了数据，或者 ID 匹配，就允许停止转圈
  if ((detail.correlationId && detail.correlationId === activeVarRequestCid.value) || isFetchingVariables.value) {
    // 清理 ID
    activeVarRequestCid.value = null;

    // 赋值完整对象
    deviceVariables.value = detail; // 兼容性写法，防止报错阻断日志

    isFetchingVariables.value = false;
    ElMessage.success("变量快照已更新");
  }
};

const handleScreenDataReady = (event: Event) => {
  const detail = (event as CustomEvent).detail;
  if (detail.deviceId === props.deviceId) {
    ElMessage.success("收到截图/OCR数据就绪通知，正在刷新...");
    Promise.allSettled([fetchLastScreenshot(), fetchLastOcrResult()]).finally(() => {
      isCapturing.value = false;
    });
  }
};

const handleUiStructureReady = (event: Event) => {
  const detail = (event as CustomEvent).detail;
  if (detail.deviceId === props.deviceId) {
    ElMessage.success("收到UI结构数据就绪通知，正在刷新...");
    fetchLastUiStructure().finally(() => {
      isFetchingStructure.value = false;
    });
  }
};

const handleAppListReady = (event: Event) => {
  const detail = (event as CustomEvent).detail;
  if (detail.deviceId === props.deviceId) {
    ElMessage.success("收到应用列表就绪通知，正在刷新...");
    fetchInstalledApps(false);
  }
};

onMounted(() => {
  fetchDetails();
  fetchInstalledApps(false);
  fetchLastScreenshot();
  fetchLastOcrResult();
  fetchLastUiStructure();

  window.addEventListener("screen_data_ready", handleScreenDataReady);
  window.addEventListener("ui_structure_ready", handleUiStructureReady);
  window.addEventListener("app_list_ready", handleAppListReady);
  window.addEventListener("live_variables_ready", handleLiveVariablesReady); // [核心新增]
});

const toggleFullscreen = () => {
  if (!pageRef.value) return;
  if (!document.fullscreenElement) {
    pageRef.value.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

onMounted(() => document.addEventListener("fullscreenchange", handleFullscreenChange));

onBeforeUnmount(() => {
  if (screenshotUrl.value) URL.revokeObjectURL(screenshotUrl.value);
  window.removeEventListener("screen_data_ready", handleScreenDataReady);
  window.removeEventListener("ui_structure_ready", handleUiStructureReady);
  window.removeEventListener("app_list_ready", handleAppListReady);
  window.removeEventListener("live_variables_ready", handleLiveVariablesReady); // [核心新增]
});
</script>

<style scoped>
.device-detail-page {
  padding: 0px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header-bar {
  flex-shrink: 0;
  margin-bottom: 10px;
}

/* 调整页面标题字体大小 */
:deep(.el-page-header__content) {
  font-size: 15px;
}

.tabs-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.device-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: none;
  box-shadow: none;
}

:deep(.el-tabs__content) {
  flex-grow: 1;
  padding: 15px;
  overflow: auto;
  background-color: #f5f7fa;
}

.tab-content-scroll {
  padding-bottom: 20px;
}

.tab-content-full {
  display: flex;
  flex-direction: column;
}

.full-height-card {
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
}
</style>