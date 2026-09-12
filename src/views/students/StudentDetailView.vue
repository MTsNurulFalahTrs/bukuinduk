<template>
  <div class="space-y-5">
    <!-- ── Page Header ─────────────────────────────────────────── -->
    <PageHeader
      title="Detail Siswa"
      show-back
      :breadcrumbs="[{ label: 'Data Siswa', to: '/students' }, { label: student?.fullName ?? '…' }]"
    >
      <template v-if="student" #actions>
        <BaseButton
          v-if="can(PERMISSIONS.STUDENT_UPDATE)"
          variant="outline"
          size="sm"
          @click="router.push(`/students/${student.id}/edit`)"
        >
          <Pencil class="h-4 w-4" />
          <span class="hidden sm:inline">Edit</span>
        </BaseButton>

        <!--
          BUG-14 FIX: Tombol Arsipkan di-disable saat isArchiving agar double-click
          tidak bisa trigger dialog dua kali sebelum loading state terpasang.
        -->
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

        <!-- Restore: tampilkan jika status bukan active dan user punya izin -->
        <BaseButton
          v-if="can(PERMISSIONS.STUDENT_ARCHIVE) && student.status !== 'active'"
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

    <!-- ── Skeleton Loading ────────────────────────────────────── -->
    <div v-if="isLoading" class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <!-- Kartu profil kiri -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div class="flex flex-col items-center gap-3">
          <BaseSkeleton height="h-20 w-20 rounded-full" />
          <BaseSkeleton height="h-5 w-40" />
          <BaseSkeleton height="h-4 w-24" />
        </div>
        <div class="space-y-3 pt-4 border-t border-slate-100">
          <BaseSkeleton v-for="i in 5" :key="i" height="h-4" />
        </div>
      </div>
      <!-- Panel tab kanan -->
      <div class="lg:col-span-2 space-y-4">
        <BaseSkeleton height="h-10" />
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <BaseSkeleton v-for="i in 6" :key="i" height="h-4" />
        </div>
      </div>
    </div>

    <!-- ── Error State ─────────────────────────────────────────── -->
    <BaseAlert v-else-if="error" type="error" class="mt-2">
      <div class="flex items-center justify-between gap-4">
        <span>{{ error }}</span>
        <BaseButton size="sm" variant="outline" @click="retryLoad">Coba Lagi</BaseButton>
      </div>
    </BaseAlert>

    <!-- ── Content ─────────────────────────────────────────────── -->
    <template v-else-if="student">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <!-- ── Kartu Profil Kiri ─────────────────────────────── -->
        <!--
          BUG-9 FIX: Gunakan prop :padding="false" agar tidak ada conflict p-5 vs py-6.
          Padding dikendalikan sepenuhnya oleh class di slot konten.
        -->
        <BaseCard :padding="false" class="overflow-hidden">
          <!-- Banner gradient tipis di atas avatar -->
          <div class="h-16 bg-gradient-to-r from-primary-500 to-primary-700 shrink-0" />

          <div class="flex flex-col items-center text-center px-5 pb-5 -mt-8 gap-2">
            <!-- Avatar lebih besar sebagai focal point -->
            <BaseAvatar
              :name="student.fullName"
              :src="student.photoUrl ?? undefined"
              size="xl"
              color="blue"
              class="ring-4 ring-white shadow-sm"
            />

            <div class="mt-1">
              <h2 class="text-base font-bold text-slate-800 leading-tight">{{ student.fullName }}</h2>
              <p v-if="student.nickname" class="text-sm text-slate-400 mt-0.5">"{{ student.nickname }}"</p>
            </div>

            <!--
              BUG-12 FIX: Hapus prop `size` yang tidak ada di StudentStatusBadge.
              Komponen hanya menerima `status` dan `dot`.
            -->
            <StudentStatusBadge :status="student.status" dot />

            <!-- Info usia jika ada tanggal lahir -->
            <p v-if="studentAge !== null" class="text-xs text-slate-400">
              {{ studentAge }} tahun
            </p>
          </div>

          <!-- Daftar info ringkas -->
          <div class="px-5 pb-5 border-t border-slate-100 pt-4 space-y-2.5 text-sm">
            <InfoRow label="NIS"          :value="student.nis" />
            <InfoRow label="NISN"         :value="student.nisn" />
            <InfoRow label="Jenis Kelamin" :value="formatGender(student.gender)" />
            <InfoRow label="Kelas"        :value="student.currentEnrollment?.classroomName" />
            <InfoRow label="Tahun Masuk"  :value="student.currentEnrollment?.schoolYearName" />
            <InfoRow label="Tgl Masuk"    :value="formatDate(student.entryDate)" />
          </div>

          <!-- Quick action edit di bawah kartu (mobile-friendly) -->
          <div
            v-if="can(PERMISSIONS.STUDENT_UPDATE)"
            class="px-5 pb-5"
          >
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

        <!-- ── Panel Tab Kanan ────────────────────────────────── -->
        <div class="lg:col-span-2 space-y-0">
          <!--
            BUG-8 FIX: Tambahkan `pb-px` agar border-b-2 tab aktif tidak terpotong
            saat container scroll horizontal di mobile.
          -->
          <div class="flex border-b border-slate-200 overflow-x-auto scrollbar-thin pb-px mb-4">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              :class="[
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap',
                'border-b-2 -mb-px transition-colors focus:outline-none',
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

              <!-- ── Tab: Identitas ──────────────────────────── -->
              <div v-if="activeTab === 'identity'" class="space-y-4">
                <BaseCard title="Data Pribadi">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2 text-sm">
                    <!--
                      BUG-10 FIX: NIK hanya tampilkan mask '••••' jika user PUNYA akses
                      sensitif DAN nik memang tidak ada (backend hapus field untuk teacher).
                      Jika tidak punya akses: tampilkan mask hanya jika ada kemungkinan ada data
                      (role admin/principal). Teacher yang tidak dapat field nik dari backend
                      sudah tidak ada value, jadi tampilkan '—'.
                    -->
                    <InfoRow
                      label="NIK"
                      :value="nikDisplay"
                    />
                    <InfoRow label="Tempat Lahir"    :value="student.birthPlace" />
                    <InfoRow label="Tanggal Lahir"   :value="formatDate(student.birthDate)" />
                    <InfoRow label="Agama"           :value="student.religion" />
                    <InfoRow label="Kewarganegaraan" :value="student.nationality" />
                    <InfoRow label="Status Keluarga" :value="familyStatusLabel" />
                    <InfoRow label="Anak Ke-"        :value="student.childOrder != null ? String(student.childOrder) : undefined" />
                    <InfoRow label="Jml Saudara"     :value="student.siblingsCount != null ? String(student.siblingsCount) : undefined" />
                  </div>
                </BaseCard>

                <BaseCard title="Alamat & Kontak">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2 text-sm">
                    <!--
                      BUG-13 FIX: Pisahkan alamat dan RT/RW — tidak digabung join
                      yang bisa menghasilkan leading-space jika salah satu kosong.
                    -->
                    <div class="sm:col-span-2">
                      <InfoRow label="Alamat" :value="student.address" />
                    </div>
                    <InfoRow label="RT/RW"         :value="student.rtRw" />
                    <InfoRow label="Desa/Kelurahan" :value="student.village" />
                    <InfoRow label="Kecamatan"     :value="student.district" />
                    <InfoRow label="Kab/Kota"      :value="student.city" />
                    <InfoRow label="Provinsi"      :value="student.province" />
                    <InfoRow label="Kode Pos"      :value="student.postalCode" />
                    <InfoRow label="No. HP"        :value="student.phone" />
                    <InfoRow label="Email"         :value="student.email" />
                  </div>
                </BaseCard>

                <BaseCard v-if="student.notes" title="Catatan">
                  <p class="text-sm text-slate-600 mt-2 leading-relaxed">{{ student.notes }}</p>
                </BaseCard>
              </div>

              <!-- ── Tab: Orang Tua ──────────────────────────── -->
              <div v-else-if="activeTab === 'parents'" class="space-y-4">
                <ParentCard
                  v-for="rel in (['father', 'mother', 'guardian'] as const)"
                  :key="rel"
                  :parent="getParent(rel)"
                  :relationship="rel"
                  :show-sensitive="can(PERMISSIONS.STUDENT_VIEW_SENSITIVE)"
                />
              </div>

              <!-- ── Tab: Kesehatan ──────────────────────────── -->
              <div v-else-if="activeTab === 'health'">
                <BaseCard title="Data Kesehatan">
                  <template v-if="can(PERMISSIONS.STUDENT_VIEW_SENSITIVE)">
                    <!--
                      BUG-11 FIX: Gunakan string kosong '' bukan undefined sebagai fallback
                      agar InfoRow selalu menerima prop string yang konsisten.
                      RESPONSIVE FIX: cols-1 di xs, cols-2 di sm, cols-3 di md
                    -->
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
                    <!-- Empty state jika data kesehatan belum diisi -->
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

              <!-- ── Tab: Pendidikan Sebelumnya ──────────────── -->
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
                      <!--
                        RESPONSIVE FIX: cols-1 di mobile agar teks tidak terpotong,
                        cols-2 di sm ke atas.
                      -->
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 flex-1 min-w-0">
                        <InfoRow label="Asal Sekolah" :value="ed.schoolName" />
                        <InfoRow label="Jenjang"      :value="ed.level" />
                        <InfoRow label="Tahun Lulus"  :value="ed.graduationYear != null ? String(ed.graduationYear) : undefined" />
                        <InfoRow label="No. Ijazah"   :value="ed.certificateNumber" />
                      </div>
                    </div>
                  </div>
                  <BaseEmpty v-else title="Belum ada data riwayat pendidikan" class="py-8" />
                </BaseCard>
              </div>

              <!-- ── Tab: Riwayat Kelas ──────────────────────── -->
              <div v-else-if="activeTab === 'enrollment'">
                <BaseCard title="Riwayat Kelas">
                  <!-- Error fetch enrollment (tidak memblokir halaman utama) -->
                  <BaseAlert v-if="enrollmentError" type="error" class="mt-2 mb-3">
                    {{ enrollmentError }}
                    <button
                      class="ml-2 underline text-xs hover:no-underline"
                      @click="retryEnrollments"
                    >
                      Muat ulang
                    </button>
                  </BaseAlert>

                  <!--
                    BUG-3 FIX: Kondisi yang benar adalah `enrollments.length > 0`,
                    bukan `student.currentEnrollment || enrollments.length`.
                    Sebelumnya jika currentEnrollment ada tapi enrollments kosong,
                    container tampil tapi list kosong — tanpa BaseEmpty.
                  -->
                  <div v-if="enrollments.length > 0" class="mt-2 space-y-2">
                    <div
                      v-for="enr in enrollments"
                      :key="enr.id"
                      class="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors text-sm"
                    >
                      <div class="p-2 bg-slate-100 rounded-lg shrink-0 mt-0.5">
                        <School class="h-4 w-4 text-slate-500" />
                      </div>
                      <!--
                        RESPONSIVE FIX: cols-1 di mobile, cols-2 di sm, cols-4 di lg.
                        Sebelumnya cols-2 di xs terlalu padat.
                        BUG-4 FIX: Gunakan formatEnrollmentStatus() bukan raw enr.status.
                      -->
                      <div class="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-2">
                        <InfoRow label="Kelas"          :value="enr.classroomName" />
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
                    v-else-if="!enrollmentError"
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

    <!-- ── Confirm Archive Dialog ──────────────────────────────── -->
    <BaseConfirmDialog
      v-model="showArchiveDialog"
      title="Arsipkan Siswa"
      :message="`Arsipkan '${student?.fullName}'? Siswa akan dinonaktifkan dan tidak muncul di daftar aktif.`"
      type="warning"
      confirm-text="Ya, Arsipkan"
      :loading="isArchiving"
      @confirm="confirmArchive"
    />

    <!-- ── Confirm Restore Dialog ──────────────────────────────── -->
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
// InfoRow — komponen helper ringan untuk pasangan label/nilai.
//
// BUG-7 FIX: Gunakan type null|string bukan String (konstruktor) agar
// undefined tidak pernah dirender sebagai string "undefined".
// Template menggunakan || '—' sebagai fallback tampilan.
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
// EnrollmentStatusBadge — badge berwarna untuk status enrollment.
// BUG-4 FIX: Status raw ('active','transferred', dll) ditampilkan
// dengan label Indonesia dan warna yang sesuai.
// Gunakan methods bukan computed agar TypeScript tidak perlu inferensi `this`.
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
    const entry = computed(() => enrollmentStatusMap[props.status ?? ''])
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
// ParentCard — komponen helper untuk satu entri orang tua/wali.
//
// BUG-2 FIX: parent.birthDate diformat via formatDate() bukan as-is.
// BUG-1 FIX: normalizeIsAlive hanya ada di sini sebagai method;
//   fungsi duplikat di setup scope dihapus.
// ─────────────────────────────────────────────────────────────────
const ParentCard = {
  props: {
    parent:        { type: Object, default: null },
    relationship:  { type: String, required: true },
    showSensitive: { type: Boolean, default: false },
  },
  components: { BaseCard, InfoRow },
  methods: {
    formatDate,
    /**
     * BUG-21 FIX (dipertahankan): isAlive dari spreadsheet bisa berupa
     * boolean, string "TRUE"/"FALSE", angka 0/1, atau null.
     * Hanya return false jika nilai secara eksplisit menunjukkan false.
     */
    normalizeIsAlive(val: unknown): boolean {
      if (val === false || val === 'FALSE' || val === 'false' || val === 0) return false
      return true
    },
    relationLabel(rel: string): string {
      return ({ father: 'Data Ayah', mother: 'Data Ibu', guardian: 'Data Wali' } as Record<string, string>)[rel] ?? rel
    },
  },
  template: `
    <BaseCard :title="relationLabel(relationship)">
      <div v-if="parent" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-2 text-sm">
        <InfoRow label="Nama"       :value="parent.fullName" />
        <InfoRow v-if="showSensitive" label="NIK" :value="parent.nik" />
        <InfoRow label="Tgl Lahir"  :value="formatDate(parent.birthDate)" />
        <InfoRow label="Pendidikan" :value="parent.education" />
        <InfoRow label="Pekerjaan"  :value="parent.occupation" />
        <InfoRow label="Penghasilan" :value="parent.incomeRange" />
        <InfoRow label="No. HP"     :value="parent.phone" />
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

// Loading / error state lokal (store state tidak dipakai oleh view ini)
const isLoading = ref(true)
const error     = ref('')

// Enrollment history (dimuat terpisah agar error-nya tidak menutup halaman)
const enrollments    = ref<StudentEnrollment[]>([])
const enrollmentError = ref('')

// Archive
const showArchiveDialog = ref(false)
const isArchiving = ref(false)

// Restore
const showRestoreDialog = ref(false)
const isRestoring = ref(false)

// ─────────────────────────────────────────────────────────────────
// Tab definitions — ikon diambil dari lucide-vue-next
// ─────────────────────────────────────────────────────────────────
const tabs = [
  { key: 'identity',   label: 'Identitas',  icon: User          },
  { key: 'parents',    label: 'Orang Tua',  icon: Users         },
  { key: 'health',     label: 'Kesehatan',  icon: Heart         },
  { key: 'education',  label: 'Pendidikan', icon: BookOpen      },
  { key: 'enrollment', label: 'Riwayat Kelas', icon: History    },
]
const activeTab = ref('identity')

// ─────────────────────────────────────────────────────────────────
// Computed helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Usia siswa dihitung dari tanggal lahir.
 */
const studentAge = computed((): number | null => {
  return calculateAge(student.value?.birthDate)
})

/**
 * BUG-10 FIX: NIK hanya ditampilkan mask jika:
 * - user PUNYA permission STUDENT_VIEW_SENSITIVE → tampilkan nilai asli atau '—'
 * - user TIDAK punya permission:
 *   - jika backend sudah strip field (teacher) → student.nik undefined → tampilkan '—'
 *   - jika backend mengirim field tapi user tidak boleh lihat (edge case) → tampilkan mask
 * Hasilnya: teacher melihat '—', admin/principal yang diblokir melihat mask.
 */
const nikDisplay = computed((): string | undefined => {
  if (can(PERMISSIONS.STUDENT_VIEW_SENSITIVE)) {
    return student.value?.nik || undefined
  }
  // Backend sudah hapus field nik untuk teacher → undefined → InfoRow tampil '—'
  if (!student.value?.nik) return undefined
  // Field ada tapi tidak boleh dilihat → mask
  return '••••••••••••••••'
})

/**
 * Label familyStatus yang lebih ramah.
 */
const familyStatusLabel = computed((): string | undefined => {
  const map: Record<string, string> = {
    kandung:    'Anak Kandung',
    tiri:       'Anak Tiri',
    angkat:     'Anak Angkat',
    yatim:      'Yatim',
    piatu:      'Piatu',
    yatim_piatu: 'Yatim Piatu',
  }
  const val = student.value?.familyStatus
  if (!val) return undefined
  return map[val] ?? val
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

async function loadEnrollments() {
  enrollmentError.value = ''
  try {
    enrollments.value = await studentsService.getEnrollments(studentId.value)
  } catch (e: unknown) {
    // BUG-6 FIX: Error enrollment disimpan di enrollmentError (bukan error utama)
    // sehingga data siswa yang sudah dimuat tetap tampil, hanya tab riwayat
    // kelas yang menampilkan pesan error parsial + tombol retry.
    enrollmentError.value = e instanceof Error ? e.message : 'Gagal memuat riwayat kelas.'
  }
}

async function retryEnrollments() {
  await loadEnrollments()
}

async function retryLoad() {
  isLoading.value = true
  error.value = ''
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

/**
 * BUG-5 FIX: Hapus async yang tidak diperlukan — fungsi ini hanya set flag.
 * BUG-14 FIX: Guard isArchiving agar double-click tidak bisa buka dialog dua kali.
 */
function handleArchive() {
  if (isArchiving.value) return
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
    toast.error(e instanceof Error ? e.message : 'Gagal mengarsipkan siswa.')
  } finally {
    isArchiving.value = false
    showArchiveDialog.value = false
  }
}

// ─────────────────────────────────────────────────────────────────
// Restore (fitur baru: aktifkan kembali siswa dari halaman detail)
// ─────────────────────────────────────────────────────────────────
function handleRestore() {
  if (isRestoring.value) return
  showRestoreDialog.value = true
}

async function confirmRestore() {
  if (!student.value) return
  isRestoring.value = true
  try {
    await studentsService.restore(student.value.id)
    // Perbarui status di store tanpa refetch penuh
    studentsStore.updateInList({ ...student.value, status: 'active' })
    // Perbarui current juga
    await studentsStore.fetchDetail(student.value.id)
    toast.success('Siswa berhasil diaktifkan kembali.')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengaktifkan siswa.')
  } finally {
    isRestoring.value = false
    showRestoreDialog.value = false
  }
}

// ─────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  studentsStore.clearCurrent()
  // BUG-18 FIX (dipertahankan): Reset error lama agar tidak flash saat navigasi.
  error.value = ''
  enrollmentError.value = ''
  isLoading.value = true

  try {
    // BUG-19 FIX (dipertahankan): fetchDetail() melempar error jika gagal.
    await studentsStore.fetchDetail(studentId.value)
    if (student.value) {
      // BUG-6 FIX: Load enrollment terpisah — error-nya tidak menutup halaman.
      await loadEnrollments()
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat data siswa.'
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
/* Transisi fade saat ganti tab */
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
