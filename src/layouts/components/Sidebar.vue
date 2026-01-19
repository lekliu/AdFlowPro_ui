<template>
  <div class="sidebar-container">
    <div class="layout-logo">
      <h3 v-show="!isCollapse">AdFlowPro管理</h3>
      <h3 v-show="isCollapse">AFP</h3>
    </div>
    <el-menu
      :default-active="activeMenu"
      class="el-menu-vertical-demo"
      router
      :collapse="isCollapse"
      background-color="#001529"
      text-color="#a6adb4"
      active-text-color="#ffffff"
    >
      <el-menu-item index="/">
        <el-icon><House /></el-icon>
        <template #title>Dashboard</template>
      </el-menu-item>

      <el-sub-menu index="/management">
        <template #title>
          <el-icon><Management /></el-icon>
          <span>应用与设备</span>
        </template>
        <el-menu-item index="/devices">
          <el-icon><Platform /></el-icon>
          <template #title>设备管理</template>
        </el-menu-item>
        <el-menu-item index="/apps">
          <el-icon><Collection /></el-icon>
          <template #title>主应用目录</template>
        </el-menu-item>
      </el-sub-menu>

      <el-sub-menu index="/assets">
        <template #title>
          <el-icon><Files /></el-icon>
          <span>资产管理</span>
        </template>
        <el-menu-item index="/atomic-operations">
          <el-icon><Operation /></el-icon>
          <span>原子操作</span>
        </el-menu-item>
        <el-menu-item index="/test-packages">
          <el-icon><TakeawayBox /></el-icon>
          <span>测试包</span>
        </el-menu-item>
        <el-menu-item index="/test-cases">
          <el-icon><DocumentCopy /></el-icon>
          <span>测试用例</span>
        </el-menu-item>
        <el-menu-item index="/test-suites">
          <el-icon><Reading /></el-icon>
          <span>测试套件</span>
        </el-menu-item>
        <el-menu-item index="/image-templates">
          <el-icon><Picture /></el-icon>
          <span>图元模板</span>
        </el-menu-item>
        <el-menu-item index="/ai-models">
          <el-icon><Cpu /></el-icon>
          <span>AI 模型库</span>
        </el-menu-item>
      </el-sub-menu>

      <el-sub-menu index="/automation">
        <template #title>
          <el-icon><Cpu /></el-icon>
          <span>自动化中心</span>
        </template>
        <el-menu-item index="/jobs">
          <el-icon><DataLine /></el-icon>
          <template #title>任务历史</template>
        </el-menu-item>
        <el-menu-item index="/scheduled-tasks">
          <el-icon><AlarmClock /></el-icon>
          <template #title>定时任务</template>
        </el-menu-item>
      </el-sub-menu>

      <el-sub-menu index="/platform-settings" v-if="userRole !== 'viewer'">
        <template #title>
          <el-icon><Setting /></el-icon>
          <span>平台设置</span>
        </template>
        
        <!-- 仅超管可见：租户管理 -->
        <el-menu-item v-if="userRole === 'super_admin'" index="/platform-settings/tenants">
          <el-icon><OfficeBuilding /></el-icon>
          <span>租户管理</span>
        </el-menu-item>

        <el-menu-item index="/global-variables">
          <el-icon><PriceTag /></el-icon>
          <span>全局变量</span>
        </el-menu-item>
        <el-menu-item index="/platform-settings/atom-categories">
          <el-icon><CollectionTag /></el-icon>
          <span>原子操作分类</span>
        </el-menu-item>
        
        <!-- 超管和租户管理员可见：成员管理与接入码 -->
        <el-menu-item v-if="['super_admin', 'admin'].includes(userRole)" index="/platform-settings/users">
          <el-icon><User /></el-icon>
          <span>成员管理</span>
        </el-menu-item>
        <el-menu-item v-if="['super_admin', 'admin'].includes(userRole)" index="/platform-settings/access-keys">
          <el-icon><Key /></el-icon>
          <span>接入码中心</span>
        </el-menu-item>
        
        <el-menu-item index="/platform-settings/import-export">
          <el-icon><UploadFilled /></el-icon>
          <span>数据导入导出</span>
        </el-menu-item>
      </el-sub-menu>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import {
  House,
  Platform,
  Collection,
  Files,
  Operation,
  TakeawayBox,
  DocumentCopy,
  Reading,
  DataLine,
  Setting,
  PriceTag,
  AlarmClock,
  Picture,
  Management,
  Cpu,
  Share,
  CollectionTag, 
  UploadFilled,
  User, Key,
  OfficeBuilding
} from "@element-plus/icons-vue";

defineProps<{
  isCollapse: boolean;
}>();

const route = useRoute();
const authStore = useAuthStore();
const activeMenu = computed(() => route.path);
const userRole = computed(() => authStore.user?.role);
</script>

<style scoped>
.sidebar-container {
  height: 100%;
  background-color: #001529;
  transition: width 0.28s;
  /* --- 关键改动 1: 将容器设置为 Flex 布局 --- */
  display: flex;
  flex-direction: column;
}

.layout-logo {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  overflow: hidden;
  /* --- 关键改动 2: Logo区域不收缩 --- */
  flex-shrink: 0;
}

.layout-logo h3 {
  margin: 0;
  font-size: 18px;
  white-space: nowrap;
}

.el-menu {
  border-right: none;
  /* --- 关键改动 3: 移除固定的 height 计算，让 Flexbox 控制 --- */
  /* height: calc(100% - 40px); */

  /* --- 关键改动 4: 自动填充剩余空间并处理内部滚动 --- */
  flex-grow: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Style adjustments for dark theme menu */
.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 220px;
}

/* --- 样式覆盖规则保持不变，以处理悬停等状态 --- */
:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover),
:deep(.el-sub-menu.is-active > .el-sub-menu__title),
:deep(.el-menu--collapse .el-sub-menu.is-opened > .el-sub-menu__title) {
  background-color: transparent !important;
}
</style>
