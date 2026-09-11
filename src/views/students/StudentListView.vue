<template>
  <div class="space-y-5">
    <PageHeader title="Data Siswa" :subtitle="`${studentsStore.total} siswa ditemukan`">
      <template #actions>
        <BaseButton
          v-if="can(PERMISSIONS.STUDENT_IMPORT)"
          variant="outline"
          size="sm"
          @click="$router.push('/students/import')"
        >
          <Upload class="h-4 w-4" /> Import
        </BaseButton>
        <BaseButton
          v-if="can(PERMISSIONS.STUDENT_CREATE)"
          size="sm"
          @click="$router.push('/students/create')"
        >
          <UserPlus class="h-4 w-4" /> Tambah Siswa
        </BaseButton>
      </template>
    </PageHeader>

    <!-- Search & Filter -->
    <BaseCard :padding="true">
      <SearchFilter
        v-model:search="searchQuery"
        search-placeholder="Cari nama, NIS, NISN..."
      >
        <template #filters>
          <BaseSelect
            v-model="filters.status"
            :options="statusOptions"
            placeholder="Semua Status"
            class="w-36"
            @update:model-value="onFilterChange"
          />
          <BaseSelect
            v-model="filters.gender"
            :options="genderOptions"
            placeholder="Semua Gender"
            class="w-36"
            @update:model-value="onFilterChange"
          />
          <BaseSelect
            v-model="filters.classroomId"
            :options="classroomOptions"
            placeholder="Semua Kelas"
            class="w-40"
            @update:model-value="onFilterChange"
          />
          <BaseButton
            v-if="hasActiveFilters"
            variant="ghost"
            size="sm"
            @click="resetFilters"
          >
            <X class="h-4 w-4" /> Reset
          </BaseButton>
        </template>
        <template #actions>
          <BaseButton
            v-if="can(PERMISSIONS.STUDENT_EXPORT)"
            variant="outline"
            size="sm"
            :loading="isExporting"
            @click="handleExport"
          >
            <Download class="h-4 w-4" /> Export
          </BaseButton>
        </template>
      </SearchFilter>
    </BaseCard>

    <!-- Table -->
    <BaseCard :padding="false">
      <DataTable
        :columns="columns"
        :rows="studentsStore.list as Record<string, unknown>[]"
        :loading="studentsStore.isLoading"
        :skeleton-rows="10"
        row-key="id"
        :clickable="true"
        empty-title="Tidak ada data siswa"
        empty-description="Belum ada siswa yang terdaftar atau tidak ada yang cocok dengan filter."
        empty-type="students"
        @row-click="row => $router.push(`/students/${row.id}`)"
        @sort="onSort"
      >
        <!-- No urut -->
        <template #cell-no="{ index }">
          <span class="text-slate-400 text-xs">
            {{ (pagination.page.value - 1) * pagination.limit.value + index + 1 }}
          </span>
        </template>

        <!-- Nama + Avatar -->
        <template #cell-fullName="{ row }">
          <div class="flex items-center gap-3">
            <BaseAvatar
              :name="String(row.fullName)"
              :src="row.photoUrl ? String(row.photoUrl) : undefined"
              size="sm"
              color="blue"
            />
            <div class="min-w-0">
              <p class="font-medium text-slate-800 truncate">{{ row.fullName }}</p>
              <p class="text-xs text-slate-400 truncate">{{ row.nis }}</p>
            </div>
          </div>
        </template>

        <!-- Gender -->
        <template #cell-gender="{ row }">
          <span :class="row.gender === 'L' ? 'text-blue-600' : 'text-pink-600'" class="font-medium text-sm">
            {{ row.gender === 'L' ? 'L' : 'P' }}
          </span>
        </template>

        <!-- Status -->
        <template #cell-status="{ row }">
          <StudentStatusBadge :status="String(row.status)" dot />
        </template>

        <!-- Aksi -->
        <template #cell-actions="{ row }">
          <div class="flex items-center gap-1" @click.stop>
            <button
              class="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              title="Lihat detail"
              @click="$router.push(`/students/${row.id}`)"
            >
              <Eye class="h-4 w-4" />
            </button>
            <button
              v-if="can(PERMISSIONS.STUDENT_UPDATE)"
              class="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
              title="Edit"
              @click="$router.push(`/students/${row.id}/edit`)"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              v-if="can(PERMISSIONS.STUDENT_ARCHIVE) && row.status === 'active'"
              class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Arsipkan"
              @click="handleArchive(String(row.id), String(row.fullName))"
            >
              <Archive class="h-4 w-4" />
            </button>
          </div>
        </template>
      </DataTable>

      <!-- Pagination -->
      <div class="px-4 border-t border-slate-100">
        <BasePagination
          :current-page="pagination.page.value"
          :total-pages="pagination.totalPages.value"
          :total="studentsStore.total"
          :limit="pagination.limit.value"
          @update:current-page="onPageChange"
        />
      </div>
    </BaseCard>

    <!-- Confirm archive dialog -->
    <BaseConfirmDialog
      v-model="confirmDialog.isOpen.value"
      title="Arsipkan Siswa"
      :message="`Arsipkan siswa '${confirmDialog.options.value.message}'? Siswa tidak akan dihapus, hanya dinonaktifkan.`"
      type="warning"
      confirm-text="Ya, Arsipkan"
      :loading="confirmDialog.isLoading.value"
      @confirm="confirmArchive"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  UserPlus, Upload, Download, Eye, Pencil,
  Archive, X,
} from 'lucide-vue-next'
import { PageHeader, SearchFilter, DataTable, StudentStatusBadge } from '@/components/shared'
import type { TableColumn } from '@/components/shared/DataTable.vue'
import {
  BaseCard, BaseButton, BaseSelect, BaseAvatar,
  BasePagination, BaseConfirmDialog,
} from '@/components/ui'
import { useStudentsStore } from '@/stores/students'
import { useClassroomsStore } from '@/stores/classrooms'
import { usePermission, usePagination, useSearch, useExport, useConfirm } from '@/composables'
import { studentsService } from '@/services'
import { PERMISSIONS } from '@/constants'
import { STUDENT_STATUS_OPTIONS, GENDER_OPTIONS } from '@/constants'
import { toast } from 'vue-sonner'

const studentsStore = useStudentsStore()
const classroomsStore = useClassroomsStore()
const { can } = usePermission()
const pagination = usePagination()
const { exportToExcel, isExporting } = useExport()
const confirmDialog = useConfirm()

const filters = ref({ status: '', gender: '', classroomId: '' })
const hasActiveFilters = computed(() =>
  Object.values(filters.value).some(v => v !== '')
)

const statusOptions = STUDENT_STATUS_OPTIONS
const genderOptions = GENDER_OPTIONS
const classroomOptions = computed(() => [
  ...classroomsStore.classroomOptions,
])

// Debounced search
const { query: searchQuery } = useSearch((q) => {
  pagination.reset()
  studentsStore.setFilters({ search: q, page: 1 })
  studentsStore.fetchList()
})

const columns: TableColumn[] = [
  { key: 'no', label: 'No', width: 'w-10' },
  { key: 'fullName', label: 'Nama Siswa', sortable: true },
  { key: 'nisn', label: 'NISN', class: 'hidden md:table-cell' },
  { key: 'gender', label: 'JK', align: 'center', width: 'w-12' },
  { key: 'classroomName', label: 'Kelas', class: 'hidden sm:table-cell' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: 'actions', label: '', align: 'right', width: 'w-28', sticky: 'right' },
]

function onFilterChange() {
  pagination.reset()
  studentsStore.setFilters({ ...filters.value, page: 1 })
  studentsStore.fetchList()
}

function resetFilters() {
  filters.value = { status: '', gender: '', classroomId: '' }
  searchQuery.value = ''
  pagination.reset()
  studentsStore.resetFilters()
  studentsStore.fetchList()
}

function onPageChange(page: number) {
  pagination.setPage(page)
  studentsStore.setFilters({ page })
  studentsStore.fetchList()
}

function onSort(key: string, dir: 'asc' | 'desc') {
  studentsStore.setFilters({ sortBy: key, sortDir: dir, page: 1 })
  pagination.reset()
  studentsStore.fetchList()
}

// Archive
let archiveTargetId = ''
async function handleArchive(id: string, name: string) {
  archiveTargetId = id
  confirmDialog.options.value.message = name
  confirmDialog.isOpen.value = true
}

async function confirmArchive() {
  confirmDialog.isLoading.value = true
  try {
    await studentsService.archive(archiveTargetId)
    studentsStore.removeFromList(archiveTargetId)
    toast.success('Siswa berhasil diarsipkan.')
    confirmDialog.isOpen.value = false
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengarsipkan siswa.')
  } finally {
    confirmDialog.isLoading.value = false
  }
}

// Export
async function handleExport() {
  try {
    const data = await studentsService.exportData(studentsStore.filters)
    await exportToExcel(
      data as unknown as Record<string, unknown>[],
      {
        nis: 'NIS', nisn: 'NISN', fullName: 'Nama Lengkap',
        gender: 'L/P', birthPlace: 'Tempat Lahir', birthDate: 'Tgl Lahir',
        address: 'Alamat', phone: 'No. HP', status: 'Status',
        classroomName: 'Kelas',
      },
      'data-siswa'
    )
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengekspor data.')
  }
}

// Sync pagination total
watch(() => studentsStore.total, v => pagination.setTotal(v))

onMounted(async () => {
  await classroomsStore.fetch()
  await studentsStore.fetchList()
  pagination.setTotal(studentsStore.total)
})
</script>
