<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>UI 结构</span>
        <el-button
          type="success"
          :icon="Search"
          @click="$emit('fetchUiStructure')"
          :loading="isLoading"
          :disabled="!isConnected"
        >
          {{ isLoading ? "获取中..." : "获取UI结构" }}
        </el-button>
      </div>
    </template>
    <!-- >>>>>>>>>> 修改这里的显示逻辑 <<<<<<<<<< -->
    <div class="ui-structure-container" v-loading="isLoading">
      <pre v-if="flattenedText"><code>{{ flattenedText }}</code></pre>
      <el-empty
        v-else
        description="暂无UI结构, 请点击按钮获取"
        :image-size="80"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Search } from "@element-plus/icons-vue";
import { toRefs } from "vue";
import { useFlattenUi } from "@/composables/useFlattenUi"; // 导入我们的新函数

const props = defineProps<{
  structure: object | null;
  isLoading: boolean;
  isConnected: boolean;
}>();

defineEmits(["fetchUiStructure"]);

// 将 props.structure 转换为一个 ref，以便 useFlattenUi 可以监听它
const { structure } = toRefs(props);

// 使用 composable 函数来获取扁平化后的文本
const { flattenedText } = useFlattenUi(structure);
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ui-structure-container {
  background-color: #f8f9fa;
  color: #303133;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  max-height: 300px;
  overflow: auto;
  font-family: "Fira Code", "Courier New", monospace;
  font-size: 13px;
  line-height: 1.6; /* 增加行高以提高可读性 */
}
.ui-structure-container pre {
  margin: 0;
  white-space: pre; /* 改为 pre 以保留我们生成的空格和换行 */
  word-break: break-all;
}
</style>
