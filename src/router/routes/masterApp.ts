// FILE: AdFlowPro_ui/src/router/routes/masterApp.ts
import type { RouteRecordRaw } from "vue-router";

const masterAppRoutes: Array<RouteRecordRaw> = [
  {
    path: "apps",
    name: "MasterApps",
    component: () => import("@/pages/apps/MasterAppsPage.vue"),
    meta: { title: "主应用目录", icon: "Collection" },
  },
];

export default masterAppRoutes;
