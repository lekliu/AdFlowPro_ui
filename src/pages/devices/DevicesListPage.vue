<template>
  <div class="devices-list-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>设备连接管理</span>
          <el-button type="primary" :icon="Plus" @click="handleAddDevice">手动添加设备</el-button>
        </div>
      </template>

      <!-- Filters -->
      <el-form :inline="true" :model="filterParams" class="filter-form">
        <el-form-item label="搜索">
          <el-input v-model="filterParams.searchQuery" placeholder="按ID或名称搜索" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterParams.status" placeholder="所有状态" clearable style="width: 150px">
            <el-option label="在线 (DB)" value="online" />
            <el-option label="离线 (DB)" value="offline" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="deviceStore.devices" v-loading="deviceStore.isLoading" style="width: 100%" border stripe :row-key="(row) => row.deviceId">
        <el-table-column type="index" width="50" label="序号" />
        <el-table-column prop="deviceId" label="设备ID" min-width="200" sortable show-overflow-tooltip />
        <el-table-column prop="deviceName" label="设备名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="osVersion" label="系统版本" width="100" />
        <el-table-column prop="appVersion" label="App版本" width="100" />
        <el-table-column prop="status" label="数据库状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'online' ? 'success' : scope.row.status === 'offline' ? 'info' : 'warning'">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="WebSocket" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.isConnectedWs ? 'success' : 'danger'">
              <el-icon style="vertical-align: middle" :size="16">
                <component :is="scope.row.isConnectedWs ? SuccessFilled : CircleCloseFilled" />
              </el-icon>
              {{ scope.row.isConnectedWs ? " 已连接" : " 已断开" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastSeenAt" label="最后在线时间" width="180" sortable>
          <template #default="scope">
            {{ formatDate(scope.row.lastSeenAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="scope">
            <el-button size="small" :icon="View" @click="viewDetails(scope.row.deviceId)">详情</el-button>
            <el-button size="small" type="primary" :icon="Edit" @click="openEditModal(scope.row)"> 编辑 </el-button>
            <el-button size="small" type="primary" :icon="Promotion" @click="openCommandModal(scope.row)" :disabled="!scope.row.isConnectedWs"
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
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- Modals... -->
    <el-dialog v-model="commandModalVisible" :title="'向 ' + selectedDeviceForCommand?.deviceId + ' 发送指令'" width="60%" destroy-on-close>
      <CommandForm v-if="selectedDeviceForCommand" :device-id="selectedDeviceForCommand.deviceId" @command-sent="handleCommandSent" />
      <template #footer>
        <el-button @click="commandModalVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editModalVisible" title="编辑设备名称" width="30%" @close="editingDeviceName = ''">
      <el-form v-if="editingDevice" label-position="top">
        <el-form-item label="设备ID">
          <el-input :value="editingDevice.deviceId" disabled />
        </el-form-item>
        <el-form-item label="新设备名称">
          <el-input v-model="editingDeviceName" placeholder="请输入新的设备名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editModalVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdateDeviceName" :loading="isUpdating">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "DevicesList",
});
import { ref, onMounted, reactive } from "vue";
import { useRouter } from "vue-router";
import { useDeviceStore } from "@/stores/deviceStore";
import { deviceService } from "@/api/deviceService";
import type { DevicePublic, DeviceUpdatePayload } from "@/types/api";
import { Plus, Search, Refresh, View, Promotion, SuccessFilled, CircleCloseFilled, Edit } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ElMessage } from "element-plus";

dayjs.extend(utc);

const deviceStore = useDeviceStore();
const router = useRouter();

const filterParams = reactive({
  searchQuery: "",
  status: "",
});

const currentPage = ref(1);
const pageSize = ref(10);

const commandModalVisible = ref(false);
const selectedDeviceForCommand = ref<DevicePublic | null>(null);

const editModalVisible = ref(false);
const editingDevice = ref<DevicePublic | null>(null);
const editingDeviceName = ref("");
const isUpdating = ref(false);

const fetchData = () => {
  const params = {
    skip: (currentPage.value - 1) * pageSize.value,
    limit: pageSize.value,
    status: filterParams.status || undefined,
    search: filterParams.searchQuery || undefined,
  };
  deviceStore.fetchDevices(params);
};

onMounted(() => {
  fetchData();
});

const handleSearch = () => {
  currentPage.value = 1;
  fetchData();
};

const resetFilters = () => {
  filterParams.searchQuery = "";
  filterParams.status = "";
  currentPage.value = 1;
  fetchData();
};

const handleSizeChange = (val: number) => {
  pageSize.value = val;
  currentPage.value = 1;
  fetchData();
};

const handleCurrentChange = (val: number) => {
  currentPage.value = val;
  fetchData();
};

const viewDetails = (deviceId: string) => {
  router.push({ name: "DeviceDetail", params: { deviceId } });
};

const openCommandModal = (device: DevicePublic) => {
  selectedDeviceForCommand.value = device;
  commandModalVisible.value = true;
};

const openEditModal = (device: DevicePublic) => {
  editingDevice.value = device;
  editingDeviceName.value = device.deviceName || "";
  editModalVisible.value = true;
};

const handleUpdateDeviceName = async () => {
  if (!editingDevice.value) return;
  isUpdating.value = true;
  try {
    const payload: DeviceUpdatePayload = {
      deviceName: editingDeviceName.value,
    };
    const updatedDevice = await deviceService.updateDevice(editingDevice.value.deviceId, payload);
    deviceStore.updateDeviceInList(updatedDevice);
    ElMessage.success("设备名称更新成功！");
    editModalVisible.value = false;
  } catch (error) {
    console.error("Failed to update device name:", error);
  } finally {
    isUpdating.value = false;
  }
};

const handleAddDevice = () => {
  ElMessage.info("手动添加设备功能尚未实现。");
};

const handleCommandSent = (success: boolean) => {
  if (success) {
    ElMessage.success("指令已成功分派。");
  }
  commandModalVisible.value = false;
};

const formatDate = (dateString: string | Date): string => {
  if (!dateString) return "N/A";
  return dayjs.utc(dateString).local().format("YYYY-MM-DD HH:mm:ss");
};
</script>

<style scoped>
.devices-list-page {
  padding: 0px;
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
