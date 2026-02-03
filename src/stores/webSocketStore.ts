// FILE: AdFlowPro_ui/src/stores/webSocketStore.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue"; // <-- 导入 computed
import logger from "@/utils/logger";
import { ElNotification } from "element-plus";
import { wsService } from "@/services/wsService";
import { useDeviceStore } from "@/stores/deviceStore";
import {useAuthStore} from "./authStore";

// Define a type for our log entries for better structure
export interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  payload?: any; // Optional structured payload for details
}

type ConnectionStatus = "connected" | "disconnected" | "connecting";

interface AdhocTaskInfo {
  correlationId: string;
  deviceId: string;
}

// Function to get the base WebSocket URL from the HTTP base URL
const getWebSocketBaseUrl = (): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host; // 这里在开发环境下会拿到 localhost:5173

  // 这里必须要以 /ws 开头，才能被 vite.config.ts 中的代理捕获
  return `${protocol}://${host}/ws/ui-notifications`;
};

export const useWebSocketStore = defineStore("uiWebSocket", () => {
  const connectionStatus = ref<ConnectionStatus>("disconnected");
  const isConnected = computed(() => connectionStatus.value === "connected");
  const logs = ref<LogEntry[]>([]);
  const isLogPanelVisible = ref(false);

  const currentAdhocTask = ref<AdhocTaskInfo | null>(null);
  const isAbortingAdhocTask = ref(false);

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

    const authStore = useAuthStore();
    const wsUrl = getWebSocketBaseUrl();
    logger.info(`[WS-UI] Connecting to ${wsUrl} with token...`);
    addLog(`正在连接到服务器实时通知服务...`, "info");
    connectionStatus.value = "connecting"; // Set state to connecting
    // 核心修正：连接时携带 Token
    ws = new WebSocket(`${wsUrl}?token=${authStore.token}`);

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
            data.type === "apk_pull_complete" ||
            data.type === "job_step_update" ||
            data.type === "job_status_change"||
            data.type === "live_variables_ready"
        ) {
          const customEvent = new CustomEvent(data.type, { detail: payload });
          window.dispatchEvent(customEvent);
          logger.info(`[WS-UI] Dispatched browser event: ${data.type}`, payload);
          return; // Don't add to log panel
        }

        // --- [新增] 设备上下线状态同步事件 ---
        if (data.type === "device_connected") {
          const deviceStore = useDeviceStore();
          deviceStore.setDeviceOnline(payload.deviceId, true);
          addLog(`设备上线: ${payload.deviceId}`, "success");
          return;
        }
        if (data.type === "device_disconnected") {
          const deviceStore = useDeviceStore();
          deviceStore.setDeviceOnline(payload.deviceId, false);
          addLog(`设备下线: ${payload.deviceId}`, "warning");
          return;
        }

        // --- 2. 识别并处理即时任务生命周期事件 ---
        if (data.type === "adhocTaskCreated") {
          currentAdhocTask.value = {
            correlationId: payload.correlationId,
            deviceId: payload.deviceId,
          };
          isAbortingAdhocTask.value = false; // Reset aborting state
          addLog(`一个新的即时调试任务已启动 (ID: ${payload.correlationId?.slice(0, 8)}...)`, "info");
          return;
        }
        if (data.type === "adhocTaskAbortSent") {
          isAbortingAdhocTask.value = false;
          addLog(`中止指令已发送至任务 (ID: ${payload.correlationId?.slice(0, 8)}...)`, "warning");
          return;
        }

        let message = `收到消息: ${data.type}`;
        let type: LogEntry["type"] = "info";
        let isTerminalMessage = false;

        // --- 3. 处理不同类型的终端消息 ---
        const correlationId = payload.correlationId || ""; // <-- 安全地获取ID

        if (data.type === "live_validation_result" || data.type === "live_test_result") {
          isTerminalMessage = true; // 标记这是一个终结消息

          // --- 关键调试日志：提前打印ID ---
          console.log("[ID_COMPARISON] Checking for task completion:", {
            storedTaskId: currentAdhocTask.value?.correlationId,
            receivedTaskId: correlationId,
            areEqual: currentAdhocTask.value?.correlationId === correlationId
          });

          if (payload.success) {
            type = "success";
            
            // Enhanced formatting for match results
            if (data.type === "live_validation_result" && payload.foundNode) {
              const node = payload.foundNode;
              const boundsStr = node.boundsInScreen ? `[${node.boundsInScreen.join(", ")}]` : "N/A";
              let details = "";
              
              if (node.text) details += ` Text: "${node.text}"`;
              if (node.contentDescription) details += ` Desc: "${node.contentDescription}"`;
              if (node.className) details += ` Class: ${node.className.split('.').pop()}`; // Short class name
              if (node.score) details += ` Score: ${node.score.toFixed(2)}`;
              if (payload.regexGroups && payload.regexGroups.length > 0) {
                details += ` | Regex Capture: [${payload.regexGroups.join(", ")}]`;
              }

              message = `[${correlationId.slice(0, 8)}] ✅ 匹配成功! ${details} @ ${boundsStr}`;
            } else {
              // Default success message
              message = `[${correlationId.slice(0, 8)}] ✅ ${payload.message || '操作成功'}`;
            }

          } else {
            if (payload.message && payload.message.toLowerCase().includes("cancel")) {
              type = "warning";
              message = `[${correlationId.slice(0, 8)}] 🟡 ${payload.message}`;
            } else {
              type = "error";
              message = `[${correlationId.slice(0, 8)}] ❌ ${payload.message || '操作失败'}`;
            }
          }
        }

        // --- 4. 统一处理日志和状态清理 ---
        addLog(message, type, payload);

        if (isTerminalMessage && currentAdhocTask.value?.correlationId === correlationId) {
          logger.info(`[AdhocTask] Task ${correlationId} finished. Clearing state.`);
          currentAdhocTask.value = null;
          isAbortingAdhocTask.value = false;
        }

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

  const isAdhocTaskRunning = computed(() => !!currentAdhocTask.value);



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
    currentAdhocTask,
    isAdhocTaskRunning,
    isAbortingAdhocTask,
  };
});
