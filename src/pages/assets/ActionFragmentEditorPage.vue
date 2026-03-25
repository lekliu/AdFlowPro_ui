<template>
  <div class="fragment-editor-page">
    <el-page-header @back="goBack" :content="isEditMode ? '编辑动作片段' : '新建动作片段'" class="sticky-header">
      <template #extra>
        <div class="header-actions">
          <el-button type="warning" plain :icon="Monitor" @click="openCodeMode">代码模式</el-button>
          <el-button @click="goBack">取消</el-button>
          <el-button type="primary" @click="handleSave" :loading="isSaving">保存</el-button>
        </div>
      </template>
    </el-page-header>

    <div v-loading="isLoading" class="editor-content">
      <el-card class="box-card">
        <el-form :model="form" ref="formRef" label-position="top" :rules="rules">
          <el-row :gutter="20">
            <el-col :span="16">
              <el-form-item label="名称" prop="name">
                <el-input v-model="form.name" placeholder="例如：登录通用点击序列" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="所属分类">
                <el-select v-model="form.categoryId" placeholder="选择分类" clearable filterable style="width: 100%">
                  <el-option v-for="cat in categoryStore.allCategories" :key="cat.categoryId" :label="cat.name" :value="cat.categoryId" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="描述">
            <el-input v-model="form.description" type="textarea" placeholder="描述此片段的用途" />
          </el-form-item>
        </el-form>
      </el-card>

      <div style="margin-top: 20px">
        <div class="section-title">动作序列定义</div>
        <ActionSequenceEditor mode="editor" v-model="form.actionsJson" />
      </div>
    </div>

    <DslEditorDialog
      v-model="codeDialog.visible"
      v-model:code="codeDialog.code"
      title="动作片段 DSL 配置"
      helpText="支持编排纯动作序列，格式如 action.click(text='Val')"
      @apply="handleApplyCode"
      @editor-mount="handleDslEditorMount"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { v4 as uuidv4 } from "uuid";
import { useActionFragmentStore } from "@/stores/actionFragmentStore";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { useTabStore } from "@/stores/tabStore";
import ActionSequenceEditor from "@/components/ActionSequenceEditor.vue";
import { cleanupActionSequence } from "@/utils/payloadCleaner";
import {Monitor} from "@element-plus/icons-vue";
import {generateFragmentCode, parseFragmentCode} from "@/utils/dslService";

const props = defineProps<{ fragmentId?: string }>();
const route = useRoute();
const router = useRouter();
const fragmentStore = useActionFragmentStore();
const categoryStore = useAtomCategoryStore();
const tabStore = useTabStore();

const fragmentIdNum = computed(() => props.fragmentId ? Number(props.fragmentId) : null);
const isEditMode = computed(() => !!fragmentIdNum.value);
const isLoading = ref(false);
const isSaving = ref(false);
const formRef = ref();

const form = reactive({
  name: "",
  description: "",
  categoryId: null as number | null,
  actionsJson: [] as any[]
});

const rules = {
  name: [{ required: true, message: "请输入名称", trigger: "blur" }]
};

onMounted(async () => {
  categoryStore.fetchAllCategories();
  if (isEditMode.value) {
    loadData();
  } else {
    tabStore.updateTabTitle(route.fullPath, "新建动作片段");
  }
});

const loadData = async () => {
  isLoading.value = true;
  try {
    const data = await fragmentStore.fetchById(fragmentIdNum.value!);
    if (data) {
      form.name = data.name;
      form.description = data.description || "";
      form.categoryId = data.categoryId || null;
      form.actionsJson = data.actionsJson.map(a => ({ ...a, id: uuidv4() }));
      tabStore.updateTabTitle(route.fullPath, `片段 - ${data.name}`);
    }
  } finally {
    isLoading.value = false;
  }
};

const handleSave = async () => {
  await formRef.value.validate();
  if (form.actionsJson.length === 0) return ElMessage.error("动作序列不能为空");

  isSaving.value = true;
  try {
    const payload = {
      ...form,
      actionsJson: cleanupActionSequence(form.actionsJson)
    };

    if (isEditMode.value) {
      await fragmentStore.update(fragmentIdNum.value!, payload);
      ElMessage.success("保存成功");
    } else {
      await fragmentStore.create(payload);
      ElMessage.success("创建成功");
    }

    // --- 核心修复：通知列表页需要刷新 ---
    fragmentStore.setNeedsRefresh(true);

    goBack();
  } finally {
    isSaving.value = false;
  }
};


// --- 代码模式逻辑 ---
const codeDialog = reactive({
  visible: false,
  code: "",
});

const openCodeMode = () => {
  codeDialog.code = generateFragmentCode(form, fragmentIdNum.value);
  codeDialog.visible = true;
};

const handleApplyCode = () => {
  try {
    const updatedForm = parseFragmentCode(codeDialog.code, form);
    Object.assign(form, updatedForm);
    // 确保每个动作都有本地 ID 供渲染
    form.actionsJson = form.actionsJson.map(a => ({ ...a, id: a.id || uuidv4() }));
    ElMessage.success("代码配置已应用");
    codeDialog.visible = false;
  } catch (error) {
    ElMessage.error("语法解析失败，请检查格式");
  }
};

const handleDslEditorMount = ({ editor, monaco }: any) => {
  monaco.languages.registerCompletionItemProvider('python', {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };
      const suggestions = [
        { label: 'config', kind: monaco.languages.CompletionItemKind.Function, insertText: 'config(name="${1:片段名称}")', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
        { label: 'action.click', kind: monaco.languages.CompletionItemKind.Method, insertText: 'action.click(text="${1:文本}")', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
        { label: 'action.wait', kind: monaco.languages.CompletionItemKind.Method, insertText: 'action.wait(ms=${1:1000})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
        { label: 'fragment.call', kind: monaco.languages.CompletionItemKind.Method, insertText: 'fragment.call(id=${1:ID})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
        { label: 'if_true', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'if_true("${1:公式}"):\n    ', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range }
      ];
      return { suggestions };
    }
  });
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => handleApplyCode());
};

const goBack = () => tabStore.removeTab(route.fullPath);
</script>

<style scoped>
.fragment-editor-page { padding: 20px; }
.sticky-header { margin-bottom: 20px; background: #fff; padding: 10px; border-radius: 4px; }
.section-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #606266; }
</style>
