<template>
  <div class="jobs-list-page" @click="closeContextMenu">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">任务历史记录</span>

          <!-- 顶部操作按钮组 -->
          <el-button-group class="header-button-group">
            <el-button :icon="View" type="primary" @click="handleViewSelected" :disabled="selectedJobs.length !== 1">详情</el-button>
            <el-button :icon="VideoPause" type="warning" @click="handleCancelSelected" :disabled="!canCancelSelected">停止</el-button>
            <el-button :icon="Download" type="success" @click="handleExportSelected" :disabled="selectedJobs.length !== 1 || !canExportSelected">报告</el-button>
            <el-button :icon="Delete" type="danger" @click="handleDeleteSelected" :disabled="selectedJobs.length === 0">删除</el-button>
          </el-button-group>

          <div class="header-actions">
            <el-switch v-model="autoRefreshEnabled" inline-prompt active-text="自动刷新 (5s)" inactive-text="关闭" style="margin-right: 15px" />
            <el-button :icon="Refresh" @click="handleRefresh" :loading="jobStore.isLoading && !autoRefreshEnabled">刷新列表</el-button>
          </div>
        </div>
      </template>

      <div class="filter-container">
        <el-input
          v-model="searchQuery"
          placeholder="按套件名称或App包名搜索"
          clearable
          @keyup.enter="handleSearch"
          style="width: 300px; margin-right: 10px"
        >
          <template #append>
            <el-button :icon="Search" @click="handleSearch" />
          </template>
        </el-input>
        <el-select v-model="statusFilter" placeholder="按状态筛选" clearable @change="handleSearch" style="width: 150px">
          <el-option label="排队中" value="queued" />
          <el-option label="待处理" value="pending" />
          <el-option label="运行中" value="running" />
          <el-option label="已完成" value="completed" />
          <el-option label="失败" value="failed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <el-select
          v-model="deviceFilter"
          placeholder="按设备筛选"
          clearable
          @change="handleSearch"
          style="width: 200px"
          filterable
          v-loading="deviceStore.isLoading"
        >
          <el-option
            v-for="device in deviceStore.devices"
            :key="device.deviceId"
            :label="device.deviceName || device.deviceId"
            :value="device.deviceId"
          />
        </el-select>
      </div>

      <el-table
          :data="jobStore.jobs"
          v-loading="jobStore.isLoading"
          style="width: 100%"
          border
          stripe
          ref="jobTableRef"
          @selection-change="handleSelectionChange"
          @row-click="handleRowClick"
          @row-dblclick="handleRowDblClick"
          @row-contextmenu="handleRowContextMenu"
      >
        <el-table-column type="selection" width="40" />
        <el-table-column prop="jobId" label="Job ID" width="80" />
        <el-table-column prop="suiteName" label="测试套件" min-width="180" show-overflow-tooltip />
        <el-table-column label="目标App" min-width="220" show-overflow-tooltip>
          <template #default="scope">
            <span style="font-weight: bold; color: var(--el-text-color-primary)">{{ scope.row.targetAppName }}</span>
            <div style="font-size: 11px; color: var(--el-text-color-secondary)">{{ scope.row.targetAppPackageName }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="deviceName" label="目标设备" width="150" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="120" align="center">
          <template #default="scope">
            <el-tag :type="statusTagType(scope.row.status)">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="开始时间" prop="startedAt" width="160" sortable>
          <template #default="scope">{{ formatDate(scope.row.startedAt) }}</template>
        </el-table-column>
        <el-table-column label="耗时(秒)" width="120">
          <template #default="scope">{{ calculateDuration(scope.row.startedAt, scope.row.completedAt) }}</template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="jobStore.totalJobs > 0"
        class="pagination-container"
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="jobStore.totalJobs"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- 右键菜单 -->
    <div
        v-show="contextMenu.visible"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div class="menu-item" @click="handleViewSelected">
        <el-icon><View /></el-icon> 查看详情
      </div>
      <div class="menu-item" v-if="canCancelContextMenu" @click="handleCancelSelected">
        <el-icon><VideoPause /></el-icon> 停止任务
      </div>
      <div class="menu-item" v-if="canExportContextMenu" @click="handleExportSelected">
        <el-icon><Download /></el-icon> 导出报告
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item" :class="{ 'is-disabled': !canRunAgain }" @click="handleRunAgain">
        <el-icon><VideoPlay /></el-icon> 再次运行
      </div>
      <div class="menu-item" @click="handleAddToSchedule">
        <el-icon><AlarmClock /></el-icon> 添加到定时任务
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item danger" @click="handleDeleteSelected">
        <el-icon><Delete /></el-icon> 删除记录
      </div>
    </div>

    <!-- 再次运行对话框 (复用套件页逻辑) -->
    <el-dialog v-model="runDialog.visible" title="再次运行任务" width="500px">
      <el-form :model="runDialog.form" ref="runFormRef" :rules="runDialog.rules" label-width="100px">
        <el-form-item label="测试套件">
          <el-input :value="contextMenu.row?.suiteName" disabled />
        </el-form-item>
        <el-form-item label="目标应用" prop="targetAppPackageName">
          <el-select v-model="runDialog.form.targetAppPackageName" placeholder="选择应用" filterable style="width: 100%">
            <el-option
                v-for="app in masterAppStore.apps"
                :key="app.packageName"
                :label="`${app.appName} (${app.packageName})`"
                :value="app.packageName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目标设备" prop="deviceId">
          <el-select v-model="runDialog.form.deviceId" placeholder="选择设备" filterable style="width: 100%">
            <el-option
                v-for="device in onlineDevices"
                :key="device.deviceId"
                :label="`${device.deviceName || device.deviceId}`"
                :value="device.deviceId"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="runDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="confirmRunAgain" :loading="runDialog.isSubmitting">立即启动</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "JobsList",
});
import { ref, onMounted, watch, onUnmounted, reactive, computed, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useJobStore } from "@/stores/jobStore";
import { useDeviceStore } from "@/stores/deviceStore";
import { useMasterAppStore } from "@/stores/masterAppStore";
import { usePrefillStore } from "@/stores/prefillStore";
import { Search, View, Refresh, VideoPause, Download, Delete, VideoPlay, AlarmClock } from "@element-plus/icons-vue";
import { jobService } from "@/api/jobService";
import type { JobListPublic } from "@/types/api";
import { ElMessageBox, ElMessage, type ElTable, type FormInstance, type FormRules } from "element-plus";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const router = useRouter();
const jobStore = useJobStore();
const deviceStore = useDeviceStore();
const masterAppStore = useMasterAppStore();
const prefillStore = usePrefillStore();
const jobTableRef = ref<InstanceType<typeof ElTable>>();

const currentPage = ref(1);
const pageSize = ref(10);
const searchQuery = ref("");
const statusFilter = ref("");
const deviceFilter = ref("");
const selectedJobs = ref<JobListPublic[]>([]);

// 右键菜单状态
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  row: null as JobListPublic | null,
});

// 再次运行对话框状态
const runFormRef = ref<FormInstance>();
const runDialog = reactive({
  visible: false,
  isSubmitting: false,
  form: {
    targetAppPackageName: "",
    deviceId: "",
  },
  rules: {
    targetAppPackageName: [{ required: true, message: "请选择目标应用", trigger: "change" }],
    deviceId: [{ required: true, message: "请选择目标设备", trigger: "change" }],
  } as FormRules,
});

const onlineDevices = computed(() => deviceStore.devices.filter((d) => d.isConnectedWs));

const autoRefreshEnabled = ref(false);
const autoRefreshTimer = ref<number | null>(null);

const fetchData = (isAutoRefresh = false) => {
  // 在非自动刷新时，才显示加载状态，避免UI闪烁
  if (!isAutoRefresh) {
    jobStore.isLoading = true;
  }
  jobStore
    .fetchJobs({
      skip: (currentPage.value - 1) * pageSize.value,
      limit: pageSize.value,
      search: searchQuery.value || undefined,
      status: statusFilter.value || undefined,
      deviceId: deviceFilter.value || undefined,
    })
    .finally(() => {
      if (!isAutoRefresh) {
        jobStore.isLoading = false;
      }
    });
};

watch(autoRefreshEnabled, (isEnabled) => {
  if (isEnabled) {
    // 立即执行一次
    fetchData(true);
    // 设置定时器
    autoRefreshTimer.value = window.setInterval(() => {
      fetchData(true);
    }, 5000);
  } else {
    // 清除定时器
    if (autoRefreshTimer.value) {
      clearInterval(autoRefreshTimer.value);
      autoRefreshTimer.value = null;
    }
  }
});

onUnmounted(() => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value);
  }
  window.removeEventListener('scroll', closeContextMenu, true);
});

onMounted(() => {
  fetchData();
  deviceStore.fetchDevices({ limit: 1000 }); // 获取所有设备
});

const handleRefresh = () => {
  fetchData();
};

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

// --- 交互逻辑 ---
const handleSelectionChange = (selection: JobListPublic[]) => {
  selectedJobs.value = selection;
};

const handleRowClick = (row: JobListPublic) => {
  if (jobTableRef.value) {
    jobTableRef.value.toggleRowSelection(row, undefined);
  }
};

const handleRowDblClick = (row: JobListPublic) => {
  router.push({ name: "JobDetail", params: { jobId: row.jobId } });
};

const handleRowContextMenu = (row: JobListPublic, column: any, event: MouseEvent) => {
  event.preventDefault();
  if (jobTableRef.value) {
    const isSelected = selectedJobs.value.some(item => item.jobId === row.jobId);
    if (!isSelected) {
      jobTableRef.value.clearSelection();
      jobTableRef.value.toggleRowSelection(row, true);
    }
  }
  contextMenu.row = row;

  // --- 核心修复：防止菜单超出屏幕底部 ---
  const menuHeight = 240; // 预估菜单高度（包含边距和分割线）
  const menuWidth = 150;  // 预估菜单宽度
  
  // 处理 Y 轴（上下翻转）
  if (event.clientY + menuHeight > window.innerHeight) {
    contextMenu.y = event.clientY - menuHeight;
  } else {
    contextMenu.y = event.clientY;
  }

  // 处理 X 轴（左右翻转，防止右侧溢出）
  if (event.clientX + menuWidth > window.innerWidth) {
    contextMenu.x = event.clientX - menuWidth;
  } else {
    contextMenu.x = event.clientX;
  }
  contextMenu.visible = true;
};

const canRunAgain = computed(() => {
  return contextMenu.row && contextMenu.row.suiteId && contextMenu.row.suiteId > 0;
});

const closeContextMenu = () => {
  contextMenu.visible = false;
};

const handleViewSelected = () => {
  if (selectedJobs.value.length === 1) {
    router.push({ name: "JobDetail", params: { jobId: selectedJobs.value[0].jobId } });
  }
  closeContextMenu();
};

// --- 再次运行逻辑 ---
const handleRunAgain = () => {
  // 显式类型守卫，确保 contextMenu.row 不为 null
  if (!contextMenu.row || !canRunAgain.value) {
    ElMessage.warning("该任务没有关联的测试套件（可能是调试任务），无法再次运行。");
    return;
  }
  masterAppStore.fetchApps({ skip: 0, limit: 1000 });
  deviceStore.fetchDevices({ limit: 1000 });
  
  runDialog.form.targetAppPackageName = contextMenu.row.targetAppPackageName;
  runDialog.form.deviceId = contextMenu.row.deviceId || ""; // 需要后端在JobListPublic中补充deviceId字段
  runDialog.visible = true;
  closeContextMenu();
};

const confirmRunAgain = async () => {
  if (!runFormRef.value || !contextMenu.row) return;
  await runFormRef.value.validate(async (valid) => {
    if (valid) {
      runDialog.isSubmitting = true;
      try {
        const createdJob = await jobService.createJob({
          suiteId: contextMenu.row!.suiteId, // 需要后端在JobListPublic中补充suiteId字段
          targetAppPackageName: runDialog.form.targetAppPackageName,
          deviceId: runDialog.form.deviceId,
        });
        ElMessage.success(`任务 #${createdJob.jobId} 已重新启动`);
        runDialog.visible = false;
        router.push({ name: "JobDetail", params: { jobId: createdJob.jobId } });
      } finally {
        runDialog.isSubmitting = false;
      }
    }
  });
};

// --- 添加到定时任务逻辑 ---
const handleAddToSchedule = () => {
  // 显式类型守卫
  if (!contextMenu.row) return;

  // 1. 将数据存入内存 Store
  prefillStore.setScheduledTask({
    suiteId: contextMenu.row.suiteId,
    targetAppPackageName: contextMenu.row.targetAppPackageName,
    deviceId: contextMenu.row.deviceId,
    name: `定时-${contextMenu.row.suiteName}`
  });
  // 2. 执行不带参数的纯净跳转
  router.push({ name: "ScheduledTasks" });
  closeContextMenu();
};

// --- 批量操作逻辑 ---
const canCancelSelected = computed(() => 
  selectedJobs.value.length > 0 && selectedJobs.value.every(j => ['running', 'queued'].includes(j.status))
);

const canExportSelected = computed(() => 
  selectedJobs.value.length === 1 && ['completed', 'failed', 'cancelled'].includes(selectedJobs.value[0].status)
);

const canCancelContextMenu = computed(() => 
  contextMenu.row && ['running', 'queued'].includes(contextMenu.row.status)
);

const canExportContextMenu = computed(() => 
  contextMenu.row && ['completed', 'failed', 'cancelled'].includes(contextMenu.row.status)
);

const handleCancelSelected = async () => {
  const jobsToCancel = selectedJobs.value.filter(j => ['running', 'queued'].includes(j.status));
  if (jobsToCancel.length === 0) return;

  try {
    await ElMessageBox.confirm(`确定要停止选中的 ${jobsToCancel.length} 个任务吗？`, "确认停止", {
      type: "warning",
    });
    await Promise.all(jobsToCancel.map(j => jobStore.cancelJob(j.jobId)));
    ElMessage.success("停止指令已发送");
    closeContextMenu();
  } catch (error) {
    if (error !== "cancel") console.error(error);
  }
};

const handleExportSelected = async () => {
  if (selectedJobs.value.length === 1) {
    await jobStore.exportReport(selectedJobs.value[0].jobId);
  }
  closeContextMenu();
};

const handleDeleteSelected = async () => {
  if (selectedJobs.value.length === 0) return;

  try {
    await ElMessageBox.confirm(
      `确定要永久删除选中的 ${selectedJobs.value.length} 个任务吗？<br/><strong>此操作将同时删除所有关联的截图文件，且不可恢复。</strong>`,
      "危险操作确认",
      {
        type: "warning",
        dangerouslyUseHTMLString: true,
        confirmButtonText: "确认删除",
        cancelButtonText: "取消",
      }
    );
    await Promise.all(selectedJobs.value.map(j => jobStore.deleteJob(j.jobId)));
    fetchData();
    closeContextMenu();
  } catch (error) {
    if (error !== "cancel") {
      // API error handled by interceptor
    }
  }
};
const statusTagType = (status: string) => {
  switch (status) {
    case "completed":
      return "success";
    case "running":
      return "primary";
    case "failed":
      return "danger";
    case "debugging": // Using warning color for debugging status
      return "warning";
    case "pending":
    case "queued":
      return "warning";
    case "cancelled":
      return "info";
    default:
      return "info";
  }
};

const formatDate = (dateString?: string) => (dateString ? dayjs.utc(dateString).local().format("YYYY-MM-DD HH:mm:ss") : "N/A");

const calculateDuration = (start?: string, end?: string) => {
  if (!start) return "N/A";
  const endTime = end ? dayjs.utc(end) : dayjs.utc();
  const duration = endTime.diff(dayjs.utc(start), "second");
  return duration >= 0 ? duration : "N/A";
};
</script>

<style scoped>
.jobs-list-page {
  padding: 1px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 16px;
  font-weight: bold;
}

.header-actions {
  display: flex;
  align-items: center;
}

.filter-container {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 上下文菜单样式 */
.context-menu {
  position: fixed;
  background-color: #fff;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  padding: 5px 0;
  z-index: 2000;
  min-width: 120px;
}

.menu-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background-color: #ecf5ff;
  color: var(--el-color-primary);
}

.menu-divider {
  height: 1px;
  background-color: #ebeef5;
  margin: 5px 0;
}

.menu-item.danger {
  color: #f56c6c;
}

.menu-item.danger:hover {
  background-color: #fef0f0;
}
</style>
