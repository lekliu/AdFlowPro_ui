<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>屏幕预览</span>
        <!-- 新增的 header-modes 布局 -->
        <div class="header-modes">
          <el-tooltip content="开启吸管: 点击屏幕采集比例坐标和颜色并复制到剪切板">
            <el-switch v-model="isDropperActive" active-text="吸管" inline-prompt :active-icon="Pointer" />
          </el-tooltip>
          <el-divider direction="vertical" />
          <el-switch v-model="showGrid" inline-prompt :active-icon="Grid" :inactive-icon="Grid" />
        </div>
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
          :class="{ 'dropper-mode': isDropperActive }"
          v-loading="isCapturing"
          @mousedown="handleMouseDown"
          @mouseup="handleMouseUp"
          @mousemove="handleMouseMove"
          @mouseleave="handleMouseLeave"
      >
        <!-- 修正：添加 crossOrigin 处理跨域采样 -->
        <el-image v-if="screenshotUrl" :src="screenshotUrl" fit="contain" ref="imageRef" @load="onImageLoad" crossOrigin="anonymous">
          <template #error>
            <div class="image-slot">
              <el-icon><Picture /></el-icon><span>加载失败</span>
            </div>
          </template>
        </el-image>
        <el-empty v-else description="暂无截图，请点击“手动截图”获取" />
        <GridOverlay v-if="showGrid && screenshotUrl" />
      </div>

      <!-- 传统坐标浮层 -->
      <div v-if="mousePosition.visible && !isDropperActive" class="coords-tooltip" :style="tooltipStyle">
        {{ `(x: ${mousePosition.imageX}, y: ${mousePosition.imageY})` }}
      </div>

      <!-- 吸管放大镜 -->
      <div v-if="isDropperActive && mousePosition.visible" class="magnifier" :style="magnifierStyle">
        <canvas ref="magnifierCanvasRef" width="100" height="100"></canvas>
        <div class="crosshair"></div>
        <div class="magnifier-info">{{ currentHexColor }}</div>
      </div>
    </div>

    <!-- OCR 区域保持不变 -->
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
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from "vue";
import type { OcrPayload } from "@/types/api";
import { Camera, Picture, Grid, Download, Pointer } from "@element-plus/icons-vue";
import GridOverlay from "./GridOverlay.vue";
import { wsService } from "@/services/wsService";
import { ElMessage } from "element-plus";
import { useWebSocketStore } from "@/stores/webSocketStore";

// --- 1. 定义 Props 和 Emits (必须置顶) ---
const props = defineProps<{
  deviceId: string;
  screenshotUrl: string | null;
  ocrResult: OcrPayload | null;
  isCapturing: boolean;
  isConnected: boolean;
}>();

defineEmits(["capture"]);

// --- 2. 响应式状态定义 ---
const wsStore = useWebSocketStore();
const imageRef = ref();
const screenshotWrapperRef = ref<HTMLElement | null>(null);
const magnifierCanvasRef = ref<HTMLCanvasElement | null>(null);

const isDropperActive = ref(false);
const showGrid = ref(false);
const showPreview = ref(false);
const currentHexColor = ref("#FFFFFF");

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

let pressTimer: number | null = null;
let isDragging = false;
let startX = 0;
let startY = 0;
const LONG_PRESS_DURATION = 350;
const DRAG_THRESHOLD = 5;

// --- 3. 计算属性 ---
const previewUrlList = computed(() => (props.screenshotUrl ? [props.screenshotUrl] : []));
const ocrElementCount = computed(() => props.ocrResult?.elements?.length || 0);

const tooltipStyle = computed(() => {
  if (!screenshotWrapperRef.value) return {};
  const offset = 15;
  return {
    left: `${mousePosition.x + offset}px`,
    top: `${mousePosition.y + offset}px`
  };
});

const magnifierStyle = computed(() => ({
  left: `${mousePosition.x + 20}px`,
  top: `${mousePosition.y - 120}px`
}));

// --- 4. 侦听器 ---
watch(() => props.screenshotUrl, () => {
  Object.assign(imageInfo, { naturalWidth: 0, naturalHeight: 0, renderWidth: 0, renderHeight: 0, scale: 1, offsetX: 0, offsetY: 0 });
});

// 放大镜实时渲染核心逻辑
watch([() => mousePosition.imageX, () => mousePosition.imageY], ([ix, iy]) => {
  if (!isDropperActive.value || !magnifierCanvasRef.value) return;
  const img = imageRef.value?.$el?.querySelector("img");
  const ctx = magnifierCanvasRef.value.getContext("2d", { willReadFrequently: true });
  if (!img || !ctx) return;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 100, 100);
  // 采样原图鼠标周围 11x11 像素区域并放大到 100x100
  ctx.drawImage(img, ix - 5, iy - 5, 11, 11, 0, 0, 100, 100);

  // 采样中心点颜色
  try {
    const pixel = ctx.getImageData(50, 50, 1, 1).data;
    currentHexColor.value = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase();
  } catch (e) {
    console.warn("Canvas context is tainted, check CORS settings of MinIO.");
  }
});

// --- 5. 方法定义 ---
const recalculateImageDimensions = () => {
  const imgElement = imageRef.value?.$el?.querySelector("img");
  if (!imgElement || !screenshotWrapperRef.value) return;

  imageInfo.naturalWidth = imgElement.naturalWidth;
  imageInfo.naturalHeight = imgElement.naturalHeight;
  imageInfo.renderWidth = imgElement.width;
  imageInfo.renderHeight = imgElement.height;
  imageInfo.scale = imageInfo.naturalWidth / imageInfo.renderWidth;
  imageInfo.offsetX = (screenshotWrapperRef.value.offsetWidth - imageInfo.renderWidth) / 2;
  imageInfo.offsetY = (screenshotWrapperRef.value.offsetHeight - imageInfo.renderHeight) / 2;
};

const onImageLoad = () => recalculateImageDimensions();

const handleMouseMove = (event: MouseEvent) => {
  if (pressTimer !== null) {
    if (Math.abs(event.clientX - startX) > DRAG_THRESHOLD || Math.abs(event.clientY - startY) > DRAG_THRESHOLD) {
      isDragging = true;
      clearPressTimer();
    }
  }

  if (!screenshotWrapperRef.value || imageInfo.naturalWidth === 0) return;
  const containerRect = screenshotWrapperRef.value.getBoundingClientRect();
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
  clearPressTimer();
  mousePosition.visible = false;
};

const handleMouseDown = (event: MouseEvent) => {
  if (event.button !== 0 || !props.screenshotUrl) return;
  isDragging = false;
  startX = event.clientX;
  startY = event.clientY;
  pressTimer = window.setTimeout(() => {
    if (!isDragging) showPreview.value = true;
    clearPressTimer();
  }, LONG_PRESS_DURATION);
};

const handleMouseUp = (event: MouseEvent) => {
  // 吸管逻辑优先
  if (isDropperActive.value && !isDragging) {
    if (imageInfo.naturalWidth > 0) {
      const rx = (mousePosition.imageX / imageInfo.naturalWidth).toFixed(4);
      const ry = (mousePosition.imageY / imageInfo.naturalHeight).toFixed(4);
      const copyText = `${rx}, ${ry}, ${currentHexColor.value}`;
      navigator.clipboard.writeText(copyText).then(() => {
        ElMessage.success(`采样成功: ${copyText}`);
      });
    }
    clearPressTimer();
    return;
  }

  if (pressTimer !== null && !isDragging) {
    if (!props.isConnected) {
      ElMessage.error("设备未连接");
    } else {
      if (!wsStore.isLogPanelVisible) wsStore.toggleLogPanel();
      wsService.sendExecuteActionSequence(props.deviceId, [{
        action: "tap",
        parameters: { startX: mousePosition.imageX, startY: mousePosition.imageY },
      }]);
      ElMessage.info(`Tap (${mousePosition.imageX}, ${mousePosition.imageY})`);
    }
  }
  clearPressTimer();
};

const clearPressTimer = () => {
  if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
};

const handleSaveImage = () => {
  if (!props.screenshotUrl) return;
  const link = document.createElement("a");
  link.href = props.screenshotUrl;
  link.download = `screenshot-${props.deviceId}-${Date.now()}.jpg`;
  link.click();
};

let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  if (screenshotWrapperRef.value) {
    resizeObserver = new ResizeObserver(() => recalculateImageDimensions());
    resizeObserver.observe(screenshotWrapperRef.value);
  }
});
onBeforeUnmount(() => resizeObserver?.disconnect());
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-modes { display: flex; align-items: center; gap: 8px; }
.header-actions { display: flex; align-items: center; gap: 10px; }
.screenshot-wrapper { position: relative; width: 100%; border: 1px solid #dcdfe6; border-radius: 4px; overflow: hidden; }
.screenshot-container { display: flex; justify-content: center; align-items: center; width: 100%; min-height: 400px; background-color: #f5f7fa; }
.screenshot-container .el-image { max-width: 100%; max-height: 100%; }

.coords-tooltip {
  position: absolute; padding: 4px 8px; background: rgba(0, 0, 0, 0.7);
  color: white; border-radius: 4px; font-size: 12px; pointer-events: none; z-index: 10;
}

.dropper-mode { cursor: crosshair !important; }
.magnifier {
  position: absolute; width: 100px; height: 130px; pointer-events: none;
  z-index: 2000; border: 2px solid var(--el-color-primary); background: #000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.magnifier canvas { width: 100px; height: 100px; }
.crosshair { position: absolute; top: 50px; left: 50px; width: 10px; height: 10px; border: 1px solid red; transform: translate(-50%, -50%); }
.magnifier-info { background: #333; color: #0f0; font-family: monospace; font-size: 11px; text-align: center; line-height: 30px; }

.ocr-result-container { margin-top: 20px; border-top: 1px solid #ebeef5; padding-top: 15px; }
.ocr-text-box { background-color: #fafafa; border: 1px solid #e4e7ed; border-radius: 4px; padding: 10px; max-height: 200px; overflow-y: auto; font-family: monospace; }
.ocr-element-row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
</style>