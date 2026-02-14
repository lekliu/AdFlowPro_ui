<template>
  <el-card class="card-margin">
    <template #header>
      <div class="card-header">
        <span>调试辅助 (仅对当前在线的受控设备生效)</span>
      </div>
    </template>

    <!-- Flex 布局保持单行结构 -->
    <div v-loading="isLoading" class="compact-controls" v-if="isControlled">
      <div class="control-group flex-expand">
        <span class="label">视觉增强开关:</span>
        <el-select
            v-model="selectedTags"
            multiple
            filterable
            placeholder="请勾选需要开启的视觉反馈"
            class="tag-select"
            :disabled="!isControlled"
        >
          <!-- 核心修改：手动定义新的功能性标签 -->
          <el-option label="显示手势路径 (曲线)" value="VISUAL_PATH" />
          <el-option label="显示点击红圈" value="VISUAL_TAP" />
          <el-option label="显示匹配绿框" value="VISUAL_MATCH" />
          <el-option label="显示原子 ID 标签" value="VISUAL_ID" />
        </el-select>
      </div>
    </div>
    <div v-else class="empty-tip">
      请在右上角开启“受控模式”以启用调试辅助功能。
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { deviceService } from "@/api/deviceService";
import { QuestionFilled } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

const props = defineProps<{
  deviceId: string;
  isControlled: boolean;
}>();

const isLoading = ref(true);
const selectedTags = ref<string[]>([]);
const availableTags = ref<string[]>([]);

let isInitialLoad = true;

onMounted(async () => {
  isLoading.value = true;
  try {
    const [config, tags] = await Promise.all([
      props.deviceId ? deviceService.getDebugConfig(props.deviceId) : Promise.resolve({ enabled: false, tags: [] }),
      deviceService.getAvailableDebugTags(),
    ]);
    selectedTags.value = config.tags;
    availableTags.value = tags;
  } catch (error) {
    // Error handled by interceptor
  } finally {
    isLoading.value = false;
    setTimeout(() => {
      isInitialLoad = false;
    }, 100);
  }
});

watch(selectedTags, async (newTags) => {
  if (isInitialLoad || !props.deviceId || !props.isControlled) return;

  try {
    await deviceService.setDebugConfig(props.deviceId, {
      enabled: true,
      tags: newTags,
    });
  } catch (error) {
    ElMessage.error("标签同步失败");
  }
});
</script>

<style scoped>

.empty-tip {
  color: #909399;
  font-size: 13px;
  text-align: center;
  padding: 10px 0;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.compact-controls {
  display: flex;
  align-items: center; /* 垂直居中 */
  gap: 16px;
  min-height: 32px;
}

.control-group {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.flex-expand {
  flex-grow: 1;
}

.label {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-right: 8px;
}

.help-icon {
  margin-right: 8px;
  color: #909399;
  cursor: help;
}

.tag-select {
  width: 100%;
}

.divider {
  width: 1px;
  height: 20px;
  background-color: var(--el-border-color);
}
</style>