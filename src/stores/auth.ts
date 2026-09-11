import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginPayload } from '@/types'
import type { Permission } from '@/constants'
import { ROLE_PERMISSIONS } from '@/constants'
import { authService } from '@/services'
import { setUnauthorizedHandler } from '@/services'
import { getToken, setToken, setStoredUser, getStoredUser, clearAuth, getUserFromToken, isTokenExpired } from '@/utils'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(getStoredUser())
  const token = ref<string | null>(getToken())
  const isLoading = ref(false)

  const isAuthenticated = computed(() =>
    !!token.value && !!user.value && !isTokenExpired(token.value)
  )

  const userRole = computed(() => user.value?.role ?? null)

  // ── Setup unauthorized handler ────────────────────────────────
  setUnauthorizedHandler(() => {
    logout()
    // Redirect ditangani di router guard
  })

  // ── Actions ──────────────────────────────────────────────────

  async function login(payload: LoginPayload): Promise<void> {
    isLoading.value = true
    try {
      const res = await authService.login(payload)
      token.value = res.token
      user.value = res.user
      setToken(res.token)
      setStoredUser(res.user)
    } finally {
      isLoading.value = false
    }
  }

  async function logout(): Promise<void> {
    // Best-effort — tidak perlu await agar tidak blocking
    authService.logout().catch(() => {})
    token.value = null
    user.value = null
    clearAuth()
  }

  async function refreshUser(): Promise<void> {
    if (!token.value) return
    try {
      const me = await authService.me()
      user.value = me
      setStoredUser(me)
    } catch {
      // Token mungkin sudah expired
      logout()
    }
  }

  /**
   * Inisialisasi dari storage saat app pertama kali load.
   * Dipanggil di router beforeEach.
   */
  function initFromStorage(): void {
    const storedToken = getToken()
    const storedUser = getStoredUser()
    if (storedToken && storedUser && !isTokenExpired(storedToken)) {
      token.value = storedToken
      user.value = storedUser
    } else {
      clearAuth()
      token.value = null
      user.value = null
    }
  }

  function hasPermission(permission: Permission): boolean {
    if (!user.value) return false
    const perms = ROLE_PERMISSIONS[user.value.role] ?? []
    return perms.includes(permission)
  }

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    userRole,
    login,
    logout,
    refreshUser,
    initFromStorage,
    hasPermission,
  }
})
