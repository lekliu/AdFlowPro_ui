<!-- AdFlowPro_ui/src/pages/LoginPage.vue -->
<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <h2 style="text-align: center; margin: 0;">AdFlowPro 管理后台</h2>
      </template>
      <el-form :model="loginForm" @keyup.enter="handleLogin">
        <el-form-item>
          <el-input v-model="loginForm.username" placeholder="用户名" prefix-icon="User" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="loginForm.password" type="password" placeholder="密码" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-button type="primary" :loading="loading" style="width: 100%" @click="handleLogin">登 录</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';
import apiClient from '@/api/apiClient';
import { ElMessage } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';

const authStore = useAuthStore();
const router = useRouter();
const loading = ref(false);

const loginForm = reactive({ username: '', password: '' });

const handleLogin = async () => {
  if (!loginForm.username || !loginForm.password) return;
  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.append('username', loginForm.username);
    params.append('password', loginForm.password);

    // 显式指定 Header 为 form-urlencoded，确保后端 OAuth2PasswordRequestForm 能正确解析
    const res: any = await apiClient.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    // --- 核心修正点：改为读取 access_token ---
    authStore.setAuth(res.access_token, res.user_info);
    // ---------------------------------------

    ElMessage.success('欢迎回来！');
    router.push('/');
  } catch (error) { } finally { loading.value = false; }
};
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0f2f5;
}
.login-card {
  width: 400px;
}
</style>
