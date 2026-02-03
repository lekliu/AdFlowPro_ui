<template>
  <div id="app-container">
    <router-view />
  </div>
</template>

<script setup lang="ts">
// No specific script logic needed for a simple root App.vue
// 在应用启动时初始化 WebSocket 连接
import { onMounted, onUnmounted } from "vue";
import { useWebSocketStore } from "@/stores/webSocketStore";

const wsStore = useWebSocketStore();

onMounted(() => {
  wsStore.connect();
});

onUnmounted(() => {
  wsStore.disconnect();
});
</script>

<style>
/*
  Global styles that apply to the entire application.
  Consider moving more specific styles to individual components or a global CSS file imported in main.ts.
*/

/* Example: Basic body styling for consistency */
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f0f2f5; /* A common background color for admin panels */
  color: #333; /* Default text color */
}

/* Ensure the app container takes full height if needed, though usually handled by layout */
#app-container {
  height: 100vh;
  /*
    If your DefaultLayout.vue already sets height: 100vh for el-container,
    this might not be strictly necessary, but it doesn't hurt.
  */
}

/*
  You might want to import Element Plus's base styles or your own global reset/normalize CSS here,
  or (more commonly) in your main.ts file.
  If you've configured unplugin-vue-components with ElementPlusResolver to handle styles,
  you might not need to explicitly import Element Plus CSS here or in main.ts.
  However, if you encounter styling issues, double-check your Element Plus setup.

  Example (if not auto-imported by resolver):
  @import 'element-plus/dist/index.css';
*/

/*
  Custom scrollbar styles (optional, for a more polished look across browsers)
  These are just examples and can be quite detailed.
*/
::-webkit-scrollbar {
  width: 1px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
