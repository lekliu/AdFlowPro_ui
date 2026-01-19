import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path"; // Node.js path module for resolving paths

// For Element Plus auto-import
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env files based on the current mode (development, production, etc.)
  // This makes VITE_ prefixed environment variables available in process.env
  // and import.meta.env
  const env = loadEnv(mode, process.cwd(), ""); // Load all env vars, not just VITE_

  const viteApiBaseUrl = env.VITE_API_BASE_URL || "http://localhost:8000"; // Default if not set

  return {
    plugins: [
      vue(),
      AutoImport({
        // targets to transform
        include: [
          /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
          /\.vue$/,
          /\.vue\?vue/, // .vue
          /\.md$/, // .md
        ],
        // global imports to register
        imports: [
          "vue",
          "vue-router",
          "pinia",
          // '@vueuse/core', // if you use vueuse
          // custom
          // {
          //   '@vueuse/core': [
          //     // named imports
          //     'useMouse', // import { useMouse } from '@vueuse/core',
          //     // alias
          //     ['useFetch', 'useMyFetch'], // import { useFetch as useMyFetch } from '@vueuse/core',
          //   ],
          // },
        ],
        resolvers: [
          ElementPlusResolver(), // Auto import Element Plus components
        ],
        // Generate corresponding .d.ts file.
        dts: path.resolve(__dirname, "src/auto-imports.d.ts"),
        // Default is true, Linter error will exist if it's not false
        eslintrc: {
          enabled: true, // Default `false`
          filepath: "./.eslintrc-auto-import.json", // Default `./.eslintrc-auto-import.json`
          globalsPropValue: true, // Default `true`, (true | false | 'readonly' | 'readable' | 'writable' | 'writeable')
        },
      }),
      Components({
        resolvers: [
          ElementPlusResolver(), // Auto register Element Plus components
        ],
        // Specify custom location for d.ts file
        dts: path.resolve(__dirname, "src/components.d.ts"),
        // Allow subdirectories for components
        deep: true,
        // Filetype extensions for components to search for
        extensions: ["vue"],
        // search for subdirectories
        include: [/\.vue$/, /\.vue\?vue/],
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"), // Alias @ to /src folder
      },
    },
    server: {
      host: "0.0.0.0", // Listen on all network interfaces (useful for testing on mobile)
      port: 5173, // Default Vite port, you can change it
      open: true, // Automatically open the app in the browser on server start
      proxy: {
        // 转发 API 请求
        "/api/v1": {
          target: "http://127.0.0.1:8000",
          changeOrigin: true,
          // rewrite: (path) => path.replace(/^\/api\/v1/, '/api/v1') // 如果路径完全一致，这行可选
        },
        // 转发 WebSocket 请求 (核心：解决实时日志连接不上)
        "/ws": {
          target: "ws://127.0.0.1:8000",
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      sourcemap: false, // Generate source maps for production build (can be 'hidden' or false)
      rollupOptions: {
        output: {
          // Manual chunking for better caching (optional, Vite does a good job by default)
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("element-plus")) {
                return "vendor_element-plus";
              }
              // Create a common vendor chunk
              return "vendor";
            }
          },
        },
      },
    },
    // optimizeDeps: { // Optional: if you face issues with certain CJS dependencies
    //   include: ['element-plus/dist/locale/en.mjs', 'element-plus/dist/locale/zh-cn.mjs'],
    // },
  };
});
