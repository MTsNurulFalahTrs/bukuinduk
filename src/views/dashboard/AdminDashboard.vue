<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div>
        <h1 class="text-xl font-bold text-slate-800">
          Selamat datang, {{ authStore.user?.fullName?.split(' ')[0] }} 👋
        </h1>
        <p class="text-sm text-slate-500 mt-0.5">
          {{ schoolYearStore.activeSchoolYearName
            ? 'Tahun Pelajaran ' + schoolYearStore.activeSchoolYearName
            : 'Buku Induk Digital' }}
        </p>
      </div>
      <RouterLink
        to="/students/create"
        class="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors self-start sm:self-auto"
      >
        <UserPlus class="h-4 w-4" />
        Tambah Siswa
      </RouterLink>
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Siswa Aktif"
        :value="stats?.activeStudents"
        :icon="Users"
        color="blue"
        :loading="isLoadingStats"
      />
      <StatCard
        label="Siswa Baru Tahun Ini"
        :value="stats?.newStudentsThisYear"
        :icon="UserPlus"
        color="green"
        :loading="isLoadingStats"
      />
      <StatCard
        label="Total Guru"
        :value="stats?.totalTeachers"
        :icon="GraduationCap"
        color="purple"
        :loading="isLoadingStats"
      />
      <StatCard
        label="Total Kelas"
        :value="stats?.totalClassrooms"
        :icon="School"
        color="teal"
        :loading="isLoadingStats"
      />
    </div>

    <!-- Row 2: Gender + Status -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Distribusi Gender -->
      <BaseCard title="Distribusi Jenis Kelamin" :loading="isLoadingStats">
        <div v-if="!isLoadingStats && stats" class="space-y-3 mt-2">
          <!-- Male bar -->
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-slate-600 flex items-center gap-1.5">
                <span class="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" />
                Laki-laki
              </span>
              <span class="font-semibold text-slate-700">
                {{ formatNumber(stats.maleStudents) }}
                <span class="text-slate-400 font-normal text-xs">
                  ({{ malePercent }}%)
                </span>
              </span>
            </div>
            <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-blue-500 rounded-full transition-all duration-700"
                :style="{ width: malePercent + '%' }"
              />
            </div>
          </div>
          <!-- Female bar -->
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-slate-600 flex items-center gap-1.5">
                <span class="h-2.5 w-2.5 rounded-full bg-pink-500 inline-block" />
                Perempuan
              </span>
              <span class="font-semibold text-slate-700">
                {{ formatNumber(stats.femaleStudents) }}
                <span class="text-slate-400 font-normal text-xs">
                  ({{ femalePercent }}%)
                </span>
              </span>
            </div>
            <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-pink-500 rounded-full transition-all duration-700"
                :style="{ width: femalePercent + '%' }"
              />
            </div>
          </div>
          <p class="text-xs text-slate-400 pt-1">
            Total: {{ formatNumber(stats.totalStudents) }} siswa
          </p>
        </div>
        <div v-else-if="isLoadingStats" class="space-y-3 mt-2">
          <BaseSkeleton height="h-8" v-for="i in 2" :key="i" />
        </div>
      </BaseCard>

      <!-- Status Siswa -->
      <BaseCard title="Status Siswa">
        <div v-if="!isLoadingStats && stats" class="grid grid-cols-2 gap-3 mt-2">
          <div
            v-for="item in statusItems"
            :key="item.label"
            class="flex items-center gap-3 p-3 rounded-lg bg-slate-50"
          >
            <div :class="['p-2 rounded-lg', item.bg]">
              <component :is="item.icon" :class="['h-4 w-4', item.color]" />
            </div>
            <div>
              <p class="text-lg font-bold text-slate-800 leading-none">
                {{ formatNumber(item.value) }}
              </p>
              <p class="text-xs text-slate-500 mt-0.5">{{ item.label }}</p>
            </div>
          </div>
        </div>
        <div v-else class="grid grid-cols-2 gap-3 mt-2">
          <BaseSkeleton height="h-16" v-for="i in 4" :key="i" />
        </div>
      </BaseCard>
    </div>

    <!-- Row 3: Rekap per Kelas -->
    <BaseCard title="Rekap per Kelas" :subtitle="schoolYearStore.activeSchoolYearName">
      <div v-if="isLoadingClassStats" class="space-y-2 mt-2">
        <BaseSkeleton height="h-10" v-for="i in 4" :key="i" />
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
              <th class="px-4 py-2.5 text-center">Total</th>
              <th class="px-4 py-2.5 text-left">Distribusi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="cls in classStats"
              :key="cls.classroomId"
              class="hover:bg-slate-50 transition-colors"
            >
              <td class="px-4 py-2.5 font-medium text-slate-700">{{ cls.classroomName }}</td>
              <td class="px-4 py-2.5 text-center text-blue-600 font-medium">{{ cls.maleStudents }}</td>
              <td class="px-4 py-2.5 text-center text-pink-600 font-medium">{{ cls.femaleStudents }}</td>
              <td class="px-4 py-2.5 text-center font-semibold text-slate-800">{{ cls.totalStudents }}</td>
              <td class="px-4 py-2.5 w-40">
                <div class="flex h-2 rounded-full overflow-hidden bg-slate-100">
                  <div
                    class="bg-blue-500"
                    :style="{ width: cls.totalStudents ? (cls.maleStudents / cls.totalStudents * 100) + '%' : '0%' }"
                  />
                  <div
                    class="bg-pink-500"
                    :style="{ width: cls.totalStudents ? (cls.femaleStudents / cls.totalStudents * 100) + '%' : '0%' }"
                  />
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="bg-slate-50 font-semibold text-slate-700">
              <td class="px-4 py-2.5">Total</td>
              <td class="px-4 py-2.5 text-center text-blue-600">{{ classStats.reduce((a, c) => a + c.maleStudents, 0) }}</td>
              <td class="px-4 py-2.5 text-center text-pink-600">{{ classStats.reduce((a, c) => a + c.femaleStudents, 0) }}</td>
              <td class="px-4 py-2.5 text-center">{{ classStats.reduce((a, c) => a + c.totalStudents, 0) }}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </BaseCard>

    <!-- Row 4: Shortcut -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <RouterLink
        v-for="shortcut in shortcuts"
        :key="shortcut.label"
        :to="shortcut.to"
        :class="[
          'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
          'bg-white hover:border-primary-300 hover:shadow-sm hover:-translate-y-0.5 group',
        ]"
      >
        <div :class="['p-2.5 rounded-xl', shortcut.bg]">
          <component :is="shortcut.icon" :class="['h-5 w-5', shortcut.color]" />
        </div>
        <span class="text-xs font-medium text-slate-600 text-center group-hover:text-primary-700">
          {{ shortcut.label }}
        </span>
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Users, UserPlus, GraduationCap, School,
  CheckCircle, UserX, ArrowRightLeft, LogOut,
  FileText, Settings, UserCog, BookOpen,
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
const isLoadingStats = ref(true)
const isLoadingClassStats = ref(true)

const malePercent = computed(() => {
  if (!stats.value?.totalStudents) return 0
  return Math.round((stats.value.maleStudents / stats.value.totalStudents) * 100)
})
const femalePercent = computed(() => 100 - malePercent.value)

const statusItems = computed(() => [
  { label: 'Aktif', value: stats.value?.activeStudents ?? 0, icon: CheckCircle, bg: 'bg-green-100', color: 'text-green-600' },
  { label: 'Lulus', value: stats.value?.graduatedStudents ?? 0, icon: GraduationCap, bg: 'bg-blue-100', color: 'text-blue-600' },
  { label: 'Pindah', value: stats.value?.transferredStudents ?? 0, icon: ArrowRightLeft, bg: 'bg-amber-100', color: 'text-amber-600' },
  { label: 'Keluar', value: (stats.value?.totalStudents ?? 0) - (stats.value?.activeStudents ?? 0) - (stats.value?.graduatedStudents ?? 0) - (stats.value?.transferredStudents ?? 0), icon: LogOut, bg: 'bg-red-100', color: 'text-red-600' },
])

const shortcuts = [
  { label: 'Tambah Siswa', to: '/students/create', icon: UserPlus, bg: 'bg-blue-100', color: 'text-blue-600' },
  { label: 'Data Siswa', to: '/students', icon: Users, bg: 'bg-green-100', color: 'text-green-600' },
  { label: 'Laporan', to: '/reports', icon: FileText, bg: 'bg-purple-100', color: 'text-purple-600' },
  { label: 'Pengguna', to: '/users', icon: UserCog, bg: 'bg-amber-100', color: 'text-amber-600' },
]

onMounted(async () => {
  const syId = schoolYearStore.activeSchoolYear?.id

  isLoadingStats.value = true
  isLoadingClassStats.value = true

  try {
    const [s, cs] = await Promise.all([
      reportsService.getDashboardStats(syId),
      reportsService.getClassroomStats(syId),
    ])
    stats.value = s
    classStats.value = cs
  } catch {
    // Data tidak tersedia — tampilkan state kosong
  } finally {
    isLoadingStats.value = false
    isLoadingClassStats.value = false
  }
})
</script>
