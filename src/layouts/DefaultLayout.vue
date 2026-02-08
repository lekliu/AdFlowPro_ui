<template>
  <el-container class="main-layout">
    <el-aside :width="asideWidth" class="aside-border">
      <Sidebar :is-collapse="isCollapse" />
    </el-aside>

    <el-container>
      <el-header class="layout-header">
        <div class="header-left">
          <div class="collapse-wrapper" @click="toggleCollapse">
            <el-icon class="collapse-icon">
              <component :is="isCollapse ? Expand : Fold" />
            </el-icon>
          </div>
          <div class="header-title-wrapper">
            <span class="main-title">AdFlowPro</span>
            <span class="sub-title">管理控制台</span>
            <el-tag size="small" type="info" effect="plain" class="tenant-tag" v-if="authStore.user?.tenantName">
              {{ authStore.user.tenantName }}
            </el-tag>
          </div>
        </div>

        <div class="header-actions-right">
          <!-- 快捷工具组 -->
          <div class="tool-group">
            <el-tooltip :content="wsStatusTooltip" placement="bottom">
              <div class="action-item" @click="handleWsStatusClick">
                <el-icon :class="['status-icon', webSocketStore.connectionStatus]">
                  <component :is="wsStatusIcon" />
                </el-icon>
              </div>
            </el-tooltip>

            <el-tooltip content="实时日志" placement="bottom">
              <div class="action-item" @click="webSocketStore.toggleLogPanel">
                <IconPanelToggle :is-open="webSocketStore.isLogPanelVisible" />
              </div>
            </el-tooltip>
          </div>

          <el-divider direction="vertical" />

          <!-- 用户信息 -->
          <el-dropdown trigger="click">
            <div class="user-profile-trigger">
              <el-avatar :size="26" :icon="UserFilled" class="user-avatar" />
              <span class="user-name">{{ authStore.user?.fullName || authStore.user?.username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled class="tenant-info">
                  ID: {{ authStore.user?.tenantId }}
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

      <!-- 优化后的 Tabs 区域 -->
      <div class="tabs-view-container">
        <div class="tabs-flex-container">
          <el-tabs
              ref="tabsRef"
              v-model="activeTab"
              type="card"
              class="page-tabs"
              closable
              @tab-click="handleTabClick"
              @tab-remove="handleTabRemove"
          >
            <el-tab-pane v-for="tab in tabStore.tabs" :key="tab.path" :name="tab.path">
              <template #label>
                <span class="custom-tab-label">
                  <el-icon v-if="tab.icon" class="tab-icon"><component :is="tab.icon" /></el-icon>
                  <span>{{ tab.title }}</span>
                </span>
              </template>
            </el-tab-pane>
          </el-tabs>

          <div class="tabs-action-bar">
            <el-tooltip content="全部关闭" placement="bottom">
              <el-icon class="close-all-icon" @click="tabStore.closeAllTabs"><CircleClose /></el-icon>
            </el-tooltip>
          </div>
        </div>
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
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTabStore } from "@/stores/tabStore";
import Sidebar from "./components/Sidebar.vue";
import StatusBar from "@/components/StatusBar.vue";
import { useWebSocketStore } from "@/stores/webSocketStore";
import { useAuthStore } from "@/stores/authStore";
import { ElMessageBox, ElMessage, type TabPaneName, type TabsPaneContext } from "element-plus";
import IconPanelToggle from "@/components/icons/IconPanelToggle.vue";
import Sortable from "sortablejs";

import {
  Fold, Expand, ArrowDown, Link, Connection, Loading,
  UserFilled, User, Setting, SwitchButton, CircleClose
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
    tabStore.resetTabs();
    router.push('/login');
    ElMessage.success('已退出登录');
  }).catch(() => {});
};

const tabsRef = ref<any>(null);
let sortableInstance: Sortable | null = null;

// 初始化拖拽函数 (带保护)
const initDraggable = () => {
  nextTick(() => {
    // 1. 销毁可能存在的旧实例，防止重复绑定导致的内存泄露和冲突
    if (sortableInstance) {
      sortableInstance.destroy();
      sortableInstance = null;
    }

    const el = tabsRef.value?.$el.querySelector(".el-tabs__nav");
    if (el) {
      sortableInstance = Sortable.create(el, {
        animation: 150,
        // 【核心修复】增加延迟，只有按住 100ms 才会判定为拖拽
        // 这样快速点击菜单跳转时，Sortable 不会去抓取 DOM，彻底解决消失问题
        delay: 100,
        delayOnTouchOnly: false,
        touchStartThreshold: 5, // 容错位移
        ghostClass: "tab-ghost",
        onEnd: (evt) => {
          const { oldIndex, newIndex } = evt;
          if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
            tabStore.reorderTabs(oldIndex, newIndex);
          }
        },
      });
    }
  });
};

onMounted(initDraggable);

// 监听标签页数量变化，一旦发生“重大变更”重置拖拽引擎
watch(() => tabStore.tabs.length, () => {
  initDraggable();
});

onBeforeUnmount(() => {
  if (sortableInstance) sortableInstance.destroy();
});

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
.main-layout { height: 100vh; background-color: #f5f7fa; }
.aside-border { border-right: 1px solid #dcdfe6; transition: width 0.3s; }

.layout-header {
  background-color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  height: 50px;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
  z-index: 11;
}

.header-left { display: flex; align-items: center; }
.collapse-wrapper {
  padding: 0 12px;
  cursor: pointer;
  font-size: 18px;
  color: #606266;
  transition: color 0.3s;
}
.collapse-wrapper:hover { color: #409eff; }

.header-title-wrapper { margin-left: 8px; display: flex; align-items: baseline; gap: 6px; }
.main-title { font-size: 18px; font-weight: 700; color: #1f2d3d; }
.sub-title { font-size: 13px; color: #909399; }
.tenant-tag { margin-left: 8px; border-radius: 4px; }

.header-actions-right { display: flex; align-items: center; }
.tool-group { display: flex; gap: 4px; }
.action-item {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.3s;
  font-size: 18px;
  color: #606266;
}
.action-item:hover { background-color: #f5f7fa; }

/* 状态颜色 */
.status-icon.connected { color: #67c23a; }
.status-icon.connecting { color: #e6a23c; }
.status-icon.disconnected { color: #f56c6c; }

.user-profile-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  cursor: pointer;
  height: 40px;
  border-radius: 6px;
}
.user-profile-trigger:hover { background-color: #f5f7fa; }
.user-name { font-size: 14px; color: #606266; font-weight: 500; }

/* Tabs 样式美化 */
.tabs-view-container {
  background-color: #fff;
  padding: 6px 10px 0;
  border-bottom: 1px solid #e4e7ed;
}
.tabs-flex-container { display: flex; align-items: flex-end; }
.page-tabs { flex: 1; min-width: 0; }
:deep(.el-tabs--card > .el-tabs__header) { border-bottom: none; margin: 0; }
:deep(.el-tabs--card > .el-tabs__header .el-tabs__item) {
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  margin-right: 4px;
  height: 32px;
  line-height: 32px;
  background-color: #f4f4f5;
  transition: all 0.3s;
}
:deep(.el-tabs--card > .el-tabs__header .el-tabs__item.is-active) {
  background-color: #fff;
  border-bottom: 2px solid #409eff;
  color: #409eff;
}

.tabs-action-bar { padding: 0 8px 6px; }
.close-all-icon {
  cursor: pointer;
  font-size: 18px;
  color: #909399;
  transition: color 0.3s;
}
.close-all-icon:hover { color: #f56c6c; }

.main-content-area { flex: 1; padding: 16px; overflow-y: auto; }
</style>