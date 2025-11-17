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

router.beforeEach((to, from, next) => {
  logger.log(`[Router] Navigating from: ${from.path} -> to: ${to.path}`);
  if (to.name) {
    logger.log(`[Router] Matched route name: ${String(to.name)}`);
  } else {
    logger.warn(`[Router] No route name matched for path: ${to.path}`);
  }
  next();
});

router.onError((error) => {
  logger.error("[Router] Error:", error);
});

export default router;
