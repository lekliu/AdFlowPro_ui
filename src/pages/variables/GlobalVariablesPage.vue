<template>
  <div class="global-variables-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>全局变量管理</span>
          <el-button type="primary" :icon="Plus" @click="handleOpenDialog(null)"> 新增变量 </el-button>
        </div>
      </template>

      <div class="filter-container">
        <el-input v-model="searchQuery" placeholder="按变量名或值搜索" clearable @keyup.enter="handleSearch" style="width: 300px; margin-right: 10px">
          <template #append>
            <el-button :icon="Search" @click="handleSearch" />
          </template>
        </el-input>
      </div>

      <el-table :data="variableStore.variables" v-loading="variableStore.isLoading" style="width: 100%" border stripe>
        <el-table-column prop="name" label="变量名" width="200" sortable>
          <template #default="scope">
            <code>${{ scope.row.name }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="value" label="变量值" min-width="250" show-overflow-tooltip />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="更新时间" prop="updatedAt" width="180" sortable>
          <template #default="scope">{{ formatDate(scope.row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" :icon="Edit" @click="handleOpenDialog(scope.row)" />
            <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(scope.row)" />
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="variableStore.totalVariables > 0"
        class="pagination-container"
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="variableStore.totalVariables"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialog.visible" :title="dialog.title" width="500px" @close="resetForm">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="变量名" prop="name">
          <el-input v-model="form.name" placeholder="例如: LOGIN_USER" />
        </el-form-item>
        <el-form-item label="变量值" prop="value">
          <el-input v-model="form.value" type="textarea" :rows="3" placeholder="例如: test_user_01" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" placeholder="可选, 描述变量用途" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="variableStore.isLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "GlobalVariables",
});
import { ref, onMounted, computed, reactive } from "vue";
import { useGlobalVariableStore } from "@/stores/globalVariableStore";
import type { GlobalVariablePublic } from "@/types/api";
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from "element-plus";
import { Plus, Edit, Delete, Search } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const variableStore = useGlobalVariableStore();

// --- 分页和搜索状态 ---
const currentPage = ref(1);
const pageSize = ref(10);
const searchQuery = ref("");

// --- 对话框状态 ---
const formRef = ref<FormInstance>();
const dialog = reactive({
  visible: false,
  title: "新增变量",
});
const form = reactive({
  variableId: null as number | null,
  name: "",
  value: "",
  description: "",
});

const rules = reactive<FormRules>({
  name: [
    { required: true, message: "请输入变量名", trigger: "blur" },
    {
      pattern: /^[a-zA-Z0-9_]+$/,
      message: "变量名只能包含字母、数字和下划线",
      trigger: "blur",
    },
  ],
  value: [{ required: true, message: "请输入变量值", trigger: "blur" }],
});

// --- 数据获取 ---
const fetchData = () => {
  variableStore.fetchVariables({
    skip: (currentPage.value - 1) * pageSize.value,
    limit: pageSize.value,
    search: searchQuery.value || undefined,
  });
};

onMounted(fetchData);

// --- 事件处理器 ---
const handleSearch = () => {
  currentPage.value = 1;
  fetchData();
};

const handleSizeChange = (val: number) => {
  pageSize.value = val;
  fetchData();
};

const handleCurrentChange = (val: number) => {
  currentPage.value = val;
  fetchData();
};

const resetForm = () => {
  form.variableId = null;
  form.name = "";
  form.value = "";
  form.description = "";
  formRef.value?.clearValidate();
};

const handleOpenDialog = (variable: GlobalVariablePublic | null) => {
  resetForm();
  if (variable) {
    dialog.title = "编辑变量";
    form.variableId = variable.variableId;
    form.name = variable.name;
    form.value = variable.value;
    form.description = variable.description || "";
  } else {
    dialog.title = "新增变量";
  }
  dialog.visible = true;
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      const isEdit = !!form.variableId;
      const payload = {
        name: form.name,
        value: form.value,
        description: form.description,
      };

      try {
        if (isEdit) {
          await variableStore.updateVariable(form.variableId!, payload);
        } else {
          await variableStore.addVariable(payload);
        }
        ElMessage.success(`${isEdit ? "更新" : "创建"}成功！`);
        dialog.visible = false;
        fetchData(); // 重新加载数据
      } catch (error) {
        // API 客户端的拦截器会自动处理错误提示
      }
    }
  });
};

const handleDelete = async (variable: GlobalVariablePublic) => {
  try {
    await ElMessageBox.confirm(`确定要删除变量 "${variable.name}" 吗？`, "确认删除", {
      type: "warning",
    });
    await variableStore.deleteVariable(variable.variableId);
    ElMessage.success("删除成功！");
    // 如果删除的是当前页的最后一条数据，则需要向前翻页
    if (variableStore.variables.length === 1 && currentPage.value > 1) {
      currentPage.value--;
    }
    fetchData();
  } catch (error) {
    if (error !== "cancel") {
      // API 拦截器会处理错误
    } else {
      ElMessage.info("已取消删除");
    }
  }
};

const formatDate = (dateString: string | Date): string => {
  if (!dateString) return "N/A";
  return dayjs.utc(dateString).local().format("YYYY-MM-DD HH:mm:ss");
};
</script>

<style scoped>
.global-variables-page {
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
code {
  background-color: #f4f4f5;
  color: #909399;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: "Courier New", Courier, monospace;
}
</style>
