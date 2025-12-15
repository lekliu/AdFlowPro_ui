<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>快捷操作</span>
      </div>
    </template>
    <!-- 使用 Flex 布局替代 el-row，强制不换行 -->
    <div class="actions-row">
      <el-button-group>
        <el-button
            type="success"
            :icon="Sunny"
            :loading="isSendingScreenPowerCmd"
            :disabled="!isConnected"
            @click="$emit('sendCommand', 'wake_up')"
        >
          亮屏
        </el-button>
        <el-button
            type="danger"
            plain
            :icon="Moon"
            :loading="isSendingScreenPowerCmd"
            :disabled="!isConnected"
            @click="$emit('sendCommand', 'sleep')"
        >
          息屏
        </el-button>
      </el-button-group>

      <el-button-group>
        <el-tooltip content="自动亮度">
          <el-button :icon="Sunny" plain :disabled="!isConnected" @click="$emit('sendCommand', 'set_brightness_auto')" />
        </el-tooltip>
        <el-tooltip content="最低亮度 (节能模式)">
          <el-button :icon="Hide" plain :disabled="!isConnected" @click="$emit('sendCommand', 'set_brightness_min')" />
        </el-tooltip>
      </el-button-group>

      <div class="divider"></div>

      <el-button-group>
        <el-button
            type="primary"
            plain
            :icon="HomeFilled"
            :loading="isSendingHotkey"
            :disabled="!isConnected"
            @click="$emit('sendCommand', 'home')"
        >
          主页
        </el-button>
        <el-button
            type="primary"
            plain
            :icon="Back"
            :loading="isSendingHotkey"
            :disabled="!isConnected"
            @click="$emit('sendCommand', 'back')"
        >
          返回
        </el-button>
        <el-button
            type="primary"
            plain
            :icon="Switch"
            :loading="isSendingHotkey"
            :disabled="!isConnected"
            @click="$emit('sendCommand', 'recents')"
        >
          最近
        </el-button>
      </el-button-group>

      <div class="divider"></div>

      <el-button
          :type="isAdhocRunning ? 'danger' : 'warning'"
          :icon="CircleClose"
          :loading="isAborting"
          :disabled="!isConnected"
          @click="$emit('abortAdhoc')"
          plain
      >
        {{ isAdhocRunning ? '中止' : '重置' }}
      </el-button>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Sunny, Moon, HomeFilled, Back, Switch, CircleClose, Hide } from "@element-plus/icons-vue";

defineProps<{
  isConnected: boolean;
  isSendingScreenPowerCmd: boolean;
  isSendingHotkey: boolean;
  isAdhocRunning: boolean;
  isAborting: boolean;
}>();

defineEmits(["sendCommand", "abortAdhoc"]);
</script>

<style scoped>
.card-header {
  padding: 0;
  font-weight: bold;
}
.actions-row {
  display: flex;
  align-items: center;
  flex-wrap: nowrap; /* 核心：强制不换行 */
  gap: 12px;         /* 组与组之间的间距 */
  overflow-x: auto;  /* 极端窄屏下允许横向滚动，防止崩坏 */
  padding-bottom: 2px; /* 预留滚动条空间（如果出现） */
}
.divider {
  width: 1px;
  height: 24px;
  background-color: var(--el-border-color);
}
</style>