<template>
  <div class="devices-list-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>设备连接管理</span>
          <el-button type="primary" :icon="Plus" @click="handleAddDevice"
            >手动添加设备</el-button
          >
        </div>
      </template>

      <!-- Filters -->
      <el-form :inline="true" :model="filterParams" class="filter-form">
        <el-form-item label="设备ID">
          <el-input
            v-model="filterParams.deviceId"
            placeholder="按ID搜索"
            clearable
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="filterParams.status"
            placeholder="所有状态"
            clearable
            style="width: 150px"
          >
            <el-option label="在线 (DB)" value="online" />
            <el-option label="离线 (DB)" value="offline" />
            <!-- Add more statuses if your backend supports them -->
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch"
            >搜索</el-button
          >
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table
        :data="deviceStore.devices"
        v-loading="deviceStore.isLoading"
        style="width: 100%"
        border
        stripe
      >
        <el-table-column type="index" width="50" label="序号" />
        <el-table-column
          prop="deviceId"
          label="设备ID"
          min-width="200"
          sortable
          show-overflow-tooltip
        />
        <el-table-column
          prop="deviceName"
          label="设备名称"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column prop="osVersion" label="系统版本" width="60" />
        <el-table-column prop="appVersion" label="App版本" width="60" />
        <el-table-column prop="status" label="数据库状态" width="80">
          <template #default="scope">
            <el-tag
              :type="
                scope.row.status === 'online'
                  ? 'success'
                  : scope.row.status === 'offline'
                    ? 'info'
                    : 'warning'
              "
            >
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="WebSocket" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.isConnectedWs ? 'success' : 'danger'">
              <el-icon style="vertical-align: middle" :size="16">
                <component
                  :is="
                    scope.row.isConnectedWs ? SuccessFilled : CircleCloseFilled
                  "
                />
              </el-icon>
              {{ scope.row.isConnectedWs ? " 已连接" : " 已断开" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="lastSeenAt"
          label="最后在线时间"
          width="155"
          sortable
        >
          <template #default="scope">
            {{ formatDate(scope.row.lastSeenAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="scope">
            <el-button
              size="small"
              :icon="View"
              @click="viewDetails(scope.row.deviceId)"
              >详情</el-button
            >
            <el-button
              size="small"
              type="primary"
              :icon="Edit"
              @click="openEditModal(scope.row)"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              type="primary"
              :icon="Promotion"
              @click="openCommandModal(scope.row)"
              :disabled="!scope.row.isConnectedWs"
              >指令</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="deviceStore.totalDevices > 0"
        class="pagination-container"
        layout="total, sizes, prev, pager, next, jumper"
        :total="deviceStore.totalDevices"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- Command Modal -->
    <el-dialog
      v-model="commandModalVisible"
      :title="'向 ' + selectedDeviceForCommand?.deviceId + ' 发送指令'"
      width="60%"
      destroy-on-close
    >
      <CommandForm
        v-if="selectedDeviceForCommand"
        :device-id="selectedDeviceForCommand.deviceId"
        @command-sent="handleCommandSent"
      />
      <template #footer>
        <el-button @click="commandModalVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- >>>>>>>>>> 新增: 编辑设备名称的弹窗 <<<<<<<<<< -->
    <el-dialog
      v-model="editModalVisible"
      title="编辑设备名称"
      width="30%"
      @close="editingDeviceName = ''"
    >
      <el-form v-if="editingDevice" label-position="top">
        <el-form-item label="设备ID">
          <el-input :value="editingDevice.deviceId" disabled />
        </el-form-item>
        <el-form-item label="新设备名称">
          <el-input
            v-model="editingDeviceName"
            placeholder="请输入新的设备名称"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editModalVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleUpdateDeviceName"
          :loading="isUpdating"
          >保存</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, watch } from "vue";
import { useRouter } from "vue-router";
import { useDeviceStore } from "@/stores/deviceStore";
import { deviceService } from "@/api/deviceService"; // >>>>>>>>>> 添加这一行导入 <<<<<<<<<<
import { DevicePublic, DeviceUpdatePayload } from "@/types/api"; // Assuming you have this type
import CommandForm from "@/components/CommandForm.vue"; // You'll create this component
import {
  Plus,
  Search,
  Refresh,
  View,
  Promotion,
  SuccessFilled,
  CircleCloseFilled,
  Edit, // >>>>>>>>>> 引入Edit图标 <<<<<<<<<<
} from "@element-plus/icons-vue";
// >>>>>>>>>> 1. 导入 dayjs 和 utc 插件 <<<<<<<<<<
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

// >>>>>>>>>> 2. 启用 utc 插件 <<<<<<<<<<
dayjs.extend(utc);

const deviceStore = useDeviceStore();
const router = useRouter();

const filterParams = reactive({
  deviceId: "",
  status: "",
});

const currentPage = ref(1);
const pageSize = ref(10); // Default page size

const commandModalVisible = ref(false);
const selectedDeviceForCommand = ref<DevicePublic | null>(null);

// >>>>>>>>>> 新增: 编辑功能所需的状态 <<<<<<<<<<
const editModalVisible = ref(false);
const editingDevice = ref<DevicePublic | null>(null);
const editingDeviceName = ref("");
const isUpdating = ref(false);

const fetchData = () => {
  const params = {
    skip: (currentPage.value - 1) * pageSize.value,
    limit: pageSize.value,
    status: filterParams.status || undefined, // Pass undefined if empty
    // deviceId_like: filterParams.deviceId || undefined, // Backend API needs to support this
  };
  // If deviceId filter is active, you might want a different API or a more specific fetch
  // For now, fetchDevices will just use skip, limit, status
  deviceStore.fetchDevices(params);
};

onMounted(() => {
  fetchData();
  // TODO: Implement polling or WebSocket for live status updates if needed
  // setInterval(fetchData, 15000); // Example: Poll every 15 seconds
});

watch([currentPage, pageSize], fetchData); // Refetch data when pagination changes

const handleSearch = () => {
  currentPage.value = 1; // Reset to first page on new search
  fetchData();
};

const resetFilters = () => {
  filterParams.deviceId = "";
  filterParams.status = "";
  currentPage.value = 1;
  fetchData();
};

const handleSizeChange = (val: number) => {
  pageSize.value = val;
  // fetchData will be called by the watcher
};

const handleCurrentChange = (val: number) => {
  currentPage.value = val;
  // fetchData will be called by the watcher
};

const viewDetails = (deviceId: string) => {
  router.push({ name: "DeviceDetail", params: { deviceId } });
};

const openCommandModal = (device: DevicePublic) => {
  selectedDeviceForCommand.value = device;
  commandModalVisible.value = true;
};

// >>>>>>>>>> 新增: 打开编辑弹窗的函数 <<<<<<<<<<
const openEditModal = (device: DevicePublic) => {
  editingDevice.value = device;
  editingDeviceName.value = device.deviceName || "";
  editModalVisible.value = true;
};

// >>>>>>>>>> 新增: 处理设备名称更新的函数 <<<<<<<<<<
const handleUpdateDeviceName = async () => {
  if (!editingDevice.value) return;
  isUpdating.value = true;
  try {
    const payload: DeviceUpdatePayload = {
      deviceName: editingDeviceName.value,
    };
    const updatedDevice = await deviceService.updateDevice(
      editingDevice.value.deviceId,
      payload
    );
    // 更新 Pinia store 中的数据
    deviceStore.updateDeviceInList(updatedDevice);
    ElMessage.success("设备名称更新成功！");
    editModalVisible.value = false;
  } catch (error) {
    console.error("Failed to update device name:", error);
    ElMessage.error("更新失败，请重试。");
  } finally {
    isUpdating.value = false;
  }
};

const handleAddDevice = () => {
  // For manually adding a device if your backend supports it (not in current FastAPI design)
  // Or this could open a modal for some other purpose.
  alert("手动添加设备功能尚未实现。");
};

const handleCommandSent = (success: boolean) => {
  if (success) {
    // Optionally refresh device data or show success message
    ElMessage.success("指令已发送。");
  }
  commandModalVisible.value = false; // Close modal regardless
};

const formatDate = (dateString: string | Date): string => {
  if (!dateString) return "N/A";
  // dayjs.utc(dateString) - 强制将输入字符串按UTC时间解析
  // .local() - 将其转换为浏览器本地时区
  // .format(...) - 按指定格式输出
  return dayjs.utc(dateString).local().format("YYYY-MM-DD HH:mm:ss");
};
</script>

<style scoped>
.devices-list-page {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.filter-form {
  margin-bottom: 20px;
}
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
