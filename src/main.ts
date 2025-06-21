// src/main.ts
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";

// --- Import Element Plus ---
import ElementPlus from "element-plus";
import "element-plus/dist/index.css"; // Import Element Plus styles
// (Optional) If you need to import a specific locale for Element Plus
// import locale from 'element-plus/dist/locale/zh-cn.mjs' // Example: Chinese

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// --- Use Element Plus ---
app.use(ElementPlus); // For global registration
// app.use(ElementPlus, { locale }) // If using a specific locale

app.mount("#app");
