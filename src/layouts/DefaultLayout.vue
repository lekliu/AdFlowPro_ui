<template>
  <el-container class="main-layout">
    <el-aside :width="asideWidth">
      <Sidebar :is-collapse="isCollapse" />
    </el-aside>

    <el-container>
      <el-header class="layout-header">
        <div class="header-left">
          <el-icon @click="toggleCollapse" class="collapse-icon">
            <component :is="isCollapse ? Expand : Fold" />
          </el-icon>
          <div class="header-title-wrapper">
            <span class="main-title">AdFlowPro 管理后台</span>
            <span class="tenant-tag" v-if="authStore.user?.tenantName">({{ authStore.user.tenantName }})</span>
          </div>
        </div>

        <div class="header-actions-right">
          <!-- WebSocket 状态指示器 -->
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

          <!-- 日志面板开关 -->
          <el-tooltip content="显示/隐藏实时日志面板">
            <div class="icon-button-wrapper" @click="webSocketStore.toggleLogPanel">
              <IconPanelToggle :is-open="webSocketStore.isLogPanelVisible" />
            </div>
          </el-tooltip>

          <!-- 用户信息下拉菜单 -->
          <el-dropdown trigger="click">
            <span class="user-profile-link">
              <el-avatar :size="28" :icon="UserFilled" class="user-avatar" />
              <div class="user-info">
                <span class="user-name">{{ authStore.user?.fullName || authStore.user?.username }}</span>
                <el-tag size="small" :type="authStore.isAdmin ? 'danger' : 'info'" effect="plain" class="role-tag">
                  {{ authStore.user?.role }}
                </el-tag>
              </div>
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <span>租户: {{ authStore.user?.tenantId }}</span>
                </el-dropdown-item>
                <el-dropdown-item :icon="User" @click="openProfileDialog">个人中心</el-dropdown-item>
                <el-dropdown-item :icon="Setting">系统设置</el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout" class="logout-item">
                  <el-icon><SwitchButton /></el-icon>
                  <span>退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
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

  <!-- ... 在组件底部添加对话框 ... -->
  <el-dialog v-model="profile.visible" title="修改个人资料" width="400px">
    <el-form :model="profile.form" label-width="80px">
      <el-form-item label="用户名">
        <el-input :value="authStore.user?.username" disabled />
      </el-form-item>
      <el-form-item label="姓名">
        <el-input v-model="profile.form.fullName" />
      </el-form-item>
      <el-form-item label="新密码">
        <el-input v-model="profile.form.password" type="password" placeholder="不修改请留空" show-password />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="profile.visible = false">取消</el-button>
      <el-button type="primary" @click="handleUpdateProfile" :loading="profile.submitting">保存修改</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTabStore } from "@/stores/tabStore";
import Sidebar from "./components/Sidebar.vue";
import StatusBar from "@/components/StatusBar.vue";
import { useWebSocketStore } from "@/stores/webSocketStore";
import { useAuthStore } from "@/stores/authStore";
import { ElMessageBox, ElMessage, type TabPaneName, type TabsPaneContext } from "element-plus";
import IconPanelToggle from "@/components/icons/IconPanelToggle.vue";

import {
  Fold, Expand, ArrowDown, Link, Connection, Loading,
  UserFilled, User, Setting, SwitchButton
} from "@element-plus/icons-vue";
import apiClient from "@/api/apiClient";

const route = useRoute();
const router = useRouter();
const tabStore = useTabStore();
const webSocketStore = useWebSocketStore();
const authStore = useAuthStore();

// --- 侧边栏折叠逻辑 ---
const isCollapse = ref(false);
const asideWidth = computed(() => (isCollapse.value ? "64px" : "220px"));
const toggleCollapse = () => { isCollapse.value = !isCollapse.value; };

// --- WebSocket 状态指示逻辑 (补全这部分) ---
const wsStatusTooltip = computed(() => {
  switch (webSocketStore.connectionStatus) {
    case "connected": return "实时通知服务已连接";
    case "disconnected": return "实时通知服务已断开，点击重连";
    case "connecting": return "正在连接实时通知服务...";
    default: return "未知状态";
  }
});

const wsStatusIcon = computed(() => {
  switch (webSocketStore.connectionStatus) {
    case "connected": return Link;
    case "disconnected": return Connection;
    case "connecting": return Loading;
    default: return Connection;
  }
});

const wsStatusType = computed(() => {
  switch (webSocketStore.connectionStatus) {
    case "connected": return "success";
    case "disconnected": return "danger";
    case "connecting": return "default";
    default: return "info";
  }
});

const handleWsStatusClick = () => {
  if (webSocketStore.connectionStatus === "disconnected") {
    webSocketStore.connect();
  }
};

// --- 退出登录逻辑 ---
const handleLogout = () => {
  ElMessageBox.confirm('确认退出登录吗？', '系统提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    authStore.logout();
    router.push('/login');
    ElMessage.success('已退出登录');
  }).catch(() => {});
};

// --- Tab 标签页管理逻辑 ---
const activeTab = computed({
  get: () => tabStore.activeTabPath,
  set: (path) => tabStore.setActiveTab(path),
});

const handleTabClick = (pane: TabsPaneContext) => {
  const path = pane.props.name as string;
  if (path && path !== route.fullPath) { router.push(path); }
};

const handleTabRemove = (path: TabPaneName) => { tabStore.removeTab(path as string); };

const profile = reactive({
  visible: false,
  submitting: false,
  form: { fullName: '', password: '' }
});

const openProfileDialog = () => {
  profile.form.fullName = authStore.user?.fullName || '';
  profile.form.password = '';
  profile.visible = true;
};

const handleUpdateProfile = async () => {
  profile.submitting = true;
  try {
    const payload: any = { fullName: profile.form.fullName };
    if (profile.form.password) payload.password = profile.form.password;

    const updatedUser: any = await apiClient.put('/system/users/me', payload);

    // 同步更新本地 Store 里的用户信息
    authStore.setAuth(authStore.token, {
      ...authStore.user,
      fullName: updatedUser.fullName
    });

    ElMessage.success('资料已成功更新');
    profile.visible = false;
  } catch (e) {
    // 错误由拦截器处理
  } finally {
    profile.submitting = false;
  }
};

watch(() => route.fullPath, (newPath) => {
  tabStore.addTab(route);
  tabStore.setActiveTab(newPath);
}, { immediate: true });
</script>

<style scoped>
.main-layout { height: 100vh; overflow: hidden; }
.el-aside { transition: width 0.28s; }
.layout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  padding: 0 20px;
  height: 48px;
}
.header-left { display: flex; align-items: center; font-weight: 600; }
.collapse-icon { cursor: pointer; font-size: 20px; margin-right: 15px; }
.header-actions-right { display: flex; align-items: center; gap: 15px; }
.icon-button-wrapper { cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; color: var(--el-text-color-regular); }

.user-profile-link { display: flex; align-items: center; cursor: pointer; padding: 0 8px; height: 48px; transition: background-color 0.2s; }
.user-profile-link:hover { background-color: #f6f6f6; }
.user-info { margin-left: 10px; display: flex; flex-direction: column; align-items: flex-start; line-height: 1.2; }
.user-name { font-size: 14px; font-weight: 500; color: var(--el-text-color-primary); }
.role-tag { margin-top: 2px; height: 18px; padding: 0 4px; font-size: 10px; }
.user-avatar { background-color: var(--el-color-primary-light-7); color: var(--el-color-primary); }
.logout-item { color: var(--el-color-danger); }

.tabs-view-container { background-color: #f0f2f5; padding: 5px 10px 0 10px; border-bottom: 1px solid #dcdfe6; }
.main-content-area { flex-grow: 1; overflow: auto; background-color: #f0f2f5; }
.layout-footer { height: 20px; line-height: 20px; text-align: center; font-size: 12px; color: #909399; background-color: #f0f2f5; border-top: 1px solid #e6e6e6; }
.fade-transform-leave-active, .fade-transform-enter-active { transition: all 0.3s; }
.fade-transform-enter-from { opacity: 0; transform: translateX(-30px); }
.fade-transform-leave-to { opacity: 0; transform: translateX(30px); }
/* 在 DefaultLayout.vue 的 style 块中添加 */
.header-title-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.main-title {
  font-size: 16px;
  font-weight: 600;
}

.tenant-tag {
  font-size: 14px;
  color: var(--el-color-primary);
  font-weight: normal;
  opacity: 0.8;
}
</style>