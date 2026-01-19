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

      <!-- 4. 子图节点属性编辑 -->
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

      <!-- 2. 普通状态节点属性编辑 (矩形) -->
      <div v-else-if="isNode">
        <el-form label-position="top">
          <el-form-item label="节点名称">
            <el-input v-model="properties.textValue" @change="updateNodeText" />
          </el-form-item>
        </el-form>
      </div>

      <!-- 3. 边属性编辑 -->
      <div v-else-if="isEdge">
        <el-form label-position="top">
          <el-form-item label="迁移描述">
            <el-input v-model="properties.textValue" @change="updateNodeText" />
          </el-form-item>

          <!-- [核心逻辑] 如果这条线的起点是逻辑节点，则隐藏触发器配置 -->
          <template v-if="!isSourceLogicNode">
          <el-form-item label="筛选分类">
            <el-select v-model="atomCategoryFilter" placeholder="全部分类" clearable>
              <el-option v-for="cat in atomCategories" :key="cat.categoryId" :label="cat.name" :value="cat.categoryId" />
            </el-select>
          </el-form-item>

          <el-form-item>
            <template #label>
              <div class="label-with-action">
                <span>触发器 (原子操作)</span>
                <el-button link type="primary" :icon="Refresh" @click="emit('refresh-data')" size="small">刷新</el-button>
              </div>
            </template>
            <el-select v-model="properties.conditionAtomIds" multiple filterable placeholder="选择触发器" style="width: 100%" @change="updateProperties">
              <el-option v-for="atom in filteredAtomPool" :key="atom.atomId" :label="atom.name" :value="atom.atomId">
                <div class="option-item">
                  <span class="option-text">{{ atom.name }}</span>
                  <el-button type="primary" link :icon="Edit" @click.stop="handleEditAtom(atom.atomId)" />
                </div>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="触发器 (测试包 1)">
            <el-select v-model="properties.actionPackageId" clearable filterable placeholder="选择测试包" style="width: 100%" @change="updateProperties">
              <el-option v-for="pkg in filteredPackagePool" :key="pkg.packageId" :label="pkg.name" :value="pkg.packageId" />
            </el-select>
          </el-form-item>

          <el-form-item label="触发器 (测试包 2)">
            <el-select v-model="properties.secondaryPackageId" clearable filterable placeholder="选择第二个测试包" style="width: 100%" @change="updateProperties">
              <el-option v-for="pkg in filteredPackagePool" :key="pkg.packageId" :label="pkg.name" :value="pkg.packageId" />
            </el-select>
          </el-form-item>
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

    <!-- 4. 画布属性 (未选中元素) -->
    <div v-else class="panel-content">
      <h4>全局触发器</h4>
      <el-form label-position="top">
        <el-form-item label="分类筛选">
          <el-select v-model="atomCategoryFilter" placeholder="全部分类" clearable>
            <el-option v-for="cat in atomCategories" :key="cat.categoryId" :label="cat.name" :value="cat.categoryId" />
          </el-select>
        </el-form-item>
        <el-form-item label="全局原子操作">
          <el-select :model-value="globalAtomIds" @update:model-value="emit('update:globalAtomIds', $event)" multiple filterable style="width: 100%">
            <el-option v-for="atom in filteredAtomPool" :key="atom.atomId" :label="atom.name" :value="atom.atomId" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { Edit, Refresh, Plus, Delete } from "@element-plus/icons-vue";
import type { AtomicOperationPublic, TestPackagePublic } from "@/types/api";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import router from "@/router";
import { useCaseStore } from "@/stores/caseStore";
import {useRoute, useRouter} from "vue-router";

// 定义接口，增加 BaseType 以区分节点和边
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
  lfInstance: any; // 必须接收 LogicFlow 实例
  atomPool: AtomicOperationPublic[];
  packagePool: TestPackagePublic[];
  globalAtomIds: number[];
}>();

const emit = defineEmits(["properties-change", "update:globalAtomIds", "edit-atom", "refresh-data"]);

const properties = ref<any>({});
const atomCategoryFilter = ref<number | null>(null);
const categoryStore = useAtomCategoryStore();

const atomCategories = computed(() => categoryStore.allCategories);

onMounted(() => categoryStore.fetchAllCategories());

// --- 计算属性过滤 ---
const filteredAtomPool = computed(() => {
  if (!atomCategoryFilter.value) return props.atomPool;
  return props.atomPool.filter((atom) => atom.categoryId === atomCategoryFilter.value);
});

const filteredPackagePool = computed(() => {
  if (!atomCategoryFilter.value) return props.packagePool;
  return props.packagePool.filter((pkg) => pkg.categoryId === atomCategoryFilter.value);
});

const isNode = computed(() => props.activeElement?.BaseType === "node");
const isEdge = computed(() => props.activeElement?.BaseType === "edge");

// 检查当前选中的“边”是否起源于逻辑节点
const isSourceLogicNode = computed(() => {
  if (!isEdge.value || !props.activeElement || !props.lfInstance) return false;
  const edgeData = props.activeElement;
  // LogicFlow 边的对象上有 sourceNodeId
  const sourceNode = props.lfInstance.getNodeModelById((edgeData as any).sourceNodeId);
  return sourceNode?.type === 'LogicNode';
});
// 核心：动态发现画布中除自己以外的所有有效节点名
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

// --- 逻辑分支操作 ---
const addBranch = () => {
  if (!properties.value.branches) properties.value.branches = [];
  properties.value.branches.push({ leftValue: "", operator: "==", rightValue: "", targetNodeId: "" });
  updateProperties();
};

const removeBranch = (index: number) => {
  properties.value.branches.splice(index, 1);
  updateProperties();
};

const caseStore = useCaseStore();
const route = useRoute();

/**
 * [核心修复] 过滤子用例池：仅允许引用“流程图”类型的用例，且防止自引用
 */
const filteredCasePool = computed(() => {
  const currentCaseId = Number(route.params.caseId);
  return caseStore.cases.filter(c =>
      c.caseType === 'flow' && c.caseId !== currentCaseId
  );
});

const handleJumpToSubflow = () => {
  if (properties.value.subCaseId) {
    router.push({ name: 'TestCaseEditor', params: { caseId: properties.value.subCaseId } });
  }
};

// --- 状态同步 Watcher ---
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
          conditionAtomIds: currentProps.conditionAtomIds || [],
          actionPackageId: currentProps.actionPackageId || null,
          secondaryPackageId: currentProps.secondaryPackageId || null,
        };
      } else {
        properties.value = {};
      }
    },
    { immediate: true, deep: true }
);

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
</script>

<style scoped>
.branch-item {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #ebeef5;
  margin-bottom: 12px;
}
.branch-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}
.branch-cond-row {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}
.jump-select-item {
  margin-bottom: 0 !important;
}
.label-with-action {
  display: flex;
  justify-content: space-between;
  width: 100%;
}
.option-item {
  display: flex;
  justify-content: space-between;
  width: 100%;
}
.properties-panel {
  padding: 15px;
  height: 100%;
  overflow-y: auto;
}
</style>