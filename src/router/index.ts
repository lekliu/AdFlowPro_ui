// FILE: AdFlowPro_ui/src/router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw, type RouteLocationNormalized } from "vue-router";
import DefaultLayout from "@/layouts/DefaultLayout.vue";
import logger from "@/utils/logger";
import { useTabStore } from "@/stores/tabStore";

// --- 导入模块化路由 ---
import dashboardRoutes from "./routes/dashboard";
import deviceRoutes from "./routes/device";
import masterAppRoutes from "./routes/masterApp";
import assetRoutes from "./routes/assets";
import jobRoutes from "./routes/job";
import platformRoutes from "./routes/platform";
import { useAuthStore } from "@/stores/authStore";

// 为 meta.title 定义更具体的类型
declare module "vue-router" {
  interface RouteMeta {
    title: string | ((route: RouteLocationNormalized) => string);
    noCache?: boolean;
    icon?: string; // Optional: for dynamic sidebar generation later
  }
}

// --- 重构路由定义 ---
const routes: Array<RouteRecordRaw> = [
  {
    path: "/login",
    name: "Login",
    component: () => import("@/pages/LoginPage.vue"),
    meta: { title: "登录", noCache: true },
  },
  {
    path: "/",
    component: DefaultLayout,
    children: [...dashboardRoutes, ...deviceRoutes, ...masterAppRoutes, ...assetRoutes, ...jobRoutes, ...platformRoutes],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// ... (afterEach and beforeEach guards are correct and unchanged) ...
router.afterEach((to) => {
  const tabStore = useTabStore();
  tabStore.addTab(to);
});

// 全局守卫逻辑
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.name !== 'Login' && !authStore.isAuthenticated) {
    // 没登录且不是去登录页 -> 踢回登录页
    next({ name: 'Login' });
  } else if (to.name === 'Login' && authStore.isAuthenticated) {
    // 已登录还想去登录页 -> 踢回首页
    next({ name: 'Dashboard' });
  } else {
    next();
  }
});

router.onError((error) => {
  logger.error("[Router] Error:", error);
});

export default router;
