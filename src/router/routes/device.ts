// FILE: AdFlowPro_ui/src/router/routes/device.ts
import type { RouteRecordRaw } from "vue-router";

const deviceRoutes: Array<RouteRecordRaw> = [
  {
    path: "devices",
    name: "DevicesList",
    component: () => import("@/pages/devices/DevicesListPage.vue"),
    meta: { title: "设备管理" },
  },
  {
    path: "devices/:deviceId",
    name: "DeviceDetail",
    component: () => import("@/pages/devices/DeviceDetailPage.vue"),
    props: true,
    meta: { title: (route) => `设备 - ${route.params.deviceId}` }, // Simplified title for now
  },
];

export default deviceRoutes;
