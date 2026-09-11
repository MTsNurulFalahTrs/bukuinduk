<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex items-center justify-center p-4">
    <!-- Background pattern -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/5" />
      <div class="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-white/5" />
      <div class="absolute top-1/2 left-1/4 w-40 h-40 rounded-full bg-white/5" />
    </div>

    <div class="relative w-full max-w-sm">
      <!-- Logo / Branding -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
          <img src="/favicon.svg" alt="Logo" class="w-10 h-10" />
        </div>
        <h1 class="text-2xl font-bold text-white">{{ appSettings?.schoolName || APP_NAME }}</h1>
        <p class="text-primary-200 text-sm mt-1">Buku Induk Digital</p>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <slot />
      </div>

      <!-- Footer -->
      <p class="text-center text-primary-300 text-xs mt-6">
        &copy; {{ currentYear }} Buku Induk Digital. Hak cipta dilindungi.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { APP_NAME } from '@/constants'

// Settings opsional (bisa diisi nanti dari store)
defineProps<{ appSettings?: { schoolName?: string } | null }>()

const currentYear = computed(() => new Date().getFullYear())
</script>
