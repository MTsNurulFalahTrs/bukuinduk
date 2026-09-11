<template>
  <AuthLayout>
    <div class="p-6 sm:p-8">
      <h2 class="text-xl font-bold text-slate-800 mb-1">Masuk ke Sistem</h2>
      <p class="text-sm text-slate-500 mb-6">Masukkan username dan password Anda</p>

      <BaseAlert v-if="errorMsg" type="error" dismissible class="mb-4">
        {{ errorMsg }}
      </BaseAlert>

      <form class="space-y-4" @submit.prevent="handleLogin">
        <!-- Username -->
        <BaseInput
          v-model="form.username"
          label="Username"
          placeholder="Masukkan username"
          required
          :prefix-icon="User"
          :error-message="errors.username"
          autocomplete="username"
        />

        <!-- Password -->
        <div class="w-full">
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Password <span class="text-red-500">*</span>
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock class="h-4 w-4" />
            </div>
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Masukkan password"
              required
              autocomplete="current-password"
              :class="[
                'block w-full rounded-lg border text-sm text-slate-800 placeholder-slate-400 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-offset-0 pl-9 pr-10 py-2',
                errors.password
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                  : 'border-slate-300 focus:border-primary-500 focus:ring-primary-100',
              ]"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>
          </div>
          <p v-if="errors.password" class="mt-1 text-xs text-red-500">{{ errors.password }}</p>
        </div>

        <!-- Submit -->
        <BaseButton
          type="submit"
          variant="primary"
          size="lg"
          :loading="isLoading"
          loading-text="Memverifikasi..."
          class="w-full mt-2"
        >
          <LogIn class="h-4 w-4" />
          Masuk
        </BaseButton>
      </form>

      <p class="text-center text-xs text-slate-400 mt-6">
        Lupa password? Hubungi administrator sistem.
      </p>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock, Eye, EyeOff, LogIn } from 'lucide-vue-next'
import AuthLayout from '@/layouts/AuthLayout.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import { useAuthStore } from '@/stores/auth'
import { loginSchema } from '@/utils/validation'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ username: '', password: '' })
const errors = reactive<{ username?: string; password?: string }>({})
const errorMsg = ref('')
const isLoading = ref(false)
const showPassword = ref(false)

async function handleLogin() {
  // Reset errors
  errors.username = undefined
  errors.password = undefined
  errorMsg.value = ''

  // Validasi client-side
  try {
    await loginSchema.validate(form, { abortEarly: false })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'inner' in err) {
      const validationErrors = (err as { inner: { path: string; message: string }[] }).inner
      for (const e of validationErrors) {
        if (e.path === 'username') errors.username = e.message
        if (e.path === 'password') errors.password = e.message
      }
    }
    return
  }

  isLoading.value = true
  try {
    await authStore.login({ username: form.username, password: form.password })

    // Redirect ke halaman sebelumnya atau dashboard
    const redirect = route.query.redirect as string | undefined
    if (redirect && redirect.startsWith('/') && redirect !== '/login') {
      router.push(redirect)
    } else {
      router.push('/dashboard')
    }
  } catch (err: unknown) {
    errorMsg.value = err instanceof Error ? err.message : 'Login gagal. Coba lagi.'
    // BUG-65 FIX: Bersihkan field password setelah login gagal agar credential
    // tidak tertinggal di memori / form lebih lama dari yang diperlukan.
    // Username dibiarkan terisi agar user tidak perlu mengetik ulang.
    form.password = ''
  } finally {
    isLoading.value = false
  }
}
</script>
