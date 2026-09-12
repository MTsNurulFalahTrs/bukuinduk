<template>
  <div class="space-y-4">

    <!-- ── Page Header ─────────────────────────────────────────── -->
    <!--
      BUG-15 FIX: PageHeader memiliki mb-6 bawaan + space-y-4 container = dobel gap.
      Gunakan wrapper dengan mb-0 override via class prop tidak bisa langsung,
      tapi PageHeader sudah set mb-6 di template-nya — kita set space-y-4 (lebih
      kecil dari space-y-5 sebelumnya) agar total gap tetap wajar.
    -->
    <PageHeader
      title="Data Siswa"
      :subtitle="headerSubtitle"
    >
      <template #actions>
        <BaseButton
          v-if="can(PERMISSIONS.STUDENT_IMPORT)"
          variant="outline"
          size="sm"
          :disabled="studentsStore.isLoading || isExporting"
          @click="$router.push('/students/import')"
        >
          <Upload class="h-4 w-4" />
          <span class="hidden sm:inline">Import</span>
        </BaseButton>
        <BaseButton
          v-if="can(PERMISSIONS.STUDENT_CREATE)"
          size="sm"
          :disabled="isExporting"
          @click="$router.push('/students/create')"
        >
          <UserPlus class="h-4 w-4" />
          <span class="hidden sm:inline">Tambah Siswa</span>
        </BaseButton>
      </template>
    </PageHeader>

    <!-- ── Search & Filter ─────────────────────────────────────── -->
    <BaseCard :padding="false">
      <div class="p-4">

        <!-- Baris 1: Search + tombol Export -->
        <div class="flex items-center gap-3">

          <!-- Search input -->
          <div class="relative flex-1 min-w-0">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Cari nama, NIS, NISN..."
              class="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg bg-white placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-colors"
            />
          </div>

          <!-- Export — selalu di kanan search, tidak collapse -->
          <BaseButton
            v-if="can(PERMISSIONS.STUDENT_EXPORT)"
            variant="outline"
            size="sm"
            :loading="isExporting"
            :disabled="studentsStore.isLoading"
            class="shrink-0"
            @click="handleExport"
          >
            <Download class="h-4 w-4" />
            <span class="hidden sm:inline">Export</span>
          </BaseButton>
        </div>

        <!-- Divider -->
        <div class="border-t border-slate-100 my-3" />

        <!-- Baris 2: Filter chips + Reset -->
        <div class="flex flex-wrap items-center gap-2">

          <!-- Label "Filter:" hanya di desktop -->
          <span class="hidden sm:inline-flex items-center text-xs font-medium text-slate-400 mr-1 shrink-0">
            <SlidersHorizontal class="h-3.5 w-3.5 mr-1.5" />
            Filter:
          </span>

          <BaseSelect
            v-model="filters.status"
            :options="statusOptions"
            placeholder="Semua Status"
            clearable
            class="w-36 shrink-0"
            @update:model-value="onFilterChange"
          />
          <BaseSelect
            v-model="filters.gender"
            :options="genderOptions"
            placeholder="Semua Gender"
            clearable
            class="w-36 shrink-0"
            @update:model-value="onFilterChange"
          />
          <BaseSelect
            v-model="filters.classroomId"
            :options="classroomOptions"
            placeholder="Semua Kelas"
            clearable
            class="w-40 shrink-0"
            @update:model-value="onFilterChange"
          />

          <!-- Spacer — dorong badge + tombol Reset ke kanan di desktop -->
          <div class="flex-1 hidden sm:block" />

          <!-- Badge filter aktif -->
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 scale-90"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-90"
          >
            <span
              v-if="hasActiveFilters"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200 shrink-0"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-primary-500" />
              Filter aktif
            </span>
          </Transition>

          <!-- Tombol Reset -->
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 -translate-x-1"
            enter-to-class="opacity-100 translate-x-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 translate-x-0"
            leave-to-class="opacity-0 -translate-x-1"
          >
            <button
              v-if="hasActiveFilters"
              type="button"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors shrink-0"
              @click="resetFilters"
            >
              <X class="h-3 w-3" />
              Reset
            </button>
          </Transition>
        </div>
      </div>
    </BaseCard>

    <!-- ── Tabel Data Siswa ─────────────────────────────────────── -->
    <BaseCard :padding="false">
      <DataTable
        :columns="columns"
        :rows="studentsStore.list as Record<string, unknown>[]"
        :loading="studentsStore.isLoading"
        :skeleton-rows="10"
        row-key="id"
        :clickable="true"
        empty-title="Tidak ada data siswa"
        :empty-description="emptyDescription"
        empty-type="students"
        :sort-key="activeSortKey"
        :sort-dir="activeSortDir"
        @row-click="row => $router.push(`/students/${row.id}`)"
        @sort="onSort"
      >
        <!-- Slot empty kontekstual: tampilkan tombol Reset saat filter aktif -->
        <!-- BUG-17 FIX: Empty state kontekstual dengan tombol Reset Filter -->
        <template v-if="hasActiveFilters" #empty>
          <BaseButton variant="outline" size="sm" @click="resetFilters">
            <X class="h-4 w-4" /> Reset Filter
          </BaseButton>
        </template>

        <!-- No urut -->
        <template #cell-no="{ index }">
          <span class="text-slate-400 tabular-nums text-xs">
            {{ (pagination.page.value - 1) * pagination.limit.value + index + 1 }}
          </span>
        </template>

        <!-- Nama + Avatar -->
        <template #cell-fullName="{ row }">
          <div class="flex items-center gap-2.5 min-w-0">
            <BaseAvatar
              :name="String(row.fullName)"
              :src="row.photoUrl ? String(row.photoUrl) : undefined"
              size="sm"
              color="blue"
            />
            <div class="min-w-0">
              <p class="font-medium text-slate-800 truncate leading-snug">{{ row.fullName }}</p>
              <p class="text-xs text-slate-400 truncate">{{ row.nis }}</p>
            </div>
          </div>
        </template>

        <!-- Gender — ikon + label singkat -->
        <template #cell-gender="{ row }">
          <span
            :class="[
              'inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded',
              row.gender === 'L'
                ? 'text-blue-700 bg-blue-50'
                : 'text-pink-700 bg-pink-50',
            ]"
          >
            {{ row.gender === 'L' ? 'L' : 'P' }}
          </span>
        </template>

        <!-- Status -->
        <template #cell-status="{ row }">
          <StudentStatusBadge :status="String(row.status)" dot />
        </template>

        <!-- Aksi -->
        <!--
          BUG-13 FIX: Tambahkan type="button" pada semua tombol aksi untuk
          kejelasan semantic dan mencegah unexpected form submit.
          @click.stop mencegah event bubble ke row-click handler.
        -->
        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5" @click.stop>
            <button
              type="button"
              class="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-200"
              title="Lihat detail"
              @click="$router.push(`/students/${row.id}`)"
            >
              <Eye class="h-4 w-4" />
            </button>
            <button
              v-if="can(PERMISSIONS.STUDENT_UPDATE)"
              type="button"
              class="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-200"
              title="Edit"
              @click="$router.push(`/students/${row.id}/edit`)"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              v-if="can(PERMISSIONS.STUDENT_ARCHIVE) && row.status === 'active'"
              type="button"
              class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-200"
              title="Arsipkan"
              @click="handleArchive(String(row.id), String(row.fullName))"
            >
              <Archive class="h-4 w-4" />
            </button>
          </div>
        </template>
      </DataTable>

      <!-- Pagination -->
      <!--
        Tampilkan pagination hanya saat ada data dan tidak sedang loading,
        agar tidak ada "kedip" pagination saat fetch.
      -->
      <div
        v-if="!studentsStore.isLoading && studentsStore.list.length > 0"
        class="px-4 border-t border-slate-100"
      >
        <BasePagination
          :current-page="pagination.page.value"
          :total-pages="pagination.totalPages.value"
          :total="studentsStore.total"
          :limit="pagination.limit.value"
          @update:current-page="onPageChange"
        />
      </div>
    </BaseCard>

    <!-- ── Confirm Dialog: Arsipkan Siswa ──────────────────────── -->
    <!--
      BUG-2 FIX: Sebelumnya terdapat dua jalur eksekusi doArchive():
      (1) await confirm() → ok → doArchive() di handleArchive()
      (2) @confirm event → onConfirmArchive() → doArchive()
      Hasilnya doArchive() dipanggil DUA KALI setiap confirm.

      Solusi: gunakan SATU jalur saja — hanya Promise pattern.
      @confirm sekarang memanggil confirmDialog.onConfirm() yang me-resolve
      Promise di handleArchive(), lalu doArchive() berjalan sekali dari sana.
      Handler @cancel memanggil confirmDialog.onCancel() untuk resolve(false).

      BUG-3 FIX: isLoading dan isOpen tidak lagi dimanipulasi langsung dari
      doArchive(). isOpen dikelola sepenuhnya oleh useConfirm (via onConfirm/onCancel).
      isLoading tetap diekspos untuk prop :loading di dialog.
    -->
    <BaseConfirmDialog
      v-model="confirmDialog.isOpen.value"
      title="Arsipkan Siswa"
      :message="`Arsipkan siswa '${archiveName}'? Siswa tidak akan dihapus, hanya dinonaktifkan.`"
      type="warning"
      confirm-text="Ya, Arsipkan"
      :loading="confirmDialog.isLoading.value"
      @confirm="confirmDialog.onConfirm()"
      @cancel="confirmDialog.onCancel()"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  UserPlus, Upload, Download, Eye, Pencil,
  Archive, X, Search, SlidersHorizontal,
} from 'lucide-vue-next'
import { PageHeader, DataTable, StudentStatusBadge } from '@/components/shared'
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

// ── Filter state ──────────────────────────────────────────────
const filters = ref({ status: '', gender: '', classroomId: '' })

const hasActiveFilters = computed(() =>
  Object.values(filters.value).some(v => v !== '') || searchQuery.value !== ''
)

// ── Sort state — BUG-4 FIX: track di view agar bisa diteruskan ke DataTable prop
const activeSortKey = ref(studentsStore.filters.sortBy ?? 'fullName')
const activeSortDir = ref<'asc' | 'desc'>(studentsStore.filters.sortDir ?? 'asc')

// ── Options ───────────────────────────────────────────────────
const statusOptions = STUDENT_STATUS_OPTIONS
const genderOptions = GENDER_OPTIONS

const classroomOptions = computed(() =>
  classroomsStore.classroomOptions
)

// ── Header subtitle ───────────────────────────────────────────
// BUG-6 FIX: Saat loading, tampilkan "Memuat data..." bukan angka stale.
const headerSubtitle = computed(() => {
  if (studentsStore.isLoading) return 'Memuat data...'
  const n = studentsStore.total
  return n === 0 ? 'Tidak ada siswa ditemukan' : `${n.toLocaleString('id-ID')} siswa ditemukan`
})

// ── Empty state description ───────────────────────────────────
// BUG-17 FIX: Pesan empty state kontekstual berdasarkan apakah filter aktif.
const emptyDescription = computed(() => {
  if (hasActiveFilters.value) {
    return 'Tidak ada siswa yang cocok dengan filter atau pencarian yang aktif.'
  }
  return 'Belum ada siswa yang terdaftar di sistem.'
})

// ── Columns ───────────────────────────────────────────────────
// BUG-12 FIX: Kurangi kolom yang tampil di sm agar tidak overflow.
// Di mobile (<sm): No, Nama, Status, Aksi (4 kolom)
// Di sm–md: tambah Gender, Kelas
// Di md+: tambah NISN
const columns: TableColumn[] = [
  { key: 'no',          label: 'No',     width: 'w-10' },
  { key: 'fullName',    label: 'Nama Siswa', sortable: true },
  { key: 'nisn',        label: 'NISN',   class: 'hidden md:table-cell', cellClass: 'hidden md:table-cell' },
  { key: 'gender',      label: 'JK',     align: 'center', width: 'w-14', class: 'hidden sm:table-cell', cellClass: 'hidden sm:table-cell' },
  { key: 'classroomName', label: 'Kelas', class: 'hidden sm:table-cell', cellClass: 'hidden sm:table-cell' },
  { key: 'status',      label: 'Status', align: 'center', width: 'w-28' },
  { key: 'actions',     label: '',       align: 'right',  width: 'w-24', sticky: 'right' },
]

// ── Search ─────────────────────────────────────────────────────
const { query: searchQuery, clear: clearSearch } = useSearch((q) => {
  pagination.reset()
  studentsStore.setFilters({ search: q, page: 1 })
  studentsStore.fetchList()
})

// ── Filter handlers ───────────────────────────────────────────
function onFilterChange() {
  pagination.reset()
  studentsStore.setFilters({ ...filters.value, page: 1 })
  studentsStore.fetchList()
}

function resetFilters() {
  filters.value = { status: '', gender: '', classroomId: '' }
  // BUG-14 (useSearch) FIX: clearSearch() tidak men-trigger debounce double-call
  clearSearch()
  pagination.reset()
  studentsStore.resetFilters()
  studentsStore.fetchList()
  // Reset sort ke default
  activeSortKey.value = 'fullName'
  activeSortDir.value = 'asc'
}

function onPageChange(page: number) {
  pagination.setPage(page)
  studentsStore.setFilters({ page })
  studentsStore.fetchList()
}

// BUG-4 & BUG-10 FIX: Simpan sort state di view dan teruskan ke DataTable via props.
// DataTable (BUG-10 fix) sudah reset ke 'asc' saat ganti kolom — tapi view perlu
// menyimpan state ini untuk dikirim ke store dan ditampilkan saat navigasi back.
function onSort(key: string, dir: 'asc' | 'desc') {
  activeSortKey.value = key
  activeSortDir.value = dir
  studentsStore.setFilters({ sortBy: key, sortDir: dir, page: 1 })
  pagination.reset()
  studentsStore.fetchList()
}

// ── Archive ───────────────────────────────────────────────────
// BUG-17: Simpan nama siswa terpisah untuk pesan dialog (tidak perlu raw ref id).
// BUG-2 FIX: archiveTargetId tetap sebagai ref, tapi doArchive() hanya dipanggil
// SEKALI — dari handleArchive() setelah await confirm() resolve true.
// Handler @confirm di template hanya memanggil confirmDialog.onConfirm() untuk
// me-resolve Promise, bukan langsung doArchive().
const archiveTargetId = ref('')
const archiveName = ref('')

async function handleArchive(id: string, name: string) {
  archiveTargetId.value = id
  archiveName.value = name

  // Tunggu user konfirmasi via Promise — resolve true jika confirm, false jika cancel
  const ok = await confirmDialog.confirm({
    message: name,
    type: 'warning',
  })

  // BUG-2 FIX: doArchive() hanya dipanggil di sini, TIDAK dari @confirm handler.
  if (ok) {
    await doArchive()
  }
}

async function doArchive() {
  if (!archiveTargetId.value) return

  // BUG-3 FIX: Set isLoading via ref yang diekspos, jangan manipulasi isOpen langsung.
  confirmDialog.isLoading.value = true
  try {
    await studentsService.archive(archiveTargetId.value)
    studentsStore.removeFromList(archiveTargetId.value)
    toast.success('Siswa berhasil diarsipkan.')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengarsipkan siswa.')
  } finally {
    confirmDialog.isLoading.value = false
    // BUG-3 FIX: Tutup dialog via onConfirm/onCancel sudah dilakukan — cukup reset target.
    archiveTargetId.value = ''
    archiveName.value = ''
  }
}

// ── Export ────────────────────────────────────────────────────
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

// ── Sync ──────────────────────────────────────────────────────
// Sync total dari store ke pagination setiap kali berubah
watch(() => studentsStore.total, v => pagination.setTotal(v))

// BUG-1 FIX: await classroomsStore.fetch() dulu SEBELUM studentsStore.fetchList()
// agar classroomOptions sudah tersedia saat tabel render pertama kali.
// Keduanya tidak saling bergantung secara data, tapi fetch classrooms lebih ringan
// dan cepat — tidak ada overhead signifikan dari sequential await ini.
onMounted(async () => {
  await classroomsStore.fetch()
  await studentsStore.fetchList()
  pagination.setTotal(studentsStore.total)
})
</script>
