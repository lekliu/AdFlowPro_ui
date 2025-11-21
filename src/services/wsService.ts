// FILE: AdFlowPro_ui/src/services/wsService.ts
import { useWebSocketStore } from "@/stores/webSocketStore";
import type { PerformActionPayload, SceneSnapshot } from "@/types/api";
import { ElMessage } from "element-plus";

interface AtomDataPayload {
  sceneSnapshotJson: SceneSnapshot;
  actionsJson: PerformActionPayload[];
}

/**
 * A typed service for sending commands via the UI WebSocket.
 * It uses the websocketStore to manage the connection.
 */
export const wsService = {
  /**
   * Sends a sequence of actions to be executed ad-hoc on a device.
   * @param deviceId The ID of the target device.
   * @param actions An array of PerformActionPayload objects.
   */
  sendExecuteActionSequence(deviceId: string, actions: PerformActionPayload[]): boolean {
    const wsStore = useWebSocketStore();
    if (!wsStore.isConnected) {
      ElMessage.error(`无法发送指令，与服务器的实时连接已断开。`);
      return false;
    }

    const message = {
      type: "execute_action_sequence",
      payload: {
        deviceId,
        actions,
      },
    };

    return wsStore.sendMessage(message);
  },

  /**
   * Sends a scene snapshot to a device for live validation.
   * @param deviceId The ID of the target device.
   * @param sceneSnapshot The SceneSnapshot object to validate.
   */
  sendValidateMatcher(deviceId: string, sceneSnapshot: SceneSnapshot): boolean {
    const wsStore = useWebSocketStore();
    if (!wsStore.isConnected) {
      ElMessage.error(`无法发送验证请求，与服务器的实时连接已断开。`);
      return false;
    }

    const message = {
      type: "validate_matcher",
      payload: {
        deviceId,
        sceneSnapshot,
      },
    };

    return wsStore.sendMessage(message);
  },

  sendTestFullAtom(deviceId: string, atomData: AtomDataPayload): boolean {
    const wsStore = useWebSocketStore();
    if (!wsStore.isConnected) {
      ElMessage.error(`无法发送测试请求，与服务器的实时连接已断开。`);
      return false;
    }

    const message = {
      type: "test_full_atom",
      payload: {
        deviceId,
        atomData,
      },
    };

    return wsStore.sendMessage(message);
  },

  sendValidateTestPackage(packageId: number, deviceId: string): boolean {
    const wsStore = useWebSocketStore();
    if (!wsStore.isConnected) {
      ElMessage.error(`无法发送测试请求，与服务器的实时连接已断开。`);
      return false;
    }

    const message = {
      type: "validate_test_package",
      payload: {
        packageId,
        deviceId,
      },
    };

    return wsStore.sendMessage(message);
  },

  sendValidateTestCase(caseId: number, deviceId: string): boolean {
    const wsStore = useWebSocketStore();
    if (!wsStore.isConnected) {
      ElMessage.error(`无法发送测试请求，与服务器的实时连接已断开。`);
      return false;
    }

    const message = {
      type: "validate_test_case",
      payload: {
        caseId,
        deviceId,
      },
    };

    return wsStore.sendMessage(message);
  },

  /**
   * Sends a request to abort a running ad-hoc task.
   * @param deviceId The ID of the target device where the task is running.
   * @param correlationId The unique ID of the task to be aborted.
   */
  sendAbortAdhocTask(deviceId: string, correlationId: string): boolean {
    const wsStore = useWebSocketStore();
    if (!wsStore.isConnected) {
      ElMessage.error(`无法发送中止请求，与服务器的实时连接已断开。`);
      return false;
    }

    const message = {
      type: "abort_adhoc_task",
      payload: { deviceId, correlationId },
    };

    return wsStore.sendMessage(message);
  },
};
