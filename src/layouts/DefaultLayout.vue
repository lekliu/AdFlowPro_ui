<template>
  <el-container class="main-layout">
    <el-aside :width="asideWidth">
      <Sidebar :is-collapse="isCollapse" />
    </el-aside>

    <el-container>
      <el-header class="layout-header">
        <div>
          <el-icon @click="toggleCollapse" class="collapse-icon">
            <component :is="isCollapse ? Expand : Fold" />
          </el-icon>
          <span>Welcome to AdFlowPro Management</span>
        </div>

        <div class="header-actions-right">
          <el-tooltip :content="wsStatusTooltip" placement="bottom">
            <el-button
              :icon="wsStatusIcon"
              :type="wsStatusType"
              :loading="webSocketStore.connectionStatus === 'connecting'"
              circle
              @click="handleWsStatusClick"
              :disabled="webSocketStore.connectionStatus === 'connecting'"
              plain
            />
          </el-tooltip>
          <el-tooltip content="显示/隐藏实时日志面板">
            <div class="icon-button-wrapper" @click="webSocketStore.toggleLogPanel">
              <IconPanelToggle :is-open="webSocketStore.isLogPanelVisible" />
            </div>
          </el-tooltip>
          <el-dropdown>
            <span class="el-dropdown-link">
              Admin
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>Profile</el-dropdown-item>
                <el-dropdown-item>Settings</el-dropdown-item>
                <el-dropdown-item divided>Logout</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <!-- 新增：中止调试任务按钮 -->
          <el-tooltip content="中止当前正在运行的即时调试任务" placement="bottom" v-if="webSocketStore.isAdhocTaskRunning">
            <el-button
              type="danger"
              :icon="CircleClose"
              @click="handleAbortAdhocTask"
              :loading="webSocketStore.isAbortingAdhocTask"
              circle
              plain
            />
          </el-tooltip>
        </div>
      </el-header>

      <div class="tabs-view-container">
        <el-tabs v-model="activeTab" type="card" class="page-tabs" closable @tab-click="handleTabClick" @tab-remove="handleTabRemove">
          <el-tab-pane v-for="tab in tabStore.tabs" :key="tab.path" :label="tab.title" :name="tab.path" />
        </el-tabs>
      </div>

      <div class="main-content-area">
        <router-view v-slot="{ Component, route }">
          <transition name="fade-transform" mode="out-in">
            <keep-alive :include="tabStore.cachedViews">
              <component :is="Component" :key="route.fullPath" />
            </keep-alive>
          </transition>
        </router-view>
      </div>

      <el-footer class="layout-footer">AdFlowPro Admin ©2024</el-footer>
    </el-container>
    <StatusBar v-if="webSocketStore.isLogPanelVisible" />
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTabStore } from "@/stores/tabStore";
import Sidebar from "./components/Sidebar.vue";
import StatusBar from "@/components/StatusBar.vue";
import { useWebSocketStore } from "@/stores/webSocketStore";
import type { TabPaneName, TabsPaneContext } from "element-plus";

import { Fold, Expand, ArrowDown, Link, Connection, Loading } from "@element-plus/icons-vue";
import { CircleClose } from "@element-plus/icons-vue"; // 新增图标

const route = useRoute();
const router = useRouter();
const tabStore = useTabStore();
const webSocketStore = useWebSocketStore();

// --- 折叠逻辑保留在布局中，因为它控制 el-aside 的宽度 ---
const isCollapse = ref(false);
const asideWidth = computed(() => (isCollapse.value ? "64px" : "220px"));
const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value;
};

const wsStatusTooltip = computed(() => {
  switch (webSocketStore.connectionStatus) {
    case "connected":
      return "实时通知服务已连接";
    case "disconnected":
      return "实时通知服务已断开，点击重连";
    case "connecting":
      return "正在连接实时通知服务...";
    default:
      return "未知状态";
  }
});

const wsStatusIcon = computed(() => {
  switch (webSocketStore.connectionStatus) {
    case "connected":
      return Link;
    case "disconnected":
      return Connection;
    case "connecting":
      return Loading;
    default:
      return Connection;
  }
});

const wsStatusType = computed(() => {
  switch (webSocketStore.connectionStatus) {
    case "connected":
      return "success";
    case "disconnected":
      return "danger";
    case "connecting":
      return "default";
    default:
      return "info";
  }
});

const handleWsStatusClick = () => {
  if (webSocketStore.connectionStatus === "disconnected") {
    webSocketStore.connect();
  }
};

const handleAbortAdhocTask = () => {
  if (webSocketStore.currentAdhocTask) {
    webSocketStore.abortCurrentAdhocTask();
  }
};

const activeTab = computed({
  get: () => tabStore.activeTabPath,
  set: (path) => tabStore.setActiveTab(path),
});

const handleTabClick = (pane: TabsPaneContext) => {
  const path = pane.props.name as string;
  if (path && path !== route.fullPath) {
    router.push(path);
  }
};

const handleTabRemove = (path: TabPaneName) => {
  tabStore.removeTab(path as string);
};

watch(
  () => route.fullPath,
  (newPath) => {
    tabStore.addTab(route);
    tabStore.setActiveTab(newPath);
  },
  { immediate: true }
);
</script>

<style scoped>
.main-layout {
  height: 100vh;
  overflow: hidden;
}
.el-aside {
  transition: width 0.28s;
}
.layout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  padding: 0 20px;
  height: 40px;
  gap: 15px;
}
.collapse-icon {
  cursor: pointer;
  font-size: 20px;
  margin-right: 15px;
}
.tabs-view-container {
  background-color: #f0f2f5;
  padding: 5px 10px 0 10px;
  border-bottom: 1px solid #dcdfe6;
  flex-shrink: 0;
}
.page-tabs {
  --el-tabs-card-height: 32px;
  --el-tabs-header-margin: 0;
}
:deep(.el-tabs__header) {
  border: none;
  margin-bottom: -1px;
}
:deep(.el-tabs__nav) {
  border: none !important;
}
:deep(.el-tabs__item) {
  background-color: #fff;
  border-radius: 4px 4px 0 0 !important;
  border-color: #e4e7ed !important;
  font-size: 13px;
  transition: all 0.2s;
}
:deep(.el-tabs__item.is-active) {
  background-color: #fff;
  border-bottom-color: #fff !important;
  color: var(--el-color-primary);
}
.main-content-area {
  flex-grow: 1;
  overflow: auto; /* Allow content to scroll */
  /* padding: 10px; Let child pages control their own padding */
  background-color: #f0f2f5;
}
.layout-footer {
  height: 20px; /* Reduced height */
  line-height: 20px;
  text-align: center;
  font-size: 12px;
  color: #909399;
  background-color: #f0f2f5;
  border-top: 1px solid #e6e6e6;
  flex-shrink: 0;
}
.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all 0.3s;
}
.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}
.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
.el-dropdown-link {
  cursor: pointer;
  display: flex;
  align-items: center;
}
.header-actions-right {
  display: flex;
  align-items: center;
  gap: 20px; /* Increase gap for better spacing */
}
.icon-button-wrapper {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px; /* Control icon size */
  color: var(--el-text-color-regular);
  transition: color 0.2s;
}
.icon-button-wrapper:hover {
  color: var(--el-color-primary);
}
</style>
