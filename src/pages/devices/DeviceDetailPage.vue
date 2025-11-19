<template>
  <div class="device-detail-page" v-if="device" ref="pageRef">
    <el-page-header @back="goBack" :content="`设备详情 - ${device.deviceName || device.deviceId}`">
      <template #extra>
        <div class="header-actions">
          <el-tooltip content="切换全屏" placement="bottom">
            <el-button :icon="FullScreen" circle @click="toggleFullscreen" />
          </el-tooltip>
        </div>
      </template>
    </el-page-header>

    <el-row :gutter="20" class="detail-content-row">
      <!-- 左侧栏 -->
      <el-col :span="15">
        <DeviceInfoCard :device="device" />

        <!-- 使用可选链操作符 (?.) 来安全地访问可能为null的device对象的属性 -->
        <QuickActionsCard
          :is-connected="device?.isConnectedWs || false"
          :is-sending-screen-power-cmd="isSendingScreenPowerCmd"
          :is-sending-hotkey="isSendingHotkey"
          @send-command="handleQuickCommand"
          class="card-margin"
        />

        <InstalledAppsCard
          :apps="installedApps"
          :is-loading="isFetchingApps"
          :is-connected="device.isConnectedWs || false"
          @refresh="fetchInstalledApps"
          @uninstall="handleUninstall"
          @add-to-master="handleAddToMaster"
        />

        <UiStructureCard
          :structure="uiStructure"
          :is-loading="isFetchingStructure"
          :is-connected="device?.isConnectedWs || false"
          @fetch-ui-structure="handleGetUiStructure"
          class="card-margin"
        />

        <ActionSequenceEditor class="card-margin" mode="standalone" :device-id="deviceId" v-model="standaloneActions">
          <template #header>
            <span>发送即时指令序列</span>
          </template>
        </ActionSequenceEditor>
      </el-col>

      <!-- 右侧栏 -->
      <el-col :span="9">
        <ScreenshotCard
          :device-id="deviceId"
          :screenshot-url="screenshotUrl"
          :ocr-result="ocrResult"
          :is-capturing="isCapturing"
          :is-connected="device?.isConnectedWs || false"
          @capture="handleManualCapture"
        />
      </el-col>
    </el-row>
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
import { ref, onMounted, computed, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDeviceStore } from "@/stores/deviceStore";
import { useTabStore } from "@/stores/tabStore";
import { useMasterAppStore } from "@/stores/masterAppStore";
import type { DevicePublic, OcrPayload, PerformActionPayload, DeviceInstalledApp } from "@/types/api";
import { ElMessage, ElMessageBox } from "element-plus";
import { commandService } from "@/api/commandService";
import { deviceService } from "@/api/deviceService";
import { FullScreen } from "@element-plus/icons-vue";

import DeviceInfoCard from "@/components/DeviceInfoCard.vue";
import QuickActionsCard from "@/components/QuickActionsCard.vue";
import UiStructureCard from "@/components/UiStructureCard.vue";
import ScreenshotCard from "@/components/ScreenshotCard.vue";
import InstalledAppsCard from "@/components/InstalledAppsCard.vue";
import ActionSequenceEditor from "@/components/ActionSequenceEditor.vue";

// 为 standalone 模式的 ActionSequenceEditor 创建本地状态
type ActionWithId = PerformActionPayload & { id: string };
const standaloneActions = ref<ActionWithId[]>([]);

const route = useRoute();
const router = useRouter();
const deviceStore = useDeviceStore();
const tabStore = useTabStore();
const masterAppStore = useMasterAppStore();
const pageRef = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);

const deviceId = computed(() => route.params.deviceId as string);
const device = ref<DevicePublic | null>(null);
const isLoading = ref(false);

const isCapturing = ref(false);
const screenshotUrl = ref<string | null>(null);
const ocrResult = ref<OcrPayload | null>(null);

const isFetchingStructure = ref(false);
const uiStructure = ref<object | null>(null);

const isSendingScreenPowerCmd = ref(false);
const isSendingHotkey = ref(false);

const installedApps = ref<DeviceInstalledApp[]>([]);
const isFetchingApps = ref(false);

const goBack = () => tabStore.removeTab(route.fullPath);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchDetails = async () => {
  if (!deviceId.value) return;
  isLoading.value = true;
  try {
    // 调用 store action。这个 action 内部已经处理了错误，不会向外抛出
    await deviceStore.fetchDeviceDetails(deviceId.value);
    // 从 store 获取更新后的设备信息
    device.value = deviceStore.selectedDevice;
    if (device.value) {
      const newTitle = `设备 - ${device.value.deviceName || device.value.deviceId}`;
      tabStore.updateTabTitle(route.fullPath, newTitle);
    }
  } catch (error) {
    // 理论上这个 catch 不会执行，因为 store action 捕获了错误
    // 但作为安全措施保留
    console.error("Critical error in component during fetchDetails:", error);
    device.value = null;
  } finally {
    isLoading.value = false;
  }
};

const fetchInstalledApps = async (fromDevice: boolean = false) => {
  if (!deviceId.value) return;

  isFetchingApps.value = true;

  try {
    if (fromDevice) {
      // --- 从设备更新的逻辑 ---
      if (!device.value?.isConnectedWs) {
        ElMessage.warning("设备未连接，无法从设备实时更新。将从服务器缓存加载。");
        // 即使设备未连接，也继续执行下面的从缓存加载的逻辑
      } else {
        // 1. 向设备发送指令
        await deviceService.refreshApps(deviceId.value);
        ElMessage.info("应用列表更新指令已发送，等待设备实时响应...");
        return; // exit here and wait for the event.
      }
    }

    // This part is now for initial load and for the event handler callback
    const apps = await deviceService.getInstalledApps(deviceId.value);
    installedApps.value = apps; // 只有在成功获取到数据后才更新列表

    // 根据返回结果给出不同的提示
    if (fromDevice) {
      ElMessage.success(`列表已从设备更新，共找到 ${apps.length} 个应用。`);
    } else {
      ElMessage.success(`列表已从服务器缓存刷新，共找到 ${apps.length} 个应用。`);
    }
  } catch (error) {
    // 捕获到任何错误时，我们不再清空列表，而是给出提示并保持旧数据
    console.error("Failed to fetch/refresh installed apps:", error);
    ElMessage.error("更新应用列表失败，请检查网络或稍后重试。");
    // 不要在这里清空列表: installedApps.value = []; <<< 关键修改
  } finally {
    if (!fromDevice) {
      isFetchingApps.value = false;
    }
  }
};

const fetchLastScreenshot = async () => {
  try {
    const blob = await deviceService.getLatestScreenshot(deviceId.value);
    if (screenshotUrl.value) URL.revokeObjectURL(screenshotUrl.value);
    screenshotUrl.value = blob.size > 0 ? URL.createObjectURL(blob) : null;
  } catch (error: any) {
    if (error.response?.status !== 404) console.error("Failed to fetch screenshot:", error);
    screenshotUrl.value = null;
  }
};

const fetchLastOcrResult = async () => {
  try {
    ocrResult.value = await deviceService.getLatestOcrResult(deviceId.value);
  } catch (error: any) {
    if (error.response?.status !== 404) {
      console.error("Failed to fetch ocr result:", error);
    }
    ocrResult.value = null;
  }
};

const fetchLastUiStructure = async () => {
  try {
    const structure = await deviceService.getLatestUiStructure(deviceId.value);
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
    const res = await commandService.sendUiStructureCommand(deviceId.value);
    ElMessage.info(`UI结构请求已发送 (ID: ${res.correlationId})，等待设备实时响应...`);
    // await sleep(3000);
    // await fetchLastUiStructure();
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
    const res = await commandService.sendCaptureScreenCommand(deviceId.value);
    ElMessage.info(`截图指令已发送 (ID: ${res.correlationId})，等待设备实时响应...`);
    // await sleep(3000);
    // await Promise.allSettled([fetchLastScreenshot(), fetchLastOcrResult()]);
  } catch (error) {
    console.error("Error sending capture command", error);
  } finally {
    isCapturing.value = false;
  }
};

const handleQuickCommand = async (command: "wake_up" | "sleep" | "home" | "back" | "recents") => {
  const isPowerCmd = ["wake_up", "sleep"].includes(command);
  const loadingRef = isPowerCmd ? isSendingScreenPowerCmd : isSendingHotkey;

  loadingRef.value = true;
  try {
    let payload: PerformActionPayload;

    if (command === "wake_up" || command === "sleep") {
      payload = { action: command };
    } else {
      payload = {
        action: "press_key",
        parameters: { keyCode: command },
      };
    }
    const response = await commandService.sendPerformActionCommand(deviceId.value, payload);
    ElMessage.success(`指令 '${command}' 已发送 (ID: ${response.correlationId})`);
  } catch (error) {
    console.error(`Error sending command ${command}:`, error);
  } finally {
    loadingRef.value = false;
  }
};

const handleUninstall = async (packageName: string) => {
  try {
    await ElMessageBox.confirm(`确定要向设备发送卸载应用 [${packageName}] 的指令吗？这会立即从列表中移除记录。`, "卸载应用", {
      type: "warning",
    });

    ElMessage.info(`正在发送卸载指令并移除记录...`);

    // 调用API，后端现在会同时发送指令和删除DB记录
    await deviceService.uninstallApp(deviceId.value, packageName);

    ElMessage.success(`卸载指令已发送，记录已移除！请在设备端手动确认。`);

    // 立即在前端UI上移除该项 <<
    const index = installedApps.value.findIndex((app) => app.packageName === packageName);
    if (index > -1) {
      installedApps.value.splice(index, 1);
    }
    // 不再需要 setTimeout 和 fetchInstalledApps，因为我们已经手动更新了UI和DB。
    // 只有当用户再次手动刷新列表时，如果卸载失败，该应用才会重新出现。
  } catch (error) {
    if (error !== "cancel") {
      console.error("Failed to send uninstall command:", error);
      // API interceptor 会显示错误，这里可以不再重复显示
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

    // 调用 store action 来执行 API 请求
    await masterAppStore.addApp({
      appName: app.appName,
      packageName: app.packageName,
    });

    // Optimistic UI Update: Update the local list for instant feedback
    const appInList = installedApps.value.find((a) => a.packageName === app.packageName);
    if (appInList) {
      appInList.isInMaster = true;
    }
  } catch (error) {
    if (error !== "cancel") ElMessage.info("已取消操作");
  }
};

// --- 2. 新增事件处理器和生命周期钩子 ---
const handleScreenDataReady = (event: Event) => {
  const detail = (event as CustomEvent).detail;
  if (detail.deviceId === deviceId.value) {
    ElMessage.success("收到截图/OCR数据就绪通知，正在刷新...");
    Promise.allSettled([fetchLastScreenshot(), fetchLastOcrResult()]).finally(() => {
      isCapturing.value = false;
    });
  }
};

const handleUiStructureReady = (event: Event) => {
  const detail = (event as CustomEvent).detail;
  if (detail.deviceId === deviceId.value) {
    ElMessage.success("收到UI结构数据就绪通知，正在刷新...");
    fetchLastUiStructure().finally(() => {
      isFetchingStructure.value = false;
    });
  }
};

const handleAppListReady = (event: Event) => {
  const detail = (event as CustomEvent).detail;
  if (detail.deviceId === deviceId.value) {
    ElMessage.success("收到应用列表就绪通知，正在刷新...");
    // Fetch from server cache (fromDevice = false) and turn off loading spinner
    fetchInstalledApps(false);
  }
};

onMounted(() => {
  fetchDetails();
  fetchInstalledApps(false);
  fetchLastScreenshot();
  fetchLastOcrResult();
  fetchLastUiStructure();

  // 注册事件监听器
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
}
/* --- 新增全屏样式 --- */
.device-detail-page:fullscreen {
  background-color: #fff;
  overflow-y: auto;
  padding: 20px;
}
.detail-content-row {
  margin-top: 20px;
}
.card-margin {
  margin-top: 20px;
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
