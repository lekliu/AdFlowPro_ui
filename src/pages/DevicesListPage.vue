<template>
  <div class="devices-list-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>Connected Devices Management</span>
          <el-button type="primary" :icon="Plus" @click="handleAddDevice"
            >Add Device (Manual)</el-button
          >
        </div>
      </template>

      <!-- Filters -->
      <el-form :inline="true" :model="filterParams" class="filter-form">
        <el-form-item label="Device ID">
          <el-input
            v-model="filterParams.deviceId"
            placeholder="Search by ID"
            clearable
          />
        </el-form-item>
        <el-form-item label="Status">
          <el-select
            v-model="filterParams.status"
            placeholder="All Statuses"
            clearable
          >
            <el-option label="Online (DB)" value="online" />
            <el-option label="Offline (DB)" value="offline" />
            <!-- Add more statuses if your backend supports them -->
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch"
            >Search</el-button
          >
          <el-button :icon="Refresh" @click="resetFilters">Reset</el-button>
        </el-form-item>
      </el-form>

      <el-table
        :data="deviceStore.devices"
        v-loading="deviceStore.isLoading"
        style="width: 100%"
        border
        stripe
      >
        <el-table-column type="index" width="50" />
        <el-table-column
          prop="device_id"
          label="Device ID"
          min-width="200"
          sortable
          show-overflow-tooltip
        />
        <el-table-column
          prop="device_name"
          label="Name"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column prop="os_version" label="OS" width="100" />
        <el-table-column prop="app_version" label="App Ver." width="100" />
        <el-table-column prop="status" label="DB Status" width="120">
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
        <el-table-column label="WebSocket" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.is_connected_ws ? 'success' : 'danger'">
              <el-icon style="vertical-align: middle" :size="16">
                <component
                  :is="
                    scope.row.is_connected_ws
                      ? SuccessFilled
                      : CircleCloseFilled
                  "
                />
              </el-icon>
              {{ scope.row.is_connected_ws ? " Live" : " Down" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="last_seen_at"
          label="Last Seen"
          width="180"
          sortable
        >
          <template #default="scope">
            {{ formatDate(scope.row.last_seen_at) }}
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="220" fixed="right">
          <template #default="scope">
            <el-button
              size="small"
              :icon="View"
              @click="viewDetails(scope.row.device_id)"
              >Details</el-button
            >
            <el-button
              size="small"
              type="primary"
              :icon="Promotion"
              @click="openCommandModal(scope.row)"
              :disabled="!scope.row.is_connected_ws"
              >Commands</el-button
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
      :title="'Send Command to ' + selectedDeviceForCommand?.device_id"
      width="60%"
      destroy-on-close
    >
      <CommandForm
        v-if="selectedDeviceForCommand"
        :device-id="selectedDeviceForCommand.device_id"
        @command-sent="handleCommandSent"
      />
      <template #footer>
        <el-button @click="commandModalVisible = false">Close</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, watch } from "vue";
import { useRouter } from "vue-router";
import { useDeviceStore } from "@/stores/deviceStore";
import { DevicePublic } from "@/types/api"; // Assuming you have this type
import CommandForm from "@/components/CommandForm.vue"; // You'll create this component
import {
  Plus,
  Search,
  Refresh,
  View,
  Promotion,
  SuccessFilled,
  CircleCloseFilled,
} from "@element-plus/icons-vue";

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

const handleAddDevice = () => {
  // For manually adding a device if your backend supports it (not in current FastAPI design)
  // Or this could open a modal for some other purpose.
  alert("Add Device functionality not implemented in this example.");
};

const handleCommandSent = (success: boolean) => {
  if (success) {
    // Optionally refresh device data or show success message
    ElMessage.success("Command sent successfully!");
  }
  commandModalVisible.value = false; // Close modal regardless
};

const formatDate = (dateString: string | Date): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString(); // Or use a library like date-fns for better formatting
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
