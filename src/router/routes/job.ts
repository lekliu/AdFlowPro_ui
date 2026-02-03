// FILE: AdFlowPro_ui/src/router/routes/job.ts
import type { RouteRecordRaw } from "vue-router";

const jobRoutes: Array<RouteRecordRaw> = [
  {
    path: "jobs",
    name: "JobsList",
    component: () => import("@/pages/jobs/JobsListPage.vue"),
    meta: { title: "任务历史", icon: "DataLine" },
  },
  {
    path: "jobs/:jobId",
    name: "JobDetail",
    component: () => import("@/pages/jobs/JobDetailPage.vue"),
    props: true,
    meta: { title: (route) => `任务详情 - #${route.params.jobId}`, icon: "Monitor" },
  },
];

export default jobRoutes;
