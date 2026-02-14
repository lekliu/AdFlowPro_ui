// FILE: AdFlowPro_ui/src/router/routes/data.ts
import type { RouteRecordRaw } from "vue-router";

const dataRoutes: Array<RouteRecordRaw> = [
    {
        path: "data/dashboard",
        name: "DataDashboard",
        component: () => import("@/pages/data/DataCenterPage.vue"),
        meta: { title: "业务看板", icon: "DataAnalysis" },
    },
    {
        path: "data/ai-gallery",
        name: "AiGallery",
        component: () => import("@/pages/data/AiImageGalleryPage.vue"),
        meta: { title: "AI 素材库", icon: "PictureFilled" },
    },
    {
        path: "data/alarms",
        name: "SystemAlarms",
        component: () => import("@/pages/data/SystemAlarmsPage.vue"),
        meta: { title: "系统告警", icon: "BellFilled" },
    }
];

export default dataRoutes;