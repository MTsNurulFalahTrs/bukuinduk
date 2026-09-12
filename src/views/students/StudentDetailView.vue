<template>
  <div class="space-y-5">

    <!-- ── Page Header ──────────────────────────────────────────── -->
    <PageHeader
      title="Detail Siswa"
      show-back
      :breadcrumbs="[
        { label: 'Data Siswa', to: '/students' },
        { label: isLoading ? 'Memuat…' : (student?.fullName ?? 'Tidak ditemukan') },
      ]"
    >
      <template v-if="student" #actions>
        <!--
          BUG-13 FIX: Edit button di header HANYA ditampilkan jika user
          punya izin. Di mobile ia disembunyikan (hidden sm:flex) karena
          sudah ada quick-action edit di dalam kartu profil kiri.
          Ini menghilangkan duplikasi tombol Edit di desktop.
        -->
        <BaseButton
          v-if="can(PERMISSIONS.STUDENT_UPDATE)"
          variant="outline"
          size="sm"
          class="hidden sm:inline-flex"
          @click="router.push(`/students/${student.id}/edit`)"
        >
          <Pencil class="h-4 w-4" />
          Edit
        </BaseButton>

        <!-- Arsipkan: hanya untuk siswa aktif -->
        <BaseButton
          v-if="can(PERMISSIONS.STUDENT_ARCHIVE) && student.status === 'active'"
          variant="danger"
          size="sm"
          :disabled="isArchiving"
          @click="handleArchive"
        >
          <Archive class="h-4 w-4" />
          <span class="hidden sm:inline">Arsipkan</span>
        </BaseButton>

        <!--
          BUG-9 FIX: Tombol Aktifkan HANYA muncul untuk status 'inactive'.
          Status 'graduated', 'transferred', 'dropped_out' tidak di-restore
          secara otomatis — butuh proses berbeda dan tidak ada di alur ini.
        -->
        <BaseButton
          v-if="can(PERMISSIONS.STUDENT_ARCHIVE) && student.status === 'inactive'"
          variant="success"
          size="sm"
          :loading="isRestoring"
          @click="handleRestore"
        >
          <RotateCcw class="h-4 w-4" />
          <span class="hidden sm:inline">Aktifkan</span>
        </BaseButton>
      </template>
    </PageHeader>

    <!-- ── Skeleton Loading ──────────────────────────────────────── -->
    <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <!-- Kartu profil kiri -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="h-16 bg-slate-100" />
        <div class="flex flex-col items-center px-5 pb-5 -mt-8 gap-3">
          <!--
            BUG-1 FIX: Pisahkan height, width, dan rounded menjadi prop
            terpisah sesuai API BaseSkeleton. Compound class "h-20 w-20
            rounded-full" tidak didukung prop height (hanya satu h-* class).
          -->
          <BaseSkeleton height="h-16" width="w-16" :rounded="true" />
          <BaseSkeleton height="h-5" width="w-36" />
          <BaseSkeleton height="h-4" width="w-20" />
        </div>
        <div class="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">
          <!--
            BUG-14 FIX: Variasikan lebar skeleton agar lebih representatif
            dengan konten label + nilai yang berbeda-beda panjangnya.
          -->
          <BaseSkeleton height="h-3.5" width="w-full" />
          <BaseSkeleton height="h-3.5" width="w-5/6" />
          <BaseSkeleton height="h-3.5" width="w-full" />
          <BaseSkeleton height="h-3.5" width="w-4/6" />
          <BaseSkeleton height="h-3.5" width="w-full" />
          <BaseSkeleton height="h-3.5" width="w-3/4" />
        </div>
      </div>

      <!-- Panel tab kanan -->
      <div class="lg:col-span-2 space-y-4">
        <!--
          BUG-7 FIX: Skeleton tab bar lebih representatif — 5 tombol dengan
          lebar yang mirip tab aslinya, bukan satu kotak h-10 penuh.
        -->
        <div class="flex gap-2 border-b border-slate-200 pb-px">
          <BaseSkeleton v-for="i in 5" :key="i" height="h-9" :width="tabSkeletonWidths[i - 1]" />
        </div>
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <BaseSkeleton height="h-4" width="w-32" />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <BaseSkeleton v-for="i in 8" :key="i" height="h-4" :width="i % 2 === 0 ? 'w-4/5' : 'w-full'" />
          </div>
        </div>
      </div>
    </div>

    <!-- ── Error State ───────────────────────────────────────────── -->
    <BaseAlert v-else-if="error" type="error" class="mt-2">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <span>{{ error }}</span>
        <BaseButton size="sm" variant="outline" @click="retryLoad">
          Coba Lagi
        </BaseButton>
      </div>
    </BaseAlert>

    <!-- ── Content ──────────────────────────────────────────────── -->
    <template v-else-if="student">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <!-- ── Kartu Profil Kiri ──────────────────────────────── -->
        <BaseCard :padding="false" class="overflow-hidden">
          <!-- Banner gradient -->
          <div class="h-16 bg-gradient-to-r from-primary-500 to-primary-700 shrink-0" />

          <div class="flex flex-col items-center text-center px-5 pb-5 -mt-8 gap-2">
            <BaseAvatar
              :name="student.fullName"
              :src="student.photoUrl ?? undefined"
              size="xl"
              color="blue"
              class="ring-4 ring-white shadow-sm"
            />

            <div class="mt-1">
              <h2 class="text-base font-bold text-slate-800 leading-tight">
                {{ student.fullName }}
              </h2>
              <p v-if="student.nickname" class="text-sm text-slate-400 mt-0.5">
                "{{ student.nickname }}"
              </p>
            </div>

            <StudentStatusBadge :status="student.status" dot />

            <p v-if="studentAge !== null" class="text-xs text-slate-400">
              {{ studentAge }} tahun
            </p>
          </div>

          <!-- Info ringkas -->
          <div class="px-5 pb-4 border-t border-slate-100 pt-4 space-y-2.5 text-sm">
            <InfoRow label="NIS"           :value="student.nis" />
            <InfoRow label="NISN"          :value="student.nisn" />
            <InfoRow label="Jenis Kelamin" :value="formatGender(student.gender)" />
            <InfoRow label="Kelas"         :value="student.currentEnrollment?.classroomName" />
            <InfoRow label="Tahun Masuk"   :value="student.currentEnrollment?.schoolYearName" />
            <InfoRow label="Tgl Masuk"     :value="formatDate(student.entryDate)" />
          </div>

          <!--
            BUG-13 FIX: Tombol Edit di profil card ditampilkan di semua ukuran
            layar — ini satu-satunya edit action di mobile (header edit disembunyikan
            di mobile via hidden sm:inline-flex). Di desktop keduanya tampil, tapi
            ini justru konsisten: header = navigasi global, card = aksi kontekstual.
            Untuk menghindari duplikasi murni, header edit class="hidden sm:inline-flex"
            membuatnya tidak tampil di mobile, sedangkan card edit selalu ada.
          -->
          <div v-if="can(PERMISSIONS.STUDENT_UPDATE)" class="px-5 pb-5">
            <BaseButton
              variant="outline"
              size="sm"
              class="w-full"
              @click="router.push(`/students/${student.id}/edit`)"
            >
              <Pencil class="h-4 w-4" /> Edit Data Siswa
            </BaseButton>
          </div>
        </BaseCard>

        <!-- ── Panel Tab Kanan ───────────────────────────────── -->
        <div class="lg:col-span-2">
          <!-- Tab bar -->
          <div class="flex border-b border-slate-200 overflow-x-auto scrollbar-thin pb-px mb-4">
            <!--
              BUG-4/11 FIX: Tambahkan type="button" pada semua tab button agar
              tidak berpotensi trigger form submit jika ada wrapper <form>.
              BUG UI-2 FIX: Ganti focus:outline-none dengan focus-visible ring
              yang visible untuk keyboard navigation.
            -->
            <button
              v-for="tab in tabs"
              :key="tab.key"
              type="button"
              :class="[
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap',
                'border-b-2 -mb-px transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1',
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
              ]"
              @click="activeTab = tab.key"
            >
              <component :is="tab.icon" class="h-3.5 w-3.5 shrink-0" />
              {{ tab.label }}
            </button>
          </div>

          <!-- Tab content dengan transisi fade -->
          <Transition name="tab-fade" mode="out-in">
            <div :key="activeTab">

              <!-- ── Identitas ─────────────────────────────── -->
              <div v-if="activeTab === 'identity'" class="space-y-4">
                <BaseCard title="Data Pribadi">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2 text-sm">
                    <InfoRow label="NIK"             :value="nikDisplay" />
                    <InfoRow label="Tempat Lahir"    :value="student.birthPlace" />
                    <InfoRow label="Tanggal Lahir"   :value="formatDate(student.birthDate)" />
                    <InfoRow label="Agama"           :value="student.religion" />
                    <InfoRow label="Kewarganegaraan" :value="student.nationality" />
                    <InfoRow label="Status Keluarga" :value="familyStatusLabel" />
                    <InfoRow
                      label="Anak Ke-"
                      :value="student.childOrder != null ? String(student.childOrder) : undefined"
                    />
                    <InfoRow
                      label="Jml Saudara"
                      :value="student.siblingsCount != null ? String(student.siblingsCount) : undefined"
                    />
                  </div>
                </BaseCard>

                <BaseCard title="Alamat & Kontak">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2 text-sm">
                    <div class="sm:col-span-2">
                      <InfoRow label="Alamat" :value="student.address" />
                    </div>
                    <InfoRow label="RT/RW"          :value="student.rtRw" />
                    <InfoRow label="Desa/Kelurahan" :value="student.village" />
                    <InfoRow label="Kecamatan"      :value="student.district" />
                    <InfoRow label="Kab/Kota"       :value="student.city" />
                    <InfoRow label="Provinsi"       :value="student.province" />
                    <InfoRow label="Kode Pos"       :value="student.postalCode" />
                    <InfoRow label="No. HP"         :value="student.phone" />
                    <InfoRow label="Email"          :value="student.email" />
                  </div>
                </BaseCard>

                <BaseCard v-if="student.notes" title="Catatan">
                  <p class="text-sm text-slate-600 mt-2 leading-relaxed">{{ student.notes }}</p>
                </BaseCard>
              </div>

              <!-- ── Orang Tua ──────────────────────────────── -->
              <div v-else-if="activeTab === 'parents'" class="space-y-4">
                <ParentCard
                  v-for="rel in (['father', 'mother', 'guardian'] as const)"
                  :key="rel"
                  :parent="getParent(rel)"
                  :relationship="rel"
                  :show-sensitive="can(PERMISSIONS.STUDENT_VIEW_SENSITIVE)"
                />
              </div>

              <!-- ── Kesehatan ──────────────────────────────── -->
              <div v-else-if="activeTab === 'health'">
                <BaseCard title="Data Kesehatan">
                  <template v-if="can(PERMISSIONS.STUDENT_VIEW_SENSITIVE)">
                    <div
                      v-if="student.health"
                      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 mt-2 text-sm"
                    >
                      <InfoRow label="Gol. Darah"  :value="student.health.bloodType" />
                      <InfoRow
                        label="Tinggi Badan"
                        :value="student.health.heightCm ? `${student.health.heightCm} cm` : ''"
                      />
                      <InfoRow
                        label="Berat Badan"
                        :value="student.health.weightKg ? `${student.health.weightKg} kg` : ''"
                      />
                      <div class="sm:col-span-2 md:col-span-3">
                        <InfoRow label="Kebutuhan Khusus"  :value="student.health.specialNeeds" />
                      </div>
                      <div class="sm:col-span-2 md:col-span-3">
                        <InfoRow label="Catatan Kesehatan" :value="student.health.healthNotes" />
                      </div>
                      <div class="sm:col-span-2 md:col-span-3">
                        <InfoRow label="Alergi" :value="student.health.allergies" />
                      </div>
                    </div>
                    <BaseEmpty
                      v-else
                      title="Data kesehatan belum diisi"
                      description="Data kesehatan siswa ini belum tersedia di sistem."
                      class="py-8"
                    />
                  </template>
                  <BaseAlert v-else type="info" class="mt-2">
                    Data kesehatan bersifat sensitif dan tidak dapat dilihat dengan role Anda.
                  </BaseAlert>
                </BaseCard>
              </div>

              <!-- ── Pendidikan Sebelumnya ──────────────────── -->
              <div v-else-if="activeTab === 'education'">
                <BaseCard title="Riwayat Pendidikan Sebelumnya">
                  <div v-if="student.educationHistory?.length" class="mt-2 space-y-3">
                    <div
                      v-for="ed in student.educationHistory"
                      :key="ed.id"
                      class="flex gap-3 p-3 bg-slate-50 rounded-lg text-sm"
                    >
                      <div class="p-2 bg-blue-100 rounded-lg shrink-0 self-start">
                        <GraduationCap class="h-4 w-4 text-blue-600" />
                      </div>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 flex-1 min-w-0">
                        <InfoRow label="Asal Sekolah" :value="ed.schoolName" />
                        <InfoRow label="Jenjang"      :value="ed.level" />
                        <InfoRow
                          label="Tahun Lulus"
                          :value="ed.graduationYear != null ? String(ed.graduationYear) : undefined"
                        />
                        <InfoRow label="No. Ijazah" :value="ed.certificateNumber" />
                      </div>
                    </div>
                  </div>
                  <BaseEmpty v-else title="Belum ada data riwayat pendidikan" class="py-8" />
                </BaseCard>
              </div>

              <!-- ── Riwayat Kelas ───────────────────────────── -->
              <div v-else-if="activeTab === 'enrollment'">
                <BaseCard title="Riwayat Kelas">
                  <!--
                    BUG-12 FIX: Ganti <button> raw dengan BaseButton agar
                    styling, focus ring, dan accessibility konsisten.
                  -->
                  <BaseAlert
                    v-if="enrollmentError"
                    type="error"
                    class="mt-2 mb-3"
                  >
                    <div class="flex items-center justify-between gap-3 flex-wrap">
                      <span>{{ enrollmentError }}</span>
                      <BaseButton
                        size="sm"
                        variant="outline"
                        @click="retryEnrollments"
                      >
                        Muat ulang
                      </BaseButton>
                    </div>
                  </BaseAlert>

                  <!--
                    BUG-8 / UI-1 FIX: Tampilkan skeleton saat enrollments masih
                    diload (isLoadingEnrollments) agar tidak ada flash konten kosong.
                  -->
                  <div v-if="isLoadingEnrollments" class="mt-2 space-y-2">
                    <div
                      v-for="i in 3"
                      :key="i"
                      class="flex gap-3 p-3 rounded-lg border border-slate-100"
                    >
                      <BaseSkeleton height="h-8" width="w-8" :rounded="false" />
                      <div class="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <BaseSkeleton v-for="j in 4" :key="j" height="h-4" />
                      </div>
                    </div>
                  </div>

                  <div v-else-if="enrollments.length > 0" class="mt-2 space-y-2">
                    <div
                      v-for="enr in enrollments"
                      :key="enr.id"
                      class="flex items-start gap-3 p-3 rounded-lg border border-slate-100
                             hover:border-slate-200 hover:bg-slate-50 transition-colors text-sm"
                    >
                      <div class="p-2 bg-slate-100 rounded-lg shrink-0 mt-0.5">
                        <School class="h-4 w-4 text-slate-500" />
                      </div>
                      <div class="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-2">
                        <InfoRow label="Kelas"           :value="enr.classroomName" />
                        <InfoRow label="Tahun Pelajaran" :value="enr.schoolYearName" />
                        <InfoRow label="Tgl Masuk"       :value="formatDate(enr.entryDate)" />
                        <div>
                          <p class="text-xs text-slate-400 mb-0.5">Status</p>
                          <EnrollmentStatusBadge :status="enr.status" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <BaseEmpty
                    v-else-if="!enrollmentError && !isLoadingEnrollments"
                    title="Belum ada riwayat kelas"
                    description="Siswa ini belum pernah terdaftar di kelas manapun."
                    class="py-8"
                  />
                </BaseCard>
              </div>

            </div>
          </Transition>
        </div>
      </div>
    </template>

    <!-- ── Confirm Archive ───────────────────────────────────────── -->
    <BaseConfirmDialog
      v-model="showArchiveDialog"
      title="Arsipkan Siswa"
      :message="`Arsipkan '${student?.fullName}'? Siswa akan dinonaktifkan dan tidak muncul di daftar aktif.`"
      type="warning"
      confirm-text="Ya, Arsipkan"
      :loading="isArchiving"
      @confirm="confirmArchive"
    />

    <!-- ── Confirm Restore ───────────────────────────────────────── -->
    <BaseConfirmDialog
      v-model="showRestoreDialog"
      title="Aktifkan Kembali Siswa"
      :message="`Aktifkan kembali '${student?.fullName}' menjadi siswa aktif?`"
      type="info"
      confirm-text="Ya, Aktifkan"
      :loading="isRestoring"
      @confirm="confirmRestore"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Pencil, Archive, GraduationCap, School,
  RotateCcw, User, Users, Heart, BookOpen, History,
} from 'lucide-vue-next'
import { PageHeader, StudentStatusBadge } from '@/components/shared'
import {
  BaseCard, BaseButton, BaseAlert, BaseAvatar,
  BaseSkeleton, BaseEmpty, BaseConfirmDialog,
} from '@/components/ui'
import { useStudentsStore } from '@/stores/students'
import { usePermission } from '@/composables'
import { studentsService } from '@/services'
import { PERMISSIONS } from '@/constants'
import { formatDate, formatGender, calculateAge } from '@/utils'
import { toast } from 'vue-sonner'
import type { StudentParent, StudentEnrollment } from '@/types'

// ─────────────────────────────────────────────────────────────────
// InfoRow — helper label/nilai dengan fallback '—'
// ─────────────────────────────────────────────────────────────────
const InfoRow = {
  props: {
    label: { type: String, required: true },
    value: { type: String, default: null },
  },
  template: `
    <div class="min-w-0">
      <p class="text-xs text-slate-400 mb-0.5 truncate">{{ label }}</p>
      <p class="text-slate-700 font-medium break-words">{{ value || '—' }}</p>
    </div>
  `,
}

// ─────────────────────────────────────────────────────────────────
// EnrollmentStatusBadge — badge berwarna per status enrollment
// ─────────────────────────────────────────────────────────────────
const enrollmentStatusMap: Record<string, { label: string; color: string }> = {
  active:      { label: 'Aktif',       color: 'bg-green-100 text-green-700'  },
  inactive:    { label: 'Tidak Aktif', color: 'bg-slate-100 text-slate-600'  },
  transferred: { label: 'Pindah',      color: 'bg-amber-100 text-amber-700'  },
  graduated:   { label: 'Lulus',       color: 'bg-blue-100 text-blue-700'    },
  dropped_out: { label: 'Keluar',      color: 'bg-red-100 text-red-700'      },
}

const EnrollmentStatusBadge = {
  props: { status: { type: String, default: null } },
  setup(props: { status: string | null }) {
    const entry      = computed(() => enrollmentStatusMap[props.status ?? ''])
    const label      = computed(() => entry.value?.label ?? props.status ?? '—')
    const colorClass = computed(() => entry.value?.color ?? 'bg-slate-100 text-slate-600')
    return { label, colorClass }
  },
  template: `
    <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colorClass]">
      {{ label }}
    </span>
  `,
}

// ─────────────────────────────────────────────────────────────────
// ParentCard — kartu satu entri orang tua / wali
// ─────────────────────────────────────────────────────────────────
const ParentCard = {
  props: {
    parent:        { type: Object,  default: null  },
    relationship:  { type: String,  required: true },
    showSensitive: { type: Boolean, default: false },
  },
  components: { BaseCard, InfoRow },
  methods: {
    formatDate,
    /** isAlive dari GAS bisa boolean, string "TRUE"/"FALSE", atau angka 0/1 */
    normalizeIsAlive(val: unknown): boolean {
      if (val === false || val === 'FALSE' || val === 'false' || val === 0) return false
      return true
    },
    relationLabel(rel: string): string {
      const map: Record<string, string> = {
        father:   'Data Ayah',
        mother:   'Data Ibu',
        guardian: 'Data Wali',
      }
      return map[rel] ?? rel
    },
  },
  template: `
    <BaseCard :title="relationLabel(relationship)">
      <div v-if="parent" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2 text-sm">
        <InfoRow label="Nama"        :value="parent.fullName" />
        <InfoRow v-if="showSensitive" label="NIK" :value="parent.nik" />
        <InfoRow label="Tgl Lahir"   :value="formatDate(parent.birthDate)" />
        <InfoRow label="Pendidikan"  :value="parent.education" />
        <InfoRow label="Pekerjaan"   :value="parent.occupation" />
        <InfoRow label="Penghasilan" :value="parent.incomeRange" />
        <InfoRow label="No. HP"      :value="parent.phone" />
        <InfoRow
          label="Status"
          :value="normalizeIsAlive(parent.isAlive) ? 'Masih Hidup' : 'Almarhum/ah'"
        />
      </div>
      <p v-else class="text-sm text-slate-400 mt-2 italic">Data tidak tersedia.</p>
    </BaseCard>
  `,
}

// ─────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────
const route  = useRoute()
const router = useRouter()
const studentsStore = useStudentsStore()
const { can } = usePermission()

const student = computed(() => studentsStore.current)

const isLoading           = ref(true)
const error               = ref('')
const enrollments         = ref<StudentEnrollment[]>([])
const enrollmentError     = ref('')
const isLoadingEnrollments = ref(false)   // BUG-8 FIX: state loading enrollment

// Archive / restore
const showArchiveDialog = ref(false)
const isArchiving       = ref(false)
const showRestoreDialog = ref(false)
const isRestoring       = ref(false)

// ─────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────
const tabs = [
  { key: 'identity',   label: 'Identitas',     icon: User        },
  { key: 'parents',    label: 'Orang Tua',     icon: Users       },
  { key: 'health',     label: 'Kesehatan',     icon: Heart       },
  { key: 'education',  label: 'Pendidikan',    icon: BookOpen    },
  { key: 'enrollment', label: 'Riwayat Kelas', icon: History     },
]
const activeTab = ref('identity')

// Lebar skeleton representatif per tab button (BUG-7 FIX)
const tabSkeletonWidths = ['w-20', 'w-24', 'w-24', 'w-24', 'w-28']

// ─────────────────────────────────────────────────────────────────
// Computed helpers
// ─────────────────────────────────────────────────────────────────
const studentAge = computed((): number | null =>
  calculateAge(student.value?.birthDate)
)

const nikDisplay = computed((): string | undefined => {
  if (can(PERMISSIONS.STUDENT_VIEW_SENSITIVE)) {
    return student.value?.nik || undefined
  }
  if (!student.value?.nik) return undefined
  return '••••••••••••••••'
})

const familyStatusLabel = computed((): string | undefined => {
  const map: Record<string, string> = {
    kandung:     'Anak Kandung',
    tiri:        'Anak Tiri',
    angkat:      'Anak Angkat',
    yatim:       'Yatim',
    piatu:       'Piatu',
    yatim_piatu: 'Yatim Piatu',
  }
  const val = student.value?.familyStatus
  return val ? (map[val] ?? val) : undefined
})

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function getParent(rel: 'father' | 'mother' | 'guardian'): StudentParent | undefined {
  return student.value?.parents?.find(p => p.relationship === rel)
}

// ─────────────────────────────────────────────────────────────────
// Data loading
// ─────────────────────────────────────────────────────────────────
const studentId = computed(() => route.params.id as string)

async function loadEnrollments(): Promise<void> {
  enrollmentError.value       = ''
  isLoadingEnrollments.value  = true   // BUG-8 FIX
  try {
    enrollments.value = await studentsService.getEnrollments(studentId.value)
  } catch (e: unknown) {
    enrollmentError.value = e instanceof Error ? e.message : 'Gagal memuat riwayat kelas.'
  } finally {
    isLoadingEnrollments.value = false
  }
}

async function retryEnrollments(): Promise<void> {
  await loadEnrollments()
}

async function retryLoad(): Promise<void> {
  isLoading.value = true
  error.value     = ''
  studentsStore.clearCurrent()
  try {
    await studentsStore.fetchDetail(studentId.value)
    if (student.value) await loadEnrollments()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat data siswa.'
  } finally {
    isLoading.value = false
  }
}

// ─────────────────────────────────────────────────────────────────
// Archive
// ─────────────────────────────────────────────────────────────────
function handleArchive(): void {
  if (isArchiving.value) return
  showArchiveDialog.value = true
}

async function confirmArchive(): Promise<void> {
  if (!student.value) return
  isArchiving.value = true
  try {
    await studentsService.archive(student.value.id)
    studentsStore.removeFromList(student.value.id)
    toast.success('Siswa berhasil diarsipkan.')
    /*
     * BUG-3 FIX: Reset flag sebelum navigasi agar state bersih jika komponen
     * belum di-unmount saat push berjalan (browser SPA cepat).
     */
    isArchiving.value       = false
    showArchiveDialog.value = false
    router.push('/students')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengarsipkan siswa.')
    isArchiving.value       = false
    showArchiveDialog.value = false
  }
}

// ─────────────────────────────────────────────────────────────────
// Restore
// ─────────────────────────────────────────────────────────────────
function handleRestore(): void {
  if (isRestoring.value) return
  showRestoreDialog.value = true
}

async function confirmRestore(): Promise<void> {
  if (!student.value) return
  const id = student.value.id   // simpan id sebelum async agar tidak stale
  isRestoring.value = true
  try {
    await studentsService.restore(id)

    /*
     * BUG-2/6 FIX: Hapus double-write optimistic + fetchDetail.
     * Cukup lakukan satu fetchDetail untuk memuat data terbaru.
     * Jika fetchDetail gagal, tangkap errornya dan tampilkan ke user
     * (sebelumnya error di-swallow → uncaught rejection).
     */
    try {
      await studentsStore.fetchDetail(id)
    } catch {
      // fetchDetail gagal setelah restore berhasil — perbarui hanya status
      // secara optimistic agar UI tidak menunjukkan status lama.
      if (student.value) {
        studentsStore.updateInList({ ...student.value, status: 'active' })
      }
      toast.warning('Siswa diaktifkan, tapi gagal memuat data terbaru. Halaman mungkin perlu direfresh.')
    }

    toast.success('Siswa berhasil diaktifkan kembali.')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengaktifkan siswa.')
  } finally {
    isRestoring.value       = false
    showRestoreDialog.value = false
  }
}

// ─────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  studentsStore.clearCurrent()
  error.value           = ''
  enrollmentError.value = ''
  isLoading.value       = true

  try {
    await studentsStore.fetchDetail(studentId.value)
    if (student.value) await loadEnrollments()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat data siswa.'
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tab-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
