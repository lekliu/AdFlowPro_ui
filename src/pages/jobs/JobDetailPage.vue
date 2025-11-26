<!-- 文件路径: src/pages/jobs/JobDetailPage.vue (修正版) -->
<template>
  <div class="job-detail-page">
    <el-page-header @back="goBack" :content="`任务详情 - Job #${jobId}`" />

    <div v-loading="jobStore.isDetailsLoading" class="detail-content">
      <el-card v-if="jobDetails" class="box-card">
        <template #header>
          <div class="card-header">
            <span>任务概览</span>
            <div class="header-actions">
              <el-button :icon="CopyDocument" type="primary" plain @click="handleCopyForAI">复制给AI分析</el-button>
              <el-button :icon="Refresh" @click="handleRefresh" :loading="jobStore.isDetailsLoading" plain>刷新</el-button>
              <el-button
                v-if="['completed', 'failed', 'cancelled'].includes(jobDetails.status)"
                type="success"
                :icon="Download"
                @click="handleExportReport(jobDetails.jobId)"
                :loading="jobStore.isExporting"
                plain
              >
                导出报告
              </el-button>
              <el-button
                v-if="['running', 'queued'].includes(jobDetails.status)"
                type="danger"
                :icon="VideoPause"
                @click="handleCancelJob"
                :loading="jobStore.isCancelling"
              >
                {{ jobDetails.status === "running" ? "停止任务" : "取消排队" }}
              </el-button>
            </div>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Job ID">{{ jobDetails.jobId }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(jobDetails.status)">{{ jobDetails.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="测试套件">{{ jobDetails.suite?.name || "N/A" }}</el-descriptions-item>
          <el-descriptions-item label="目标设备">{{ jobDetails.device?.deviceName || jobDetails.device?.deviceId || "N/A" }}</el-descriptions-item>
          <el-descriptions-item label="目标App">{{ jobDetails.targetAppPackageName }}</el-descriptions-item>
          <el-descriptions-item label="总耗时">{{ calculateDuration(jobDetails.startedAt, jobDetails.completedAt) }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ formatDate(jobDetails.startedAt) }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ formatDate(jobDetails.completedAt) }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card v-if="jobDetails" class="timeline-card">
        <template #header>
          <span>执行步骤</span>
        </template>
        <el-timeline v-if="results.length > 0">
          <el-timeline-item
            v-for="result in results"
            :key="result.resultId"
            :timestamp="formatDate(result.createdAt)"
            :type="result.status === 'success' ? 'success' : 'danger'"
            :icon="result.status === 'success' ? Check : Close"
            placement="top"
          >
            <el-card>
              <h4>{{ result.stepName }}</h4>
              <p>耗时: {{ result.durationMs || 0 }} ms</p>
              <div v-if="result.reportedValue" class="reported-value-container">
                <strong>实际值:</strong>
                <pre><code>{{ result.reportedValue }}</code></pre>
              </div>
              <div v-if="result.log" class="log-container">
                <strong>日志:</strong>
                <pre><code>{{ result.log }}</code></pre>
              </div>
              <div v-if="result.screenshotUrl" class="screenshot-container">
                <strong>失败截图:</strong>
                <el-image
                  style="width: 100px; height: auto; margin-top: 8px; cursor: pointer"
                  :src="result.screenshotUrl"
                  :preview-src-list="[result.screenshotUrl]"
                  fit="contain"
                  hide-on-click-modal
                />
              </div>
              <div v-if="result.failureContextJson" class="context-container">
                <el-collapse>
                  <el-collapse-item title="失败上下文 (UI/OCR)" name="1">
                    <pre><code>{{ JSON.stringify(result.failureContextJson, null, 2) }}</code></pre>
                  </el-collapse-item>
                </el-collapse>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>
        <!-- START: 明显修改标注: v-else 保持不变 -->
        <el-empty v-else description="暂无执行步骤记录" />
        <!-- END: 明显修改标注 -->
      </el-card>

      <el-empty v-if="!jobDetails && !jobStore.isLoading" description="无法加载任务详情" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "JobDetail",
});
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useJobStore } from "@/stores/jobStore";
import { Check, Close, VideoPause, Download, Refresh, CopyDocument } from "@element-plus/icons-vue";
import { ElMessageBox, ElMessage } from "element-plus";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const props = defineProps<{ jobId: string }>();
const router = useRouter();
const jobStore = useJobStore();

// START: 明显修改标注: 将 jobDetails 和 results 分开
// 这个计算属性用于获取任务的元数据，用于顶部的概览卡片
const jobDetails = computed(() => jobStore.currentJobDetails?.jobDetails);
// 这个新的计算属性专门用于获取执行结果列表，用于时间线
const results = computed(() => jobStore.currentJobDetails?.results || []);
// END: 明显修改标注

onMounted(() => {
  jobStore.fetchJobDetails(Number(props.jobId));
});

const handleRefresh = () => {
  jobStore.fetchJobDetails(Number(props.jobId));
};

const handleCopyForAI = async () => {
  if (!jobDetails.value || results.value.length === 0) {
    ElMessage.warning("任务详情为空，无法生成分析数据。");
    return;
  }

  const details = jobDetails.value;
  const steps = results.value;

  // 1. 构建任务概览
  let prompt = `# AdFlowPro 自动化测试故障分析请求\n\n`;
  prompt += `## 1. 任务环境\n`;
  prompt += `- **Job ID**: ${details.jobId}\n`;
  prompt += `- **测试套件**: ${details.suite?.name || "N/A"}\n`;
  prompt += `- **目标应用**: ${details.targetAppPackageName}\n`;
  prompt += `- **执行设备**: ${details.device?.deviceName || details.device?.deviceId}\n`;
  prompt += `- **最终状态**: ${details.status}\n`;
  prompt += `- **开始时间**: ${formatDate(details.startedAt)}\n`;
  prompt += `- **结束时间**: ${formatDate(details.completedAt)}\n\n`;

  // 2. 构建步骤概览表
  prompt += `## 2. 执行步骤概览\n`;
  prompt += `| 步骤名称 | 类型 | 状态 | 耗时(ms) | 简要日志 |\n`;
  prompt += `|---|---|---|---|---|\n`;
  
  steps.forEach((step) => {
    // 截取日志前50个字符防止表格过宽
    const shortLog = (step.log || "").replace(/\n/g, " ").slice(0, 50) + (step.log && step.log.length > 50 ? "..." : "");
    const statusIcon = step.status === "success" ? "✅" : "❌";
    prompt += `| ${step.stepName} | ${step.stepType} | ${statusIcon} ${step.status} | ${step.durationMs || 0} | ${shortLog} |\n`;
  });
  prompt += `\n`;

  // 3. 提取失败详情
  const failedSteps = steps.filter((s) => s.status !== "success");

  if (failedSteps.length > 0) {
    prompt += `## 3. 故障深度诊断数据\n`;
    prompt += `请基于以下详细信息分析失败原因：\n\n`;

    failedSteps.forEach((step, index) => {
      prompt += `### 故障点 ${index + 1}: ${step.stepName}\n`;
      prompt += `- **完整日志**:\n\`\`\`text\n${step.log || "无日志"}\n\`\`\`\n`;

      if (step.reportedValue) {
        prompt += `- **断言实际值 (Actual Value)**: \`${step.reportedValue}\`\n`;
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
    case "completed":
      return "success";
    case "running":
      return "primary";
    case "failed":
      return "danger";
    case "debugging":
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
}
.detail-content {
  margin-top: 20px;
}
.timeline-card {
  margin-top: 20px;
}
.log-container {
  margin-top: 10px;
}
.log-container pre,
.reported-value-container pre,
.context-container pre {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: "Courier New", Courier, monospace;
  max-height: 400px;
  overflow-y: auto;
}
.reported-value-container pre {
  background-color: #fef0f0; /* Light red background */
  color: #f56c6c; /* Red text */
  border: 1px solid #fde2e2;
}
.screenshot-container {
  margin-top: 10px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.context-container {
  margin-top: 15px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
