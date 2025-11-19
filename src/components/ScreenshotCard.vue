<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>屏幕预览</span>
        <el-tooltip content="显示/隐藏九宫格参考线">
          <el-switch v-model="showGrid" inline-prompt :active-icon="Grid" :inactive-icon="Grid" />
        </el-tooltip>
        <div class="header-actions">
          <el-tooltip content="保存截图" v-if="screenshotUrl">
            <el-button :icon="Download" circle @click="handleSaveImage" />
          </el-tooltip>

          <el-button type="primary" :icon="Camera" @click="$emit('capture')" :loading="isCapturing" :disabled="!isConnected">
            {{ isCapturing ? "截取中..." : "手动截图" }}
          </el-button>
        </div>
      </div>
    </template>

    <div class="screenshot-wrapper" ref="screenshotWrapperRef">
      <div
        class="screenshot-container"
        v-loading="isCapturing"
        @mousedown="handleMouseDown"
        @mouseup="handleMouseUp"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
      >
        <el-image v-if="screenshotUrl" :src="screenshotUrl" fit="contain" ref="imageRef" @load="onImageLoad">
          <template #error>
            <div class="image-slot">
              <el-icon><Picture /></el-icon><span>加载失败</span>
            </div>
          </template>
        </el-image>
        <el-empty v-else description="暂无截图，请点击“手动截图”获取" />
        <GridOverlay v-if="showGrid && screenshotUrl" />
      </div>
      <div v-if="mousePosition.visible" class="coords-tooltip" :style="tooltipStyle">
        {{ `(x: ${mousePosition.imageX}, y: ${mousePosition.imageY})` }}
      </div>
    </div>

    <div class="ocr-result-container">
      <h4>OCR 识别结果 ({{ ocrElementCount }} 项)</h4>
      <div v-if="ocrResult && ocrResult.fullText" class="ocr-full-text">
        <strong>Full Text:</strong>
        <pre><code>{{ ocrResult.fullText }}</code></pre>
      </div>
      <div v-if="ocrResult && ocrResult.elements && ocrResult.elements.length > 0" class="ocr-text-box">
        <div v-for="(element, index) in ocrResult.elements" :key="index" class="ocr-element-row">
          <span class="ocr-element-text">"{{ element.text }}"</span>
          <span class="ocr-element-coords">({{ element.left }}, {{ element.top }}) ({{ element.right }}, {{ element.bottom }})</span>
        </div>
      </div>
      <el-empty v-else description="无OCR识别结果" :image-size="50" />
    </div>
    <el-image-viewer v-if="showPreview" :url-list="previewUrlList" @close="showPreview = false" />
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import type { OcrPayload } from "@/types/api";
import { Camera, Picture, Grid, Download } from "@element-plus/icons-vue";
import GridOverlay from "./GridOverlay.vue"; // 导入新组件
import { wsService } from "@/services/wsService";
import { ElMessage } from "element-plus";
import { useWebSocketStore } from "@/stores/webSocketStore";
import { onBeforeUnmount, onMounted } from "vue";
const props = defineProps<{
  deviceId: string;
  screenshotUrl: string | null;
  ocrResult: OcrPayload | null;
  isCapturing: boolean;
  isConnected: boolean;
}>();

defineEmits(["capture"]);

const imageRef = ref();
const screenshotWrapperRef = ref<HTMLElement | null>(null);
const wsStore = useWebSocketStore();
const showGrid = ref(false);

const showPreview = ref(false);
const previewUrlList = computed(() => (props.screenshotUrl ? [props.screenshotUrl] : []));

// --- Click vs. Long Press State ---
let pressTimer: number | null = null;
let isDragging = false;
let startX = 0;
let startY = 0;
const LONG_PRESS_DURATION = 350; // ms
const DRAG_THRESHOLD = 5; // pixels

const ocrElementCount = computed(() => props.ocrResult?.elements?.length || 0);

const mousePosition = reactive({
  visible: false,
  x: 0,
  y: 0,
  imageX: 0,
  imageY: 0,
});

const imageInfo = reactive({
  naturalWidth: 0,
  naturalHeight: 0,
  renderWidth: 0,
  renderHeight: 0,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
});

let resizeObserver: ResizeObserver | null = null;

watch(
  () => props.screenshotUrl,
  () => {
    // 当截图URL变化时，重置尺寸信息，以便 onImageLoad 重新计算
    Object.assign(imageInfo, {
      naturalWidth: 0,
      naturalHeight: 0,
      renderWidth: 0,
      renderHeight: 0,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });
  }
);

const recalculateImageDimensions = () => {
  const imgElement = imageRef.value?.$el?.querySelector("img");
  if (!imgElement || !screenshotWrapperRef.value) {
    return;
  }

  imageInfo.naturalWidth = imgElement.naturalWidth;
  imageInfo.naturalHeight = imgElement.naturalHeight;
  imageInfo.renderWidth = imgElement.width;
  imageInfo.renderHeight = imgElement.height;
  imageInfo.scale = imageInfo.naturalWidth / imageInfo.renderWidth;
  imageInfo.offsetX = (screenshotWrapperRef.value.offsetWidth - imageInfo.renderWidth) / 2;
  imageInfo.offsetY = (screenshotWrapperRef.value.offsetHeight - imageInfo.renderHeight) / 2;
};

const onImageLoad = () => {
  // Call the recalculation function on initial load
  recalculateImageDimensions();
};

const tooltipStyle = computed(() => {
  const style: { [key: string]: string } = {};
  const tooltipWidth = 120,
    tooltipHeight = 30,
    offset = 15;
  if (!screenshotWrapperRef.value) return {};

  if (mousePosition.x + tooltipWidth + offset > screenshotWrapperRef.value.offsetWidth) {
    style.left = mousePosition.x - tooltipWidth - offset + "px";
  } else {
    style.left = mousePosition.x + offset + "px";
  }
  if (mousePosition.y + tooltipHeight + offset > screenshotWrapperRef.value.offsetHeight) {
    style.top = mousePosition.y - tooltipHeight - offset + "px";
  } else {
    style.top = mousePosition.y + offset + "px";
  }
  return style;
});

const handleMouseMove = (event: MouseEvent) => {
  if (pressTimer !== null) {
    // Check if the mouse has moved beyond the drag threshold
    if (Math.abs(event.clientX - startX) > DRAG_THRESHOLD || Math.abs(event.clientY - startY) > DRAG_THRESHOLD) {
      isDragging = true;
      // If dragging starts, it can't be a click or long press anymore
      clearPressTimer();
    }
  }

  if (!screenshotWrapperRef.value || imageInfo.naturalWidth === 0) return;
  const rect = screenshotWrapperRef.value.getBoundingClientRect();
  // We need the coordinates relative to the container div, not the image
  const containerEl = event.currentTarget as HTMLElement;
  const containerRect = containerEl.getBoundingClientRect();
  const containerX = event.clientX - containerRect.left;
  const containerY = event.clientY - containerRect.top;

  mousePosition.x = containerX;
  mousePosition.y = containerY;

  const isInImage =
    containerX >= imageInfo.offsetX &&
    containerX <= imageInfo.offsetX + imageInfo.renderWidth &&
    containerY >= imageInfo.offsetY &&
    containerY <= imageInfo.offsetY + imageInfo.renderHeight;

  if (isInImage) {
    mousePosition.visible = true;
    mousePosition.imageX = Math.round((containerX - imageInfo.offsetX) * imageInfo.scale);
    mousePosition.imageY = Math.round((containerY - imageInfo.offsetY) * imageInfo.scale);
  } else {
    mousePosition.visible = false;
  }
};

const handleMouseLeave = () => {
  clearPressTimer(); // Clear timer if mouse leaves the area
  mousePosition.visible = false;
};

// 完整的点击/长按处理逻辑 **********
const handleMouseDown = (event: MouseEvent) => {
  if (event.button !== 0) return; // Only handle left clicks
  if (!props.screenshotUrl) return; // Don't do anything if there's no image

  isDragging = false;
  startX = event.clientX;
  startY = event.clientY;

  pressTimer = window.setTimeout(() => {
    // If timer fires and we haven't started dragging, it's a long press
    if (!isDragging) {
      triggerPreview();
    }
    clearPressTimer();
  }, LONG_PRESS_DURATION);
};

const handleMouseUp = (event: MouseEvent) => {
  // Check if it was a valid click (timer was active, not a drag)
  if (pressTimer !== null && !isDragging) {
    sendTapCommand();
  }
  clearPressTimer();
};

const clearPressTimer = () => {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
};

const triggerPreview = () => {
  if (previewUrlList.value.length > 0) {
    showPreview.value = true;
  }
};

const sendTapCommand = () => {
  if (!props.isConnected) {
    ElMessage.error("设备未连接，无法发送点击指令。");
    return;
  }
  if (!wsStore.isLogPanelVisible) {
    wsStore.toggleLogPanel();
  }

  const { imageX, imageY } = mousePosition;
  wsService.sendExecuteActionSequence(props.deviceId, [
    {
      action: "tap",
      parameters: { startX: imageX, startY: imageY },
    },
  ]);

  ElMessage.info(`Tap 指令已发送至 (${imageX}, ${imageY})`);
};
const handleSaveImage = () => {
  if (!props.screenshotUrl) return;

  // Create a temporary anchor element
  const link = document.createElement("a");
  link.href = props.screenshotUrl;

  // Suggest a filename for the user
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.download = `screenshot-${props.deviceId}-${timestamp}.jpg`;

  // Programmatically click the link to trigger the download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

onMounted(() => {
  if (screenshotWrapperRef.value) {
    resizeObserver = new ResizeObserver(() => {
      // This callback is triggered whenever the container size changes.
      recalculateImageDimensions();
    });
    resizeObserver.observe(screenshotWrapperRef.value);
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect();
});
</script>

<style scoped>
/* 粘贴 ScreenshotCard 需要的所有样式 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.screenshot-wrapper {
  position: relative;
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}
.screenshot-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 720px;
  height: auto;
  background-color: #f5f7fa;
  border-radius: 4px;
}
.screenshot-container .el-image {
  max-width: 100%;
  max-height: 100%;
  border-radius: 4px;
}
.image-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #909399;
  font-size: 14px;
}
.image-slot .el-icon {
  font-size: 30px;
  margin-bottom: 8px;
}
.coords-tooltip {
  position: absolute;
  padding: 4px 8px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 10;
  transition: opacity 0.2s;
}
.ocr-result-container {
  margin-top: 20px;
  border-top: 1px solid #ebeef5;
  padding-top: 15px;
}
.ocr-result-container h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #303133;
}
.ocr-text-box {
  background-color: #fafafa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 10px 15px;
  max-height: 250px;
  overflow-y: auto;
  font-family: "Courier New", Courier, monospace;
  font-size: 13px;
  color: #606266;
}
.ocr-element-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  border-bottom: 1px solid #f0f2f5;
}
.ocr-element-text {
  flex-grow: 1;
  margin-right: 15px;
  word-break: break-all;
}
.ocr-element-coords {
  flex-shrink: 0;
  color: #909399;
  font-size: 12px;
}
</style>
