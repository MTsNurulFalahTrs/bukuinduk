<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-xl font-bold text-slate-800">
        Selamat datang, {{ authStore.user?.fullName?.split(' ')[0] }} 👋
      </h1>
      <p class="text-sm text-slate-500 mt-0.5">Kelas yang Anda ampu</p>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <BaseSkeleton v-for="i in 3" :key="i" height="h-32" />
    </div>

    <!-- Empty -->
    <BaseEmpty
      v-else-if="!classrooms.length"
      title="Belum ada kelas yang diampu"
      description="Hubungi administrator untuk menambahkan kelas ke akun Anda."
      type="students"
    />

    <!-- Kelas yang diampu -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <RouterLink
        v-for="cls in classrooms"
        :key="cls.id"
        :to="`/classrooms/${cls.id}`"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-primary-300 hover:shadow-md transition-all group"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="p-2.5 bg-primary-100 rounded-xl">
            <School class="h-5 w-5 text-primary-600" />
          </div>
          <BaseBadge color="green" dot>Aktif</BaseBadge>
        </div>
        <h3 class="font-bold text-lg text-slate-800 group-hover:text-primary-700 transition-colors">
          Kelas {{ cls.name }}
        </h3>
        <p class="text-sm text-slate-500 mt-0.5">{{ cls.schoolYearName }}</p>
        <div class="flex items-center gap-1 mt-3 text-sm text-slate-600">
          <Users class="h-4 w-4 text-slate-400" />
          <span class="font-semibold">{{ cls.studentCount ?? '-' }}</span>
          <span class="text-slate-400">siswa</span>
        </div>
      </RouterLink>
    </div>

    <!-- Aksi cepat -->
    <BaseCard v-if="classrooms.length" title="Aksi Cepat">
      <div class="flex flex-wrap gap-3 mt-1">
        <RouterLink
          :to="classrooms[0] ? `/classrooms/${classrooms[0].id}` : '/classrooms'"
          class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Users class="h-4 w-4" /> Daftar Siswa
        </RouterLink>
        <RouterLink
          to="/my-students"
          class="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Search class="h-4 w-4" /> Cari Siswa
        </RouterLink>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { School, Users, Search } from 'lucide-vue-next'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'
import BaseEmpty from '@/components/ui/BaseEmpty.vue'
import { useAuthStore } from '@/stores/auth'
import { classroomsService } from '@/services'
import type { Classroom } from '@/types'

const authStore = useAuthStore()
const classrooms = ref<Classroom[]>([])
const isLoading = ref(true)

onMounted(async () => {
  const teacherId = authStore.user?.teacherId
  if (!teacherId) { isLoading.value = false; return }
  try {
    classrooms.value = await classroomsService.getByTeacher(teacherId)
  } catch { /* silent */ } finally {
    isLoading.value = false
  }
})
</script>
