// FILE: AdFlowPro_ui/src/router/routes/platform.ts
import type { RouteRecordRaw } from "vue-router";

const platformRoutes: Array<RouteRecordRaw> = [
  {
    path: "global-variables",
    name: "GlobalVariables",
    component: () => import("@/pages/variables/GlobalVariablesPage.vue"),
    meta: { title: "全局变量" },
  },
  {
    path: "scheduled-tasks",
    name: "ScheduledTasks",
    component: () => import("@/pages/scheduled-tasks/ScheduledTasksPage.vue"),
    meta: { title: "定时任务" },
  },
  {
    path: "platform-settings/atom-categories",
    name: "AtomCategories",
    component: () => import("@/pages/platform-settings/AtomCategoriesPage.vue"),
    meta: { title: "原子操作分类" },
  },
  {
    path: "platform-settings/import-export",
    name: "ImportExport",
    component: () => import("@/pages/platform-settings/ImportExportPage.vue"),
    meta: { title: "数据导入导出" },
  },
];

export default platformRoutes;
