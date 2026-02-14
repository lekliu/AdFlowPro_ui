<template>
  <div class="ai-gallery-page">
    <!-- 1. 顶部工具栏：包含筛选、全选、批量操作 -->
    <div class="toolbar">
      <div class="left-group">
        <el-input
            v-model="searchPrefix"
            placeholder="按素材前缀筛选..."
            style="width: 220px"
            @clear="handleSearchClear"
            clearable
        >
          <template #append><el-button :icon="Search" @click="loadImages" /></template>
        </el-input>

        <!-- 核心修改：添加每页数量切换 -->
        <el-select v-model="pageSize" @change="handleSizeChange" style="width: 110px; margin-left: 10px">
          <el-option v-for="size in pageSizes" :key="size" :label="size + '个/页'" :value="size" />
        </el-select>

        <el-checkbox
            v-model="checkAll"
            :indeterminate="isIndeterminate"
            @change="handleCheckAllChange"
            style="margin-left: 20px"
        >
          全选 (已选 {{ selection.length }} / 共 {{ totalCount }} 项)
        </el-checkbox>
      </div>

      <div class="actions">
        <el-button-group>
          <el-button type="danger" :icon="Delete" :disabled="!selection.length" @click="handleBatchDelete">删除</el-button>
          <el-button type="primary" :icon="Download" :disabled="!selection.length" @click="handleBatchDownload">下载</el-button>
        </el-button-group>
        <el-button-group>
        <el-button type="success" :icon="Promotion" :disabled="!selection.length" @click="cvatDialog.visible = true" style="margin-left: 10px">推送到 CVAT</el-button>
          <el-button type="warning" :icon="Camera" @click="openCaptureDialog">远程截图采集</el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 2. 图片展示网格：使用 pagedImages 替代原 images -->
    <div class="image-grid" v-loading="loading">
      <div class="grid-container" v-if="images.length > 0">
        <div
            v-for="img in images"
            :key="img.fullPath"
            class="img-card"
            :class="{ 'is-selected': selection.includes(img.fullPath) }"
        >
          <div class="img-checker-wrapper">
            <el-checkbox-group v-model="selection">
              <el-checkbox :label="img.fullPath" class="img-checker"><span></span></el-checkbox>
            </el-checkbox-group>
          </div>

          <el-image
              :src="img.url"
              fit="contain"
              lazy
              class="main-img"
              :preview-src-list="[img.url]"
              preview-teleported
          />
          <div class="img-info">
            <span class="name" :title="img.name">{{ img.name }}</span>
            <span class="size">{{ (img.size / 1024).toFixed(1) }} KB</span>
          </div>
        </div>
      </div>
      <el-empty v-else description="未找到匹配素材" />
    </div>

    <!-- 3. 分页控制条 -->
    <div class="pagination-container" v-if="totalCount > 0">
      <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="pageSizes"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalCount"
          background
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
      />
    </div>

    <!-- CVAT 推送弹窗 -->
    <el-dialog v-model="cvatDialog.visible" title="推送素材至 CVAT" width="450px">
      <el-form label-position="top">
        <el-form-item label="任务名称">
          <el-input v-model="cvatDialog.taskName" />
        </el-form-item>
        <el-form-item label="CVAT 项目 ID (可选)">
          <el-input-number
              v-model="cvatDialog.projectId"
              :min="1"
              placeholder="留空则创建独立任务"
              style="width: 100%"
          />
          <div class="tip">提示：在 CVAT 项目 URL 中可以找到 ID (如 projects/5)</div>
        </el-form-item>
        <el-form-item label="CVAT 地址">
          <el-input v-model="cvatDialog.url" />
        </el-form-item>
        <el-form-item label="API Token">
          <el-input v-model="cvatDialog.token" type="password" show-password />
        </el-form-item>

      </el-form>
      <template #footer>
        <el-button @click="cvatDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="handlePushToCvat" :loading="cvatDialog.loading">立即推送</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="captureDialog.visible" title="远程截取 AI 训练素材" width="400px">
      <el-form label-position="top">
        <el-form-item label="选择在线设备">
          <el-select v-model="captureDialog.deviceId" placeholder="请选择设备" style="width: 100%">
            <el-option
                v-for="d in onlineDevices"
                :key="d.deviceId"
                :label="`${d.deviceName || d.deviceId}`"
                :value="d.deviceId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="素材文件前缀">
          <el-input v-model="captureDialog.prefix" placeholder="例如: login_btn / ad_banner" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="captureDialog.visible = false">取消</el-button>
        <el-button
            type="primary"
            @click="handleRemoteCapture"
            :loading="captureDialog.submitting"
            :disabled="!captureDialog.deviceId"
        >立即截取并上传</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed, watch } from 'vue';
import { aiImageService } from '@/api/aiImageService';
import { Search, Delete, Download, Promotion, Camera} from '@element-plus/icons-vue';
import {ElMessage, ElMessageBox, ElNotification, type CheckboxValueType, ElLoading} from 'element-plus';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import {useDeviceStore} from "@/stores/deviceStore";

// --- 基础状态 ---
const images = ref<any[]>([]); // 此时只存当前页的 18 张图
const totalCount = ref(0);     // 存储总数
const selection = ref<string[]>([]);
const loading = ref(false);
const searchPrefix = ref("");

const currentPage = ref(1);
const pageSize = ref(18); // 核心修改：改为 ref 响应式
const pageSizes = [18, 50, 100, 200]; // 核心修改：可选范围

// 计算属性：当前页渲染切片
const pagedImages = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return images.value.slice(start, end);
});

// --- 全选逻辑 ---
const checkAll = ref(false);
const isIndeterminate = computed(() => {
  // 现在的 images 长度就是当前页长度
  return selection.value.length > 0 && selection.value.length < images.value.length;
});

// 全选逻辑修正：由于现在是后端分页，全选只能选中“当前页”
const handleCheckAllChange = (val: any) => {
  const isChecked = val as boolean;
  // 只全选当前页可见的图片
  selection.value = isChecked ? images.value.map(i => i.fullPath) : [];
};

// 监听选中的变化，驱动全选状态
watch(selection, (newVal) => {
  checkAll.value = newVal.length === images.value.length && images.value.length > 0;
});

// --- 数据加载 ---
const loadImages = async () => {
  loading.value = true;
  try {
    const res = await aiImageService.getImageList({
      prefix: searchPrefix.value,
      skip: (currentPage.value - 1) * pageSize.value,
      limit: pageSize.value
    });

    images.value = res.items;
    totalCount.value = res.total;

    // 每次加载新数据（含翻页/搜索）都应重置全选状态
    checkAll.value = false;
  } finally { loading.value = false; }
};

// 监听页码变化
const handleCurrentChange = (val: number) => {
  currentPage.value = val;
  selection.value = []; // 核心：后端分页模式下，翻页必须清空选中，否则逻辑会乱
  checkAll.value = false;
  loadImages();
};

// 搜索逻辑
const handleSearch = () => {
  currentPage.value = 1;
  loadImages();
};

// 核心修改：处理每页数量变化
const handleSizeChange = (val: number) => {
  pageSize.value = val;
  currentPage.value = 1; // 切换数量后回到第一页
  loadImages();
};


const handleSearchClear = () => {
  searchPrefix.value = "";
  loadImages();
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- 批量操作逻辑 ---
const handleBatchDownload = async () => {
  if (selection.value.length === 0) return;

  const loadingInstance = ElLoading.service({ text: '正在打包并下载...' });

  try {
    // 1. 调用后端接口获取 ZIP 压缩包
    const blob = await aiImageService.batchDownload(selection.value);

    // 2. 将二进制流转为本地 URL
    const url = window.URL.createObjectURL(new Blob([blob]));

    // 3. 模拟点击下载
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ai_samples_${new Date().getTime()}.zip`);
    document.body.appendChild(link);
    link.click();

    // 4. 清理
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    ElMessage.success(`成功下载 ${selection.value.length} 张图片（已压缩）`);
  } catch (error) {
    console.error("Download failed:", error);
    ElMessage.error("下载失败，请稍后重试");
  } finally {
    loadingInstance.close();
  }
};

const handleBatchDelete = () => {
  ElMessageBox.confirm(`警告：确定删除选中的 ${selection.value.length} 张图片吗？此操作不可撤销。`, "永久删除", {
    confirmButtonClass: 'el-button--danger',
    type: 'warning'
  }).then(async () => {
    await aiImageService.deleteImages(selection.value);
    ElMessage.success('已从云端彻底删除');
    selection.value = [];
    loadImages();
  });
};

// --- CVAT 逻辑 (保持不变) ---
const cvatDialog = reactive({
  visible: false,
  loading: false,
  taskName: `AFP_Sample_${dayjs().format('YYYYMMDD_HHmmss')}`,
  projectId: localStorage.getItem('cvat_project_id') ? Number(localStorage.getItem('cvat_project_id')) : null,
  url: localStorage.getItem('cvat_url') || '',
  token: localStorage.getItem('cvat_token') || ''
});

const handlePushToCvat = async () => {
  cvatDialog.loading = true;
  try {
    localStorage.setItem('cvat_url', cvatDialog.url);
    localStorage.setItem('cvat_token', cvatDialog.token);
    if (cvatDialog.projectId) {
      localStorage.setItem('cvat_project_id', cvatDialog.projectId.toString());
    } else {
      localStorage.removeItem('cvat_project_id');
    }
    const res: any = await aiImageService.pushToCvat({
      taskName: cvatDialog.taskName,
      images: selection.value,
      cvatUrl: cvatDialog.url,
      cvatToken: cvatDialog.token,
      projectId: cvatDialog.projectId
    });
    ElNotification({
      title: '推送成功',
      message: `CVAT 任务 ID: ${res.taskId}`,
      type: 'success',
      onClick: () => window.open(res.url, '_blank')
    });
    cvatDialog.visible = false;
    selection.value = [];
  } finally { cvatDialog.loading = false; }
};

const deviceStore = useDeviceStore();
const onlineDevices = computed(() => deviceStore.devices.filter(d => d.isConnectedWs));

const captureDialog = reactive({
  visible: false,
  submitting: false,
  deviceId: localStorage.getItem('last_capture_device') || '',
  prefix: 'manual',
  currentCid: ''
});

const openCaptureDialog = () => {
  deviceStore.fetchDevices({ limit: 1000 }); // 刷新设备在线状态
  captureDialog.visible = true;
};

// 核心功能：下发指令
const handleRemoteCapture = async () => {
  captureDialog.submitting = true;
  captureDialog.currentCid = `web_${uuidv4().slice(0,8)}`; // 生成本次请求的唯一标识

  try {
    localStorage.setItem('last_capture_device', captureDialog.deviceId);
    await aiImageService.remoteCapture(captureDialog.deviceId, {
      prefix: captureDialog.prefix,
      correlationId: captureDialog.currentCid
    });
    ElMessage.info("指令已下发，正在等待设备截图上传...");

    // 设置 15 秒保底超时，防止 Loading 永远不消失
    setTimeout(() => {
      if (captureDialog.submitting) {
        captureDialog.submitting = false;
        ElMessage.error("设备响应超时，请检查设备自动化引擎是否开启");
      }
    }, 15000);

  } catch (error) {
    captureDialog.submitting = false;
  }
};

// 核心功能：监听回传结果
const handleActionResult = (event: Event) => {
  const detail = (event as CustomEvent).detail;

  // 只处理与本次采集 ID 匹配的结果
  if (detail.correlationId === captureDialog.currentCid) {
    captureDialog.submitting = false;

    if (detail.success) {
      ElMessage.success("素材采集成功！已存入云端库。");
      captureDialog.visible = false;
      loadImages(); // 自动刷新列表，看到新截图
    } else {
      ElMessage.error(`采集失败: ${detail.message}`);
    }
  }
};

onMounted(loadImages);
onMounted(() => {
  window.addEventListener('live_test_result', handleActionResult);
});

</script>

<style scoped>
.ai-gallery-page { padding: 20px; min-height: 100vh; }
.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 25px;
  align-items: center;
  background: #fff;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.left-group { display: flex; align-items: center; }

/* 响应式网格比例 */
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.img-card {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  background-color: #fff;
  transition: all 0.3s;
}
.img-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
}
.img-card.is-selected {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.main-img {
  width: 100%;
  height: 280px; /* 进一步优化手机截图比例 */
  display: block;
  background-color: #f5f7fa;
}

.img-checker-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 40px;
  height: 40px;
  z-index: 20;
  padding: 8px;
}
.img-checker {
  background: rgba(255, 255, 255, 0.85);
  border-radius: 4px;
  padding: 4px;
}

.img-info { padding: 10px; font-size: 12px; border-top: 1px solid #f5f5f5; }
.name { color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; margin-bottom: 4px; }
.size { color: #999; }

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 30px;
  padding: 20px 0 40px 0;
}
</style>