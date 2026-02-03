<!-- 文件路径: src/pages/scheduled-tasks/ScheduledTasksPage.vue (新文件) -->
<template>
  <div class="scheduled-tasks-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>定时任务管理</span>
          <el-button type="primary" :icon="Plus" @click="handleOpenDialog(null)"> 新建任务 </el-button>
        </div>
      </template>

      <div class="filter-container">
        <el-input v-model="searchQuery" placeholder="按任务名称搜索" clearable @keyup.enter="handleSearch" style="width: 300px; margin-right: 10px">
          <template #append>
            <el-button :icon="Search" @click="handleSearch" />
          </template>
        </el-input>
      </div>

      <el-table :data="taskStore.tasks" v-loading="taskStore.isLoading" style="width: 100%" border stripe>
        <el-table-column prop="name" label="任务名称" width="200" sortable show-overflow-tooltip />
        <el-table-column prop="suiteName" label="测试套件" min-width="200" show-overflow-tooltip />
        <el-table-column prop="deviceName" label="目标设备" min-width="180" show-overflow-tooltip />
        <el-table-column prop="cronExpression" label="CRON表达式" width="140" align="center" />
        <el-table-column prop="isEnabled" label="状态" width="100" align="center">
          <template #default="scope">
            <el-switch :model-value="scope.row.isEnabled" @change="handleToggleEnable(scope.row, $event as boolean)" />
          </template>
        </el-table-column>
        <el-table-column label="下次运行时间" prop="nextRunTime" width="180" sortable>
          <template #default="scope">{{ formatDateTime(scope.row.nextRunTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="scope">
            <el-button size="small" type="primary" :icon="Edit" @click="handleOpenDialog(scope.row)" />
            <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(scope.row)" />
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="taskStore.totalTasks > 0"
        class="pagination-container"
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="taskStore.totalTasks"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="600px" @close="resetForm">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="form.name" placeholder="例如: 每日核心功能回归" />
        </el-form-item>

        <el-form-item label="测试套件" prop="suiteId">
          <el-select
            v-model="form.suiteId"
            placeholder="选择一个测试套件"
            filterable
            style="width: 100%"
            v-loading="suiteStore.isLoading"
          >
            <el-option v-for="suite in availableSuites" :key="suite.suiteId" :label="suite.name" :value="suite.suiteId" />
          </el-select>
        </el-form-item>
        
        <!-- [新增] 用例切片选择器 -->
        <el-form-item label="执行切片" v-if="currentSuiteCases.length > 0">
          <el-select v-model="form.selectedCaseIds" multiple collapse-tags placeholder="留空则执行全部用例" style="width: 100%">
            <el-option v-for="c in currentSuiteCases" :key="c.caseId" :label="c.name" :value="c.caseId" />
          </el-select>
          <div style="font-size: 12px; color: #909399; line-height: 1.2; margin-top: 4px">
            仅对线性套件生效。若留空，则按默认顺序执行所有用例。
          </div>
        </el-form-item>

        <el-form-item label="目标应用" prop="targetAppPackageName">
          <el-select v-model="form.targetAppPackageName" placeholder="选择要测试的应用" filterable style="width: 100%" v-loading="appStore.isLoading">
            <el-option v-for="app in appStore.apps" :key="app.packageName" :label="`${app.appName} (${app.packageName})`" :value="app.packageName" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标设备" prop="deviceId">
          <el-select v-model="form.deviceId" placeholder="选择一个设备" filterable style="width: 100%" v-loading="deviceStore.isLoading">
            <el-option
              v-for="device in deviceStore.devices"
              :key="device.deviceId"
              :label="`${device.deviceName || device.deviceId}`"
              :value="device.deviceId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="CRON表达式" prop="cronExpression">
          <el-input v-model="form.cronExpression" placeholder="例如: 0 2 * * *" />
          <el-tooltip placement="top">
            <template #content>
              <div style="line-height: 1.5">
                格式: 分 时 日 月 周<br />
                - `* * * * *` : 每分钟<br />
                - `0 2 * * *` : 每天凌晨2点<br />
                - `0 9 * * 1` : 每周一上午9点
              </div>
            </template>
            <el-icon style="margin-left: 8px; color: #909399; cursor: help"><QuestionFilled /></el-icon>
          </el-tooltip>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" placeholder="可选, 描述任务用途" />
        </el-form-item>
        <el-form-item label="是否启用">
          <el-switch v-model="form.isEnabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="taskStore.isLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "ScheduledTasks",
});
import { ref, onMounted, reactive, onActivated, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useScheduledTaskStore } from "@/stores/scheduledTaskStore";
import { useSuiteStore } from "@/stores/suiteStore";
import { useDeviceStore } from "@/stores/deviceStore";
import { usePrefillStore } from "@/stores/prefillStore";
import { useMasterAppStore } from "@/stores/masterAppStore";
import type { ScheduledTaskPublic } from "@/types/api";
import { suiteService } from "@/api/suiteService"; // 引入 Service 获取详情
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { Plus, Edit, Delete, Search, QuestionFilled } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

// --- Store Instances ---
const taskStore = useScheduledTaskStore();
const suiteStore = useSuiteStore();
const deviceStore = useDeviceStore();
const appStore = useMasterAppStore();
const prefillStore = usePrefillStore();
const route = useRoute();
const router = useRouter();

// --- Component State ---
const currentPage = ref(1);
const pageSize = ref(10);
const searchQuery = ref("");
const formRef = ref<FormInstance>();

const dialog = reactive({
  visible: false,
  title: "新建定时任务",
});

const form = reactive({
  scheduleId: null as number | null,
  name: "",
  description: "",
  suiteId: null as number | null,
  suiteType: "linear" as "linear" | "flow", // Kept for radio button, but logic simplified
  targetAppPackageName: "",
  deviceId: "",
  cronExpression: "",
  isEnabled: true,
  selectedCaseIds: [] as number[], // [新增]
});

// --- 核心：处理来自其他页面的预填请求 ---
const checkPrefill = () => {
  // 从内存 Store 中消费数据
  const data = prefillStore.consumeScheduledTask();
  if (data) {
    handleOpenDialog(null); // 打开新增弹窗
    form.suiteId = data.suiteId;
    form.targetAppPackageName = data.targetAppPackageName;
    form.deviceId = data.deviceId;
    form.name = data.name;
  }
};

onMounted(() => {
  fetchData();
  suiteStore.fetchAllSuites();
  deviceStore.fetchDevices({ limit: 1000 });
  appStore.fetchApps({ skip: 0, limit: 1000 });
  checkPrefill();
});

onActivated(checkPrefill);

// 增加监听：处理标签页已打开时的再次跳转
watch(
  () => route.query,
  (newQuery) => {
    if (newQuery.prefillSuiteId) checkPrefill();
  }
);

const rules = reactive<FormRules>({
  name: [{ required: true, message: "请输入任务名称", trigger: "blur" }],
  suiteId: [{ required: true, message: "请选择测试套件", trigger: "change" }],
  targetAppPackageName: [{ required: true, message: "请选择目标应用", trigger: "change" }],
  deviceId: [{ required: true, message: "请选择目标设备", trigger: "change" }],
  cronExpression: [
    { required: true, message: "请输入CRON表达式", trigger: "blur" },
    {
      validator: (rule, value, callback) => {
        // Basic check for 5 parts
        if (value && value.split(" ").length === 5) {
          callback();
        } else {
          callback(new Error("CRON表达式必须包含5个部分 (分 时 日 月 周)"));
        }
      },
      trigger: "blur",
    },
  ],
});

// --- DYNAMIC SUITE LIST ---
const availableSuites = computed(() => {
  return suiteStore.allSuites;
});

// [新增] 当前选中套件的用例列表
const currentSuiteCases = ref<any[]>([]);

// [新增] 监听套件ID变化，加载用例列表
watch(() => form.suiteId, async (newId) => {
  if (!newId) {
    currentSuiteCases.value = [];
    return;
  }
  const suite = await suiteService.getSuiteById(newId);
  currentSuiteCases.value = suite.cases || [];
});

onMounted(() => {
  fetchData();
  // Pre-load data for dialog dropdowns from BOTH stores
  suiteStore.fetchAllSuites();
  deviceStore.fetchDevices({ limit: 1000 });
  appStore.fetchApps({ skip: 0, limit: 1000 });
});

// --- Event Handlers ---
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

const handleToggleEnable = async (task: ScheduledTaskPublic, isEnabled: boolean) => {
  try {
    await taskStore.updateTask(task.scheduleId, { isEnabled });
    ElMessage.success(`任务 "${task.name}" 已${isEnabled ? "启用" : "禁用"}`);
    // No need to refetch, store updates optimistically
  } catch (error) {
    // Revert UI on failure
    const taskInStore = taskStore.tasks.find((t) => t.scheduleId === task.scheduleId);
    if (taskInStore) taskInStore.isEnabled = !isEnabled;
    ElMessage.error("状态更新失败");
  }
};

const resetForm = () => {
  form.scheduleId = null;
  form.name = "";
  form.description = "";
  form.suiteId = null;
  form.suiteType = "linear";
  form.targetAppPackageName = "";
  form.deviceId = "";
  form.cronExpression = "";
  form.isEnabled = true;
  form.selectedCaseIds = []; // Reset
  formRef.value?.clearValidate();
};

const handleOpenDialog = (task: ScheduledTaskPublic | null) => {
  resetForm();
  if (task) {
    dialog.title = "编辑定时任务";
    Object.assign(form, {
      scheduleId: task.scheduleId,
      name: task.name,
      description: task.description || "",
      suiteId: task.suiteId,
      suiteType: "linear", // Always linear now
      targetAppPackageName: task.targetAppPackageName,
      deviceId: task.deviceId,
      cronExpression: task.cronExpression,
      isEnabled: task.isEnabled,
      selectedCaseIds: task.selectedCaseIds || [], // Fill
    });
  } else {
    dialog.title = "新建定时任务";
  }
  dialog.visible = true;
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      const isEdit = !!form.scheduleId;
      // Exclude suiteType from the payload
      // [修正] selectedCaseIds 如果为空数组，转为 null 发送，保持逻辑一致性
      const { scheduleId, suiteType, selectedCaseIds, ...rest } = form;
      const payload = { 
        ...rest, 
        selectedCaseIds: selectedCaseIds.length > 0 ? selectedCaseIds : null 
      };

      try {
        if (isEdit) {
          await taskStore.updateTask(scheduleId!, payload as any);
        } else {
          await taskStore.addTask(payload as any);
        }
        ElMessage.success(`任务 ${isEdit ? "更新" : "创建"}成功！`);
        dialog.visible = false;
        fetchData();
      } catch (error) {
        // API client interceptor will handle message
      }
    }
  });
};

const handleDelete = async (task: ScheduledTaskPublic) => {
  try {
    await ElMessageBox.confirm(`确定要删除定时任务 "${task.name}" 吗？`, "确认删除", {
      type: "warning",
    });
    await taskStore.deleteTask(task.scheduleId);
    ElMessage.success("删除成功！");
    if (taskStore.tasks.length === 1 && currentPage.value > 1) {
      currentPage.value--;
    }
    fetchData();
  } catch (error) {
    if (error !== "cancel") ElMessage.info("已取消删除");
  }
};

// --- Data Fetching ---
const fetchData = () => {
  taskStore.fetchTasks({
    skip: (currentPage.value - 1) * pageSize.value,
    limit: pageSize.value,
    search: searchQuery.value || undefined,
  });
};
// --- Formatters ---
const formatDateTime = (dateString?: string) => (dateString ? dayjs.utc(dateString).local().format("YYYY-MM-DD HH:mm:ss") : "N/A");
</script>

<style scoped>
.scheduled-tasks-page {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
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
