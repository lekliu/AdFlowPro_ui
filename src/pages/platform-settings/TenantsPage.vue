<!-- AdFlowPro_ui/src/pages/platform-settings/TenantsPage.vue -->
<template>
  <div class="tenants-page">
    <el-card>
      <template #header>
        <div class="flex-header">
          <span class="title">租户管理 (SaaS 控制台)</span>
          <el-button type="primary" :icon="Plus" @click="openCreateDialog">开通新租户</el-button>
        </div>
      </template>

      <!-- 租户列表 -->
      <el-table :data="tenants" v-loading="loading" border stripe style="width: 100%">
        <el-table-column prop="id" label="租户ID" width="120" />
        <el-table-column prop="name" label="租户名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="adminUsername" label="管理员" width="120">
          <template #default="{row}">
            <el-tag size="small">{{ row.adminUsername || '未设定' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="maxSlots" label="并发名额" width="100" align="center">
          <template #default="{row}">
            <b style="color: #409eff">{{ row.maxSlots }}</b>
          </template>
        </el-table-column>
        <el-table-column prop="userCount" label="成员数" width="90" align="center" />
        <el-table-column prop="isActive" label="状态" width="100" align="center">
          <template #default="{row}">
            <el-tag :type="row.isActive ? 'success' : 'danger'">
              {{ row.isActive ? '运行中' : '已停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{row}">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>

        <!-- 操作列 -->
        <el-table-column label="操作" fixed="right" width="280">
          <template #default="{row}">
            <el-button-group>
              <el-button size="small" :icon="Edit" @click="handleEdit(row)">编辑配额</el-button>
              <el-button size="small" type="warning" :icon="Lock" @click="handleResetPwd(row)">重置密码</el-button>

              <!-- 停用/启用切换 -->
              <el-button
                  v-if="row.id !== 'default'"
                  size="small"
                  :type="row.isActive ? 'danger' : 'success'"
                  :icon="row.isActive ? 'VideoPause' : 'VideoPlay'"
                  @click="toggleActive(row)"
              >
                {{ row.isActive ? '禁用' : '启用' }}
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 弹窗 1: 创建租户 (开户) -->
    <el-dialog v-model="createDialog.visible" title="开通新租户" width="500px">
      <el-form :model="createForm" label-width="110px" ref="createFormRef" :rules="createRules">
        <el-form-item label="租户ID" prop="tenantId">
          <el-input v-model="createForm.tenantId" placeholder="建议使用公司英文缩写, 如 'AliGroup'" />
        </el-form-item>
        <el-form-item label="租户名称" prop="fullName">
          <el-input v-model="createForm.fullName" placeholder="租户的全称" />
        </el-form-item>
        <el-divider>管理员账号初始化</el-divider>
        <el-form-item label="管理用户名" prop="adminUsername">
          <el-input v-model="createForm.adminUsername" placeholder="建议设为 admin" />
        </el-form-item>
        <el-form-item label="初始密码" prop="adminPassword">
          <el-input v-model="createForm.adminPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitCreate" :loading="submitting">立即开通</el-button>
      </template>
    </el-dialog>

    <!-- 弹窗 2: 编辑配额 -->
    <el-dialog v-model="editDialog.visible" title="调整租户配额" width="400px">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="租户名称">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="并发名额">
          <el-input-number v-model="editForm.maxSlots" :min="1" :max="1000" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitUpdate" :loading="submitting">保存变更</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { Plus, Edit, Lock, VideoPause, VideoPlay } from '@element-plus/icons-vue';
import apiClient from '@/api/apiClient';
import { ElMessage, ElMessageBox } from 'element-plus';

const tenants = ref([]);
const loading = ref(false);
const submitting = ref(false);

const createDialog = reactive({ visible: false });
const editDialog = reactive({ visible: false, currentId: null });

const createForm = reactive({ tenantId: '', fullName: '', adminUsername: 'admin', adminPassword: '' });
const editForm = reactive({ name: '', maxSlots: 1 });

const createRules = {
  tenantId: [{ required: true, message: '请输入租户ID', trigger: 'blur' }],
  fullName: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  adminUsername: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  adminPassword: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

const fetchTenants = async () => {
  loading.value = true;
  try {
    const res = await apiClient.get('/system/tenants');
    tenants.value = res.items;
  } finally { loading.value = false; }
};

const openCreateDialog = () => {
  Object.assign(createForm, { tenantId: '', fullName: '', adminUsername: 'admin', adminPassword: '' });
  createDialog.visible = true;
};

const submitCreate = async () => {
  submitting.value = true;
  try {
    await apiClient.post('/system/tenants/create', createForm);
    ElMessage.success('租户开通成功');
    createDialog.visible = false;
    fetchTenants();
  } catch (error) { 
    // 错误已被 apiClient 拦截器通过 ElMessage 显示，此处仅需停止加载
  } finally { submitting.value = false; }
};

const handleEdit = (row) => {
  editDialog.currentId = row.id;
  editForm.name = row.name;
  editForm.maxSlots = row.maxSlots;
  editDialog.visible = true;
};

const submitUpdate = async () => {
  submitting.value = true;
  try {
    await apiClient.put(`/system/tenants/${editDialog.currentId}`, editForm);
    ElMessage.success('配额已更新');
    editDialog.visible = false;
    fetchTenants();
  } finally { submitting.value = false; }
};

const handleResetPwd = (row) => {
  ElMessageBox.prompt(`正在重置租户 [${row.id}] 的管理员密码`, '安全重置', {
    confirmButtonText: '确定重置',
    cancelButtonText: '取消',
    inputPlaceholder: '请输入新密码',
    inputType: 'password'
  }).then(async ({ value }) => {
    if (!value) return;
    await apiClient.post(`/system/tenants/${row.id}/reset-admin-password`, { newPassword: value });
    ElMessage.success('密码已成功重置');
  });
};

const toggleActive = (row) => {
  const action = row.isActive ? '停用' : '启用';
  ElMessageBox.confirm(`确定要${action}租户 [${row.name}] 吗？${row.isActive ? '停用后其下所有设备将立即失效。' : ''}`, '状态变更').then(async () => {
    if (row.isActive) {
      // 调用软删除接口
      await apiClient.delete(`/system/tenants/${row.id}`);
    } else {
      // 调用更新接口恢复
      await apiClient.put(`/system/tenants/${row.id}`, { isActive: true });
    }
    ElMessage.success(`租户已${action}`);
    fetchTenants();
  });
};

onMounted(fetchTenants);
</script>

<style scoped>
.flex-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 16px; font-weight: bold; color: #303133; }
</style>