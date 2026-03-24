<template>
  <div class="af-page-container" ref="pageContainerRef">
    <!-- 保持原版 card-margin 类名 -->
    <el-card class="table-card card-margin" shadow="never" v-loading="isLoading">
      <template #header>
        <div class="af-list-header">
          <div class="left">
            <!-- 唯一的重型更新按钮：触发手机实时上报 -->
            <el-button type="primary" @click="$emit('refresh', true)" :loading="isLoading" :disabled="!isConnected">
              <el-icon class="mr-1"><Refresh /></el-icon> 从设备更新应用状态
            </el-button>
            <span class="count-info ml-6">
              已安装应用 ({{ filteredApps.length }}/{{ apps.length }})
            </span>
          </div>

          <el-select v-model="sortBy" placeholder="排序" style="width: 120px">
            <el-option label="名称 (A-Z)" value="name" />
            <el-option label="时间 (最新)" value="lastRunTime" />
            <el-option label="时间 (最早)" value="lastRunTimeAsc" />
          </el-select>

          <div class="right filter-group">
            <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width: 110px">
              <el-option label="全部" value="" />
              <el-option label="已纳管" value="inMaster" />
              <el-option label="最近失败" value="failed" />
              <el-option label="最近成功" value="success" />
            </el-select>

            <el-select v-model="suiteFilter" placeholder="按套件筛选" clearable filterable style="width: 140px">
              <el-option label="[未配置]" value="__NULL__" />
              <el-option v-for="suite in uniqueSuites" :key="suite" :label="suite" :value="suite" />
            </el-select>

            <!-- 调整为原子列表风格的搜索框 -->
            <el-input
                v-model="searchQuery"
                placeholder="搜索应用或包名..."
                clearable
                style="width: 200px"
            >
              <template #append>
                <el-button :icon="Search"
                           @click="$emit('refresh', false)"
                           title="从后台服务器刷新清单" />
              </template>
            </el-input>
          </div>
        </div>
      </template>

      <!-- 数据表格：移除 height 属性让其自动撑开 -->
      <el-table
          :data="filteredApps"
          style="width: 100%"
          border
          stripe
          class="custom-table"
      >
        <!-- 1. 应用名称：还原“白”字标签及样式 -->
        <el-table-column label="应用名称" prop="appName" min-width="150" show-overflow-tooltip>
          <template #default="{row}">
            <div class="app-info-cell">
              <div class="name-row">
                <el-tag
                    v-if="row.isInMaster"
                    type="success"
                    size="small"
                    effect="dark"
                    class="master-tag"
                    title="在主应用目录中"
                >白</el-tag>
                <span class="main-name">{{ row.appName }}</span>
              </div>
              <div class="sub-package" v-if="showPackageName">{{ row.packageName }}</div>
            </div>
          </template>
        </el-table-column>

        <!-- 2. 本地权重：还原 text-bold 逻辑 -->
        <el-table-column label="本地权重" prop="weight" width="90" align="center">
          <template #default="{ row }">
            <span :class="['weight-badge', row.weight > 0 ? 'text-bold' : '']">{{ row.weight }}</span>
          </template>
        </el-table-column>

        <!-- 3. 默认套件 -->
        <el-table-column label="默认套件" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="suite-cell" v-if="row.defaultSuiteName">
              <el-icon><Collection /></el-icon>
              <span>{{ row.defaultSuiteName }}</span>
            </div>
            <span v-else class="placeholder-text">未配置</span>
          </template>
        </el-table-column>

        <!-- 4. 运行结果：还原 Tooltip 和耗时逻辑 -->
        <el-table-column label="结果" min-width="150" >
          <template #default="{ row }">
            <div class="result-cell" v-if="row.lastStatus">
              <div class="status-main-row">
                <el-tag :type="getStatusType(row.lastStatus)" size="small" class="status-tag">
                  {{ row.lastStatus }}
                </el-tag>

                <span v-if="row.lastDurationS != null" class="duration-text ml-2">
                  {{ formatDurationExact(row.lastDurationS) }}
                </span>
              </div>
              
              <!-- 核心修复：直接展示失败或状态消息 -->
              <div 
                v-if="row.lastStatusMessage" 
                class="status-msg-row" 
                :title="row.lastStatusMessage"
              >
                {{ row.lastStatusMessage }}
            </div>
            </div>
            <span v-else class="placeholder-text">--</span>
          </template>
        </el-table-column>

        <!-- 6. 版本 (补回遗漏列) -->
        <el-table-column label="版本" prop="versionName" width="90" show-overflow-tooltip />

        <!-- 7. 操作列：Gmail 悬浮效果 -->
        <el-table-column
            label="上次运行"
            prop="lastRunAt"
            width="150"
            align="right"
            header-align="left"
        >
          <template #default="scope">
            <div class="action-swap-container">
              <span class="time-text-display">
                {{ scope.row.lastRunAt ? formatDateTime(scope.row.lastRunAt, "MM-DD HH:mm") : '--' }}
              </span>

              <div class="row-floating-actions">
                <div class="action-mask-gradient"></div>
                <div class="action-buttons-inner">
                  <!-- 运行 (原版 size="small" plain) -->
                  <el-tooltip v-if="scope.row.isInMaster" :content="getRunButtonTooltip(scope.row)" :disabled="canRun(scope.row)">
                    <span>
                       <el-button
                           circle :icon="VideoPlay"
                           class="btn-action btn-run"
                           @click.stop="$emit('runApp', scope.row)"
                           :disabled="!canRun(scope.row)"
                       />
                    </span>
                  </el-tooltip>

                  <!-- 添加 -->
                  <el-tooltip v-if="!scope.row.isInMaster" content="添加应用">
                    <el-button
                        circle :icon="Plus"
                        class="btn-action btn-add"
                        @click.stop="$emit('addToMaster', scope.row)"
                    />
                  </el-tooltip>

                  <!-- 卸载 (还原逻辑：!isConnected || isSystemApp) -->
                  <el-tooltip content="卸载应用">
                    <el-button
                        circle :icon="Delete"
                        class="btn-action btn-delete"
                        @click.stop="$emit('uninstall', scope.row.packageName)"
                        :disabled="!isConnected || scope.row.isSystemApp"
                    />
                  </el-tooltip>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { Delete, Plus, VideoPlay, Search, Refresh, Collection } from "@element-plus/icons-vue";
import type { DeviceInstalledApp } from "@/types/api";
import { formatDateTime } from "@/utils/formatter";

const props = defineProps<{
  apps: DeviceInstalledApp[];
  isLoading: boolean;
  isConnected: boolean;
}>();

defineEmits(["refresh", "uninstall", "pullApk", "addToMaster", "runApp"]);

const searchQuery = ref("");
const filterStatus = ref("");
const suiteFilter = ref("");
const sortBy = ref("name");

const uniqueSuites = computed(() => {
  const suites = new Set<string>();
  props.apps.forEach(app => app.defaultSuiteName && suites.add(app.defaultSuiteName));
  return Array.from(suites).sort();
});

const filteredApps = computed(() => {
  let result = [...props.apps];

  // 1. 搜索
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(app =>
        app.appName.toLowerCase().includes(q) || app.packageName.toLowerCase().includes(q)
    );
  }

  // 2. 状态筛选 (100% 还原原版逻辑)
  if (filterStatus.value === 'inMaster') {
    result = result.filter(app => app.isInMaster);
  } else if (filterStatus.value === 'failed') {
    result = result.filter(app => app.lastStatus === 'failed');
  } else if (filterStatus.value === 'success') {
    // 特别注意：success 会包含 completed
    result = result.filter(app => app.lastStatus === 'success' || app.lastStatus === 'completed');
  }

  // 3. 套件筛选 (100% 还原 __NULL__ 逻辑)
  if (suiteFilter.value) {
    if (suiteFilter.value === '__NULL__') {
      result = result.filter(app => !app.defaultSuiteId);
    } else {
      result = result.filter(app => app.defaultSuiteName === suiteFilter.value);
    }
  }

  // 4. 排序 (还原三种模式)
  if (sortBy.value === 'lastRunTime') {
    result.sort((a, b) => (b.lastRunAt || "").localeCompare(a.lastRunAt || ""));
  } else if (sortBy.value === 'lastRunTimeAsc') {
    result.sort((a, b) => (a.lastRunAt || "").localeCompare(b.lastRunAt || ""));
  } else {
    result.sort((a, b) => a.appName.localeCompare(b.appName));
  }

  return result;
});

// 100% 还原原版耗时格式化逻辑
const formatDurationExact = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
};

// 100% 还原原版状态映射 (补全 CANCELLED)
const getStatusType = (status: string) => {
  // 核心修正：先转为大写再进行比较
  const s = (status || '').toUpperCase();

  switch (s) {
    case 'SUCCESS':
    case 'COMPLETED': return 'success';
    case 'FAILED': return 'danger';
    case 'RUNNING': return 'primary';
    case 'QUEUED': return 'warning'; // 即使后端给的是小写 queued 也能匹配
    case 'CANCELLED': return 'info';
    default: return 'info';
  }
};

const canRun = (app: DeviceInstalledApp) => app.isInMaster && !!app.defaultSuiteId;
const getRunButtonTooltip = (app: DeviceInstalledApp) => app.defaultSuiteId ? "运行默认测试套件" : "未配置默认测试套件";

// 响应式控制
const pageContainerRef = ref<HTMLElement | null>(null);
const showPackageName = ref(true);
const showDesc = ref(true);
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (pageContainerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      showPackageName.value = w > 900;
      showDesc.value = w > 1150;
    });
    resizeObserver.observe(pageContainerRef.value);
  }
});
onUnmounted(() => resizeObserver?.disconnect());
</script>

<style scoped>
/* 还原原版样式类 */
.card-margin { margin-top: 0; }
.af-page-container { padding: 0; }
.table-card { border: none; box-shadow: none !important; }

.af-list-header {
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 10px;
}
.filter-group { display: flex; gap: 8px; flex-wrap: wrap; }

.count-info { font-size: 13px; color: #909399; }

/* 单元格美化 */
.app-info-cell .name-row { display: flex; align-items: center; gap: 6px; }
.app-info-cell .main-name { font-weight: 600; color: var(--el-text-color-primary); }
.app-info-cell .sub-package { font-size: 11px; color: #909399; font-family: 'JetBrains Mono', monospace; margin-top: 2px; }

.master-tag { font-size: 10px; padding: 0 4px; height: 18px; line-height: 16px; margin-right: 5px; }

.weight-badge {
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
  background: #f4f4f5; color: #909399; padding: 2px 8px; border-radius: 10px;
}
.text-bold { font-weight: bold; color: var(--el-color-primary); background: var(--el-color-primary-light-9); }

.suite-cell { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--el-text-color-regular); }
.suite-cell .el-icon { color: var(--el-color-warning); }

.status-tag { font-weight: bold; }
.clickable-help { cursor: help; }
.duration-text { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #909399; }

.status-msg-row {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.2;
  color: #f56c6c; /* 默认使用错误红 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.placeholder-text { color: #dcdfe6; font-size: 12px; }

/* Gmail 悬浮效果 */
.action-swap-container { position: relative; display: flex; align-items: center; justify-content: flex-end; width: 100%; height: 32px; }
.time-text-display { transition: opacity 0.2s; color: #606266; font-size: 12px; font-family: 'JetBrains Mono', monospace; }

.row-floating-actions {
  position: absolute; top: 0; right: -10px; bottom: 0;
  display: flex; align-items: center; opacity: 0; pointer-events: none;
  transition: all 0.2s ease; z-index: 5;
}
.action-mask-gradient {
  width: 40px; height: 100%;
  background: linear-gradient(to right, rgba(255, 255, 255, 0), var(--el-table-row-hover-bg-color) 80%);
}
.action-buttons-inner {
  display: flex; align-items: center; gap: 6px; padding-right: 12px;
  background-color: var(--el-table-row-hover-bg-color);
}
.action-buttons-inner :deep(.btn-action) { border: none; background: transparent; width: 32px; height: 32px; font-size: 20px !important;}
.action-buttons-inner :deep(.btn-run) { color: var(--el-color-success); }
.action-buttons-inner :deep(.btn-run:hover) { background-color: var(--el-color-success-light-9); }
.action-buttons-inner :deep(.btn-add) { color: var(--el-color-primary); }
.action-buttons-inner :deep(.btn-add:hover) { background-color: var(--el-color-primary-light-9); }
.action-buttons-inner :deep(.btn-delete) { color: var(--el-color-danger); }
.action-buttons-inner :deep(.btn-delete:hover) { background-color: var(--el-color-danger-light-9); }

:deep(.el-table__row:hover) .time-text-display { opacity: 0; }
:deep(.el-table__row:hover) .row-floating-actions { opacity: 1; pointer-events: auto; right: 0; }
:deep(.el-table__row:hover > td.el-table__cell) { background-color: var(--el-table-row-hover-bg-color) !important; }

.mr-1 { margin-right: 4px; }
.ml-4 { margin-left: 16px; }
</style>