<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>快捷操作</span>
      </div>
    </template>
    <el-row :gutter="10" justify="start">
      <el-button
        type="success"
        :icon="Sunny"
        :loading="isSendingScreenPowerCmd"
        :disabled="!isConnected"
        @click="$emit('sendCommand', 'wake_up')"
      >
        点亮屏幕
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
      <el-divider direction="vertical" style="height: 32px; margin: 0 8px" />
      <el-button
        type="primary"
        plain
        :icon="HomeFilled"
        :loading="isSendingHotkey"
        :disabled="!isConnected"
        @click="$emit('sendCommand', 'home')"
      >
        主屏幕
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
        最近任务
      </el-button>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import { Sunny, Moon, HomeFilled, Back, Switch } from "@element-plus/icons-vue";

defineProps<{
  isConnected: boolean;
  isSendingScreenPowerCmd: boolean;
  isSendingHotkey: boolean;
}>();

defineEmits(["sendCommand"]);
</script>
