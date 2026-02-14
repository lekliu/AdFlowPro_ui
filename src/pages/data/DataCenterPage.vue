<template>
  <div class="data-center-page">
    <el-card class="filter-card" body-style="padding: 10px 20px;">
      <el-form :inline="true" :model="filters" class="compact-form">
        <el-form-item label="指标">
          <el-select v-model="filters.label" @change="handleFilterChange" style="width: 140px">
            <el-option v-for="l in labels" :key="l" :label="l" :value="l" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备">
          <el-select 
            v-model="filters.deviceId" 
            placeholder="全部" 
            clearable 
            filterable
            style="width: 120px" 
            @change="handleFilterChange"
          >
            <el-option v-for="d in sortedDevices" :key="d.deviceId" :label="d.deviceName || d.deviceId" :value="d.deviceId" />
          </el-select>
        </el-form-item>
        <el-form-item label="应用">
          <el-select 
            v-model="filters.packageName" 
            placeholder="全部" 
            clearable 
            filterable
            style="width: 120px" 
            @change="handleFilterChange"
          >
            <el-option v-for="a in sortedApps" :key="a.packageName" :label="a.appName" :value="a.packageName" />
          </el-select>
        </el-form-item>
        <el-form-item label="范围">
          <el-date-picker
            v-model="filters.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            size="small"
            style="width: 330px"
            @change="handleFilterChange"
          />
        </el-form-item>
        <el-form-item label="周期">
          <el-radio-group v-model="filters.interval" @change="fetchStats" size="small">
            <el-radio-button value="hour">小时</el-radio-button>
            <el-radio-button value="day">天</el-radio-button>
            <el-radio-button value="week">周</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Refresh" @click="() => fetchData(true)" size="small">刷新</el-button>
        </el-form-item>
        <el-form-item>
          <div class="total-badge">
            <span class="total-label">筛选合计：{{ formatNumber(grandTotal/100) }}</span>
          </div>
        </el-form-item>

      </el-form>

    </el-card>

    <!-- 统计图表区 -->
    <el-card class="chart-card" body-style="padding: 15px;">
      <el-row :gutter="20">
        <!-- 左侧：趋势分析 -->
        <el-col :span="18">
          <div ref="chartRef" style="width: 100%; height: 400px"></div>
        </el-col>
        <!-- 右侧：Top 10 应用 -->
        <el-col :span="6" class="rank-col">
          <div class="rank-header">
            <div class="rank-title">应用贡献度 (Top 10)</div>
          </div>
          <div ref="rankChartRef" style="width: 100%; height: 360px"></div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 原始记录表格 -->
    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>记录明细</span>
          <el-button type="danger" plain :disabled="!selectedIds.length" @click="handleBatchDelete">批量删除</el-button>
        </div>
      </template>
      <el-table
          :data="reports"
          @selection-change="handleSelectionChange"
          border
          stripe
      >
        <el-table-column type="selection" width="55" />
        <el-table-column label="上报时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="来源应用" min-width="180">
          <template #default="{ row }">
            <div style="font-weight: bold">{{ row.appName }}</div>
            <div style="font-size: 11px; color: #909399">{{ row.appPackage }}</div>
          </template>
        </el-table-column>
        <el-table-column label="来源设备" width="160">
          <template #default="{ row }">
            <span>{{ row.deviceName }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="label" label="指标(Label)" width="120" />
        <el-table-column label="数值" width="120">
          <template #default="{ row }">
            <el-tag effect="dark">{{ row.value }}</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <!-- 新增：分页控件 -->
      <div style="margin-top: 15px; display: flex; justify-content: flex-end">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @current-change="() => fetchData(false)"
          @size-change="() => fetchData(true)"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { dataReportService } from '@/api/dataReportService';
import { useDeviceStore } from '@/stores/deviceStore';
import { useMasterAppStore } from '@/stores/masterAppStore';
import { Refresh } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { ElMessage, ElMessageBox } from 'element-plus';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

const deviceStore = useDeviceStore();
const appStore = useMasterAppStore();

// 【新增】应用列表按名称中文排序
const sortedApps = computed(() => {
  return [...appStore.apps].sort((a, b) => a.appName.localeCompare(b.appName, 'zh-CN'));
});

// 【新增】设备列表按名称排序
const sortedDevices = computed(() => {
  return [...deviceStore.devices].sort((a, b) => (a.deviceName || a.deviceId).localeCompare(b.deviceName || b.deviceId, 'zh-CN'));
});

// 1. 定义数据接口（对应后端返回的新结构）
interface ReportItem {
  dataId: number;
  createdAt: string;
  deviceId: string;
  deviceName: string;
  label: string;
  value: string;
  appPackage: string;
  appName: string;
}

// 核心修改后的逻辑（带时区转换）：
const formatDate = (val: string | null) => {
  if (!val) return '--';
  return dayjs.utc(val).local().format('MM-DD HH:mm:ss');
};

const labels = ref<string[]>([]);
const reports = ref<ReportItem[]>([]);
const selectedIds = ref<number[]>([]);
const chartRef = ref();
let myChart: any = null;

// 3. 编写处理函数，显式定义参数类型
const handleSelectionChange = (val: ReportItem[]) => {
  selectedIds.value = val.map((item) => item.dataId);
};

// 新增：分页状态
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
});

// 初始化：默认范围为最近一个月
const defaultEnd = dayjs();
const defaultStart = dayjs().subtract(1, 'month');

const filters = reactive({
  label: '',
  deviceId: '',
  packageName: '',
  interval: 'day',
  dateRange: [defaultStart.toDate(), defaultEnd.toDate()] as [Date, Date]
});

const fetchData = async (isRefresh: boolean = false) => {
  if (isRefresh === true) pagination.page = 1;

  const params: any = {
    label: filters.label || undefined,
    deviceId: filters.deviceId || undefined,
    packageName: filters.packageName || undefined,
    skip: (pagination.page - 1) * pagination.pageSize,
    limit: pagination.pageSize
  };

  console.log(">>> [LOG 1 - UI Request Params]:", JSON.stringify(params));

  if (filters.dateRange && filters.dateRange.length === 2) {
    params.start = filters.dateRange[0].toISOString();
    params.end = filters.dateRange[1].toISOString();
  }

  const res = await dataReportService.getReports(params);
  reports.value = res.items;
  pagination.total = res.total;
  fetchStats();
};

const rankChartRef = ref();
let rankChart: any = null;
const grandTotal = ref(0);

const fetchStats = async () => {
  if (!filters.label) return;

  const params: any = {
    label: filters.label,
    interval: filters.interval,
    deviceId: filters.deviceId || undefined,
    packageName: filters.packageName || undefined
  };

  if (filters.dateRange && filters.dateRange.length === 2) {
    params.start = filters.dateRange[0].toISOString();
    params.end = filters.dateRange[1].toISOString();
  }

  // 并发请求趋势数据和排名数据
  const [trendData, topAppData] = await Promise.all([
    dataReportService.getStats(params),
    dataReportService.getTopApps(params) // 注意：TopApps 接口不传 packageName，因为我们要看全局排名
  ]);

  // 核心逻辑：从趋势数据中计算精确的总合计
  grandTotal.value = trendData.reduce((acc, curr) => acc + (curr.sum_value || 0), 0);

  updateChart(trendData);
  updateRankChart(topAppData);
};

const formatNumber = (val: number) => {
  return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const updateChart = (data: any[]) => {
  if (!myChart) myChart = echarts.init(chartRef.value);

  // 核心修改：在渲染 X 轴之前，将每个时间桶字符串转换成本地时间
  const xAxisData = data.map(d => {
    // 1. 后端返回的是类似 "2026-02-12 05:00" 的 UTC 字符串
    // 2. 使用 dayjs.utc(d.time_bucket) 解析它
    // 3. 使用 .local() 转换为本地时区
    // 4. 使用 .format() 重新格式化为显示字符串
    return dayjs.utc(d.time_bucket).local().format('YYYY-MM-DD HH:mm');
  });

  const option = {
    title: { text: `${filters.label} 趋势分析` },
    tooltip: {
      trigger: 'axis',
      // 提示框内部也会随之自动变为本地时间
    },
    xAxis: {
      type: 'category',
      data: xAxisData // 使用转换后的本地时间数组
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '合计值',
        type: 'line',
        data: data.map(d => d.sum_value),
        smooth: true
      },
      {
        name: '平均值',
        type: 'bar',
        data: data.map(d => d.avg_value)
      }
    ]
  };
  myChart.setOption(option);
};

const updateRankChart = (data: any[]) => {
  if (!rankChart) rankChart = echarts.init(rankChartRef.value);

  // 数据反转，让最大的在最上面
  const sortedData = [...data].reverse();

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '10%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', splitLine: { show: false }, axisLabel: { show: false } },
    yAxis: {
      type: 'category',
      data: sortedData.map(d => d.app_name),
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [
      {
        name: '累计值',
        type: 'bar',
        data: sortedData.map(d => d.total_value),
        label: { show: true, position: 'right' },
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#83bff6' },
            { offset: 1, color: '#188df0' }
          ])
        },
        barWidth: '60%'
      }
    ]
  };
  rankChart.setOption(option);
};

const handleSizeChange = (val: number) => {
  pagination.pageSize = val;
  fetchData(true);
};

const handleFilterChange = () => {
  fetchData(true);
};

const handleBatchDelete = () => {
  ElMessageBox.confirm('确定删除选中的记录吗？').then(async () => {
    await dataReportService.batchDelete(selectedIds.value);
    ElMessage.success('删除成功');
    fetchData();
  });
};

onMounted(async () => {
  deviceStore.fetchDevices({ limit: 1000 });
  appStore.fetchApps({ skip: 0, limit: 1000 });
  labels.value = await dataReportService.getLabels();
  if (labels.value.length > 0) {
    filters.label = labels.value[0];
    fetchData();
  }
});

onMounted(() => {
  window.addEventListener('resize', () => myChart?.resize());
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', () => myChart?.resize());
});

</script>

<style scoped>
.filter-card { margin-bottom: 12px; }
.chart-card { margin-bottom: 12px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }

/* 紧凑表单样式 */
.compact-form :deep(.el-form-item) {
  margin-right: 12px; /* 缩小项间距 */
  margin-bottom: 0;    /* 强制一行，去除底边距 */
}
.compact-form :deep(.el-form-item__label) {
  padding-right: 8px;
  font-weight: bold;
}

/* 统一调整卡片阴影，使其看起来更轻量 */
.el-card {
  box-shadow: 0 1px 4px rgba(0,21,41,.08) !important;
}

.rank-col { border-left: 1px solid #f0f0f0; }
.rank-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
  padding: 0 10px;
}
.rank-title { font-size: 13px; font-weight: bold; color: #909399; margin-top: 5px; }
.total-badge {
  background: #f0f7ff;
  border: 1px solid #d1e9ff;
  border-radius: 4px;
  padding: 4px 10px;
  text-align: right;
}
.total-label { display: block; font-size: 13px; color: #409eff; text-transform: uppercase; margin-bottom: 2px; }
.total-value { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 800; color: #1890ff; }

</style>
