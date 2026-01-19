<!-- src/components/editors/PixelMatcherEditor.vue -->
<template>
  <div class="pixel-matcher-editor">
    <div class="quick-paste-box">
      <el-input v-model="pasteValue" placeholder="直接粘贴吸管采集的结果 (x, y, color)" size="small">
        <template #append>
          <el-button @click="handleQuickAdd">解析并添加</el-button>
        </template>
      </el-input>
      <div class="tip">提示：使用详情页“吸管”采集后在此粘贴可快速录入</div>
    </div>

    <el-table :data="modelValue.pixelPoints" size="small" border stripe style="margin-top: 10px">
      <el-table-column label="坐标 (X, Y)" width="120">
        <template #default="{ row }">
          <div class="coord-cell">({{ row.x }}, {{ row.y }})</div>
        </template>
      </el-table-column>
      <el-table-column label="期望颜色" width="90">
        <template #default="{ row }">
          <div class="color-cell">
            <div class="color-preview" :style="{ backgroundColor: row.color }"></div>
            <code>{{ row.color }}</code>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="容差">
        <template #default="{ row }">
          <el-input-number v-model="row.tolerance" :min="0" :max="255" size="small" controls-position="right" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="60" align="center">
        <template #default="{ $index }">
          <el-button type="danger" :icon="Delete" circle plain size="small" @click="removePoint($index)" />
        </template>
      </el-table-column>
    </el-table>

  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Plus, Delete } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

const props = defineProps<{ modelValue: any }>();
const emit = defineEmits(["update:modelValue"]);

const pasteValue = ref("");

const handleQuickAdd = () => {
  if (!pasteValue.value) return;
  // 正则匹配: 0.1234, 0.5678, #AABBCC
  const regex = /([\d\.]+),\s*([\d\.]+),\s*(#[0-9A-Fa-f]{6})/;
  const match = pasteValue.value.match(regex);

  if (match) {
    const newPoint = {
      x: parseFloat(match[1]),
      y: parseFloat(match[2]),
      color: match[3],
      tolerance: 15
    };
    const currentPoints = props.modelValue.pixelPoints || [];
    emit("update:modelValue", {
      ...props.modelValue,
      pixelPoints: [...currentPoints, newPoint]
    });
    pasteValue.value = "";
    ElMessage.success("采样点已添加");
  } else {
    ElMessage.error("格式错误，无法解析。请确认粘贴内容如：0.1234, 0.5678, #FF0000");
  }
};

const removePoint = (index: number) => {
  const currentPoints = [...props.modelValue.pixelPoints];
  currentPoints.splice(index, 1);
  emit("update:modelValue", { ...props.modelValue, pixelPoints: currentPoints });
};
</script>

<style scoped>
.quick-paste-box { background: #f8f9fa; padding: 10px; border-radius: 4px; border: 1px dashed #dcdfe6; }
.tip { font-size: 11px; color: #909399; margin-top: 4px; }
.coord-cell { font-family: monospace; font-size: 12px; }
.color-cell { display: flex; align-items: center; gap: 8px; font-family: monospace; }
.color-preview { width: 14px; height: 14px; border: 1px solid #ddd; border-radius: 2px; }
</style>