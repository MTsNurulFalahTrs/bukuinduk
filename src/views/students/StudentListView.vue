<template>
  <div class="space-y-5">
    <PageHeader
      title="Detail Siswa"
      show-back
      :breadcrumbs="[{ label: 'Data Siswa', to: '/students' }, { label: student?.fullName ?? '...' }]"
    >
      <template v-if="student" #actions>
        <BaseButton
          v-if="can(PERMISSIONS.STUDENT_UPDATE)"
          variant="outline"
          size="sm"
          @click="$router.push(`/students/${student.id}/edit`)"
        >
          <Pencil class="h-4 w-4" /> Edit
        </BaseButton>
        <BaseButton
          v-if="can(PERMISSIONS.STUDENT_ARCHIVE) && student.status === 'active'"
          variant="danger"
          size="sm"
          @click="handleArchive"
        >
          <Archive class="h-4 w-4" /> Arsipkan
        </BaseButton>
      </template>
    </PageHeader>

    <!-- Skeleton loading -->
    <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <BaseSkeleton height="h-64" class="lg:col-span-1" />
      <BaseSkeleton height="h-64" class="lg:col-span-2" />
    </div>

    <!-- Error -->
    <BaseAlert v-else-if="error" type="error">{{ error }}</BaseAlert>

    <template v-else-if="student">
      <!-- Row 1: Identity card + contact -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- Card kiri: foto + identitas utama -->
        <BaseCard class="flex flex-col items-center text-center gap-3 py-6">
          <BaseAvatar :name="student.fullName" :src="student.photoUrl" size="xl" color="blue" />
          <div>
            <h2 class="text-lg font-bold text-slate-800">{{ student.fullName }}</h2>
            <p v-if="student.nickname" class="text-sm text-slate-400">"{{ student.nickname }}"</p>
          </div>
          <StudentStatusBadge :status="student.status" dot size="md" />

          <div class="w-full border-t border-slate-100 pt-4 text-left space-y-2.5 text-sm">
            <InfoRow label="NIS" :value="student.nis" />
            <InfoRow label="NISN" :value="student.nisn" />
            <InfoRow label="Jenis Kelamin" :value="formatGender(student.gender)" />
            <InfoRow label="Kelas" :value="student.currentEnrollment?.classroomName" />
            <InfoRow label="Tahun Masuk" :value="student.currentEnrollment?.schoolYearName" />
            <InfoRow label="Tgl Masuk" :value="formatDate(student.entryDate)" />
          </div>
        </BaseCard>

        <!-- Tab detail kanan -->
        <div class="lg:col-span-2 space-y-4">
          <!-- Tab navigation -->
          <div class="flex border-b border-slate-200 overflow-x-auto gap-0 scrollbar-thin">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              :class="[
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              ]"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- Tab: Identitas Lengkap -->
          <div v-if="activeTab === 'identity'" class="space-y-4">
            <BaseCard title="Data Pribadi">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2 text-sm">
                <InfoRow label="NIK" :value="can(PERMISSIONS.STUDENT_VIEW_SENSITIVE) ? student.nik : '••••••••••••••••'" />
                <InfoRow label="Tempat Lahir" :value="student.birthPlace" />
                <InfoRow label="Tanggal Lahir" :value="formatDate(student.birthDate)" />
                <InfoRow label="Agama" :value="student.religion" />
                <InfoRow label="Kewarganegaraan" :value="student.nationality" />
                <InfoRow label="Status Keluarga" :value="student.familyStatus" />
                <InfoRow label="Anak Ke-" :value="student.childOrder?.toString()" />
                <InfoRow label="Jml Saudara" :value="student.siblingsCount?.toString()" />
              </div>
            </BaseCard>
            <BaseCard title="Alamat & Kontak">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2 text-sm">
                <div class="sm:col-span-2">
                  <InfoRow label="Alamat" :value="[student.address, student.rtRw].filter(Boolean).join(' RT/RW ')" />
                </div>
                <InfoRow label="Desa/Kelurahan" :value="student.village" />
                <InfoRow label="Kecamatan" :value="student.district" />
                <InfoRow label="Kab/Kota" :value="student.city" />
                <InfoRow label="Provinsi" :value="student.province" />
                <InfoRow label="Kode Pos" :value="student.postalCode" />
                <InfoRow label="No. HP" :value="student.phone" />
                <InfoRow label="Email" :value="student.email" />
              </div>
            </BaseCard>
          </div>

          <!-- Tab: Orang Tua -->
          <div v-if="activeTab === 'parents'" class="space-y-4">
            <ParentCard
              v-for="rel in (['father', 'mother', 'guardian'] as const)"
              :key="rel"
              :parent="getParent(rel)"
              :relationship="rel"
              :show-sensitive="can(PERMISSIONS.STUDENT_VIEW_SENSITIVE)"
            />
          </div>

          <!-- Tab: Kesehatan -->
          <div v-if="activeTab === 'health'">
            <BaseCard title="Data Kesehatan">
              <div
                v-if="can(PERMISSIONS.STUDENT_VIEW_SENSITIVE)"
                class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 mt-2 text-sm"
              >
                <InfoRow label="Gol. Darah" :value="student.health?.bloodType" />
                <InfoRow label="Tinggi Badan" :value="student.health?.heightCm ? student.health.heightCm + ' cm' : undefined" />
                <InfoRow label="Berat Badan" :value="student.health?.weightKg ? student.health.weightKg + ' kg' : undefined" />
                <div class="col-span-2 sm:col-span-3">
                  <InfoRow label="Kebutuhan Khusus" :value="student.health?.specialNeeds" />
                </div>
                <div class="col-span-2 sm:col-span-3">
                  <InfoRow label="Catatan Kesehatan" :value="student.health?.healthNotes" />
                </div>
                <div class="col-span-2 sm:col-span-3">
                  <InfoRow label="Alergi" :value="student.health?.allergies" />
                </div>
              </div>
              <BaseAlert v-else type="info" class="mt-2">
                Data kesehatan bersifat sensitif dan tidak dapat dilihat dengan role Anda.
              </BaseAlert>
            </BaseCard>
          </div>

          <!-- Tab: Pendidikan Sebelumnya -->
          <div v-if="activeTab === 'education'">
            <BaseCard title="Riwayat Pendidikan Sebelumnya">
              <div v-if="student.educationHistory?.length" class="mt-2 space-y-3">
                <div
                  v-for="ed in student.educationHistory"
                  :key="ed.id"
                  class="flex gap-3 p-3 bg-slate-50 rounded-lg text-sm"
                >
                  <div class="p-2 bg-blue-100 rounded-lg shrink-0">
                    <GraduationCap class="h-4 w-4 text-blue-600" />
                  </div>
                  <div class="grid grid-cols-2 gap-2 flex-1">
                    <InfoRow label="Asal Sekolah" :value="ed.schoolName" />
                    <InfoRow label="Jenjang" :value="ed.level" />
                    <InfoRow label="Tahun Lulus" :value="ed.graduationYear?.toString()" />
                    <InfoRow label="No. Ijazah" :value="ed.certificateNumber" />
                  </div>
                </div>
              </div>
              <BaseEmpty v-else title="Belum ada data riwayat pendidikan" class="py-8" />
            </BaseCard>
          </div>

          <!-- Tab: Riwayat Kelas -->
          <div v-if="activeTab === 'enrollment'">
            <BaseCard title="Riwayat Kelas">
              <div v-if="student.currentEnrollment || enrollments.length" class="mt-2 space-y-2">
                <div
                  v-for="enr in enrollments"
                  :key="enr.id"
                  class="flex items-center gap-3 p-3 rounded-lg border border-slate-100 text-sm"
                >
                  <div class="p-2 bg-slate-100 rounded-lg shrink-0">
                    <School class="h-4 w-4 text-slate-500" />
                  </div>
                  <div class="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-1">
                    <InfoRow label="Kelas" :value="enr.classroomName" />
                    <InfoRow label="Tahun Pelajaran" :value="enr.schoolYearName" />
                    <InfoRow label="Masuk" :value="formatDate(enr.entryDate)" />
                    <InfoRow label="Status" :value="enr.status" />
                  </div>
                </div>
              </div>
              <BaseEmpty v-else title="Belum ada riwayat kelas" class="py-8" />
            </BaseCard>
          </div>
        </div>
      </div>
    </template>

    <!-- Confirm archive -->
    <BaseConfirmDialog
      v-model="showArchiveDialog"
      title="Arsipkan Siswa"
      :message="`Arsipkan '${student?.fullName}'? Siswa akan dinonaktifkan.`"
      type="warning"
      confirm-text="Ya, Arsipkan"
      :loading="isArchiving"
      @confirm="confirmArchive"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Pencil, Archive, GraduationCap, School } from 'lucide-vue-next'
import { PageHeader, StudentStatusBadge } from '@/components/shared'
import {
  BaseCard, BaseButton, BaseAlert, BaseAvatar,
  BaseSkeleton, BaseEmpty, BaseConfirmDialog,
} from '@/components/ui'
import { useStudentsStore } from '@/stores/students'
import { usePermission } from '@/composables'
import { studentsService } from '@/services'
import { PERMISSIONS } from '@/constants'
import { formatDate, formatGender } from '@/utils'
import { toast } from 'vue-sonner'
import type { StudentParent, StudentEnrollment } from '@/types'

// ── InfoRow helper ───────────────────────────────────────────────
const InfoRow = {
  props: { label: String, value: String },
  template: `
    <div>
      <p class="text-xs text-slate-400 mb-0.5">{{ label }}</p>
      <p class="text-slate-700 font-medium">{{ value || '—' }}</p>
    </div>
  `,
}

// ── ParentCard helper ────────────────────────────────────────────
const ParentCard = {
  props: { parent: Object, relationship: String, showSensitive: Boolean },
  components: { BaseCard, InfoRow },
  methods: {
    // BUG-21 FIX: normalizeIsAlive harus disertakan sebagai method di component object
    // agar bisa diakses dari template string. Nilai isAlive dari spreadsheet bisa berupa
    // boolean true/false, string "TRUE"/"FALSE", number 0/1, atau null.
    normalizeIsAlive(val: unknown): boolean {
      if (val === false || val === 'FALSE' || val === 'false' || val === 0) return false
      return true
    },
  },
  template: `
    <BaseCard :title="{ father: 'Ayah', mother: 'Ibu', guardian: 'Wali' }[relationship]">
      <div v-if="parent" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2 text-sm">
        <InfoRow label="Nama" :value="parent.fullName" />
        <InfoRow v-if="showSensitive" label="NIK" :value="parent.nik" />
        <InfoRow label="Tgl Lahir" :value="parent.birthDate" />
        <InfoRow label="Pendidikan" :value="parent.education" />
        <InfoRow label="Pekerjaan" :value="parent.occupation" />
        <InfoRow label="Penghasilan" :value="parent.incomeRange" />
        <InfoRow label="No. HP" :value="parent.phone" />
        <InfoRow label="Status" :value="normalizeIsAlive(parent.isAlive) === false ? 'Almarhum/ah' : 'Masih hidup'" />
      </div>
      <p v-else class="text-sm text-slate-400 mt-2">Data tidak tersedia.</p>
    </BaseCard>
  `,
}

const route = useRoute()
const router = useRouter()
const studentsStore = useStudentsStore()
const { can } = usePermission()

const student = computed(() => studentsStore.current)
const isLoading = ref(true)
const error = ref('')
const activeTab = ref('identity')
const enrollments = ref<StudentEnrollment[]>([])
const showArchiveDialog = ref(false)
const isArchiving = ref(false)

/**
 * BUG-21 FIX: Normalizer untuk field isAlive yang bisa datang dari spreadsheet
 * dalam berbagai tipe: boolean true/false, string "TRUE"/"FALSE", atau null/undefined.
 * Hanya return false (almarhum) jika nilai secara eksplisit menunjukkan false.
 */
function normalizeIsAlive(val: unknown): boolean {
  if (val === false || val === 'FALSE' || val === 'false' || val === 0) return false
  return true // default: masih hidup jika tidak ada data
}

const tabs = [
  { key: 'identity', label: 'Identitas' },
  { key: 'parents', label: 'Orang Tua' },
  { key: 'health', label: 'Kesehatan' },
  { key: 'education', label: 'Pendidikan' },
  { key: 'enrollment', label: 'Riwayat Kelas' },
]

function getParent(rel: 'father' | 'mother' | 'guardian'): StudentParent | undefined {
  return student.value?.parents?.find(p => p.relationship === rel)
}

async function handleArchive() {
  showArchiveDialog.value = true
}

async function confirmArchive() {
  if (!student.value) return
  isArchiving.value = true
  try {
    await studentsService.archive(student.value.id)
    studentsStore.removeFromList(student.value.id)
    toast.success('Siswa berhasil diarsipkan.')
    router.push('/students')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengarsipkan.')
  } finally {
    isArchiving.value = false
    showArchiveDialog.value = false
  }
}

onMounted(async () => {
  const id = route.params.id as string
  studentsStore.clearCurrent()
  // BUG-18 FIX: Reset error state di awal agar error lama dari navigasi sebelumnya
  // tidak tampil sebentar sebelum data baru dimuat.
  error.value = ''
  isLoading.value = true
  try {
    // BUG-19 FIX: fetchDetail() sekarang melempar error jika gagal (diperbaiki di store).
    // Sehingga catch di sini akan menangkap error dan menampilkan pesan error ke user.
    await studentsStore.fetchDetail(id)
    if (student.value) {
      enrollments.value = await studentsService.getEnrollments(id)
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat data siswa.'
  } finally {
    isLoading.value = false
  }
})
</script>
