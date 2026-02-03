<!-- src/components/dialogs/DslEditorDialog.vue -->
<template>
  <el-dialog
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      :title="title"
      width="800px"
      top="5vh"
      :close-on-click-modal="false"
      append-to-body
  >
    <div class="dsl-editor-container">
      <div class="editor-frame">
        <vue-monaco-editor
            :value="code"
            @update:value="$emit('update:code', $event)"
            theme="vs"
            :language="language"
            :options="editorOptions"
            @mount="handleEditorMount"
        />
      </div>
    </div>
    <template #footer>
      <div class="dsl-footer">
        <div class="footer-tip">
          <div v-if="helpText" class="tip-text">{{ helpText }}</div>
          <div class="tip-sub">支持 Ctrl+S 快速应用</div>
        </div>
        <div class="footer-btns">
          <el-button @click="$emit('update:modelValue', false)">取消</el-button>
          <el-button type="info" plain :icon="DocumentCopy" @click="handleCopy">
            复制内容
          </el-button>
          <el-button type="primary" @click="$emit('apply')">
            运行并生成配置
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import { DocumentCopy } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";

const props = defineProps({
  modelValue: Boolean,
  code: String,
  title: { type: String, default: 'DSL 编辑器' },
  language: { type: String, default: 'python' },
  helpText: String
});

const emit = defineEmits(['update:modelValue', 'update:code', 'apply', 'editor-mount']);

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 4,
};

const handleEditorMount = (editor: any, monaco: any) => {
  // 绑定 Ctrl+S 快捷键触发应用
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    emit('apply');
  });
  // 将 mount 事件透传给父组件，以便注册特定的自动补全
  emit('editor-mount', { editor, monaco });
};

const handleCopy = async () => {
  if (!props.code) return;
  try {
    await navigator.clipboard.writeText(props.code);
    ElMessage.success("代码已成功复制到剪贴板");
  } catch (err) {
    ElMessage.error("复制失败，请手动选择文字复制");
  }
};
</script>

<style scoped>
.dsl-editor-container {
  height: 60vh;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
}
.editor-frame {
  height: 100%;
}
.dsl-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.footer-tip {
  text-align: left;
}
.tip-text {
  font-size: 12px;
  color: var(--el-text-color-regular);
  line-height: 1.2;
}
.tip-sub {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  margin-top: 2px;
}
.footer-btns {
  display: flex;
  gap: 12px;
}
</style>