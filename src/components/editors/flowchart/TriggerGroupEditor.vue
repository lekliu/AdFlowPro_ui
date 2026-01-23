<!-- AdFlowPro_ui/src/components/editors/flowchart/TriggerGroupEditor.vue -->
<template>
  <div class="trigger-group-editor">
    <!-- 辅助过滤器 -->
    <div class="helper-toolbar">
      <el-select v-model="uiFilter" placeholder="分类筛选器" clearable size="small" style="flex-grow: 1">
        <el-option v-for="c in categories" :key="c.categoryId" :label="c.name" :value="c.categoryId" />
      </el-select>
      <el-button :icon="Refresh" circle size="small" @click="$emit('refresh')" title="刷新数据清单" />
    </div>

    <!-- 原子操作多选 -->
    <div class="field-label">
      <el-icon><Operation /></el-icon> 原子操作 (触发器)
    </div>
    <el-select
        :model-value="atomIds"
        @change="(val) => emit('update:atomIds', val)"
        multiple
        filterable
        collapse-tags
        collapse-tags-tooltip
        placeholder="搜索并选择原子"
        style="width: 100%"
    >
      <el-option v-for="a in filteredAtoms" :key="a.atomId" :label="a.name" :value="a.atomId">
        <div class="option-item">
          <span class="option-name">{{ a.name }}</span>
          <el-button link type="primary" :icon="Edit" @click.stop="$emit('edit-atom', a.atomId)" />
        </div>
      </el-option>
    </el-select>

    <!-- 测试包多选 (核心修复：支持编辑按钮) -->
    <div class="field-label">
      <el-icon><TakeawayBox /></el-icon> 测试包组合 (套娃触发)
    </div>
    <el-select
        :model-value="packageIds"
        @change="(val) => emit('update:packageIds', val)"
        multiple
        filterable
        collapse-tags
        collapse-tags-tooltip
        placeholder="搜索并选择测试包"
        style="width: 100%"
    >
      <el-option v-for="p in filteredPackages" :key="p.packageId" :label="p.name" :value="p.packageId">
        <div class="option-item">
          <span class="option-name">{{ p.name }}</span>
          <!-- 就是这里：为包也增加编辑按钮 -->
          <el-button link type="primary" :icon="Edit" @click.stop="$emit('edit-package', p.packageId)" />
        </div>
      </el-option>
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Refresh, Edit, Operation, TakeawayBox } from '@element-plus/icons-vue';

const props = defineProps<{
  atomIds: number[];
  packageIds: number[];
  atomPool: any[];
  packagePool: any[];
  categories: any[];
}>();

const emit = defineEmits(['update:atomIds', 'update:packageIds', 'refresh', 'edit-atom', 'edit-package']);

const uiFilter = ref<number | null>(null);

const filteredAtoms = computed(() => {
  if (!uiFilter.value) return props.atomPool;
  return props.atomPool.filter(a => a.categoryId === uiFilter.value);
});

const filteredPackages = computed(() => {
  if (!localFilter.value) return props.packagePool;
  return props.packagePool.filter(p => p.categoryId === localFilter.value);
});
// 修正一个变量名错误，统一使用 uiFilter
const localFilter = uiFilter;
</script>

<style scoped>
.trigger-group-editor { background: #fff; padding: 12px; border: 1px solid #ebeef5; border-radius: 8px; margin-bottom: 10px; }
.helper-toolbar { display: flex; gap: 8px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px dashed #ebeef5; }
.field-label { font-size: 12px; font-weight: bold; color: #606266; margin: 12px 0 6px; display: flex; align-items: center; gap: 6px; }
.option-item { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.option-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; }
</style>