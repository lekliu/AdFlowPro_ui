// FILE: AdFlowPro_ui/src/router/routes/dashboard.ts
import type { RouteRecordRaw } from "vue-router";

const dashboardRoutes: Array<RouteRecordRaw> = [
  {
    path: "", // The root path relative to the parent layout
    name: "Dashboard",
    component: () => import("@/pages/DashboardPage.vue"),
    meta: { title: "Dashboard", noCache: true, icon: "House" },
  },
];

export default dashboardRoutes;
