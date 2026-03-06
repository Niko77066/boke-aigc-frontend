import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>({
    id: 'user_001',
    username: '运营小王',
    email: 'xiaowang@boke.com',
    avatar: '',
    role: 'admin',
    created_at: '2026-01-01T00:00:00Z',
  })
  const isAuthenticated = ref(true)
  const token = ref<string | null>('mock_token_boke_aigc')
  const permissions = ref<string[]>(['asset:manage', 'workflow:create', 'render:submit'])

  const displayName = computed(() => user.value?.username ?? '未登录')

  function setUser(u: User) {
    user.value = u
    isAuthenticated.value = true
  }

  function logout() {
    user.value = null
    isAuthenticated.value = false
    token.value = null
    permissions.value = []
  }

  return {
    user,
    isAuthenticated,
    token,
    permissions,
    displayName,
    setUser,
    logout,
  }
})
