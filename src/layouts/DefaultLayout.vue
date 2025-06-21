<template>
  <el-container class="main-layout">
    <el-aside :width="asideWidth">
      <div class="layout-logo">
        <!-- <img src="@/assets/logo.svg" alt="Logo" /> Optional Logo -->
        <h3>AdFlowPro Admin</h3>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical-demo"
        router
        :collapse="isCollapse"
      >
        <el-menu-item index="/">
          <el-icon><House /></el-icon>
          <template #title>Dashboard</template>
        </el-menu-item>
        <el-menu-item index="/devices">
          <el-icon><Platform /></el-icon>
          <template #title>Devices</template>
        </el-menu-item>
        <!-- Add more menu items here -->
        <!--
          <el.sub-menu index="/management">
            <template #title>
              <el-icon><setting /></el-icon>
              <span>Management</span>
            </template>
            <el-menu-item index="/management/users">Users</el-menu-item>
            <el-menu-item index="/management/roles">Roles</el-menu-item>
          </el.sub-menu>
          -->
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="layout-header">
        <div>
          <el-icon
            @click="toggleCollapse"
            style="cursor: pointer; font-size: 20px; margin-right: 15px"
            ><Fold
          /></el-icon>
          <span>Welcome to AdFlowPro Management</span>
        </div>
        <div>
          <!-- User profile / logout -->
          <el-dropdown>
            <span class="el-dropdown-link">
              Admin<el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>Profile</el-dropdown-item>
                <el-dropdown-item>Settings</el-dropdown-item>
                <el-dropdown-item divided>Logout</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="layout-main-content">
        <router-view v-slot="{ Component, route }">
          <transition name="fade-transform" mode="out-in">
            <keep-alive :include="cachedViews">
              <component :is="Component" :key="route.fullPath" />
            </keep-alive>
          </transition>
        </router-view>
      </el-main>
      <el-footer class="layout-footer">AdFlowPro Admin ©2024</el-footer>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import {
  House,
  Platform,
  Setting, // For potential submenu
  Fold, // For collapse icon
  ArrowDown,
} from "@element-plus/icons-vue"; // Import icons

const route = useRoute();
const isCollapse = ref(false);
const asideWidth = computed(() => (isCollapse.value ? "64px" : "220px"));
const activeMenu = computed(() => route.path);

// For KeepAlive (optional, more advanced)
const cachedViews = ref<string[]>([]); // e.g., ['DevicesListPage'] if you want to cache it

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value;
};
</script>

<style scoped>
.main-layout {
  height: 100vh;
  overflow: hidden; /* Prevent scrollbars on the main container */
}

.layout-logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #001529; /* Example dark background for logo area */
  color: white;
  overflow: hidden;
}
.layout-logo img {
  height: 32px;
  margin-right: 8px;
}
.layout-logo h3 {
  margin: 0;
  font-size: 18px;
  white-space: nowrap;
}

.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 220px; /* Should match asideWidth when not collapsed */
  min-height: 400px; /* Example */
}
.el-menu {
  border-right: none; /* Remove default border if not desired */
  height: calc(100vh - 60px); /* Full height minus logo area */
  overflow-y: auto;
}

.layout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  padding: 0 20px;
  height: 60px; /* Standard header height */
}

.layout-main-content {
  padding: 20px;
  background-color: #f0f2f5; /* Light grey background for content area */
  overflow-y: auto; /* Allow content to scroll */
  height: calc(100vh - 60px - 40px); /* Full height minus header and footer */
}
.layout-footer {
  height: 40px;
  line-height: 40px;
  text-align: center;
  font-size: 12px;
  color: #909399;
  background-color: #f0f2f5;
  border-top: 1px solid #e6e6e6;
}

/* Transition for router-view */
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
</style>
