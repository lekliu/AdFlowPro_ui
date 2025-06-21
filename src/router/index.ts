import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import DefaultLayout from "@/layouts/DefaultLayout.vue";
import DashboardPage from "@/pages/DashboardPage.vue";
import DevicesListPage from "@/pages/DevicesListPage.vue";
import DeviceDetailPage from "@/pages/DeviceDetailPage.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    component: DefaultLayout,
    children: [
      {
        path: "",
        name: "Dashboard",
        component: DashboardPage, // Or redirect to devices list
      },
      {
        path: "devices",
        name: "DevicesList",
        component: DevicesListPage,
      },
      {
        path: "devices/:deviceId", // Dynamic segment for device ID
        name: "DeviceDetail",
        component: DeviceDetailPage,
        props: true, // Pass route.params as props to the component
      },
      // Add more routes for settings, logs, etc.
    ],
  },
  // (Optional) Login route if authentication is added
  // {
  //   path: '/login',
  //   name: 'Login',
  //   component: () => import('@/pages/LoginPage.vue'), // Lazy load
  // },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // Or createWebHashHistory()
  routes,
});

// (Optional) Navigation guards for authentication
// router.beforeEach((to, from, next) => {
//   const authStore = useAuthStore(); // Assuming you have an auth store
//   if (to.meta.requiresAuth && !authStore.isAuthenticated) {
//     next({ name: 'Login' });
//   } else {
//     next();
//   }
// });

export default router;
