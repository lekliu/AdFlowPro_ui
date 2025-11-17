// src/main.ts
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";
import logger from "./utils/logger";

// --- Import Element Plus ---
import ElementPlus from "element-plus";
import "element-plus/dist/index.css"; // Import Element Plus styles
// (Optional) If you need to import a specific locale for Element Plus
// import locale from 'element-plus/dist/locale/zh-cn.mjs' // Example: Chinese

logger.info("AdFlowPro UI is starting..."); // <--- 2. 添加启动日志

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// --- Use Element Plus ---
app.use(ElementPlus); // For global registration
// app.use(ElementPlus, { locale }) // If using a specific locale

app.mount("#app");
logger.info("AdFlowPro UI has been mounted successfully."); // <--- 3. 添加挂载成功日志
