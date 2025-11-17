<template>
  <div class="jobs-list-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>任务历史记录</span>
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

      <el-table :data="jobStore.jobs" v-loading="jobStore.isLoading" style="width: 100%" border stripe>
        <el-table-column prop="jobId" label="Job ID" width="80" />
        <el-table-column prop="suiteName" label="测试套件" min-width="180" show-overflow-tooltip />
        <el-table-column prop="targetAppPackageName" label="目标App" min-width="200" show-overflow-tooltip />
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

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" :icon="View" @click="handleViewDetails(scope.row.jobId)">查看详情</el-button>
            <el-button
              v-if="['running', 'queued'].includes(scope.row.status)"
              size="small"
              type="danger"
              :icon="VideoPause"
              @click="handleCancelJob(scope.row)"
              :loading="jobStore.isCancelling"
            >
              {{ scope.row.status === "running" ? "停止" : "取消" }}
            </el-button>
            <el-button
              v-else-if="['completed', 'failed', 'cancelled'].includes(scope.row.status)"
              size="small"
              type="success"
              :icon="Download"
              @click="handleExportReport(scope.row.jobId)"
              :loading="jobStore.isExporting"
              plain
            >
              报告
            </el-button>
          </template>
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
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "JobsList",
});
import { ref, onMounted, watch, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useJobStore } from "@/stores/jobStore";
import { useDeviceStore } from "@/stores/deviceStore";
import { Search, View, Refresh, VideoPause, Download } from "@element-plus/icons-vue";
import type { JobListPublic } from "@/types/api";
import { ElMessageBox } from "element-plus";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const router = useRouter();
const jobStore = useJobStore();
const deviceStore = useDeviceStore();

const currentPage = ref(1);
const pageSize = ref(10);
const searchQuery = ref("");
const statusFilter = ref("");
const deviceFilter = ref("");

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

const handleViewDetails = (jobId: number) => {
  router.push({ name: "JobDetail", params: { jobId } });
};

const handleCancelJob = async (job: JobListPublic) => {
  try {
    await ElMessageBox.confirm(`确定要停止正在运行的任务 #${job.jobId} 吗？`, "确认停止", {
      type: "warning",
    });
    await jobStore.cancelJob(job.jobId);
    // fetchData(); // Optimistic update in store, no need to refetch immediately
  } catch (error) {
    if (error !== "cancel") {
      // API error handled by interceptor
    }
  }
};

const handleExportReport = async (jobId: number) => {
  await jobStore.exportReport(jobId);
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
  padding: 20px;
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
.filter-container {
  margin-bottom: 20px;
}
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
