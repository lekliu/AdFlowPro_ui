<template>
  <div class="atoms-list-page">
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="list-header-toolbar">
          <div class="left-tools">
            <h3 class="page-title">原子操作列表</h3>
            <el-button type="primary" :icon="Plus" @click="handleCreate">新建操作</el-button>

            <el-tooltip content="将所有原子的扫描和命中次数清零，重新开始健康度统计" placement="top">
              <el-button type="danger" plain :icon="RefreshLeft" @click="handleResetAllStats">
                重置统计
              </el-button>
            </el-tooltip>

            <el-button-group class="ml-4">
              <el-button :icon="Edit" @click="handleEditSelected" :disabled="selectedAtoms.length !== 1">编辑</el-button>
              <el-button :icon="CopyDocument" @click="handleCopySelected" :disabled="selectedAtoms.length !== 1">复制</el-button>
              <el-button :icon="Delete" type="danger" plain @click="handleDeleteSelected" :disabled="selectedAtoms.length === 0">删除</el-button>
            </el-button-group>
          </div>

          <div class="right-filters">
            <el-select v-model="categoryFilter" placeholder="按分类筛选" clearable @change="handleSearch" style="width: 150px">
              <el-option
                  v-for="category in categoryStore.allCategories"
                  :key="category.categoryId"
                  :label="category.name"
                  :value="category.categoryId"
              />
            </el-select>
            <el-input v-model="searchQuery" placeholder="按名称或描述搜索" clearable @keyup.enter="handleSearch" style="width: 240px">
              <template #append>
                <el-button :icon="Search" @click="handleSearch" />
              </template>
            </el-input>
          </div>
        </div>
      </template>

      <el-table
          :data="atomStore.atoms"
          v-loading="atomStore.isLoading || categoryStore.isLoading"
          style="width: 100%"
          border
          stripe
          class="custom-table"
          @selection-change="handleSelectionChange"
          @row-click="handleRowClick"
          @row-dblclick="handleRowDblClick"
          ref="atomTableRef"
      >
        <el-table-column type="selection" width="45" align="center" />

        <!-- ID 列：淡化处理，使用等宽字体 -->
        <el-table-column prop="atomId" label="ID" width="70" sortable align="center">
          <template #default="{row}">
            <span class="id-text">{{ row.atomId }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="操作名称" min-width="220" show-overflow-tooltip />

        <el-table-column prop="categoryName" label="分类" width="110">
          <template #default="scope">
            <el-tag v-if="scope.row.categoryName" type="info" size="small" effect="light">{{ scope.row.categoryName }}</el-tag>
            <span v-else class="empty-text">--</span>
          </template>
        </el-table-column>

        <!-- 统计列：合并扫描与命中，增加视觉对比 -->
        <el-table-column label="扫描 / 命中" width="130" align="center">
          <template #default="scope">
            <div class="stat-cell">
              <span class="scan-count">{{ scope.row.totalScans || 0 }}</span>
              <span class="stat-divider">/</span>
              <span class="match-count">{{ scope.row.totalMatches || 0 }}</span>
            </div>
          </template>
        </el-table-column>

        <!-- 健康度：可视化进度条 + 精确逻辑判定 -->
        <el-table-column label="健康度" width="150" align="center" sortable prop="hitRate">
          <template #default="{ row }">
            <el-tooltip :content="getAtomHealthDesc(row)" placement="top">
              <div class="health-progress-wrapper">
                <el-progress
                    :percentage="Math.min(100, Math.round((row.hitRate || 0) * 100))"
                    :status="getAtomHealthStatus(row)"
                    :stroke-width="8"
                    :show-text="false"
                />
                <span :class="['health-text', getAtomHealthColor(row)]">
                  {{ row.hitRate ? (row.hitRate * 100).toFixed(2) + '%' : '0%' }}
                </span>
              </div>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column prop="priority" label="优先级" width="90" sortable align="center" />

        <el-table-column prop="description" label="描述" min-width="120" show-overflow-tooltip />

        <el-table-column label="创建时间" prop="createdAt" width="160" sortable>
          <template #default="scope">
            <span class="time-text">{{ formatDate(scope.row.createdAt) }}</span>
          </template>
        </el-table-column>

        <!-- 行内操作栏 -->
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="scope">
            <el-button :icon="Edit" link type="primary" @click.stop="handleEdit(scope.row.atomId)" title="编辑"></el-button>
            <el-button :icon="Delete" link type="danger" @click.stop="handleDelete(scope.row.atomId, scope.row.name)" title="删除"></el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
            v-if="atomStore.totalAtoms > 0"
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="atomStore.totalAtoms"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "AtomsList" });

import { ref, onMounted, onActivated } from "vue";
import { useAtomStore } from "@/stores/atomStore";
import { useRouter } from "vue-router";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import { ElMessage, ElMessageBox, ElTable } from "element-plus";
import { Plus, Edit, Delete, Search, CopyDocument, RefreshLeft } from "@element-plus/icons-vue";
import type { AtomicOperationCreatePayload } from "@/types/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const router = useRouter();
const atomTableRef = ref<InstanceType<typeof ElTable>>();
const selectedAtoms = ref<any[]>([]);
const atomStore = useAtomStore();
const categoryStore = useAtomCategoryStore();

const currentPage = ref(1);
const pageSize = ref(10);
const searchQuery = ref("");
const categoryFilter = ref<number | "">("");

const fetchData = () => {
  const params = {
    skip: (currentPage.value - 1) * pageSize.value,
    limit: pageSize.value,
    search: searchQuery.value || undefined,
    categoryId: categoryFilter.value || undefined,
  };
  atomStore.fetchAtoms(params);
};

/**
 * 核心业务逻辑：健康度判定 (1:1 还原)
 */
const getAtomHealthStatus = (row: any) => {
  if (row.totalScans > 500 && (row.totalMatches || 0) === 0) return 'exception'; // 僵尸原子
  if ((row.hitRate || 0) < 0.01) return 'warning'; // 低效
  return 'success';
};

const getAtomHealthColor = (row: any) => {
  if (row.totalScans > 500 && (row.totalMatches || 0) === 0) return 'danger';
  if (row.totalScans === 0) return 'info';
  if ((row.hitRate || 0) < 0.01) return 'warning';
  return 'success';
};

const getAtomHealthDesc = (row: any) => {
  if (row.totalScans > 500 && (row.totalMatches || 0) === 0) return '僵尸原子：扫描多次从未命中，建议清理';
  if (row.totalScans === 0) return '未激活：该原子尚未被任务扫描过';
  return `命中率：${((row.hitRate || 0) * 100).toFixed(2)}%`;
};

const formatDate = (dateString: string | Date): string => {
  if (!dateString) return "N/A";
  return dayjs.utc(dateString).local().format("YYYY-MM-DD HH:mm");
};

// 基础交互逻辑
const handleSearch = () => { currentPage.value = 1; fetchData(); };
const handleSizeChange = (val: number) => { pageSize.value = val; fetchData(); };
const handleCurrentChange = (val: number) => { currentPage.value = val; fetchData(); };
const handleCreate = () => { router.push({ name: "AtomEditor" }); };
const handleEdit = (atomId: number) => { router.push({ name: "AtomEditor", params: { atomId } }); };
const handleSelectionChange = (selection: any[]) => { selectedAtoms.value = selection; };

/**
 * 易用性增强：单击行切换选中
 */
const handleRowClick = (row: any) => {
  if (atomTableRef.value) {
    const isSelected = selectedAtoms.value.some(item => item.atomId === row.atomId);
    atomTableRef.value.toggleRowSelection(row, !isSelected);
  }
};

/**
 * 易用性增强：双击编辑
 */
const handleRowDblClick = (row: any) => { if (row && row.atomId) handleEdit(row.atomId); };

const handleEditSelected = () => {
  if (selectedAtoms.value.length === 1) handleEdit(selectedAtoms.value[0].atomId);
  else ElMessage.warning("请选择一个原子操作进行编辑");
};

/**
 * 核心逻辑：批量删除 (1:1 还原)
 */
const handleDeleteSelected = async () => {
  if (selectedAtoms.value.length === 0) return;
  const names = selectedAtoms.value.map(a => a.name).join(', ');
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedAtoms.value.length} 个操作吗？\n涉及: ${names}`, "批量删除确认", {
      type: "warning",
      confirmButtonClass: 'el-button--danger',
      dangerouslyUseHTMLString: true,
    });
    const deletePromises = selectedAtoms.value.map(atom => atomStore.deleteAtom(atom.atomId));
    await Promise.all(deletePromises);
    ElMessage.success(`成功删除 ${selectedAtoms.value.length} 个原子操作！`);
    fetchData();
  } catch (error) {
    if (error === 'cancel') ElMessage.info("已取消删除");
  }
};

const handleDelete = async (atomId: number, name: string) => {
  try {
    await ElMessageBox.confirm(`确定要删除原子操作 "${name}" 吗？`, "确认删除", { type: "warning" });
    await atomStore.deleteAtom(atomId);
    ElMessage.success("删除成功！");
    fetchData();
  } catch (e) { if (e !== 'cancel') console.error(e); }
};

/**
 * 核心逻辑：原子克隆 (1:1 还原深度克隆逻辑)
 */
const handleCopySelected = async () => {
  if (selectedAtoms.value.length !== 1) return;
  const atomId = selectedAtoms.value[0].atomId;
  try {
    await ElMessageBox.confirm("确定要复制此原子操作吗？", "确认复制", { type: "info" });
    const atom = await atomStore.fetchAtomById(atomId);
    if (!atom) return ElMessage.error("获取原数据失败");

    // 使用 JSON 序列化确保 100% 深度克隆，断绝所有对象引用关系
    const source = JSON.parse(JSON.stringify(atom));
    const payload: AtomicOperationCreatePayload = {
      name: `${source.name} - 副本`,
      description: source.description,
      triggerType: source.triggerType,
      categoryId: source.categoryId,
      priority: source.priority,
      executionCountLimit: source.executionCountLimit,
      continueAfterMatch: source.continueAfterMatch,
      actionLoopCount: source.actionLoopCount,
      sceneSnapshotJson: source.sceneSnapshotJson,
      actionsJson: source.actionsJson
    };

    await atomStore.addAtom(payload);
    ElMessage.success("复制成功");
    fetchData();
  } catch (error) { if (error !== "cancel") console.error("Copy failed:", error); }
};

/**
 * 核心业务逻辑：清除全量健康数据
 */
const handleResetAllStats = () => {
  ElMessageBox.confirm(
      '确定要清空本租户所有原子操作的“扫描次数”和“命中次数”吗？该操作不可撤销，健康度将重新从 0% 开始计算。',
      '警告：重置全量统计数据',
      {
        confirmButtonText: '确 定',
        cancelButtonText: '取 消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
  ).then(async () => {
    await atomStore.resetStats();
    ElMessage.success('统计数据已重置');
    fetchData(); // 刷新列表查看效果
  }).catch(() => {});
};


onMounted(() => { fetchData(); categoryStore.fetchAllCategories(); });
onActivated(() => { if (atomStore.needsRefresh) { fetchData(); atomStore.setNeedsRefresh(false); } });
</script>

<style scoped>
.atoms-list-page { padding: 0; }
.table-card { border: none; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.05) !important; }
.list-header-toolbar { display: flex; justify-content: space-between; align-items: center; }
.left-tools { display: flex; align-items: center; gap: 12px; }
.page-title { margin: 0; font-size: 16px; color: #303133; font-weight: 700; margin-right: 8px; }
.right-filters { display: flex; gap: 10px; }
.ml-4 { margin-left: 16px; }

/* 字体优化 */
.id-text { color: #909399; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 13px; }
.stat-cell { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.stat-divider { margin: 0 4px; color: #dcdfe6; }
.match-count { color: #67c23a; font-weight: bold; }
.time-text { color: #606266; font-size: 13px; }

/* 健康度展示 */
.health-progress-wrapper { width: 100%; display: flex; flex-direction: column; gap: 4px; padding: 0 4px; }
.health-text { font-size: 11px; font-weight: 600; }
.health-text.success { color: #67c23a; }
.health-text.warning { color: #e6a23c; }
.health-text.danger { color: #f56c6c; }
.health-text.info { color: #909399; }

.empty-text { color: #c0c4cc; font-size: 12px; }
.pagination-wrapper { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>