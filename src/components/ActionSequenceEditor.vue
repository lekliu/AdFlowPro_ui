<template>
  <div class="action-sequence-editor">
    <div class="editor-header">
      <el-button :icon="Plus" @click="addAction">添加动作</el-button>
      <div class="header-actions" v-if="modelValue.length > 0">
        <el-button v-if="mode === 'editor'" type="success" plain :icon="VideoPlay" @click="openTestDialog"> 测试此序列 </el-button>
        <el-button v-if="mode === 'standalone'" type="success" :icon="Promotion" @click="executeSequence"> 执行序列 </el-button>
      </div>
    </div>

    <draggable v-model="editableActions" item-key="id" handle=".drag-handle" ghost-class="ghost" class="action-list">
      <template #item="{ element, index }">
        <ActionRow :model-value="element" @update:model-value="updateAction(index, $event)" @remove="removeAction(index)" :mode="mode" />
      </template>
    </draggable>

    <el-empty v-if="modelValue.length === 0" description="暂无动作，请点击左上角添加" />

    <!-- Live Test Dialog -->
    <el-dialog v-model="testDialog.visible" title="测试动作序列" width="400px">
      <el-form label-position="top">
        <el-form-item label="选择一个在线设备执行">
          <el-select v-model="testDialog.targetDeviceId" placeholder="请选择设备" style="width: 100%" :loading="deviceStore.isLoading">
            <el-option
                v-for="device in onlineDevices"
                :key="device.deviceId"
                :label="`${device.deviceName} (${device.deviceId})`"
                :value="device.deviceId"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="testDialog.visible = false">关闭</el-button>
        <el-button type="primary" @click="executeSequence" :disabled="!testDialog.targetDeviceId"> 开始执行 </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"; // 移除了 computed，因为暂时没用到
import { Plus, VideoPlay, Promotion } from "@element-plus/icons-vue";
import draggable from "vuedraggable";
import { ElMessage } from "element-plus";
import { v4 as uuidv4 } from "uuid"; // 引入 uuid 来生成更可靠的ID
import ActionRow from "./ActionRow.vue";
import type { PerformActionPayload } from "@/types/api/common";
import { useDeviceStore } from "@/stores/deviceStore";
import { commandService } from "@/api/commandService";
import { wsService } from "@/services/wsService";
import { useWebSocketStore } from "@/stores/webSocketStore";
import { cleanupActionSequence } from "@/utils/payloadCleaner";

type ActionWithId = PerformActionPayload & { id: string };

const props = defineProps<{
  modelValue: ActionWithId[];
  mode: "editor" | "standalone";
  deviceId?: string;
}>();

const emit = defineEmits(["update:modelValue"]);

const deviceStore = useDeviceStore();
const wsStore = useWebSocketStore();

// ==================== 核心修复逻辑开始 ====================

// 1. 定义一个内部状态 ref，它将是所有操作的唯一数据源
const editableActions = ref<ActionWithId[]>([]);

// 2. 创建一个只单向同步的 watch：当 props.modelValue 变化时，更新内部状态
//    我们通过比较 JSON 字符串来避免不必要的更新，从而切断循环！
watch(
    () => props.modelValue,
    (newVal) => {
      // 只有当外部 prop 的内容真的和内部状态不同时，才进行更新
      if (JSON.stringify(newVal) !== JSON.stringify(editableActions.value)) {
        console.log("Prop changed, updating internal state."); // 调试日志，之后可删除
        // 确保新数据也有唯一的 ID
        editableActions.value = JSON.parse(JSON.stringify(newVal)).map((a: ActionWithId) => ({ ...a, id: a.id || uuidv4() }));
      }
    },
    { deep: true, immediate: true } // immediate 确保初始值被正确设置
);

// 3. 创建另一个只单向 emit 的 watch：当内部状态变化时，通知父组件
watch(
    editableActions,
    (newVal) => {
      emit("update:modelValue", newVal);
    },
    { deep: true }
);

// ==================== 核心修复逻辑结束 ====================

const testDialog = ref({
  visible: false,
  targetDeviceId: "",
});

// onlineDevices 的计算依赖于 store，放在 setup 顶层即可
const onlineDevices = computed(() => deviceStore.devices.filter((d) => d.isConnectedWs));

const addAction = () => {
  const newAction: ActionWithId = {
    id: uuidv4(), // 使用 uuid 保证唯一性
    action: "click",
    selector: {},
    parameters: {},
  };
  editableActions.value.push(newAction);
};

const updateAction = (index: number, updatedAction: ActionWithId) => {
  console.log('[ActionSequenceEditor] Received updated action at index', index, ':', JSON.parse(JSON.stringify(updatedAction)));
  editableActions.value[index] = updatedAction;
};

const removeAction = (index: number) => {
  editableActions.value.splice(index, 1);
};

const openTestDialog = () => {
  deviceStore.fetchDevices();
  testDialog.value.targetDeviceId = "";
  testDialog.value.visible = true;
};

const executeSequence = async () => {
  // ... (此函数无需修改，它操作的是正确的 editableActions) ...
  const targetId = props.mode === "editor" ? testDialog.value.targetDeviceId : props.deviceId;
  if (!targetId) {
    ElMessage.error("未选择目标设备");
    return;
  }
  if (editableActions.value.length === 0) {
    ElMessage.warning("动作序列为空，无法执行");
    return;
  }

  // --- [DIAGNOSTIC LOG 1] ---
  console.log('[DIAGNOSTIC] Data BEFORE cleanup:', JSON.parse(JSON.stringify(editableActions.value)));
  // --- [END DIAGNOSTIC LOG] ---

  const actionsToSend = cleanupActionSequence(editableActions.value);
  if (actionsToSend.length === 0) {
    ElMessage.warning("清理后动作序列为空，无需执行");
    return;
  }

  if (!wsStore.isLogPanelVisible) {
    wsStore.toggleLogPanel();
  }

  // --- [DIAGNOSTIC LOG 2] ---
  console.log('[DIAGNOSTIC] Data AFTER cleanup (This is what is being sent):', JSON.parse(JSON.stringify(actionsToSend)));
  // --- [END DIAGNOSTIC LOG] ---

  wsService.sendExecuteActionSequence(targetId, actionsToSend);
  ElMessage.info("动作序列执行请求已发送，请在底部状态栏查看结果。");

  if (props.mode === "editor") {
    testDialog.value.visible = false;
  }
};
</script>

<style scoped>
.action-sequence-editor {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background-color: var(--el-bg-color-overlay, #fff);
  padding: 10px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color);
}
.action-list {
  min-height: 100px;
}
.ghost {
  opacity: 0.5;
  background: #c8ebfb;
}
.test-result {
  margin-top: 16px;
}
</style>