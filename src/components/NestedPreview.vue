<!-- FILE: AdFlowPro_ui/src/components/NestedPreview.vue -->
<template>
  <div class="nested-preview-area">
    <div v-for="(child, cidx) in children" :key="cidx" class="preview-item">
      <div class="preview-line">
        <span class="line-dot"></span>
        <el-icon v-if="child.type === 'atom'" class="item-icon"><Operation /></el-icon>
        <el-icon v-else class="item-icon"><TakeawayBox /></el-icon>
        <span class="preview-text">{{ child.name }}</span>

        <!-- 如果是测试包，显示透视按钮，点击后递归触发加载 -->
        <el-button v-if="child.type === 'package'" link type="primary" size="small"
                   @click="$emit('toggle', child)" :loading="child.loading" class="peek-btn">
          <el-icon><ViewIcon /></el-icon>{{ child.showPreview ? '收起' : '透视' }}
        </el-button>
      </div>

      <!-- 递归调用：如果该层级已展开，再次显示 NestedPreview -->
      <el-collapse-transition>
        <div v-if="child.showPreview">
          <NestedPreview :children="child.childrenData" @toggle="(el) => $emit('toggle', el)" />
        </div>
      </el-collapse-transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Operation, TakeawayBox, View as ViewIcon } from "@element-plus/icons-vue";

// 定义组件名称以便递归引用
defineOptions({ name: 'NestedPreview' });

defineProps<{
  children: any[]
}>();

defineEmits(['toggle']);
</script>

<style scoped>
.nested-preview-area {
  margin: 2px 0 8px 24px;
  padding: 4px 0 4px 12px;
  border-left: 2px solid #d3adf7;
  border-bottom-right-radius: 4px;
  border-bottom-left-radius: 4px;
}
.preview-item { margin-bottom: 4px; }
.preview-line { display: flex; align-items: center; font-size: 12px; color: #722ed1; padding: 2px 0; }
.line-dot { width: 4px; height: 4px; background: #b37feb; border-radius: 50%; margin-right: 8px; flex-shrink: 0; }
.item-icon { margin-right: 4px; font-size: 12px; flex-shrink: 0; }
.preview-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.peek-btn { margin-left: 8px; font-size: 11px; height: auto; padding: 0; }
</style>