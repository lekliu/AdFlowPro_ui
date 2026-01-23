<template>
  <div class="properties-panel">
    <div v-if="activeElement" class="panel-content">
      <h4>编辑属性</h4>

      <!-- 1. 逻辑节点属性编辑 (菱形) -->
      <div v-if="activeElement.type === 'LogicNode'">
        <el-form label-position="top">
          <el-form-item label="节点名称">
            <el-input v-model="properties.textValue" @change="updateNodeText" />
          </el-form-item>

          <el-divider content-position="left">分支判定 (按顺序执行)</el-divider>

          <div v-for="(branch, index) in properties.branches" :key="index" class="branch-item">
            <div class="branch-header">
              <el-tag size="small" type="info">分路 {{ index + 1 }}</el-tag>
              <el-button link type="danger" :icon="Delete" @click="removeBranch(index)" />
            </div>

            <div class="branch-cond-row">
              <el-input v-model="branch.leftValue" placeholder="${var}" size="small" />
              <el-select v-model="branch.operator" size="small" style="width: 80px">
                <el-option label="==" value="==" /><el-option label="!=" value="!=" />
                <el-option label=">" value=">" /><el-option label="<" value="<" />
                <el-option label="包含" value="contains" />
              </el-select>
              <el-input v-model="branch.rightValue" placeholder="值" size="small" />
            </div>

            <el-form-item label="满足条件则跳转至" class="jump-select-item">
              <el-select v-model="branch.targetNodeId" placeholder="选择目标节点" size="small" style="width: 100%" @change="updateProperties">
                <el-option v-for="node in availableTargetNodes" :key="node.id" :label="node.label" :value="node.id" />
              </el-select>
            </el-form-item>
          </div>

          <el-button type="primary" link :icon="Plus" @click="addBranch">添加判定分支</el-button>

          <el-divider />
          <el-form-item label="否则 (Else) 跳转至">
            <el-select v-model="properties.defaultTargetId" placeholder="都不满足时去哪" size="small" style="width: 100%" @change="updateProperties">
              <el-option v-for="node in availableTargetNodes" :key="node.id" :label="node.label" :value="node.id" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <!-- 2. 子图节点属性编辑 -->
      <div v-if="activeElement.type === 'SubflowNode'">
        <el-form label-position="top">
          <el-form-item label="显示名称">
            <el-input v-model="properties.textValue" @change="updateNodeText" />
          </el-form-item>
          <el-form-item label="引用子用例">
            <el-select v-model="properties.subCaseId" placeholder="选择已有的流程图用例" filterable style="width: 100%" @change="updateProperties">
              <el-option
                  v-for="c in filteredCasePool"
                  :key="c.caseId"
                  :label="c.name"
                  :value="c.caseId"
              />
            </el-select>
          </el-form-item>
          <el-button type="warning" plain :icon="Edit" @click="handleJumpToSubflow" :disabled="!properties.subCaseId">
            进入子图编辑
          </el-button>
        </el-form>
      </div>

      <!-- 3. 普通状态节点属性编辑 (矩形) -->
      <div v-else-if="isNode">
        <el-form label-position="top">
          <el-form-item label="节点名称">
            <el-input v-model="properties.textValue" @change="updateNodeText" />
          </el-form-item>
        </el-form>
      </div>

      <!-- 4. 边属性编辑 -->
      <div v-else-if="isEdge">
        <el-form label-position="top">
          <el-form-item label="迁移描述">
            <el-input v-model="properties.textValue" @change="updateNodeText" />
          </el-form-item>

          <!-- [核心逻辑] 修正：这里应该绑定 properties 里的字段而非 props 的 global 字段 -->
          <template v-if="!isSourceLogicNode">
            <TriggerGroupEditor
                :atom-ids="properties.conditionAtomIds"
                :package-ids="properties.packageIds"
                @update:atom-ids="handleTriggerChange('atoms', $event)"
                @update:package-ids="handleTriggerChange('packages', $event)"
                :atom-pool="atomPool"
                :package-pool="packagePool"
                :categories="atomCategories"
                @refresh="emit('refresh-data')"
                @edit-atom="handleEditAtom"
                @edit-package="handleEditPackage"
            />
          </template>
          <el-alert
              v-else
              title="逻辑分支后的路径由“条件判定”控制，无需配置视觉触发器。"
              type="info"
              :closable="false"
              show-icon
              style="margin-top: 10px"
          />
        </el-form>
      </div>
    </div>

    <!-- 5. 画布属性 (未选中元素，即全局触发器) -->
    <div v-else class="panel-content">
      <h4>全局触发器</h4>
      <el-form label-position="top">
        <TriggerGroupEditor
            :atom-ids="globalAtomIds"
            :package-ids="globalPackageIds"
            @update:atom-ids="emit('update:globalAtomIds', $event)"
            @update:package-ids="emit('update:globalPackageIds', $event)"
            :atom-pool="atomPool"
            :package-pool="packagePool"
            :categories="atomCategories"
            @refresh="emit('refresh-data')"
            @edit-atom="handleEditAtom"
            @edit-package="handleEditPackage"
        />
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { Edit, Refresh, Plus, Delete } from "@element-plus/icons-vue";
import TriggerGroupEditor from "./TriggerGroupEditor.vue";
import type { AtomicOperationPublic, TestPackagePublic } from "@/types/api";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import router from "@/router";
import { useCaseStore } from "@/stores/caseStore";
import { useRoute } from "vue-router";

type LogicFlowElement = {
  id: string;
  type: string;
  BaseType: "node" | "edge";
  text: string | { value: string };
  getProperties(): Record<string, any>;
  updateText(text: string): void;
  setProperties(properties: Record<string, any>): void;
};

const props = defineProps<{
  activeElement: LogicFlowElement | null;
  lfInstance: any;
  atomPool: AtomicOperationPublic[];
  packagePool: TestPackagePublic[];
  globalAtomIds: number[];
  globalPackageIds: number[];
}>();

const emit = defineEmits([
  "properties-change",
  "update:globalAtomIds",
  "update:globalPackageIds",
  "edit-atom",
  "edit-package",
  "refresh-data"
]);

const properties = ref<any>({});
const atomCategoryFilter = ref<number | null>(null);
const categoryStore = useAtomCategoryStore();
const caseStore = useCaseStore();
const route = useRoute();

const atomCategories = computed(() => categoryStore.allCategories);
onMounted(() => categoryStore.fetchAllCategories());

const isNode = computed(() => props.activeElement?.BaseType === "node");
const isEdge = computed(() => props.activeElement?.BaseType === "edge");

const isSourceLogicNode = computed(() => {
  if (!isEdge.value || !props.activeElement || !props.lfInstance) return false;
  const sourceNode = props.lfInstance.getNodeModelById((props.activeElement as any).sourceNodeId);
  return sourceNode?.type === 'LogicNode';
});

const availableTargetNodes = computed(() => {
  if (!props.activeElement || !props.lfInstance) return [];
  const rawData = props.lfInstance.getGraphRawData();
  return rawData.nodes
      .filter((n: any) => n.id !== props.activeElement?.id)
      .map((n: any) => ({
        id: n.id,
        label: (typeof n.text === 'object' ? n.text.value : n.text) || n.id
      }));
});

// --- 事件处理 ---
const addBranch = () => {
  if (!properties.value.branches) properties.value.branches = [];
  properties.value.branches.push({ leftValue: "", operator: "==", rightValue: "", targetNodeId: "" });
  updateProperties();
};

const removeBranch = (index: number) => {
  properties.value.branches.splice(index, 1);
  updateProperties();
};

const handleJumpToSubflow = () => {
  if (properties.value.subCaseId) {
    router.push({ name: 'TestCaseEditor', params: { caseId: properties.value.subCaseId } });
  }
};

const filteredCasePool = computed(() => {
  const currentCaseId = Number(route.params.caseId);
  return caseStore.cases.filter(c => c.caseType === 'flow' && c.caseId !== currentCaseId);
});

// [核心功能对齐] 统一处理触发器变更并同步至 LogicFlow 引擎
const handleTriggerChange = (type: 'atoms' | 'packages', val: number[]) => {
  if (type === 'atoms') {
    properties.value.conditionAtomIds = val;
  } else {
    properties.value.packageIds = val;
  }
  updateProperties();
};

const updateNodeText = () => {
  if (props.activeElement) {
    props.activeElement.updateText(properties.value.textValue);
  }
};

const updateProperties = () => {
  if (props.activeElement) {
    const { textValue, ...customProps } = properties.value;
    emit("properties-change", props.activeElement.id, customProps);
  }
};

const handleEditAtom = (atomId: number) => emit("edit-atom", atomId);
const handleEditPackage = (packageId: number) => router.push({ name: "TestPackageEditor", params: { packageId } });

// --- 状态监听 ---
watch(
    () => props.activeElement,
    (newElement) => {
      if (newElement) {
        const currentProps = newElement.getProperties();
        properties.value = {
          ...currentProps,
          textValue: typeof newElement.text === "object" ? newElement.text?.value : newElement.text,
          branches: currentProps.branches || [],
          defaultTargetId: currentProps.defaultTargetId || "",
          conditionAtomIds: Array.isArray(currentProps.conditionAtomIds) ? currentProps.conditionAtomIds : [],
          packageIds: Array.isArray(currentProps.packageIds) ? currentProps.packageIds : [],
        };

        // 数据自动迁移逻辑
        if (currentProps.actionPackageId && !properties.value.packageIds.includes(currentProps.actionPackageId)) {
          properties.value.packageIds.push(currentProps.actionPackageId);
        }
      } else {
        properties.value = {};
      }
    },
    { immediate: true, deep: true }
);

</script>

<style scoped>
.branch-item { background: #f8f9fa; padding: 10px; border-radius: 4px; border: 1px solid #ebeef5; margin-bottom: 12px; }
.branch-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.branch-cond-row { display: flex; gap: 4px; margin-bottom: 8px; }
.jump-select-item { margin-bottom: 0 !important; }
.properties-panel { padding: 15px; height: 100%; overflow-y: auto; }
</style>