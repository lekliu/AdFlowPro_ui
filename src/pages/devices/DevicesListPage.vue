<template>
  <div class="devices-list-page" @click="closeContextMenu">
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

      <el-table
          :data="deviceStore.devices"
          v-loading="deviceStore.isLoading"
          style="width: 100%"
          border
          stripe
          :row-key="(row) => row.deviceId"
          @row-contextmenu="handleRowContextMenu"
          @row-dblclick="handleRowDblClick"
          ref="deviceTableRef"
      >
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

    <!-- 右键菜单 -->
    <div
        v-show="contextMenu.visible"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div class="menu-item" @click="handleViewDetailsFromMenu">
        <el-icon><View /></el-icon> 查看详情
      </div>
      <div class="menu-item" @click="handleEditFromMenu">
        <el-icon><Edit /></el-icon> 编辑名称
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "DevicesList",
});
import { ref, onMounted, reactive, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useDeviceStore } from "@/stores/deviceStore";
import { deviceService } from "@/api/deviceService";
import type { DevicePublic, DeviceUpdatePayload } from "@/types/api";
import { Plus, Search, Refresh, View, SuccessFilled, CircleCloseFilled, Edit } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ElMessage } from "element-plus";
// 【修复点1】: 移除 type ElTable 的导入
// import { ElMessage, type ElTable } from "element-plus";

dayjs.extend(utc);

const deviceStore = useDeviceStore();
const router = useRouter();

// 【修复点2】: 将 ref 类型改为 any，避免运行时查找不存在的 ElTable 对象
const deviceTableRef = ref<any>(null);

const filterParams = reactive({
  searchQuery: "",
  status: "",
});

const currentPage = ref(1);
const pageSize = ref(10);

const editModalVisible = ref(false);
const editingDevice = ref<DevicePublic | null>(null);
const editingDeviceName = ref("");
const isUpdating = ref(false);

// 右键菜单状态
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  row: null as DevicePublic | null,
});

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
  window.addEventListener('scroll', closeContextMenu, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', closeContextMenu, true);
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

// 双击行处理
const handleRowDblClick = (row: DevicePublic) => {
  viewDetails(row.deviceId);
};

// 右键菜单处理
const handleRowContextMenu = (row: DevicePublic, column: any, event: MouseEvent) => {
  event.preventDefault();
  // 使用 ?. 安全访问，防止 undefined 报错
  if (deviceTableRef.value?.setCurrentRow) {
    deviceTableRef.value.setCurrentRow(row);
  }
  contextMenu.row = row;
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.visible = true;
};

const closeContextMenu = () => {
  contextMenu.visible = false;
};

const handleViewDetailsFromMenu = () => {
  if (contextMenu.row) {
    viewDetails(contextMenu.row.deviceId);
  }
  closeContextMenu();
};

const handleEditFromMenu = () => {
  if (contextMenu.row) {
    openEditModal(contextMenu.row);
  }
  closeContextMenu();
};

const viewDetails = (deviceId: string) => {
  router.push({ name: "DeviceDetail", params: { deviceId } });
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

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background-color: #fff;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  padding: 5px 0;
  z-index: 2000;
  min-width: 120px;
}

.menu-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background-color: #ecf5ff;
  color: var(--el-color-primary);
}

.menu-item .el-icon {
  font-size: 14px;
}
</style>