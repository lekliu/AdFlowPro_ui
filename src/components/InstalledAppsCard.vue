<template>
  <!-- 移除 body-style 中的高度限制 -->
  <el-card class="card-margin" v-loading="isLoading">
    <template #header>
      <div class="card-header">
        <span>已安装应用 ({{ filteredApps.length }}/{{ apps.length }})</span>
        <div class="header-controls">
          <el-dropdown split-button type="primary" @click="$emit('refresh', true)" :loading="isLoading" :disabled="!isConnected">
            从设备更新
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="$emit('refresh', false)">从服务器缓存刷新</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      
      <!-- 筛选工具栏 -->
      <div class="filter-toolbar">
        <el-input v-model="searchQuery" placeholder="搜索应用/包名" clearable style="width: 200px" prefix-icon="Search" />
        
        <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width: 130px">
          <el-option label="全部" value="" />
          <el-option label="已纳管" value="inMaster" />
          <el-option label="最近失败" value="failed" />
          <el-option label="最近成功" value="success" />
        </el-select>

        <el-select v-model="suiteFilter" placeholder="按套件筛选" clearable filterable style="width: 160px">
          <el-option label="[未配置]" value="__NULL__" />
          <el-option v-for="suite in uniqueSuites" :key="suite" :label="suite" :value="suite" />
        </el-select>

        <el-select v-model="sortBy" placeholder="排序" style="width: 130px">
          <el-option label="名称 (A-Z)" value="name" />
          <el-option label="时间 (最新)" value="lastRunTime" />
          <el-option label="时间 (最早)" value="lastRunTimeAsc" />
        </el-select>
      </div>
    </template>

    <!-- 核心修改：移除 height 属性，或者设为 null/auto，让表格自动撑开 -->
    <el-table :data="filteredApps" style="width: 100%" border stripe>
      <el-table-column label="应用名称" prop="appName" min-width="120" show-overflow-tooltip>
        <template #default="scope">
          <el-tag v-if="scope.row.isInMaster" type="success" size="small" effect="dark" style="margin-right: 5px" title="在主应用目录中">白</el-tag>
          <span>{{ scope.row.appName }}</span>
        </template>
      </el-table-column>
      <el-table-column label="包名" prop="packageName" min-width="160" show-overflow-tooltip />
      <el-table-column label="本地权重" prop="weight" width="90" align="center">
        <template #default="{ row }">
          <span :class="{'text-bold': row.weight > 0}">{{ row.weight }}</span>
        </template>
      </el-table-column>
      <!-- 新增：默认套件 -->
      <el-table-column label="默认套件" min-width="90" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.defaultSuiteName">{{ row.defaultSuiteName }}</span>
          <span v-else class="placeholder-text">未配置</span>
        </template>
      </el-table-column>

      <!-- 新增：上次运行时间 -->
      <el-table-column label="上次运行" width="100" align="center">
        <template #default="{ row }">
          <span v-if="row.lastRunAt" class="time-text">{{ formatDate(row.lastRunAt) }}</span>
          <span v-else class="placeholder-text">--</span>
        </template>
      </el-table-column>

      <!-- 新增：上次运行耗时 -->
      <el-table-column label="上次耗时" width="100" align="center">
        <template #default="{ row }">
          <span v-if="row.lastDurationS != null" class="duration-text">{{ formatDuration(row.lastDurationS) }}</span>
          <span v-else class="placeholder-text">--</span>
        </template>
      </el-table-column>

      <!-- 新增：运行结果 -->
      <el-table-column label="结果" width="98" align="center">
        <template #default="{ row }">
          <el-tooltip v-if="row.lastStatus === 'failed' && row.lastFailReason" :content="row.lastFailReason" placement="top" :show-after="500">
            <el-tag :type="getStatusType(row.lastStatus)" size="small" style="cursor: help">{{ row.lastStatus }}</el-tag>
          </el-tooltip>
          <el-tag v-else-if="row.lastStatus" :type="getStatusType(row.lastStatus)" size="small">{{ row.lastStatus }}</el-tag>
          <span v-else class="placeholder-text">--</span>
        </template>
      </el-table-column>

      <el-table-column label="版本" prop="versionName" width="90" />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="scope">
          <!-- 运行按钮 (仅在主目录中显示) -->
          <el-tooltip v-if="scope.row.isInMaster" :content="getRunButtonTooltip(scope.row)" :disabled="canRun(scope.row)">
            <span>
               <el-button
                   size="small"
                   type="success"
                   :icon="VideoPlay"
                   @click="$emit('runApp', scope.row)"
                   :disabled="!canRun(scope.row)"
                   plain
                   style="margin-right: 8px"
               >
                运行
              </el-button>
            </span>
          </el-tooltip>

          <!-- 添加按钮 (仅不在主目录中显示) -->
          <el-button
              v-if="!scope.row.isInMaster"
              size="small"
              type="primary"
              :icon="Plus"
              @click="$emit('addToMaster', scope.row)"
              plain
              style="margin-right: 8px"
          > 添加
          </el-button>
          <el-button
              size="small"
              type="danger"
              :icon="Delete"
              @click="$emit('uninstall', scope.row.packageName)"
              :disabled="!isConnected || scope.row.isSystemApp"
              plain
          >
            卸载
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { Delete, Plus, VideoPlay, Search } from "@element-plus/icons-vue";
import type { DeviceInstalledApp } from "@/types/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ref, computed } from "vue";

dayjs.extend(utc);

const props = defineProps<{
  apps: DeviceInstalledApp[];
  isLoading: boolean;
  isConnected: boolean;
}>();

defineEmits(["refresh", "uninstall", "pullApk", "addToMaster", "runApp"]);

// --- 过滤与排序状态 ---
const searchQuery = ref("");
const filterStatus = ref("");
const suiteFilter = ref("");
const sortBy = ref("name");

// --- 计算属性 ---
const uniqueSuites = computed(() => {
  const suites = new Set<string>();
  props.apps.forEach(app => {
    if (app.defaultSuiteName) {
      suites.add(app.defaultSuiteName);
    }
  });
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

  // 2. 状态筛选
  if (filterStatus.value === 'inMaster') result = result.filter(app => app.isInMaster);
  else if (filterStatus.value === 'failed') result = result.filter(app => app.lastStatus === 'failed');
  else if (filterStatus.value === 'success') result = result.filter(app => app.lastStatus === 'success' || app.lastStatus === 'completed');

  // 3. 套件筛选
  if (suiteFilter.value) {
    if (suiteFilter.value === '__NULL__') {
      result = result.filter(app => !app.defaultSuiteId);
    } else {
      result = result.filter(app => app.defaultSuiteName === suiteFilter.value);
    }
  }

  // 4. 排序
  if (sortBy.value === 'lastRunTime') {
    // 最新运行在前 (降序)
    result.sort((a, b) => (b.lastRunAt || "").localeCompare(a.lastRunAt || ""));
  } else if (sortBy.value === 'lastRunTimeAsc') {
    // 最早运行在前 (升序)
    // 注意：从未运行(null/empty)的会被视为"最小"，排在最前面
    result.sort((a, b) => (a.lastRunAt || "").localeCompare(b.lastRunAt || ""));
  } else {
    result.sort((a, b) => a.appName.localeCompare(b.appName));
  }

  return result;
});

const formatDate = (dateString: string) => {
  // 明确指定输入为 UTC，并转换为本地时间
  return dayjs.utc(dateString).local().format("MM-DD HH:mm");
};

// 格式化秒数为可读字符串
const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
};

const getStatusType = (status: string) => {
  switch (status) {
    case 'SUCCESS': return 'success';
    case 'completed': return 'success';
    case 'failed': return 'danger';
    case 'RUNNING': return 'primary';
    case 'queued': return 'warning';
    case 'CANCELLED': return 'info';
    default: return 'info';
  }
};

const canRun = (app: DeviceInstalledApp) => {
  return app.isInMaster && !!app.defaultSuiteId;
};

const getRunButtonTooltip = (app: DeviceInstalledApp) => {
  if (!app.defaultSuiteId) return "未配置默认测试套件";
  return "运行默认测试套件";
};
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px; /* Space for toolbar */
}
.filter-toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding-bottom: 5px;
}
.card-margin {
  margin-top: 0;
  border: none;
  box-shadow: none;
}
.time-text {
  font-size: 12px;
  color: #606266;
}
.placeholder-text {
  color: #909399;
  font-size: 12px;
}
</style>