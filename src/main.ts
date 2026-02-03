// src/main.ts
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";
import logger from "./utils/logger";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import { loader } from "@guolao/vue-monaco-editor";

loader.config({
    paths: {
        vs: "/vs",
    },
});

logger.info("AdFlowPro UI is starting...");

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// 全局注册所有图标，以便通过字符串名称使用 <component :is="iconName" />
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus);
app.mount("#app");
logger.info("AdFlowPro UI has been mounted successfully.");
