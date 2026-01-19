<template>
  <div class="users-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>成员管理 (租户: {{ authStore.user?.tenantId }})</span>
          <el-button type="primary" :icon="Plus" @click="handleOpenDialog(null)">新增成员</el-button>
        </div>
      </template>

      <el-table :data="users" v-loading="loading" border stripe>
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="fullName" label="姓名" width="150" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'info'">{{ row.role }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">{{ row.isActive ? '激活' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="加入时间" width="180">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="150">
          <template #default="{ row }">
            <!-- 仅本人或非 super_admin 用户可编辑 -->
            <el-button 
              type="primary" link :icon="Edit"
              v-if="row.role !== 'super_admin' || row.id === authStore.user?.id"
              @click="handleOpenDialog(row)"
            >编辑</el-button>

            <!-- 禁止删除任何 super_admin -->
            <el-button 
              type="danger" link :icon="Delete"
              v-if="row.role !== 'super_admin' && row.username !== 'admin'"
              @click="handleDelete(row)" 
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="450px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="form.username" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="form.fullName" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" placeholder="不修改请留空" show-password />
        </el-form-item>
        <el-form-item label="角色">
          <el-select 
            v-model="form.role" 
            style="width: 100%" 
            :disabled="form.role === 'super_admin'"
          >
            <el-option v-if="form.role === 'super_admin'" label="超级管理员" value="super_admin" />
            <el-option label="管理员" value="admin" />
            <el-option label="普通成员" value="user" />
            <el-option label="只读成员" value="viewer" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" v-if="form.id">
          <el-switch 
            v-model="form.isActive" 
            :disabled="form.role === 'super_admin'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { Plus, Edit, Delete } from '@element-plus/icons-vue';
import apiClient from '@/api/apiClient';
import { useAuthStore } from '@/stores/authStore';
import { ElMessage, ElMessageBox } from 'element-plus';

const authStore = useAuthStore();
const users = ref([]);
const loading = ref(false);
const dialog = reactive({ visible: false, title: '' });
const form = reactive({ id: null, username: '', fullName: '', password: '', role: 'user', isActive: true });

const fetchUsers = async () => {
  loading.value = true;
  try {
    const res: any = await apiClient.get('/system/users');
    users.value = res.items;
  } finally { loading.value = false; }
};

const handleOpenDialog = (user: any) => {
  if (user) {
    Object.assign(form, { ...user, password: '' });
    dialog.title = '编辑成员';
  } else {
    Object.assign(form, { id: null, username: '', fullName: '', password: '', role: 'user', isActive: true });
    dialog.title = '新增成员';
  }
  dialog.visible = true;
};

const handleSubmit = async () => {
  try {
    if (form.id) {
      // --- 编辑模式 ---
      // 1. 手动构建需要更新的字段，避免使用 delete 操作符触发 TS 错误
      const updatePayload: Record<string, any> = {
        fullName: form.fullName,
        role: form.role,
        isActive: form.isActive
      };

      // 2. 仅当用户输入了新密码时，才加入到负载中
      if (form.password && form.password.trim() !== '') {
        updatePayload.password = form.password;
      }

      await apiClient.put(`/system/users/${form.id}`, updatePayload);
      ElMessage.success('更新成功');
    } else {
      // --- 新增模式 ---
      // 结构赋值获取除 id 外的所有字段
      const { id, ...createPayload } = form;
      if (!createPayload.username || createPayload.username.length < 3) {
        return ElMessage.error('用户名至少需要3个字符');
      }
      await apiClient.post('/system/users', createPayload);
      ElMessage.success('创建成功');
    }
    dialog.visible = false;
    fetchUsers();
  } catch (e) {
    // 错误已由拦截器处理
  }
};

const handleDelete = (user: any) => {
  ElMessageBox.confirm(`确定删除成员 ${user.username} 吗？`).then(async () => {
    await apiClient.delete(`/system/users/${user.id}`);
    ElMessage.success('已删除');
    fetchUsers();
  });
};

onMounted(fetchUsers);
</script>
