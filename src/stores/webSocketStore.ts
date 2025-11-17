// FILE: AdFlowPro_ui/src/stores/webSocketStore.ts
import { defineStore } from "pinia";
import { ref } from "vue";
import logger from "@/utils/logger";
import { ElNotification } from "element-plus";

// Define a type for our log entries for better structure
export interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  payload?: any; // Optional structured payload for details
}

type ConnectionStatus = "connected" | "disconnected" | "connecting";

// Function to get the base WebSocket URL from the HTTP base URL
const getWebSocketBaseUrl = (): string => {
  const httpUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const wsUrl = httpUrl.replace(/^http/, "ws").replace("/api/v1", "");
  return `${wsUrl}/ws/ui-notifications`;
};

export const useWebSocketStore = defineStore("uiWebSocket", () => {
  const connectionStatus = ref<ConnectionStatus>("disconnected");
  const isConnected = computed(() => connectionStatus.value === "connected");
  const logs = ref<LogEntry[]>([]);
  const isLogPanelVisible = ref(false);

  let ws: WebSocket | null = null;
  let logCounter = 0;
  let reconnectTimer: number | null = null;

  function addLog(message: string, type: LogEntry["type"], payload?: any) {
    const timestamp = new Date().toLocaleTimeString("en-GB");
    logs.value.unshift({ id: logCounter++, timestamp, message, type, payload });
    if (logs.value.length > 200) {
      logs.value.pop();
    }
  }

  function connect() {
    // 连接中状态检查
    if (ws || connectionStatus.value === "connecting") {
      logger.info(`[WS-UI] Connection attempt ignored. Status: ${connectionStatus.value}`);
      return;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    const wsUrl = getWebSocketBaseUrl();
    logger.info(`[WS-UI] Connecting to ${wsUrl}...`);
    addLog(`正在连接到服务器实时通知服务...`, "info");
    connectionStatus.value = "connecting"; // Set state to connecting

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      connectionStatus.value = "connected"; // Set state to connected
      logger.info("[WS-UI] Connection established.");
      addLog("实时通知服务连接成功！", "success");
      // ElNotification({ title: "实时连接成功", message: "已连接到服务器通知服务", type: "success", position: "bottom-right" });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        logger.debug("[WS-UI] Received message:", data);

        const payload = data.payload || {};

        // --- 1. 识别并派发自定义浏览器事件 ---
        if (
          data.type === "screen_data_ready" ||
          data.type === "ui_structure_ready" ||
          data.type === "app_list_ready" ||
          data.type === "apk_pull_complete"
        ) {
          const customEvent = new CustomEvent(data.type, { detail: payload });
          window.dispatchEvent(customEvent);
          logger.info(`[WS-UI] Dispatched browser event: ${data.type}`, payload);
          return; // Don't add to log panel
        }

        let message = `收到消息: ${data.type}`;
        let type: LogEntry["type"] = "info";

        if (data.type === "live_validation_result") {
          if (payload.success) {
            type = "success";
            let details = "";
            if (payload.foundNode) {
              const node = payload.foundNode;
              const source = `source="${node.source}"`;
              const text = node.text ? `text="${node.text}"` : "";
              const desc = node.contentDescription ? `desc="${node.contentDescription}"` : "";
              const bounds = `bounds=[${node.boundsInScreen.join(",")}]`;
              details = ` | 找到元素: { ${[source, text, desc, bounds].filter(Boolean).join(", ")} }`;
            }
            if (payload.regexGroups && payload.regexGroups.length > 0) {
              details += ` | 捕获内容: [${payload.regexGroups.map((g: string) => `"${g}"`).join(", ")}]`;
            }
            message = `[${payload.correlationId.slice(0, 10)}] ✅ 匹配验证成功${details}`;
          } else {
            type = "error";
            message = `[${payload.correlationId.slice(0, 10)}] ❌ ${payload.message}`;
          }
        } else if (data.type === "live_test_result") {
          if (payload.success) {
            type = "success";
            message = `[${payload.correlationId.slice(0, 10)}] ✅ ${payload.message}`;
          } else {
            type = "error";
            message = `[${payload.correlationId.slice(0, 10)}] ❌ ${payload.message}`;
          }
        }
        addLog(message, type, payload);
      } catch (e) {
        logger.error("[WS-UI] Error parsing message:", e);
        addLog(`接收到无法解析的消息: ${event.data}`, "error");
      }
    };

    ws.onerror = (error) => {
      logger.error("[WS-UI] WebSocket error:", error);
      addLog("实时通知服务连接出错。", "error");
    };

    ws.onclose = (event) => {
      connectionStatus.value = "disconnected"; // Set state to disconnected
      ws = null;
      logger.warn(`[WS-UI] Connection closed. Code: ${event.code}`);
      addLog(`实时通知服务已断开 (Code: ${event.code})`, "warning");
      // ElNotification({ title: "实时连接已断开", message: "与服务器的通知连接已关闭", type: "warning", position: "bottom-right" });

      // 自动重连逻辑
      if (!reconnectTimer) {
        reconnectTimer = window.setTimeout(() => {
          logger.info("[WS-UI] Attempting to auto-reconnect...");
          reconnectTimer = null;
          connect();
        }, 5000); // Reconnect after 5 seconds
      }
    };
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.onclose = null; // Prevent auto-reconnect on manual disconnect
      ws.close();
      ws = null;
      connectionStatus.value = "disconnected";
      addLog("手动断开实时通知服务。", "info");
    }
  }

  function sendMessage(message: object): boolean {
    if (isConnected.value && ws) {
      ws.send(JSON.stringify(message));
      logger.debug("[WS-UI] Sent message:", message);
      return true;
    } else {
      logger.error("[WS-UI] Cannot send message: WebSocket not connected.");
      return false;
    }
  }

  function toggleLogPanel() {
    isLogPanelVisible.value = !isLogPanelVisible.value;
  }

  function clearLogs() {
    logs.value = [];
    addLog("日志已清空。", "info");
  }

  return {
    isConnected,
    connectionStatus,
    logs,
    isLogPanelVisible,
    connect,
    disconnect,
    sendMessage,
    toggleLogPanel,
    clearLogs,
  };
});
