<template>
  <el-card class="card-margin">
    <template #header>
      <div class="card-header">
        <span>远程调试</span>
      </div>
    </template>

    <!-- Flex 布局保持单行结构 -->
    <div v-loading="isLoading" class="compact-controls">

      <!-- 左侧：开关组 -->
      <div class="control-group">
        <span class="label">调试模式</span>
        <el-tooltip content="开启后，App会根据右侧配置的TAG上报详细日志到服务器后台。" placement="top">
          <el-icon class="help-icon"><QuestionFilled /></el-icon>
        </el-tooltip>
        <el-switch v-model="isEnabled" />
      </div>

      <!-- 分割线 -->
      <div class="divider" v-if="isEnabled"></div>

      <!-- 右侧：TAG 选择器 -->
      <div class="control-group flex-expand" v-if="isEnabled">
        <span class="label">TAG过滤:</span>
        <!-- 移除了 collapse-tags 和 collapse-tags-tooltip -->
        <el-select
            v-model="selectedTags"
            multiple
            filterable
            placeholder="留空则上报全部"
            class="tag-select"
            :disabled="!isEnabled"
        >
          <el-option v-for="tag in availableTags" :key="tag" :label="tag" :value="tag" />
        </el-select>
      </div>
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
}>();

const isLoading = ref(true);
const isEnabled = ref(false);
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
    isEnabled.value = config.enabled;
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

watch([isEnabled, selectedTags], async (newValue, oldValue) => {
  if (isInitialLoad || !props.deviceId) return;

  try {
    await deviceService.setDebugConfig(props.deviceId, {
      enabled: isEnabled.value,
      tags: selectedTags.value,
    });
  } catch (error) {
    ElMessage.error("配置下发失败，设备可能已离线。");
    isEnabled.value = oldValue[0];
    selectedTags.value = oldValue[1];
  }
});
</script>

<style scoped>
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