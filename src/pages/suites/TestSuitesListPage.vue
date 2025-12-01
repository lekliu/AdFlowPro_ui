<template>
  <div class="suites-list-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>测试套件管理</span>
          <el-button type="primary" :icon="Plus" @click="handleCreate">新建测试套件</el-button>
        </div>
      </template>

      <div class="filter-container">
        <el-input v-model="searchQuery" placeholder="按名称或描述搜索" clearable @keyup.enter="handleSearch" style="width: 300px; margin-right: 10px">
          <template #append>
            <el-button :icon="Search" @click="handleSearch" />
          </template>
        </el-input>
      </div>

      <el-table :data="suiteStore.suites" v-loading="suiteStore.isLoading" style="width: 100%" border stripe>
        <el-table-column type="index" width="50" label="号" />
        <el-table-column prop="name" label="名称" width="160" sortable />
        <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip />
        <el-table-column prop="targetAppPackage" label="目标App" min-width="180" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="createdAt" width="180" sortable>
          <template #default="scope">{{ formatDate(scope.row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="scope">
            <el-button size="small" type="success" :icon="VideoPlay" plain @click="handleRunSuite(scope.row)">运行</el-button>
            <el-button size="small" :icon="Document" plain @click="handleViewPackage(scope.row)">剧本</el-button>
            <el-button size="small" type="primary" :icon="Edit" @click="handleEdit(scope.row.suiteId)" />
            <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(scope.row.suiteId, scope.row.name)" />
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
          v-if="suiteStore.totalSuites > 0"
          class="pagination-container"
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="suiteStore.totalSuites"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
      />
    </el-card>

    <el-dialog v-model="runDialog.visible" title="运行测试套件" width="500px" @close="resetRunDialog">
      <el-form v-if="runDialog.suite" :model="runDialog.form" ref="runFormRef" :rules="runDialog.rules" label-width="100px">
        <el-form-item label="测试套件">
          <el-input :value="runDialog.suite.name" disabled />
        </el-form-item>
        <el-form-item label="目标应用" prop="targetAppPackageName">
          <el-select
              v-model="runDialog.form.targetAppPackageName"
              placeholder="选择要测试的应用"
              filterable
              style="width: 100%"
              v-loading="masterAppStore.isLoading"
          >
            <el-option
                v-for="app in masterAppStore.apps"
                :key="app.packageName"
                :label="`${app.appName} (${app.packageName})`"
                :value="app.packageName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目标设备" prop="deviceId">
          <el-select v-model="runDialog.form.deviceId" placeholder="选择在线的设备" filterable style="width: 100%" v-loading="deviceStore.isLoading">
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
        <el-button type="primary" @click="confirmRun" :loading="runDialog.isSubmitting">开始测试</el-button>
      </template>
    </el-dialog>

    <!-- 剧本预览对话框 -->
    <el-dialog v-model="packageDialog.visible" title="剧本预览" width="60%" top="5vh">
      <div v-loading="packageDialog.loading" class="package-content">
        <el-scrollbar height="60vh">
          <!-- 使用 ElTree 组件 -->
          <el-tree
              v-if="packageDialog.treeData.length"
              :data="packageDialog.treeData"
              :props="{ children: 'children', label: 'label' }"
              :expand-on-click-node="false"
              :default-expand-all="packageDialog.expandAll"
              node-key="id"
              ref="treeRef"
          />
        </el-scrollbar>
      </div>
      <template #footer>
        <el-button @click="toggleExpandAll"> {{ packageDialog.expandAll ? '全部折叠' : '全部展开' }} </el-button>
        <el-button type="primary" @click="handleCopyPackage" :disabled="!packageDialog.content">复制内容</el-button>
        <el-button @click="packageDialog.visible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "TestSuitesList",
});
import { ref, onMounted, computed, reactive, onActivated, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useSuiteStore } from "@/stores/suiteStore";
import { useMasterAppStore } from "@/stores/masterAppStore";
import { useDeviceStore } from "@/stores/deviceStore";
import { jobService } from "@/api/jobService";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules, type ElTree } from "element-plus";
import { Plus, Edit, Delete, Search, VideoPlay, Document } from "@element-plus/icons-vue";
import type { TestSuiteListPublic } from "@/types/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { suiteService } from "@/api/suiteService";

dayjs.extend(utc);

const router = useRouter();
const suiteStore = useSuiteStore();
const masterAppStore = useMasterAppStore();
const deviceStore = useDeviceStore();

const currentPage = ref(1);
const pageSize = ref(10);
const searchQuery = ref("");
const treeRef = ref<InstanceType<typeof ElTree>>();

const fetchData = () => {
  const params = {
    skip: (currentPage.value - 1) * pageSize.value,
    limit: pageSize.value,
    search: searchQuery.value || undefined,
  };
  suiteStore.fetchSuites(params);
};

onActivated(() => {
  if (suiteStore.needsRefresh) {
    fetchData();
    suiteStore.setNeedsRefresh(false);
  }
});

onMounted(() => {
  fetchData();
});

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

const handleCreate = () => {
  router.push({ name: "TestSuiteEditor" });
};

const handleEdit = (suiteId: number) => {
  router.push({ name: "TestSuiteEditor", params: { suiteId } });
};

const handleDelete = async (suiteId: number, name: string) => {
  try {
    await ElMessageBox.confirm(`确定要删除测试套件 "${name}" 吗？`, "确认删除", {
      type: "warning",
    });
    await suiteStore.deleteSuite(suiteId);
    ElMessage.success("删除成功！");
    if (suiteStore.suites.length === 0 && currentPage.value > 1) {
      currentPage.value--;
    }
    fetchData();
  } catch (error) {
    if (error !== "cancel") {
    } else {
      ElMessage.info("已取消删除");
    }
  }
};

const runDialog = reactive({
  visible: false,
  isSubmitting: false,
  suite: null as TestSuiteListPublic | null,
  form: {
    targetAppPackageName: "",
    deviceId: "",
  },
  rules: {
    targetAppPackageName: [{ required: true, message: "请选择目标应用", trigger: "change" }],
    deviceId: [{ required: true, message: "请选择目标设备", trigger: "change" }],
  } as FormRules,
});
const runFormRef = ref<FormInstance>();

const packageDialog = reactive({
  visible: false,
  loading: false,
  content: null as any | null,
  treeData: [] as any[],
  expandAll: false,
});

const onlineDevices = computed(() => deviceStore.devices.filter((d) => d.isConnectedWs));

const handleRunSuite = (suite: TestSuiteListPublic) => {
  masterAppStore.fetchApps({ skip: 0, limit: 1000 });
  deviceStore.fetchDevices({ limit: 1000 });
  runDialog.suite = suite;
  runDialog.form.targetAppPackageName = suite.targetAppPackage || "";
  runDialog.visible = true;
};

const jsonToTree = (obj: any, labelPrefix = ""): any[] => {
  let idCounter = 0;
  const transform = (value: any, key: string | number): any => {
    const nodeId = `${labelPrefix}-${key}-${idCounter++}`;
    if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        return {
          id: nodeId,
          label: `[${key}] (${value.length} items)`,
          children: value.map((item, index) => transform(item, index)),
        };
      } else {
        return {
          id: nodeId,
          label: `{${key}}`,
          children: Object.entries(value).map(([childKey, childValue]) => transform(childValue, childKey)),
        };
      }
    } else {
      return {
        id: nodeId,
        label: `${key}: ${JSON.stringify(value)}`,
      };
    }
  };
  if (obj && typeof obj === "object") {
    return Object.entries(obj).map(([key, value]) => transform(value, key));
  }
  return [{ id: "root", label: JSON.stringify(obj) }];
};

const toggleExpandAll = () => {
  packageDialog.expandAll = !packageDialog.expandAll;
  const nodes = treeRef.value?.store.nodesMap;
  if (nodes) {
    for (const key in nodes) {
      nodes[key].expanded = packageDialog.expandAll;
    }
  }
};

const handleViewPackage = async (suite: TestSuiteListPublic) => {
  packageDialog.content = null;
  packageDialog.treeData = [];
  packageDialog.loading = true;
  packageDialog.visible = true;
  try {
    const packageData = await suiteService.getSuitePackage(suite.suiteId);
    packageDialog.content = packageData;
    packageDialog.treeData = jsonToTree(packageData, `suite-${suite.suiteId}`);
    await nextTick(); // Wait for the DOM to update
    packageDialog.expandAll = false; // Set initial expand state
    toggleExpandAll(); // Then immediately toggle to collapse all
  } catch (error) {
    packageDialog.content = { error: "加载剧本失败。" };
    packageDialog.treeData = jsonToTree(packageDialog.content, `suite-${suite.suiteId}`);
  } finally {
    packageDialog.loading = false;
  }
};

const resetRunDialog = () => {
  runDialog.visible = false;
  runDialog.isSubmitting = false;
  runDialog.suite = null;
  runDialog.form.targetAppPackageName = "";
  runDialog.form.deviceId = "";
  runFormRef.value?.clearValidate();
};

const confirmRun = async () => {
  if (!runFormRef.value || !runDialog.suite) return;

  await runFormRef.value.validate(async (valid) => {
    if (valid) {
      runDialog.isSubmitting = true;
      try {
        const createdJob = await jobService.createJob({
          suiteId: runDialog.suite!.suiteId,
          suiteType: "linear", // This needs to be dynamic in the future
          targetAppPackageName: runDialog.form.targetAppPackageName,
          deviceId: runDialog.form.deviceId,
        });
        ElMessage.success(`任务 #${createdJob.jobId} 已启动，正在跳转监控页...`);
        resetRunDialog();
        router.push({ name: "JobDetail", params: { jobId: createdJob.jobId } });
      } catch (error) {
        // API interceptor will handle error messages
      } finally {
        runDialog.isSubmitting = false;
      }
    }
  });
};

const handleCopyPackage = async () => {
  if (!packageDialog.content) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(packageDialog.content, null, 2));
    ElMessage.success("剧本JSON内容已成功复制到剪贴板！");
  } catch (err) {
    console.error("Failed to copy text: ", err);
    ElMessage.error("复制失败，您的浏览器可能不支持或未授权剪贴板访问。");
  }
};

const formatDate = (dateString: string | Date): string => {
  if (!dateString) return "N/A";
  return dayjs.utc(dateString).local().format("YYYY-MM-DD HH:mm:ss");
};
</script>

<style scoped>
.suites-list-page {
  padding: 0px;
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
.package-content pre {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  font-family: "Courier New", Courier, monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}
:deep(.el-tree-node__content) {
  height: auto;
  min-height: 26px;
  align-items: flex-start;
}

:deep(.el-tree-node__label) {
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
}
</style>