<template>
  <div class="properties-panel">
    <!-- 元素属性 (当选中节点或边时) -->
    <div v-if="activeElement" class="panel-content">
      <h4>编辑属性</h4>
      <!-- <p class="element-info">ID: {{ activeElement.id }}</p> -->
      <!-- <p class="element-info">类型: {{ activeElement.type }}</p> -->

      <!-- 节点属性编辑 -->
      <div v-if="isNode">
        <el-form label-position="top">
          <el-form-item label="节点名称">
            <el-input v-model="properties.textValue" @change="updateNodeText" />
          </el-form-item>
        </el-form>
      </div>

      <!-- 边属性编辑 -->
      <div v-else-if="isEdge">
        <el-form label-position="top">
          <el-form-item label="迁移描述">
            <el-input v-model="properties.textValue" @change="updateNodeText" />
          </el-form-item>
          
          <!-- 新增：原子操作分类筛选 -->
          <el-form-item label="筛选分类">
            <el-select v-model="atomCategoryFilter" placeholder="全部分类" clearable>
              <el-option v-for="cat in atomCategories" :key="cat.categoryId" :label="cat.name" :value="cat.categoryId" />
            </el-select>
          </el-form-item>

          <el-form-item label="触发器 (原子操作)">
            <el-select
              v-model="properties.conditionAtomIds"
              multiple
              filterable
              placeholder="选择一个或多个触发器"
              style="width: 100%"
              @change="updateProperties"
            >
              <el-option v-for="atom in filteredAtomPool" :key="atom.atomId" :label="atom.name" :value="atom.atomId">
                <div class="option-item">
                  <span class="option-text">{{ atom.name }}</span>
                  <el-button type="primary" link :icon="Edit" @click.stop="handleEditAtom(atom.atomId)" />
                </div>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="触发器 (测试包)">
            <el-select
              v-model="properties.actionPackageId"
              clearable
              filterable
              placeholder="选择一个测试包作为触发器"
              style="width: 100%"
              @change="updateProperties"
            >
              <el-option v-for="pkg in filteredPackagePool" :key="pkg.packageId" :label="pkg.name" :value="pkg.packageId" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 画布属性 (当未选中任何元素时) -->
    <div v-else class="panel-content">
      <h4>编辑画布属性</h4>
      <el-form label-position="top">
        <el-form-item label="筛选分类">
          <el-select v-model="atomCategoryFilter" placeholder="全部分类" clearable>
            <el-option v-for="cat in atomCategories" :key="cat.categoryId" :label="cat.name" :value="cat.categoryId" />
          </el-select>
        </el-form-item>
        <el-form-item label="全局触发器 (原子操作)">
          <el-select
            :model-value="globalAtomIds"
            @update:model-value="emit('update:globalAtomIds', $event)"
            multiple
            filterable
            placeholder="选择全局触发器"
            style="width: 100%"
          >
            <el-option v-for="atom in filteredAtomPool" :key="atom.atomId" :label="atom.name" :value="atom.atomId">
              <div class="option-item">
                <span class="option-text">{{ atom.name }}</span>
                <el-button type="primary" link :icon="Edit" @click.stop="handleEditAtom(atom.atomId)" />
              </div>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { Edit } from "@element-plus/icons-vue";
import type { AtomicOperationPublic, TestPackagePublic, AtomCategoryPublic } from "@/types/api";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";

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
  atomPool: AtomicOperationPublic[];
  packagePool: TestPackagePublic[];
  globalAtomIds: number[];
}>();

const emit = defineEmits(["properties-change", "update:globalAtomIds", "edit-atom"]);

const properties = ref<any>({});
const atomCategoryFilter = ref<number | null>(null);
const categoryStore = useAtomCategoryStore();

const atomCategories = computed(() => categoryStore.allCategories);

onMounted(() => {
  // 确保分类数据已加载
  categoryStore.fetchAllCategories();
});

const filteredAtomPool = computed(() => {
  if (!atomCategoryFilter.value) return props.atomPool;
  return props.atomPool.filter((atom) => atom.categoryId === atomCategoryFilter.value);
});

const filteredPackagePool = computed(() => {
  if (!atomCategoryFilter.value) return props.packagePool;
  return props.packagePool.filter((pkg) => pkg.categoryId === atomCategoryFilter.value);
});

const isNode = computed(() => props.activeElement && props.activeElement.BaseType === "node");
const isEdge = computed(() => props.activeElement && props.activeElement.BaseType === "edge");

watch(
  () => props.activeElement,
  (newElement) => {
    if (newElement) {
      const currentProps = newElement.getProperties();
      properties.value = {
        ...currentProps,
        textValue: typeof newElement.text === "object" ? newElement.text?.value : newElement.text,
        conditionAtomIds: currentProps.conditionAtomIds || [],
        actionPackageId: currentProps.actionPackageId || null,
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

const handleEditAtom = (atomId: number) => {
  emit("edit-atom", atomId);
};
</script>

<style scoped>
.option-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.option-text {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}
.properties-panel {
  padding: 15px;
  height: 100%;
  box-sizing: border-box;
}
.panel-content {
  text-align: left;
}
</style>
