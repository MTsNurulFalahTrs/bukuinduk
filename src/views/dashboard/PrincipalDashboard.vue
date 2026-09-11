<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-xl font-bold text-slate-800">
        Selamat datang, {{ authStore.user?.fullName?.split(' ')[0] }} 👋
      </h1>
      <p class="text-sm text-slate-500 mt-0.5">
        Ringkasan data — {{ schoolYearStore.activeSchoolYearName
          ? 'Tahun Pelajaran ' + schoolYearStore.activeSchoolYearName : '' }}
      </p>
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total Siswa" :value="stats?.totalStudents" :icon="Users" color="blue" :loading="isLoading" />
      <StatCard label="Siswa Aktif" :value="stats?.activeStudents" :icon="CheckCircle" color="green" :loading="isLoading" />
      <StatCard label="Laki-laki" :value="stats?.maleStudents" :icon="User" color="blue" :loading="isLoading" />
      <StatCard label="Perempuan" :value="stats?.femaleStudents" :icon="User" color="purple" :loading="isLoading" />
    </div>

    <!-- Rekap Kelas -->
    <BaseCard title="Rekap Siswa per Kelas">
      <div v-if="isLoading" class="space-y-2 mt-2">
        <BaseSkeleton height="h-10" v-for="i in 5" :key="i" />
      </div>
      <div v-else-if="!classStats.length" class="py-8 text-center text-sm text-slate-400">
        Belum ada data kelas.
      </div>
      <div v-else class="overflow-x-auto mt-2 -mx-5 sm:mx-0">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
              <th class="px-4 py-2.5 text-left">Kelas</th>
              <th class="px-4 py-2.5 text-center">L</th>
              <th class="px-4 py-2.5 text-center">P</th>
              <th class="px-4 py-2.5 text-center font-bold">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="cls in classStats" :key="cls.classroomId" class="hover:bg-slate-50">
              <td class="px-4 py-2.5 font-medium text-slate-700">{{ cls.classroomName }}</td>
              <td class="px-4 py-2.5 text-center text-blue-600">{{ cls.maleStudents }}</td>
              <td class="px-4 py-2.5 text-center text-pink-600">{{ cls.femaleStudents }}</td>
              <td class="px-4 py-2.5 text-center font-bold text-slate-800">{{ cls.totalStudents }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="bg-slate-50 font-semibold text-slate-700 border-t-2 border-slate-200">
              <td class="px-4 py-2.5">Total</td>
              <td class="px-4 py-2.5 text-center text-blue-600">{{ classStats.reduce((a, c) => a + c.maleStudents, 0) }}</td>
              <td class="px-4 py-2.5 text-center text-pink-600">{{ classStats.reduce((a, c) => a + c.femaleStudents, 0) }}</td>
              <td class="px-4 py-2.5 text-center font-bold">{{ classStats.reduce((a, c) => a + c.totalStudents, 0) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </BaseCard>

    <!-- Status distribusi -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <BaseCard
        v-for="item in statusSummary"
        :key="item.label"
        class="flex items-center gap-4"
        :padding="true"
      >
        <div :class="['p-3 rounded-xl shrink-0', item.bg]">
          <component :is="item.icon" :class="['h-5 w-5', item.color]" />
        </div>
        <div>
          <p class="text-2xl font-bold text-slate-800 leading-none">{{ formatNumber(item.value) }}</p>
          <p class="text-sm text-slate-500 mt-1">{{ item.label }}</p>
        </div>
      </BaseCard>
    </div>

    <!-- Quick actions -->
    <div class="flex flex-wrap gap-3">
      <RouterLink
        to="/students"
        class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
      >
        <Users class="h-4 w-4" /> Lihat Data Siswa
      </RouterLink>
      <RouterLink
        to="/reports"
        class="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
      >
        <FileText class="h-4 w-4" /> Laporan
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Users, User, CheckCircle, GraduationCap,
  ArrowRightLeft, FileText,
} from 'lucide-vue-next'
import { StatCard } from '@/components/shared'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'
import { useAuthStore } from '@/stores/auth'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { reportsService } from '@/services'
import { formatNumber } from '@/utils'
import type { DashboardStats, ClassroomStats } from '@/types'

const authStore = useAuthStore()
const schoolYearStore = useSchoolYearStore()
const stats = ref<DashboardStats | null>(null)
const classStats = ref<ClassroomStats[]>([])
const isLoading = ref(true)

const statusSummary = computed(() => [
  { label: 'Siswa Lulus', value: stats.value?.graduatedStudents ?? 0, icon: GraduationCap, bg: 'bg-blue-100', color: 'text-blue-600' },
  { label: 'Siswa Pindah', value: stats.value?.transferredStudents ?? 0, icon: ArrowRightLeft, bg: 'bg-amber-100', color: 'text-amber-600' },
  { label: 'Siswa Baru', value: stats.value?.newStudentsThisYear ?? 0, icon: Users, bg: 'bg-green-100', color: 'text-green-600' },
])

onMounted(async () => {
  const syId = schoolYearStore.activeSchoolYear?.id
  try {
    const [s, cs] = await Promise.all([
      reportsService.getDashboardStats(syId),
      reportsService.getClassroomStats(syId),
    ])
    stats.value = s
    classStats.value = cs
  } catch { /* silent */ } finally {
    isLoading.value = false
  }
})
</script>
