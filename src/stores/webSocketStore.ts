// FILE: AdFlowPro_ui/src/stores/webSocketStore.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
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

  // [核心新增] 存储报警通知实例的 Map，Key 是 deviceId
  const alarmInstances = new Map<string, any>();

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
            data.type === "live_variables_ready" ||
            data.type === "live_test_result" ||
            data.type === "live_validation_result"
        ) {
          const customEvent = new CustomEvent(data.type, { detail: payload });
          window.dispatchEvent(customEvent);
          logger.info(`[WS-UI] Dispatched browser event: ${data.type}`, payload);

          // 【关键修改点】：如果是结果类消息，派发完事件后“不要”return，继续向下执行日志逻辑
          const isResultType = data.type === "live_test_result" || data.type === "live_validation_result";
          if (!isResultType) {
            return; // 只有非结果类的纯通知消息（如数据就绪）才提前结束
          }
        }

        // --- [新增] 设备上下线状态同步事件 ---
        if (data.type === "device_connected") {
          const deviceStore = useDeviceStore();
          deviceStore.setDeviceOnline(payload.deviceId, true);

          // [核心修复] 如果该设备之前在报警，自动解除并关闭弹窗
          if (alarmInstances.has(payload.deviceId)) {
            alarmInstances.get(payload.deviceId).close();
            alarmInstances.delete(payload.deviceId);
            console.log(`[ALARM] 设备 ${payload.deviceId} 已恢复，自动关闭报警弹窗`);
          }

          addLog(`设备上线: ${payload.deviceId}`, "success");
          return;
        }
        if (data.type === "device_disconnected") {
          const deviceStore = useDeviceStore();
          deviceStore.setDeviceOnline(payload.deviceId, false);
          addLog(`设备下线: ${payload.deviceId}`, "warning");
          return;
        }

        // --- 活跃设备异常离线报警 ---
        if (data.type === "device_critical_offline") {
          // 如果同一个设备已经有弹窗了，不再重复弹出
          if (alarmInstances.has(payload.deviceId)) return;

          const instance = ElNotification({
            title: "", // 标题留空，全部写在 message 里以撑满红色背景
            dangerouslyUseHTMLString: true,
            customClass: 'critical-alarm-box', // 增加自定义类名
            message: `
                <div style="background-color: #CC0000; margin: -20px; padding: 30px; border-radius: 4px; border: 3px solid #FFEB3B; box-shadow: 0 0 30px rgba(204,0,0,0.8); animation: pulse-red 1.5s infinite;">
                  <div style="color: #FFFFFF; font-size: 28px; font-weight: 900; text-align: center; margin-bottom: 15px; letter-spacing: 4px;">
                    🚨 设备离线
                  </div>
                  <div style="color: #FFEB3B; font-size: 20px; font-weight: bold; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 12px; text-align: center;">
                    ${payload.deviceName || payload.deviceId}
                  </div>
                  <div style="color: #FFFFFF; font-size: 15px; margin-top: 12px; text-align: center; opacity: 0.9;">
                    活跃插槽失联，请立即处理！
                  </div>
                </div>
                <style>
                  /* 强制修改 Element 原生关闭按钮样式 */
                  .critical-alarm-box .el-notification__closeBtn {
                    color: #FFFFFF !important;
                    font-size: 24px !important;
                    top: 15px !important;
                    right: 15px !important;
                  }
                  .critical-alarm-box { background-color: #CC0000 !important; border: none !important; padding: 0 !important; overflow: hidden; }
                  @keyframes pulse-red {
                    0% { box-shadow: 0 0 10px rgba(204,0,0,0.6); }
                    50% { box-shadow: 0 0 30px rgba(204,0,0,1); border-color: #fff; }
                    100% { box-shadow: 0 0 10px rgba(204,0,0,0.6); }
                  }
                </style>
              `,
            type: "",
            duration: 0,
            position: "top-right",
            offset: 60,
            onClose: () => {
              alarmInstances.delete(payload.deviceId);
            }
          });

          // 存入 Map 以便后续自动关闭
          alarmInstances.set(payload.deviceId, instance);

          addLog(`紧急报警: 活跃设备 ${payload.deviceId} 异常离线`, "error");
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
