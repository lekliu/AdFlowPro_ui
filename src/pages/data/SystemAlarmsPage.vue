<template>
  <div class="alarms-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="header-title">🚨 系统故障与主动告警监控</span>
          <div class="header-actions">
            <el-button type="danger" :disabled="!selectedIds.length" @click="handleBatchDelete" plain>批量删除</el-button>
            <el-button @click="fetchAlarms" :icon="Refresh">刷新</el-button>
          </div>
        </div>
      </template>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-input v-model="filters.deviceId" placeholder="按设备 ID 过滤" clearable style="width: 200px" @change="handleFilter" />
        <el-select v-model="filters.alarmType" placeholder="告警类型" clearable @change="handleFilter" style="width: 180px">
          <el-option label="算术错误" value="MATH_ERROR" />
          <el-option label="比对错误" value="COMPARE_ERROR" />
          <el-option label="主动告警" value="USER_DEFINED_ALARM" />
        </el-select>
      </div>

      <el-table :data="alarms" v-loading="loading" border stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="50" />
        <el-table-column label="上报时间" width="180">
          <template #default="{row}">{{ formatDateTime(row.createdAt || row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="来源设备" width="200">
          <template #default="{row}"><code>{{ row.deviceId || row.device_id }}</code></template>
        </el-table-column>
        <el-table-column label="类型" width="160">
          <template #default="{row}">
            <el-tag :type="getTagType(row.alarmType || row.alarm_type)" effect="dark">
              {{ row.alarmType || row.alarm_type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="详细描述" min-width="300" show-overflow-tooltip />
        <el-table-column label="操作" width="100" align="center">
          <template #default="{row}">
            <el-popover placement="left" :width="450" trigger="click">
              <template #reference><el-button link type="primary">查看详情</el-button></template>
              <div class="json-container">
                <div class="json-header">故障发生时的上下文数据</div>
                <pre class="debug-json">{{ JSON.stringify(row.details || {}, null, 2) }}</pre>
              </div>
            </el-popover>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
            v-model:current-page="pagination.page"
            :page-size="pagination.pageSize"
            :total="pagination.total"
            layout="total, prev, pager, next"
            @current-change="fetchAlarms"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { Refresh } from '@element-plus/icons-vue';
import { dataReportService } from '@/api/dataReportService';
import { ElMessage, ElMessageBox } from 'element-plus';
import apiClient from "@/api/apiClient";
import { formatDateTime } from "@/utils/formatter";

// --- 1. 定义接口 (解决 TS7006 的关键) ---
interface SystemAlarm {
  id: number;          // 修正：从 alarmId 改为 id
  deviceId: string;
  deviceName?: string;
  alarmType: string;   // 修正：后端返回的是 alarmType
  message: string;
  details: any;        // 修正：后端字段名是 details
  createdAt: string;
}

const alarms = ref([]);
const loading = ref(false);
const selectedIds = ref<number[]>([]);
const filters = reactive({ deviceId: '', alarmType: '' });
const pagination = reactive({ page: 1, pageSize: 15, total: 0 });

// 3. 编写处理函数，显式声明参数类型以通过 TS 检查
const handleSelectionChange = (val: SystemAlarm[]) => {
  // 这里的 i 会被自动推断为 SystemAlarm 类型
  selectedIds.value = val.map((i) => i.id);
};

const fetchAlarms = async () => {
  loading.value = true;
  try {
    const params = {
      skip: (pagination.page - 1) * pagination.pageSize,
      limit: pagination.pageSize,
      ...filters
    };
    const res: any = await dataReportService.getSystemAlarms(params);
    alarms.value = res.items;
    pagination.total = res.total;
  } finally { loading.value = false; }
};

const handleFilter = () => { pagination.page = 1; fetchAlarms(); };

const handleBatchDelete = () => {
  ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 条记录吗？`).then(async () => {
    await apiClient.post('/data-reports/alarms/batch-delete', { ids: selectedIds.value });
    ElMessage.success('已删除');
    await fetchAlarms();
  });
};

const getTagType = (t?: string) => {
  const type = (t || '').toUpperCase();
  if (type.includes('ERROR') || type.includes('ALARM')) return 'danger';
  if (type.includes('WARN')) return 'warning';
  return 'info';
};

onMounted(fetchAlarms);

// --- 新增刷新逻辑 ---
onActivated(() => {
  fetchAlarms();
});

</script>

<style scoped>
.filter-bar { margin-bottom: 15px; display: flex; gap: 10px; }
.header-title { color: #f56c6c; font-weight: bold; font-size: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.json-container { padding: 10px; }
.json-header { font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
.debug-json { background: #1e1e1e; color: #9cdcfe; padding: 15px; border-radius: 6px; overflow: auto; max-height: 500px; font-size: 12px; line-height: 1.5; }
.pagination { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>