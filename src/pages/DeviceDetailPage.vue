<template>
  <div class="device-detail-page" v-if="device">
    <el-page-header
      @back="goBack"
      :content="`设备详情 - ${device.deviceName || device.deviceId}`"
    />

    <el-row :gutter="20" class="detail-content-row">
      <!-- 左侧栏 -->
      <el-col :span="15">
        <DeviceInfoCard :device="device" />

        <QuickActionsCard
          :is-connected="device.isConnectedWs || false"
          :is-sending-screen-power-cmd="isSendingScreenPowerCmd"
          :is-sending-hotkey="isSendingHotkey"
          @send-command="handleQuickCommand"
          class="card-margin"
        />

        <UiStructureCard
          :structure="uiStructure"
          :is-loading="isFetchingStructure"
          :is-connected="device.isConnectedWs || false"
          @fetch-ui-structure="handleGetUiStructure"
          class="card-margin"
        />

        <el-card class="card-margin">
          <template #header>发送指令</template>
          <CommandForm :device-id="deviceId" @command-sent="onCommandSent" />
        </el-card>
      </el-col>

      <!-- 右侧栏 -->
      <el-col :span="9">
        <ScreenshotCard
          :screenshot-url="screenshotUrl"
          :ocr-result="ocrResult"
          :is-capturing="isCapturing"
          :is-connected="device.isConnectedWs || false"
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
import { ref, onMounted, computed, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDeviceStore } from "@/stores/deviceStore";
import type {
  DevicePublic,
  OcrPayload,
  PerformActionPayload,
} from "@/types/api";
import { ElMessage } from "element-plus";
import { commandService } from "@/api/commandService";
import { deviceService } from "@/api/deviceService";

// 导入子组件
import DeviceInfoCard from "@/components/DeviceInfoCard.vue";
import QuickActionsCard from "@/components/QuickActionsCard.vue";
import UiStructureCard from "@/components/UiStructureCard.vue";
import ScreenshotCard from "@/components/ScreenshotCard.vue";
import CommandForm from "@/components/CommandForm.vue";

const route = useRoute();
const router = useRouter();
const deviceStore = useDeviceStore();

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- 数据获取逻辑 ---
const fetchDetails = async () => {
  if (!deviceId.value) return;
  isLoading.value = true;
  try {
    await deviceStore.fetchDeviceDetails(deviceId.value);
    device.value = deviceStore.selectedDevice;
  } catch (error) {
    console.error("Failed to fetch device details:", error);
    device.value = null;
  } finally {
    isLoading.value = false;
  }
};

const fetchLastScreenshot = async () => {
  try {
    const blob = await deviceService.getLatestScreenshot(deviceId.value);
    if (screenshotUrl.value) URL.revokeObjectURL(screenshotUrl.value);
    screenshotUrl.value = blob.size > 0 ? URL.createObjectURL(blob) : null;
  } catch (error: any) {
    if (error.response?.status !== 404)
      console.error("Failed to fetch screenshot:", error);
    screenshotUrl.value = null;
  }
};

// >>>>>>>>>> 1. 恢复 fetchLastOcrResult 的完整实现 <<<<<<<<<<
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

// >>>>>>>>>> 2. 恢复 fetchLastUiStructure 的完整实现 <<<<<<<<<<
const fetchLastUiStructure = async () => {
  try {
    const structure = await deviceService.getLatestUiStructure(deviceId.value);
    uiStructure.value = structure;
  } catch (error: any) {
    if (error.response?.status !== 404) {
      ElMessage.error("获取UI结构失败，请重试。");
      console.error("Failed to fetch UI structure:", error);
    }
    uiStructure.value = null;
  }
};

// --- 事件处理逻辑 ---
const handleGetUiStructure = async () => {
  if (!device.value?.isConnectedWs)
    return ElMessage.error("设备未连接，无法发送指令。");
  isFetchingStructure.value = true;
  uiStructure.value = null;
  try {
    const res = await commandService.sendUiStructureCommand(deviceId.value);
    ElMessage.info(
      `UI结构请求已发送 (ID: ${res.correlation_id})，等待设备响应...`
    );
    await sleep(3000);
    await fetchLastUiStructure();
  } catch (error) {
    ElMessage.error("发送UI结构请求失败。");
  } finally {
    isFetchingStructure.value = false;
  }
};

const handleManualCapture = async () => {
  if (!device.value?.isConnectedWs)
    return ElMessage.error("设备未连接，无法发送截图指令。");
  isCapturing.value = true;
  screenshotUrl.value = null;
  ocrResult.value = null;
  try {
    const res = await commandService.sendCaptureScreenCommand(deviceId.value, {
      format: "jpeg",
      quality: 75,
    });
    ElMessage.info(
      `截图指令已发送 (ID: ${res.correlation_id})，等待设备响应...`
    );
    await sleep(3000);
    await Promise.allSettled([fetchLastScreenshot(), fetchLastOcrResult()]);
  } catch (error) {
    ElMessage.error("发送截图指令失败。");
  } finally {
    isCapturing.value = false;
  }
};

const handleQuickCommand = async (
  command: "wake_up" | "sleep" | "home" | "back" | "recents"
) => {
  const isPowerCmd = ["wake_up", "sleep"].includes(command);
  const loadingRef = isPowerCmd ? isSendingScreenPowerCmd : isSendingHotkey;

  loadingRef.value = true;
  try {
    const payload: PerformActionPayload = isPowerCmd
      ? { action: command as "wake_up" | "sleep" }
      : {
          action: "press_key",
          parameters: { keyCode: command as "home" | "back" | "recents" },
        };

    const response = await commandService.sendPerformActionCommand(
      deviceId.value,
      payload
    );
    ElMessage.success(
      `指令 '${command}' 已发送 (ID: ${response.correlation_id})`
    );
  } catch (error) {
    console.error(`Error sending command ${command}:`, error);
  } finally {
    loadingRef.value = false;
  }
};

// (这个函数可以被 handleQuickCommand 替代，但为了最小改动先保留)
const sendScreenPowerCommand = async (action: "wake_up" | "sleep") => {
  /* ... */
};
const sendHotkeyCommand = async (key: "home" | "back" | "recents") => {
  /* ... */
};

const onCommandSent = (success: boolean) => {
  if (success) ElMessage.info("指令已成功分派。");
};

const goBack = () => router.back();

onMounted(() => {
  fetchDetails();
  fetchLastScreenshot();
  fetchLastOcrResult();
  fetchLastUiStructure();
});

onBeforeUnmount(() => {
  if (screenshotUrl.value) URL.revokeObjectURL(screenshotUrl.value);
});
</script>

<style scoped>
.device-detail-page {
  padding: 20px;
}
.detail-content-row {
  margin-top: 20px;
}
.card-margin {
  margin-top: 20px;
}
</style>
