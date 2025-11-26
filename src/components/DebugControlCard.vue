<!-- FILE: AdFlowPro_ui/src/components/DebugControlCard.vue -->
<template>
  <el-card class="card-margin">
    <template #header>
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
        <span>远程调试</span>
      </div>
    </template>
    <el-form label-position="top" v-loading="isLoading">
      <el-form-item>
        <template #label>
          <span>调试模式</span>
          <el-tooltip content="开启后，App会根据下方配置的TAG上报详细日志到服务器后台。" placement="top">
            <el-icon class="form-item-tooltip"><QuestionFilled /></el-icon>
          </el-tooltip>
        </template>
        <el-switch v-model="isEnabled" />
      </el-form-item>

      <el-form-item label="日志TAG过滤" v-if="isEnabled">
        <el-select
          v-model="selectedTags"
          multiple
          filterable
          placeholder="选择要上报的日志TAG (可留空表示全部)"
          style="width: 100%"
          :disabled="!isEnabled"
        >
          <el-option v-for="tag in availableTags" :key="tag" :label="tag" :value="tag" />
        </el-select>
      </el-form-item>
    </el-form>
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

// A flag to prevent the watcher from firing on initial data load
let isInitialLoad = true;

onMounted(async () => {
  isLoading.value = true;
  try {
    const [config, tags] = await Promise.all([
      // Only try to get config if deviceId is present
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
    // After the initial data is loaded, set the flag to false
    setTimeout(() => {
      isInitialLoad = false;
    }, 100); // A small delay to ensure initial values are settled
  }
});

watch([isEnabled, selectedTags], async (newValue, oldValue) => {
  // Do not trigger on initial load
  if (isInitialLoad || !props.deviceId) return;

  try {
    await deviceService.setDebugConfig(props.deviceId, {
      enabled: isEnabled.value,
      tags: selectedTags.value,
    });
    // Give a more subtle confirmation as this fires on every change
    // ElMessage.success("调试配置已下发。");
  } catch (error) {
    ElMessage.error("配置下发失败，设备可能已离线。");
    // Revert UI on failure
    isEnabled.value = oldValue[0];
    selectedTags.value = oldValue[1];
  }
});
</script>

<style scoped>
.form-item-tooltip {
  margin-left: 8px;
  color: #909399;
  cursor: help;
}
</style>
