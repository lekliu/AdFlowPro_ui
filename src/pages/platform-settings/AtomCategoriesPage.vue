<template>
  <div class="atom-categories-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>原子操作分类管理</span>
          <el-button type="primary" :icon="Plus" @click="handleOpenDialog(null)"> 新建分类 </el-button>
        </div>
      </template>

      <div class="filter-container">
        <el-input v-model="searchQuery" placeholder="按分类名称搜索" clearable @keyup.enter="handleSearch" style="width: 300px; margin-right: 10px">
          <template #append>
            <el-button :icon="Search" @click="handleSearch" />
          </template>
        </el-input>
      </div>

      <el-table :data="categoryStore.categoriesWithCount" v-loading="categoryStore.isLoading" style="width: 100%" border stripe>
        <el-table-column prop="categoryId" label="ID" width="80" sortable />
        <el-table-column prop="name" label="分类名称" width="250" sortable />
        <el-table-column prop="atomCount" label="原子操作数量" width="150" sortable align="center" />
        <el-table-column prop="packageCount" label="测试包数量" width="150" sortable align="center" />
        <el-table-column prop="description" label="描述" min-width="300" show-overflow-tooltip />
        <el-table-column label="更新时间" prop="updatedAt" width="180" sortable>
          <template #default="scope">{{ formatDate(scope.row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" :icon="Edit" @click="handleOpenDialog(scope.row)"/>
            <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(scope.row)" :disabled="scope.row.atomCount > 0 || scope.row.packageCount > 0"/>
          </template>
        </el-table-column>
      </el-table>

      <!-- No pagination for now as categories are expected to be few -->
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" @close="resetForm">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" placeholder="例如: 登录流程" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="可选, 描述该分类的用途" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="categoryStore.isLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "AtomCategories",
});
import { ref, onMounted, reactive } from "vue";
import { useAtomCategoryStore } from "@/stores/atomCategoryStore";
import type { AtomCategoryPublic } from "@/types/api";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { Plus, Edit, Delete, Search } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import apiClient from "@/api/apiClient";

dayjs.extend(utc);

const categoryStore = useAtomCategoryStore();

const searchQuery = ref<string>("");
const formRef = ref<FormInstance>();

const dialog = reactive({
  visible: false,
  title: "新建分类",
});

const form = reactive({
  categoryId: null as number | null,
  name: "",
  description: "",
});

const rules = reactive<FormRules>({
  name: [{ required: true, message: "请输入分类名称", trigger: "blur" }],
});

const fetchData = () => {
  categoryStore.fetchCategoriesWithCount(searchQuery.value || undefined);
};

onMounted(fetchData);

const handleSearch = () => {
  fetchData();
};

const resetForm = () => {
  form.categoryId = null;
  form.name = "";
  form.description = "";
  formRef.value?.clearValidate();
};

const handleOpenDialog = (category: (AtomCategoryPublic & { atomCount: number }) | null) => {
  resetForm();
  if (category) {
    dialog.title = "编辑分类";
    form.categoryId = category.categoryId;
    form.name = category.name;
    form.description = category.description || "";
  } else {
    dialog.title = "新建分类";
  }
  dialog.visible = true;
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      const isEdit = !!form.categoryId;
      const payload = {
        name: form.name,
        description: form.description,
      };

      try {
        if (isEdit) {
          await categoryStore.editCategory(form.categoryId!, payload);
        } else {
          await categoryStore.addCategory(payload);
        }
        ElMessage.success(`${isEdit ? "更新" : "创建"}成功！`);
        dialog.visible = false;
        fetchData(); // Reload data
      } catch (error) {
        // Error is handled by API interceptor
      }
    }
  });
};

const handleDelete = async (category: any) => {
  const loading = ElLoading.service({ text: '正在进行风险评估...' });

  try {
    // 1. 调用评估接口
    const impact: any = await apiClient.get(`/atom-categories/${category.categoryId}/lineage`);
    loading.close();

    if (impact.totalImpact > 0) {
      // 2. 如果存在关联资产，弹出结构化报告
      const detailsHtml = impact.details.map((d: any) =>
          `<div style="margin-bottom:12px">
          <b style="color:#303133">● ${d.type} (${d.count}个):</b><br/>
          <div style="color:#909399; font-size:12px; padding-left:12px; margin-top:4px; line-height:1.6">
            ${d.items.join('、')}
          </div>
        </div>`
      ).join('');

      ElMessageBox.alert(
          `<div style="max-height: 400px; overflow-y: auto; padding-right:8px">
          <p style="color:#f56c6c; font-weight:bold; font-size:15px; margin-bottom:15px">
            无法删除分类！该分类下仍有 ${impact.totalImpact} 项资产。
          </p>
          ${detailsHtml}
          <p style="margin-top:15px; color:#E6A23C; font-size:12px">提示：请先将上述资产迁移至其他分类或删除。</p>
        </div>`,
          '分类删除拦截报告',
          { dangerouslyUseHTMLString: true, confirmButtonText: '我知道了', type: 'error' }
      );
      return;
    }

    // 3. 只有 totalImpact 为 0 时，才走原来的删除逻辑
    await ElMessageBox.confirm(`确定要删除分类 "${category.name}" 吗？`, "二次确认", {
      type: "warning",
      confirmButtonClass: "el-button--danger"
    });

    await categoryStore.removeCategory(category.categoryId);
    ElMessage.success("分类已成功删除");
    fetchData();

  } catch (error) {
    if (error !== 'cancel') console.error(error);
  } finally {
    loading.close();
  }
};

const formatDate = (dateString: string | Date): string => {
  if (!dateString) return "N/A";
  return dayjs.utc(dateString).local().format("YYYY-MM-DD HH:mm:ss");
};
</script>

<style scoped>
.atom-categories-page {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.filter-container {
  margin-bottom: 20px;
}
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>