<!-- AdFlowPro_ui/src/pages/devices/DeviceDetailPage.vue -->
<template>
  <div class="device-detail-page" v-if="device" ref="pageRef">
    <el-page-header @back="goBack" :content="`设备详情 - ${device.deviceName || device.deviceId}`" class="header-bar">
      <template #extra>
        <div class="header-actions">
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
            <DebugControlCard :device-id="props.deviceId || ''" />
          </div>
        </el-tab-pane>

        <!-- Tab 2: 远程操控 (核心页) -->
        <el-tab-pane label="远程操控" name="control">
          <div class="tab-content-scroll">
            <el-row :gutter="15">
              <!-- 左侧: 屏幕预览与OCR (较窄，适合竖屏截图) -->
              <el-col :span="9">
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
              <el-col :span="15">
                <!-- 1. 快捷操作 -->
                <QuickActionsCard
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
                class="full-height-card"
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

import DeviceInfoCard from "@/components/DeviceInfoCard.vue";
import QuickActionsCard from "@/components/QuickActionsCard.vue";
import UiStructureCard from "@/components/UiStructureCard.vue";
import ScreenshotCard from "@/components/ScreenshotCard.vue";
import InstalledAppsCard from "@/components/InstalledAppsCard.vue";
import ActionSequenceEditor from "@/components/ActionSequenceEditor.vue";
import DebugControlCard from "@/components/DebugControlCard.vue";

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
const pageRef = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);

const activeTab = ref("control"); // 默认打开“远程操控”页

const device = ref<DevicePublic | null>(null);
const isLoading = ref(false);

const isCapturing = ref(false);
const screenshotUrl = ref<string | null>(null);
const ocrResult = ref<OcrPayload | null>(null);

const isFetchingStructure = ref(false);
const uiStructure = ref<UiNode | null>(null);

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
      weight: 10000
    });

    const appInList = installedApps.value.find((a) => a.packageName === app.packageName);
    if (appInList) {
      appInList.isInMaster = true;
    }
  } catch (error) {
    if (error !== "cancel") ElMessage.info("已取消操作");
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