<template>
  <div class="job-detail-page">
    <el-page-header @back="goBack" :content="`任务详情 - Job #${jobId}`" />

    <div class="detail-content">
      <!-- 顶部 HUD：关键指标 -->
      <el-card v-if="jobDetails" class="box-card">
        <div class="hud-container">
          <el-descriptions :column="4" border size="small" class="hud-descriptions">
            <el-descriptions-item label="Job ID">{{ jobDetails.jobId }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="statusTagType(jobDetails.status)">{{ jobDetails.status }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="设备">{{ jobDetails.device?.deviceName || "N/A" }}</el-descriptions-item>
            <el-descriptions-item label="耗时">{{ calculateDuration(jobDetails.startedAt, jobDetails.completedAt) }}</el-descriptions-item>
          </el-descriptions>

          <div class="hud-actions">
            <el-tag v-if="['running', 'queued', 'pending'].includes(jobDetails.status)" type="success" effect="dark" class="polling-tag">
              <el-icon class="is-loading"><Refresh /></el-icon> 实时监控中
            </el-tag>
            <el-button :icon="CopyDocument" type="primary" link @click="handleCopyForAI">AI分析</el-button>
            <el-button
                v-if="['running', 'queued', 'pending'].includes(jobDetails.status)"
                type="danger"
                size="small"
                :icon="VideoPause"
                @click="handleCancelJob"
                :loading="jobStore.isCancelling"
            >
              {{ ['running', 'pending'].includes(jobDetails.status) ? "停止" : "取消排队" }}
            </el-button>
            <el-button
                v-if="['completed', 'failed', 'cancelled'].includes(jobDetails.status)"
                type="success"
                size="small"
                :icon="Download"
                @click="handleExportReport(jobDetails.jobId)"
                :loading="jobStore.isExporting"
            >
              报告
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- 实时日志表格 -->
      <div class="log-table-wrapper" ref="logTableWrapper">
        <el-table
            :data="results"
            style="width: 100%"
            size="small"
            row-key="resultId"
            :row-class-name="tableRowClassName"
            border
            stripe
        >
          <el-table-column label="时间" width="100">
            <template #default="{ row, $index }">
              <span v-if="shouldShowTime($index)" class="time-text">{{ formatTimeOnly(row.createdAt) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="步骤" width="300" show-overflow-tooltip>
            <template #default="scope">
              <span
                v-if="scope.row.stepDetails?.atomId"
                class="step-name-link"
                @click="goToAtom(scope.row.stepDetails.atomId)"
                title="点击编辑此原子操作"
              >
                {{ scope.row.stepName }}
              </span>
              <span v-else>{{ scope.row.stepName }}</span>
              <el-tag v-if="scope.row.stepDetails?.currentState" type="warning" effect="plain" size="small" style="margin-left: 5px">{{ scope.row.stepDetails.currentStateLabel || scope.row.stepDetails.currentState }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="类型" width="100">
            <template #default="scope">
              <el-tag size="small" effect="plain" type="info">{{ scope.row.stepDetails?.actionType || scope.row.stepType }}</el-tag>
            </template>
          </el-table-column>

          <!-- 核心：详情列，允许换行，不截断 -->
          <el-table-column label="详细信息" min-width="300">
            <template #default="scope">
              <div class="detail-cell">
                {{ formatStepDetails(scope.row) }}
                
                <!-- 新增：操作序列展示 (Tag形式) -->
                <div v-if="scope.row.stepDetails?.executedActions?.length" class="actions-wrapper">
                   <el-tag 
                     v-for="(action, idx) in scope.row.stepDetails.executedActions" 
                     :key="idx" 
                     size="small" 
                     type="info"
                     class="action-tag"
                   >
                    <span style="font-weight: bold">{{ action.type }}</span>
                    <span v-if="action.desc" style="margin-left: 4px; color: #606266"> {{ action.desc }}</span>
                  </el-tag>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="耗时" width="80" align="right">
            <template #default="scope">
              <span v-if="scope.row.durationMs != null">{{ scope.row.durationMs }}ms</span>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="70" align="center">
            <template #default="scope">
              <el-icon v-if="scope.row.status === 'success'" color="#67C23A"><Check /></el-icon>
              <el-icon v-else color="#F56C6C"><Close /></el-icon>
            </template>
          </el-table-column>

          <el-table-column label="快照" width="100" align="center">
            <template #default="scope">
              <el-image
                  v-if="scope.row.screenshotUrl"
                  style="width: 20px; height: 20px"
                  :src="scope.row.screenshotUrl"
                  :preview-src-list="[scope.row.screenshotUrl]"
                  preview-teleported
                  fit="contain"
              >
                <template #error><div class="image-slot"></div></template>
                <template #placeholder><div class="image-slot"></div></template>
              </el-image>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-empty v-if="!jobDetails && !jobStore.isLoading" description="无法加载任务详情" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "JobDetail",
});
import { computed, onMounted, onUnmounted, ref, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useJobStore } from "@/stores/jobStore";
import { Check, Close, VideoPause, Download, Refresh, CopyDocument } from "@element-plus/icons-vue";
import { ElMessageBox, ElMessage } from "element-plus";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import type { ResultPublic } from "@/types/api";

dayjs.extend(utc);

const props = defineProps<{ jobId: string }>();
const router = useRouter();
const jobStore = useJobStore();
const logTableWrapper = ref<HTMLElement | null>(null);

// 这个计算属性用于获取任务的元数据，用于顶部的概览卡片
const jobDetails = computed(() => jobStore.currentJobDetails?.jobDetails);
// 这个新的计算属性专门用于获取执行结果列表，用于时间线
const results = computed({
  get: () => jobStore.currentJobDetails?.results || [],
  set: (val) => {
    if (jobStore.currentJobDetails) {
      jobStore.currentJobDetails.results = val;
    }
  }
});

const scrollToBottom = async () => {
  await nextTick();
  if (logTableWrapper.value) {
    logTableWrapper.value.scrollTo({
      top: logTableWrapper.value.scrollHeight,
      behavior: 'smooth'
    });
  }
};
const goToAtom = (atomId: number) => {
  router.push({ name: "AtomEditor", params: { atomId } });
};

// WebSocket 事件处理器
const handleJobStepUpdate = (event: Event) => {
  const newStep = (event as CustomEvent).detail as ResultPublic;
  // 只有当消息属于当前查看的 Job 时才处理
  if (newStep.jobId === Number(props.jobId)) {
    // 避免重复添加 (基于 resultId)
    const exists = results.value.some(r => r.resultId === newStep.resultId);
    if (!exists) {
      if (jobStore.currentJobDetails) {
        jobStore.currentJobDetails.results.push(newStep);
        scrollToBottom(); // 确保收到新步骤时触发滚动
      }
    }
  }
};

const handleRefresh = async (isAuto = false) => {
  await jobStore.fetchJobDetails(Number(props.jobId));
  if (isAuto && jobDetails.value && ['completed', 'failed', 'cancelled'].includes(jobDetails.value.status)) {
    // stopPolling(); // Removed as it is not defined and not needed with new mechanism
  }
  if (!isAuto) {
    ElMessage.success("刷新成功");
  }
  scrollToBottom();
};

// [新增] 任务状态变更处理器
const handleJobStatusChange = (event: Event) => {
  const payload = (event as CustomEvent).detail;
  if (payload.jobId === Number(props.jobId)) {
    jobStore.updateJobStatusLocally(payload.jobId, payload.status);
  }
};

onMounted(async () => {
  await jobStore.fetchJobDetails(Number(props.jobId));
  scrollToBottom();
  window.addEventListener("job_step_update", handleJobStepUpdate);
  window.addEventListener("job_status_change", handleJobStatusChange);
});

onUnmounted(() => {
  window.removeEventListener("job_step_update", handleJobStepUpdate);
});

// --- 核心：合并详情逻辑 ---
const formatStepDetails = (result: any) => {
  const parts = [];

  // 1. 断言失败详情
  if (isAssertionFailure(result)) {
    const expected = getExpectedValue(result);
    parts.push(`[断言失败]\n期望: ${expected}\n实际: ${result.reportedValue}`);
  }
  // 2. 普通上报值
  else if (result.reportedValue) {
    const label = getReportedValueLabel(result.stepType);
    parts.push(`${label}: ${result.reportedValue}`);
  }

  // 4. 日志
  if (result.log) {
    parts.push(result.log.trim());
  }

  // 5. 失败上下文提示
  if (result.failureContextJson) {
    parts.push("(包含失败时的UI结构快照)");
  }

  return parts.join('\n');
};

const tableRowClassName = ({ row }: { row: any }) => {
  if (row.status === 'failure') {
    return 'failure-row';
  }
  return '';
};

const formatTimeOnly = (dateString?: string) => (dateString ? dayjs.utc(dateString).local().format("HH:mm:ss") : "--");

// 判断是否显示时间 (如果与上一行相同则隐藏)
const shouldShowTime = (index: number) => {
  if (index === 0) return true;
  const currentRow = results.value[index];
  const prevRow = results.value[index - 1];
  if (!currentRow || !prevRow) return true;
  
  return formatTimeOnly(currentRow.createdAt) !== formatTimeOnly(prevRow.createdAt);
};

const handleCopyForAI = async () => {
  if (!jobDetails.value || results.value.length === 0) {
    ElMessage.warning("任务详情为空，无法生成分析数据。");
    return;
  }

  const details = jobDetails.value;
  const steps = results.value;

  // 1. 构建任务概览
  let prompt = `# AdFlowPro 自动化测试故障分析\n\n`;
  prompt += `## 1. 任务环境\n`;
  prompt += `- **Job ID**: ${details.jobId}\n`;
  prompt += `- **测试套件**: ${details.suite?.name || "N/A"}\n`;
  prompt += `- **目标应用**: ${details.targetAppPackageName}\n`;
  prompt += `- **执行设备**: ${details.device?.deviceName || details.device?.deviceId}\n`;
  prompt += `- **最终状态**: ${details.status}\n`;
  prompt += `- **开始时间**: ${formatDate(details.startedAt)}\n`;
  prompt += `- **结束时间**: ${formatDate(details.completedAt)}\n`;
  prompt += `- **总耗时**: ${calculateDuration(details.startedAt, details.completedAt)}\n\n`;

  // 2. 构建步骤概览表
  prompt += `## 2. 执行步骤概览\n`;
  prompt += `| 执行时间 | 步骤名称 | 类型 | 状态 | 耗时(ms) | 详情/日志 |\n`;
  prompt += `|---|---|---|---|---|---|\n`;

  steps.forEach((step) => {
    let detailText = "";
    const stepTypeLabel = step.stepDetails?.actionType || step.stepType;

    if (isAssertionFailure(step)) {
      const expected = getExpectedValue(step);
      detailText = `[断言失败] 期望: ${expected}, 实际: ${step.reportedValue}`;
    } else if (step.reportedValue) {
      const label = getReportedValueLabel(step.stepType);
      detailText = `[${stepTypeLabel}] ${label}: ${step.reportedValue}`;
    } else if (step.stepDetails?.actionType) {
      detailText = `[${stepTypeLabel}]`;
    } else {
      detailText = (step.log || "").replace(/\n/g, " ");
    }

    if (detailText.length > 50) {
      detailText = detailText.slice(0, 50) + "...";
    }

    const statusIcon = step.status === "success" ? "✅" : "❌";
    prompt += `| ${formatDate(step.createdAt)} | ${step.stepName} | ${step.stepType} | ${statusIcon} ${step.status} | ${step.durationMs || 0} | ${detailText} |\n`;
  });
  prompt += `\n`;

  // 3. 提取失败详情
  const failedSteps = steps.filter((s) => s.status !== "success");

  if (failedSteps.length > 0) {
    prompt += `## 3. 故障深度诊断数据\n`;
    prompt += `请基于以下详细信息分析失败原因：\n\n`;

    failedSteps.forEach((step, index) => {
      prompt += `### 故障点 ${index + 1}: ${step.stepName}\n`;
      if (isAssertionFailure(step) && step.reportedValue) {
        prompt += `- **断言类型**: ${step.stepDetails?.executedActions?.[0]?.action}\n`;
        prompt += `- **期望值**: \`${getExpectedValue(step)}\`\n`;
        prompt += `- **实际值**: \`${step.reportedValue}\`\n`;
      } else if (step.reportedValue) {
        const label = getReportedValueLabel(step.stepType);
        prompt += `- **${label}**: \`${step.reportedValue}\`\n`;
      }

      prompt += `- **完整日志**:\n\`\`\`text\n${step.log || "无日志"}\n\`\`\`\n`;

      if (step.stepDetails?.variables && Object.keys(step.stepDetails.variables).length > 0) {
        prompt += `- **相关变量快照**:\n`;
        prompt += "```json\n"
        prompt += JSON.stringify(step.stepDetails.variables, null, 2);
        prompt += "\n```\n";
      }
      if (step.stepDetails?.executedActions) {
        prompt += `- **执行的动作**: \`${JSON.stringify(step.stepDetails.executedActions)}\`\n`;
      }

      if (step.failureContextJson) {
        prompt += `- **失败时的 UI/OCR 上下文 (JSON)**:\n`;
        prompt += `> 注意：这是执行动作失败时捕获的屏幕结构，请分析目标元素是否存在或属性是否匹配。\n\n`;
        prompt += `\`\`\`json\n${JSON.stringify(step.failureContextJson, null, 2)}\n\`\`\`\n`;
      } else {
        prompt += `- **上下文**: 未捕获到 UI 结构快照。\n`;
      }
      prompt += `\n---\n`;
    });
  }

  // 4. 写入剪切板
  try {
    await navigator.clipboard.writeText(prompt);
    ElMessage.success("已复制 AI 分析提示词到剪切板！");
  } catch (err) {
    console.error("Copy failed", err);
    ElMessage.error("复制失败，请检查浏览器权限。");
  }
};

const isAssertionFailure = (result: any) => {
  return result.stepDetails?.actionType === "Assert";
};

const getExpectedValue = (result: any) => {
  const action = result.stepDetails?.executedActions?.[0];
  if (!action || !action.parameters) return "N/A";

  const params = action.parameters;
  switch (action.action) {
    case "assert_text_equals":
      return params.text ?? "[未提供]";
    case "assert_element_count":
      return `${params.comparisonOperator || "=="} ${params.expectedCount}`;
    default:
      return "存在";
  }
};

const getReportedValueLabel = (stepType: string) => {
  switch (stepType) {
    case "calculation": return "计算结果";
    case "extraction": return "提取值";
    case "wait": return "等待时长";
    default: return "上报值";
  }
};

const goBack = () => router.push({ name: "JobsList" });

const handleCancelJob = async () => {
  if (!jobDetails.value) return;
  try {
    await ElMessageBox.confirm(`确定要停止正在运行的任务 #${jobDetails.value.jobId} 吗？`, "确认停止", {
      type: "warning",
    });
    await jobStore.cancelJob(jobDetails.value.jobId);
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
    case "completed": return "success";
    case "running": return "primary";
    case "failed": return "danger";
    case "debugging": return "warning";
    case "pending":
    case "queued": return "warning";
    case "cancelled": return "info";
    default: return "info";
  }
};

const formatDate = (dateString?: string) => (dateString ? dayjs.utc(dateString).local().format("YYYY-MM-DD HH:mm:ss.SSS") : "--");

const calculateDuration = (start?: string, end?: string) => {
  if (!start) return "N/A";
  const endTime = end ? dayjs.utc(end) : dayjs.utc();
  const duration = endTime.diff(dayjs.utc(start), "second");
  return duration >= 0 ? `${duration} 秒` : "N/A";
};
</script>

<style scoped>
.job-detail-page {
  padding: 0px;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.detail-content {
  margin-top: 0px;
  display: flex;
  flex-direction: column;
  gap: 0px;
  flex: 1;
  overflow: hidden; /* Prevent double scrollbars */
}

/* HUD Styles */
.hud-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hud-descriptions {
  flex-grow: 1;
}
.hud-actions {
  margin-left: 20px;
  display: flex;
  gap: 10px;
  align-items: center;
}

/* Table Styles */
.log-table-wrapper {
  flex: 1;
  overflow-y: auto;
  background: #fff;
}
/* 增大表格内容的字体 */
.log-table-wrapper :deep(.el-table) {
  font-size: 13px; /* 默认是12px，调大到13px */
}
.time-text {
  color: #909399;
  font-family: monospace;
  font-size: 13px; /* 时间列稍微小一点 */
}
.detail-cell {
  white-space: pre-wrap; /* 允许换行 */
  word-break: break-all; /* 允许长单词换行 */
  font-family: "Consolas", "Monaco", "Courier New", monospace; /* 优化字体栈 */
  font-size: 14px; /* 核心内容字号增大 */
  line-height: 1.4;
  padding: 4px 0;
}

:deep(.el-table .failure-row) {
  background-color: #fef0f0 !important;
}

.actions-wrapper {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.action-tag {
  border-color: #e9e9eb; /* 更淡的边框，减少视觉干扰 */
}

.step-name-link {
  color: var(--el-color-primary);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.step-name-link:hover {
  color: var(--el-color-primary-dark-2);
}
</style>