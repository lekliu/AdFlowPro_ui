<template>
  <div class="af-page-container" ref="pageContainerRef">
    <el-card class="table-card" shadow="never">
      <!-- 顶部操作栏 -->
      <template #header>
        <div class="af-list-header">
          <div class="left">
            <el-button type="primary" :icon="Plus" @click="handleOpenDialog(null)">新建定时任务</el-button>

            <el-button-group class="ml-4">
              <el-button :icon="Edit" @click="handleEditSelected" :disabled="selectedItems.length !== 1">编辑</el-button>
              <el-button :icon="Delete" type="danger" plain @click="handleBatchDelete" :disabled="selectedItems.length === 0">删除</el-button>
            </el-button-group>
          </div>

          <div class="right">
            <el-input
                v-model="searchQuery"
                placeholder="按任务名称搜索..."
                clearable
                @keyup.enter="handleSearch"
                style="width: 280px"
            >
              <template #append>
                <el-button :icon="Search" @click="handleSearch" />
              </template>
            </el-input>
          </div>
        </div>
      </template>

      <!-- 数据表格 -->
      <el-table
          :data="taskStore.tasks"
          v-loading="taskStore.isLoading"
          style="width: 100%"
          border
          stripe
          class="custom-table"
          ref="tableRef"
          @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="45" align="center" />

        <!-- 任务基本信息 -->
        <el-table-column prop="name" label="任务名称" min-width="200" sortable>
          <template #default="{row}">
            <div class="task-info-cell">
              <div class="main-name">{{ row.name }}</div>
              <div class="sub-info" v-if="showSuiteInfo">
                <el-icon><Calendar /></el-icon> {{ row.suiteName }}
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 目标设备 -->
        <el-table-column prop="deviceName" label="目标设备" min-width="150" v-if="showDeviceInfo">
          <template #default="{row}">
            <div class="device-cell">
              <el-icon><Cpu /></el-icon>
              <span>{{ row.deviceName }}</span>
            </div>
          </template>
        </el-table-column>

        <!-- CRON 表达式：代码风格 -->
        <el-table-column prop="cronExpression" label="CRON" width="130" align="center">
          <template #default="{row}">
            <code class="cron-text">{{ row.cronExpression }}</code>
          </template>
        </el-table-column>

        <!-- 状态开关 -->
        <el-table-column prop="isEnabled" label="状态" width="100" align="center">
          <template #default="{row}">
            <el-switch
                :model-value="row.isEnabled"
                @change="handleToggleEnable(row, $event as boolean)"
                style="--el-switch-on-color: var(--el-color-success)"
            />
          </template>
        </el-table-column>

        <!-- 最后运行/下次运行：核心 Gmail 悬浮效果列 -->
        <el-table-column
            label="下次运行时间"
            prop="nextRunTime"
            width="200"
            sortable
            align="right"
            header-align="left"
        >
          <template #default="scope">
            <div class="action-swap-container">
              <span class="time-text-display">{{ formatDateTime(scope.row.nextRunTime) }}</span>

              <div class="row-floating-actions">
                <div class="action-mask-gradient"></div>
                <div class="action-buttons-inner">
                  <el-tooltip content="立即编辑" placement="top" :show-after="500">
                    <el-button :icon="Edit" circle class="btn-action btn-edit" @click.stop="handleOpenDialog(scope.row)" />
                  </el-tooltip>
                  <el-tooltip content="删除任务" placement="top" :show-after="500">
                    <el-button :icon="Delete" circle class="btn-action btn-delete" @click.stop="handleDelete(scope.row)" />
                  </el-tooltip>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="af-pagination-wrap">
        <el-pagination
            v-if="taskStore.totalTasks > 0"
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="taskStore.totalTasks"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 任务编辑对话框 -->
    <el-dialog
        v-model="dialog.visible"
        :title="dialog.title"
        width="640px"
        class="af-dialog"
        @close="resetForm"
        destroy-on-close
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" label-position="top">
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="任务名称" prop="name">
              <el-input v-model="form.name" placeholder="输入任务名称，如：每日核心功能回归" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="测试套件" prop="suiteId">
              <el-select v-model="form.suiteId" placeholder="请选择测试套件" filterable class="w-full">
                <el-option v-for="s in availableSuites" :key="s.suiteId" :label="s.name" :value="s.suiteId" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="执行切片 (可选)">
              <el-select
                  v-model="form.selectedCaseIds"
                  multiple
                  collapse-tags
                  placeholder="留空则执行全部"
                  class="w-full"
                  :disabled="!currentSuiteCases.length"
              >
                <el-option v-for="c in currentSuiteCases" :key="c.caseId" :label="c.name" :value="c.caseId" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="目标应用" prop="targetAppPackageName">
              <el-select v-model="form.targetAppPackageName" placeholder="运行哪个 App?" filterable class="w-full">
                <el-option v-for="app in appStore.apps" :key="app.packageName" :label="app.appName" :value="app.packageName" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="目标设备" prop="deviceId">
              <el-select v-model="form.deviceId" placeholder="在哪个设备运行?" filterable class="w-full">
                <el-option v-for="d in deviceStore.devices" :key="d.deviceId" :label="d.deviceName || d.deviceId" :value="d.deviceId" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item prop="cronExpression">
              <template #label>
                <div class="flex items-center">
                  <span>CRON 表达式</span>
                  <el-tooltip placement="top">
                    <template #content>
                      格式: 分 时 日 月 周<br />
                      - `0 2 * * *` : 每天凌晨2点<br />
                      - `0 9 * * 1` : 每周一上午9点
                    </template>
                    <el-icon class="ml-1 cursor-help"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
              </template>
              <el-input v-model="form.cronExpression" placeholder="例如: 0 2 * * *" />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="描述 (可选)">
              <el-input v-model="form.description" type="textarea" :rows="2" placeholder="备注任务的特殊用途..." />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <div class="dialog-switch-row">
              <span class="label">立即启用该任务</span>
              <el-switch v-model="form.isEnabled" />
            </div>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取 消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="taskStore.isLoading">确 定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/* === 基础配置与导入 === */
defineOptions({ name: "ScheduledTasks" });

import { ref, onMounted, reactive, onActivated, watch, computed, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { useScheduledTaskStore } from "@/stores/scheduledTaskStore";
import { useSuiteStore } from "@/stores/suiteStore";
import { useDeviceStore } from "@/stores/deviceStore";
import { usePrefillStore } from "@/stores/prefillStore";
import { useMasterAppStore } from "@/stores/masterAppStore";
import { suiteService } from "@/api/suiteService";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { Plus, Edit, Delete, Search, QuestionFilled, Calendar, Cpu } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTablePagination } from "@/composables/useTableManager";

dayjs.extend(utc);

// --- Store 实例 ---
const taskStore = useScheduledTaskStore();
const suiteStore = useSuiteStore();
const deviceStore = useDeviceStore();
const appStore = useMasterAppStore();
const prefillStore = usePrefillStore();
const route = useRoute();

// --- 状态管理 (使用你熟悉的模式) ---
const { currentPage, pageSize, searchQuery, resetPagination } = useTablePagination(10);
const selectedItems = ref<any[]>([]);
const tableRef = ref();

const dialog = reactive({
  visible: false,
  title: "新建定时任务",
});

const formRef = ref<FormInstance>();
const form = reactive({
  scheduleId: null as number | null,
  name: "",
  description: "",
  suiteId: null as number | null,
  targetAppPackageName: "",
  deviceId: "",
  cronExpression: "",
  isEnabled: true,
  selectedCaseIds: [] as number[],
});

// --- 响应式布局列控制 ---
const pageContainerRef = ref<HTMLElement | null>(null);
const showDeviceInfo = ref(true);
const showSuiteInfo = ref(true);
let resizeObserver: ResizeObserver | null = null;

// --- 核心业务逻辑：套件与用例联动 ---
const currentSuiteCases = ref<any[]>([]);
const availableSuites = computed(() => suiteStore.allSuites);

watch(() => form.suiteId, async (newId) => {
  if (!newId) {
    currentSuiteCases.value = [];
    return;
  }
  try {
    const suite = await suiteService.getSuiteById(newId);
    currentSuiteCases.value = suite.cases || [];
  } catch (e) {
    currentSuiteCases.value = [];
  }
});

// --- 数据获取 ---
const fetchData = () => {
  taskStore.fetchTasks({
    skip: (currentPage.value - 1) * pageSize.value,
    limit: pageSize.value,
    search: searchQuery.value || undefined,
  });
};

// --- 生命周期与预填逻辑 ---
const checkPrefill = () => {
  const data = prefillStore.consumeScheduledTask();
  if (data) {
    handleOpenDialog(null);
    Object.assign(form, {
      suiteId: data.suiteId,
      targetAppPackageName: data.targetAppPackageName,
      deviceId: data.deviceId,
      name: data.name
    });
  }
};

onMounted(() => {
  fetchData();
  suiteStore.fetchAllSuites();
  deviceStore.fetchDevices({ limit: 1000 });
  appStore.fetchApps({ skip: 0, limit: 1000 });
  checkPrefill();

  if (pageContainerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        showDeviceInfo.value = w > 1000;
        showSuiteInfo.value = w > 800;
      }
    });
    resizeObserver.observe(pageContainerRef.value);
  }
});

onUnmounted(() => resizeObserver?.disconnect());
onActivated(checkPrefill);
watch(() => route.query, () => checkPrefill());

// --- 事件处理 ---
const handleSelectionChange = (val: any[]) => { selectedItems.value = val; };
const handleSearch = () => { resetPagination(); fetchData(); };
const handleSizeChange = (val: number) => { pageSize.value = val; fetchData(); };
const handleCurrentChange = (val: number) => { currentPage.value = val; fetchData(); };

const handleToggleEnable = async (task: any, isEnabled: boolean) => {
  try {
    await taskStore.updateTask(task.scheduleId, { isEnabled });
    ElMessage.success(`任务 "${task.name}" 已${isEnabled ? "启用" : "禁用"}`);
  } catch (error) {
    fetchData(); // 失败则回滚 UI
  }
};

const handleEditSelected = () => {
  if (selectedItems.value.length === 1) handleOpenDialog(selectedItems.value[0]);
};

const handleBatchDelete = async () => {
  const names = selectedItems.value.map(i => i.name);
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${names.length} 个任务吗？`, "批量删除", { type: 'warning' });
    await Promise.all(selectedItems.value.map(i => taskStore.deleteTask(i.scheduleId)));
    ElMessage.success("批量删除成功");
    fetchData();
  } catch (e) {}
};

const handleOpenDialog = (task: any | null) => {
  resetForm();
  if (task) {
    dialog.title = "编辑定时任务";
    Object.assign(form, {
      scheduleId: task.scheduleId,
      name: task.name,
      description: task.description || "",
      suiteId: task.suiteId,
      targetAppPackageName: task.targetAppPackageName,
      deviceId: task.deviceId,
      cronExpression: task.cronExpression,
      isEnabled: task.isEnabled,
      selectedCaseIds: task.selectedCaseIds || [],
    });
  } else {
    dialog.title = "新建定时任务";
  }
  dialog.visible = true;
};

const resetForm = () => {
  form.scheduleId = null;
  form.name = "";
  form.description = "";
  form.suiteId = null;
  form.targetAppPackageName = "";
  form.deviceId = "";
  form.cronExpression = "";
  form.isEnabled = true;
  form.selectedCaseIds = [];
  formRef.value?.resetFields();
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    const isEdit = !!form.scheduleId;
    const { scheduleId, selectedCaseIds, ...rest } = form;
    const payload = {
      ...rest,
      selectedCaseIds: selectedCaseIds.length > 0 ? selectedCaseIds : null
    };

    try {
      if (isEdit) await taskStore.updateTask(scheduleId!, payload as any);
      else await taskStore.addTask(payload as any);

      ElMessage.success(`任务${isEdit ? "更新" : "创建"}成功`);
      dialog.visible = false;
      fetchData();
    } catch (e) {}
  });
};

const handleDelete = async (task: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除任务 "${task.name}" 吗？`, "确认删除", { type: "warning" });
    await taskStore.deleteTask(task.scheduleId);
    ElMessage.success("删除成功");

    // 补齐：删除最后一条自动回退页码
    if (taskStore.tasks.length === 1 && currentPage.value > 1) {
      currentPage.value--;
    }
    fetchData();
  } catch (e) {
    if (e !== 'cancel') console.error(e);
    else ElMessage.info("已取消删除"); // 补齐：取消反馈
  }
};

const formatDateTime = (dateString?: string) =>
    dateString ? dayjs.utc(dateString).local().format("YYYY-MM-DD HH:mm:ss") : "未运行/手动";

const rules = reactive<FormRules>({
  name: [{ required: true, message: "请输入任务名称", trigger: "blur" }],
  suiteId: [{ required: true, message: "请选择测试套件", trigger: "change" }],
  targetAppPackageName: [{ required: true, message: "请选择目标应用", trigger: "change" }],
  deviceId: [{ required: true, message: "请选择目标设备", trigger: "change" }],
  cronExpression: [
    { required: true, message: "请输入 CRON 表达式", trigger: "blur" },
    { validator: (_, v, cb) => (v && v.split(" ").length === 5 ? cb() : cb("需要 5 位 CRON 格式")), trigger: "blur" }
  ],
});
</script>

<style scoped>
/* ==================== 基础布局 ==================== */
.af-page-container { padding: 20px; }
.table-card { border: none; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.05) !important; }

.af-list-header {
  display: flex; justify-content: space-between; align-items: center;
}
.af-list-header .left, .af-list-header .right { display: flex; align-items: center; gap: 12px; }

/* ==================== 表格单元格 ==================== */
.task-info-cell .main-name { font-weight: 600; color: var(--el-text-color-primary); margin-bottom: 2px; }
.task-info-cell .sub-info { font-size: 12px; color: #909399; display: flex; align-items: center; gap: 4px; }

.device-cell { display: flex; align-items: center; gap: 6px; color: var(--el-text-color-regular); }
.device-cell .el-icon { color: var(--el-color-primary); }

.cron-text {
  background: #f4f4f5; color: #606266; padding: 2px 6px; border-radius: 4px;
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
}

/* ==================== Gmail 悬浮效果 ==================== */
.action-swap-container { position: relative; display: flex; align-items: center; justify-content: flex-end; width: 100%; height: 32px; }
.time-text-display {
  transition: opacity 0.2s; color: #606266; font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
}

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
  display: flex; align-items: center; gap: 8px; padding-right: 12px;
  background-color: var(--el-table-row-hover-bg-color);
}

.action-buttons-inner :deep(.btn-action) { border: none; background: transparent; width: 32px; height: 32px; font-size: 20px !important;}
.action-buttons-inner :deep(.btn-edit) { color: var(--el-color-primary); }
.action-buttons-inner :deep(.btn-edit:hover) { background-color: var(--el-color-primary-light-9); }
.action-buttons-inner :deep(.btn-delete) { color: var(--el-color-danger); }
.action-buttons-inner :deep(.btn-delete:hover) { background-color: var(--el-color-danger-light-9); }

:deep(.el-table__row:hover) .time-text-display { opacity: 0; }
:deep(.el-table__row:hover) .row-floating-actions { opacity: 1; pointer-events: auto; right: 0; }
:deep(.el-table__row:hover > td.el-table__cell) { background-color: var(--el-table-row-hover-bg-color) !important; }

/* ==================== 弹窗辅助样式 ==================== */
.w-full { width: 100%; }
.ml-1 { margin-left: 4px; }
.cursor-help { cursor: help; }
.dialog-switch-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: #f8f9fa; border-radius: 8px; margin-top: 10px;
}
.dialog-switch-row .label { font-weight: 600; font-size: 14px; color: var(--el-text-color-primary); }

.af-pagination-wrap { margin-top: 20px; display: flex; justify-content: flex-end; }
.ml-4 { margin-left: 16px; }
</style>