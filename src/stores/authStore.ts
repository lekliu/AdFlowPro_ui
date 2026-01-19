// AdFlowPro_ui/src/stores/authStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('token') || '');
    const user = ref(JSON.parse(localStorage.getItem('user_info') || 'null'));

    const isAuthenticated = computed(() => !!token.value);
    const isAdmin = computed(() => user.value?.role === 'admin');

    function setAuth(accessToken: string, userInfo: any) {
        token.value = accessToken;
        user.value = userInfo;
        localStorage.setItem('token', accessToken);
        localStorage.setItem('user_info', JSON.stringify(userInfo));
    }

    function logout() {
        token.value = '';
        user.value = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user_info');
        // 跳转到登录页由外部逻辑处理
    }

    return { token, user, isAuthenticated, isAdmin, setAuth, logout };
});
