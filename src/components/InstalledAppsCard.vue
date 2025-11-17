<!-- AdFlowPro_ui\src\components\InstalledAppsCard.vue -->
<template>
  <el-card class="card-margin">
    <template #header>
      <div class="card-header">
        <span>已安装应用 ({{ apps.length }}个)</span>
        <el-dropdown split-button type="primary" @click="$emit('refresh', true)" :loading="isLoading" :disabled="!isConnected">
          从设备更新
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="$emit('refresh', false)">从服务器缓存刷新</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </template>

    <el-table :data="apps" v-loading="isLoading" style="width: 100%" height="400px" border stripe>
      <el-table-column label="应用名称" prop="appName" min-width="160" show-overflow-tooltip>
        <template #default="scope">
          <el-tag v-if="scope.row.isInMaster" type="success" size="small" effect="dark" style="margin-right: 5px" title="在主应用目录中">白</el-tag>
          <span>{{ scope.row.appName }}</span>
        </template>
      </el-table-column>
      <el-table-column label="包名" prop="packageName" min-width="200" show-overflow-tooltip />
      <el-table-column label="版本" prop="versionName" width="120" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="scope">
          <el-button
            size="small"
            type="danger"
            :icon="Delete"
            @click="$emit('uninstall', scope.row.packageName)"
            :disabled="!isConnected || scope.row.isSystemApp"
            plain
          >
            卸载
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { Delete } from "@element-plus/icons-vue";
import type { DeviceInstalledApp } from "@/types/api";

defineProps<{
  apps: DeviceInstalledApp[];
  isLoading: boolean;
  isConnected: boolean;
}>();

defineEmits(["refresh", "uninstall", "pullApk"]);
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-margin {
  margin-top: 20px;
}
</style>
