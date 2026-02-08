<template>
  <el-card class="full-height-card variable-monitor-card" v-loading="isLoading">
    <template #header>
      <div class="card-header">
        <span>变量快照</span>
        <div class="header-actions">
          <el-input
              v-model="searchQuery"
              placeholder="搜索变量名或值"
              clearable
              size="small"
              style="width: 200px; margin-right: 10px"
          />
          <el-button
              type="primary"
              :icon="Refresh"
              @click="emit('fetchVariables')"
              :disabled="!isConnected"
          >
            {{ isLoading ? '读取中...' : '刷新快照' }}
          </el-button>
        </div>
      </div>
    </template>

    <div v-if="!variablesData" class="empty-state">
      <el-empty :description="isConnected ? '请点击右上角按钮读取变量快照' : '设备未连接'" />
    </div>

    <div v-else class="variable-content-wrapper">
      <!-- 顶部信息 -->
      <el-alert v-if="variablesData.currentApp" type="info" :closable="false" style="margin-bottom: 10px">
        正在运行的应用: <strong>{{ variablesData.currentApp }}</strong>
      </el-alert>
      <el-alert v-else type="warning" :closable="false" style="margin-bottom: 10px">
        设备当前空闲，正在展示全量持久化变量。
      </el-alert>

      <!-- 分组表格 -->
      <el-table
          :data="filteredVariables"
          :default-expand-all="true"
          row-key="id"
          size="small"
          style="width: 100%"
      >
        <el-table-column label="变量名" prop="originalKey" min-width="150" sortable>
          <template #default="{ row }">
            <el-tag :type="row.typeTag" size="small" effect="dark" style="margin-right: 8px">{{ row.typeLabel }}</el-tag>
            <span>{{ row.originalKey }}</span>
          </template>
        </el-table-column>
        <el-table-column label="应用/状态" prop="app" width="150" />
        <el-table-column label="变量值 (预览)" prop="preview" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <el-button link type="primary" :icon="CopyDocument" @click="copyValue(row.value)">复制</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Refresh, CopyDocument } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

// 定义明确的接口
interface VariablesData {
  currentApp: string | null;
  variables: Record<string, string>;
}

const props = defineProps<{
  deviceId: string;
  // 这里使用 any 允许宽容处理，但在逻辑中进行严格检查
  variablesData: any;
  isLoading: boolean;
  isConnected: boolean;
}>();

const emit = defineEmits(['fetchVariables']);

const searchQuery = ref('');

// 变量清洗与分组逻辑
const classifiedVariables = computed(() => {
  // === [DEBUG START] 埋点日志 ===
  console.log(">>> [DEBUG_CHILD] props.variablesData:", props.variablesData);

  // 增加防御性判断，防止传入空对象时崩
  if (!props.variablesData || typeof props.variablesData.variables !== 'object') {
    console.warn(">>> [DEBUG_CHILD] variablesData is null/undefined");
    return [];
  }

  // 2. 第二层防御：检查 variables 属性
  // 注意：这里我们尝试从对象中获取 variables，即使它不存在也不会报错，只会得到 undefined
  const rawMap = props.variablesData.variables;
  console.log(">>> [DEBUG_CHILD] rawMap:", rawMap);

  if (!rawMap) {
    console.warn(">>> [DEBUG_CHILD] .variables property is missing!");
    // 如果没有 variables 属性，但 props.variablesData 本身就是个 map (兼容性尝试)
    // 我们可以试着打印一下 keys 看看
    console.log(">>> [DEBUG_CHILD] keys of variablesData:", Object.keys(props.variablesData));
    return [];
  }
  // === [DEBUG END] ===

  // 3. 安全转换
  const flatList = Object.entries(rawMap).map(([key, value], index) => {
    // 确保 value 是字符串
    const strValue = String(value);

    let type = 'temp';
    let typeLabel = '临时';
    let appLabel = '当前用例';
    let typeTag: "" | "success" | "warning" | "info" | "danger" | "primary" = 'info';

    if (key.startsWith('sys.')) {
      type = 'sys';
      typeLabel = '系统';
      appLabel = '设备全局';
      typeTag = 'primary' as const;
    } else if (key.startsWith('app.')) {
      type = 'app';
      typeLabel = '应用';
      // 安全获取 currentApp
      appLabel = props.variablesData?.currentApp || '持久化';
      typeTag = 'success' as const;
    }

    return {
      id: index,
      originalKey: key,
      name: key.replace(/^(app\.|sys\.)/, ''),
      value: strValue,
      preview: strValue.length > 50 ? strValue.substring(0, 50) + '...' : strValue,
      type: type,
      typeLabel: typeLabel as string,
      app: appLabel,
      typeTag: typeTag
    };
  });

  // 2. 排序: sys -> app -> temp
  return flatList.sort((a, b) => {
    const order: Record<string, number> = { 'sys': 1, 'app': 2, 'temp': 3 };
    return order[a.type] - order[b.type];
  });
});

const filteredVariables = computed(() => {
  if (!searchQuery.value) return classifiedVariables.value;
  const query = searchQuery.value.toLowerCase();
  return classifiedVariables.value.filter(v =>
      v.originalKey.toLowerCase().includes(query) ||
      v.value.toLowerCase().includes(query) ||
      v.app.toLowerCase().includes(query)
  );
});

const copyValue = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    ElMessage.success('变量值已复制');
  } catch (e) {
    ElMessage.error('复制失败');
  }
};
</script>

<style scoped>
.variable-monitor-card {
  padding: 0;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.variable-content-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>