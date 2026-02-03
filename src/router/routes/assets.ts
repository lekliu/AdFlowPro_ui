// FILE: AdFlowPro_ui/src/router/routes/assets.ts
import type { RouteRecordRaw } from "vue-router";

const assetRoutes: Array<RouteRecordRaw> = [
  // L1 - Atoms
  {
    path: "atomic-operations",
    name: "AtomsList",
    component: () => import("@/pages/atoms/AtomsListPage.vue"),
    meta: { title: "原子操作", icon: "Operation" },
  },
  {
    path: "atomic-operations/edit/:atomId?",
    name: "AtomEditor",
    component: () => import("@/pages/atoms/AtomEditorPage.vue"),
    props: true,
    meta: { title: (route) => (route.params.atomId ? "编辑原子操作" : "新建原子操作"), icon: "Edit" },
  },
  // L2 - Packages
  {
    path: "test-packages",
    name: "TestPackagesList",
    component: () => import("@/pages/packages/TestPackagesListPage.vue"),
    meta: { title: "测试包", icon: "TakeawayBox" }, // [修复] 补全图标
  },
  {
    path: "test-packages/edit/:packageId?",
    name: "TestPackageEditor",
    component: () => import("@/pages/packages/TestPackageEditorPage.vue"),
    props: true,
    meta: { title: (route) => (route.params.packageId ? "编辑测试包" : "新建测试包") },
  },
  // L3 - Cases
  {
    path: "test-cases",
    name: "TestCasesList",
    component: () => import("@/pages/cases/TestCasesListPage.vue"),
    meta: { title: "测试用例", icon: "DocumentCopy" }, // [修复] 补全图标
  },
  {
    path: "test-cases/edit/:caseId?",
    name: "TestCaseEditor",
    component: () => import("@/pages/cases/TestCaseEditorPage.vue"),
    props: true,
    meta: { title: (route) => (route.params.caseId ? "编辑测试用例" : "新建测试用例") },
  },
  // L4 - Suites
  {
    path: "test-suites",
    name: "TestSuitesList",
    component: () => import("@/pages/suites/TestSuitesListPage.vue"),
    meta: { title: "测试套件", icon: "Reading" }, // [修复] 补全图标
  },
  {
    path: "test-suites/edit/:suiteId?",
    name: "TestSuiteEditor",
    component: () => import("@/pages/suites/TestSuiteEditorPage.vue"),
    props: true,
    meta: { title: (route) => (route.params.suiteId ? "编辑测试套件" : "新建测试套件") },
  },

  // Image Templates
  {
    path: "image-templates",
    name: "ImageTemplateList",
    component: () => import("@/pages/assets/ImageTemplatesPage.vue"),
    meta: { title: "图元模板", icon: "Picture" }, // [修复] 补全图标
  },
  {
    path: "ai-models",
    name: "AiModelList",
    component: () => import("@/pages/assets/AiModelsPage.vue"),
    meta: { title: "AI 模型库", icon: "Cpu" }, // [修复] 补全图标
  },
];

export default assetRoutes;
