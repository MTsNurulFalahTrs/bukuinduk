<template>
  <div class="space-y-5">
    <PageHeader
      :title="isEdit ? 'Edit Data Siswa' : 'Tambah Siswa Baru'"
      show-back
      :breadcrumbs="[
        { label: 'Data Siswa', to: '/students' },
        { label: isEdit ? 'Edit' : 'Tambah Baru' },
      ]"
    />

    <BaseAlert v-if="errorMsg" type="error" dismissible>{{ errorMsg }}</BaseAlert>

    <!-- Step indicator -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1">
      <div
        v-for="(step, i) in steps"
        :key="step.key"
        class="flex items-center gap-2 shrink-0"
      >
        <button
          :class="[
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            currentStep === i
              ? 'bg-primary-600 text-white'
              : i < currentStep
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-100 text-slate-500',
          ]"
          @click="currentStep = i"
        >
          <CheckCircle v-if="i < currentStep" class="h-3.5 w-3.5" />
          <span v-else class="h-4 w-4 flex items-center justify-center rounded-full border-2 text-xs" :class="currentStep === i ? 'border-white' : 'border-current'">{{ i + 1 }}</span>
          {{ step.label }}
        </button>
        <ChevronRight v-if="i < steps.length - 1" class="h-4 w-4 text-slate-300 shrink-0" />
      </div>
    </div>

    <form @submit.prevent="handleSubmit">
      <!-- Step 0: Identitas -->
      <BaseCard v-if="currentStep === 0" title="Identitas Siswa">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <BaseInput v-model="form.fullName" label="Nama Lengkap" placeholder="Nama sesuai akta lahir" required :error-message="errors.fullName" />
          <BaseInput v-model="form.nickname" label="Nama Panggilan" placeholder="Opsional" />
          <BaseInput v-model="form.nis" label="NIS" placeholder="Nomor Induk Siswa" required :error-message="errors.nis" />
          <BaseInput v-model="form.nisn" label="NISN" placeholder="10 digit angka" required :error-message="errors.nisn" />
          <BaseInput v-model="form.nik" label="NIK" placeholder="16 digit (opsional)" :error-message="errors.nik" />
          <BaseSelect v-model="form.gender" label="Jenis Kelamin" :options="GENDER_OPTIONS" required :error-message="errors.gender" placeholder="Pilih jenis kelamin" />
          <BaseInput v-model="form.birthPlace" label="Tempat Lahir" placeholder="Kota/kabupaten" required />
          <BaseInput v-model="form.birthDate" label="Tanggal Lahir" type="date" required :error-message="errors.birthDate" />
          <BaseSelect v-model="form.religion" label="Agama" :options="RELIGION_OPTIONS" required :error-message="errors.religion" placeholder="Pilih agama" />
          <BaseSelect v-model="form.familyStatus" label="Status Keluarga" :options="FAMILY_STATUS_OPTIONS" placeholder="Pilih status" />
          <BaseInput v-model.number="form.childOrder" label="Anak Ke-" type="number" min="1" placeholder="1" />
          <BaseInput v-model.number="form.siblingsCount" label="Jumlah Saudara" type="number" min="0" placeholder="0" />
        </div>
      </BaseCard>

      <!-- Step 1: Alamat & Kontak -->
      <BaseCard v-if="currentStep === 1" title="Alamat & Kontak">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div class="sm:col-span-2">
            <BaseTextarea v-model="form.address" label="Alamat Lengkap" placeholder="Jalan, nomor rumah..." required />
          </div>
          <BaseInput v-model="form.rtRw" label="RT/RW" placeholder="001/002" />
          <BaseInput v-model="form.village" label="Desa/Kelurahan" />
          <BaseInput v-model="form.district" label="Kecamatan" />
          <BaseInput v-model="form.city" label="Kabupaten/Kota" />
          <BaseSelect v-model="form.province" label="Provinsi" :options="PROVINCES_ID" placeholder="Pilih provinsi" />
          <BaseInput v-model="form.postalCode" label="Kode Pos" placeholder="12345" />
          <BaseInput v-model="form.phone" label="No. HP Siswa" placeholder="08xx-xxxx-xxxx" />
          <BaseInput v-model="form.email" label="Email Siswa" type="email" placeholder="opsional@email.com" />
        </div>
      </BaseCard>

      <!-- Step 2: Pendidikan & Kelas -->
      <BaseCard v-if="currentStep === 2" title="Data Pendidikan & Kelas">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <BaseInput v-model="form.entryDate" label="Tanggal Masuk" type="date" required :error-message="errors.entryDate" />
          <BaseSelect v-model="form.schoolYearId" label="Tahun Pelajaran" :options="schoolYearStore.schoolYearOptions" placeholder="Pilih tahun pelajaran" />
          <BaseSelect v-model="form.classroomId" label="Kelas" :options="filteredClassroomOptions" placeholder="Pilih kelas" />
          <BaseInput v-model="form.educationHistory.schoolName" label="Asal Sekolah" placeholder="Nama sekolah sebelumnya" />
          <BaseSelect v-model="form.educationHistory.level" label="Jenjang Sekolah Asal" :options="PREVIOUS_SCHOOL_LEVEL_OPTIONS" placeholder="Pilih jenjang" />
          <BaseInput v-model="form.educationHistory.certificateNumber" label="Nomor Ijazah" placeholder="Opsional" />
          <BaseInput v-model.number="form.educationHistory.graduationYear" label="Tahun Lulus" type="number" placeholder="2024" />
          <div class="sm:col-span-2">
            <BaseTextarea v-model="form.notes" label="Catatan" placeholder="Catatan tambahan (opsional)" :rows="2" />
          </div>
        </div>
      </BaseCard>

      <!-- Step 3: Orang Tua -->
      <div v-if="currentStep === 3" class="space-y-4">
        <BaseCard
          v-for="(parentKey, parentLabel) in parentFields"
          :key="parentKey"
          :title="parentLabel"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <BaseInput v-model="form[parentKey].fullName" label="Nama Lengkap" :placeholder="`Nama ${parentLabel}`" />
            <BaseInput v-model="form[parentKey].nik" label="NIK" placeholder="16 digit (opsional)" />
            <BaseInput v-model="form[parentKey].birthDate" label="Tanggal Lahir" type="date" />
            <BaseSelect v-model="form[parentKey].education" label="Pendidikan" :options="EDUCATION_LEVEL_OPTIONS" placeholder="Pilih pendidikan" />
            <BaseInput v-model="form[parentKey].occupation" label="Pekerjaan" placeholder="Pekerjaan" />
            <BaseSelect v-model="form[parentKey].incomeRange" label="Penghasilan / Bulan" :options="INCOME_RANGE_OPTIONS" placeholder="Pilih kisaran penghasilan" />
            <BaseInput v-model="form[parentKey].phone" label="No. HP" placeholder="08xx-xxxx-xxxx" />
          </div>
        </BaseCard>
      </div>

      <!-- Step 4: Kesehatan -->
      <BaseCard v-if="currentStep === 4" title="Data Kesehatan">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <BaseSelect v-model="form.health.bloodType" label="Golongan Darah" :options="BLOOD_TYPE_OPTIONS" placeholder="Pilih golongan darah" />
          <BaseInput v-model.number="form.health.heightCm" label="Tinggi Badan (cm)" type="number" placeholder="150" />
          <BaseInput v-model.number="form.health.weightKg" label="Berat Badan (kg)" type="number" placeholder="45" />
          <div class="sm:col-span-3">
            <BaseTextarea v-model="form.health.specialNeeds" label="Kebutuhan Khusus" placeholder="Isi jika ada kebutuhan khusus" :rows="2" />
          </div>
          <div class="sm:col-span-3">
            <BaseTextarea v-model="form.health.healthNotes" label="Catatan Kesehatan" placeholder="Riwayat penyakit, kondisi kesehatan, dll" :rows="2" />
          </div>
          <div class="sm:col-span-3">
            <BaseTextarea v-model="form.health.allergies" label="Alergi" placeholder="Alergi makanan, obat, dll" :rows="2" />
          </div>
        </div>
      </BaseCard>

      <!-- Navigation buttons -->
      <div class="flex justify-between pt-2">
        <BaseButton v-if="currentStep > 0" variant="outline" type="button" @click="currentStep--">
          <ChevronLeft class="h-4 w-4" /> Sebelumnya
        </BaseButton>
        <div v-else />

        <div class="flex gap-3">
          <BaseButton variant="ghost" type="button" @click="$router.back()">Batal</BaseButton>
          <BaseButton
            v-if="currentStep < steps.length - 1"
            type="button"
            @click="currentStep++"
          >
            Berikutnya <ChevronRight class="h-4 w-4" />
          </BaseButton>
          <BaseButton
            v-else
            type="submit"
            :loading="isSaving"
            loading-text="Menyimpan..."
          >
            <Save class="h-4 w-4" />
            {{ isEdit ? 'Simpan Perubahan' : 'Simpan Siswa' }}
          </BaseButton>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CheckCircle, ChevronRight, ChevronLeft, Save } from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import {
  BaseCard, BaseInput, BaseSelect, BaseTextarea,
  BaseButton, BaseAlert,
} from '@/components/ui'
import { useStudentsStore } from '@/stores/students'
import { useClassroomsStore } from '@/stores/classrooms'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { studentsService } from '@/services'
import {
  GENDER_OPTIONS, RELIGION_OPTIONS, FAMILY_STATUS_OPTIONS,
  EDUCATION_LEVEL_OPTIONS, INCOME_RANGE_OPTIONS, BLOOD_TYPE_OPTIONS,
  PREVIOUS_SCHOOL_LEVEL_OPTIONS, PROVINCES_ID,
} from '@/constants'
import { studentSchema } from '@/utils/validation'
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()
const studentsStore = useStudentsStore()
const classroomsStore = useClassroomsStore()
const schoolYearStore = useSchoolYearStore()

const isEdit = computed(() => Boolean(route.params.id))
const isSaving = ref(false)
const errorMsg = ref('')
const currentStep = ref(0)
const errors = reactive<Record<string, string>>({})

const steps = [
  { key: 'identity', label: 'Identitas' },
  { key: 'address', label: 'Alamat' },
  { key: 'education', label: 'Pendidikan' },
  { key: 'parents', label: 'Orang Tua' },
  { key: 'health', label: 'Kesehatan' },
]

const parentFields: Record<string, string> = {
  father: 'Data Ayah',
  mother: 'Data Ibu',
  guardian: 'Data Wali',
}

const form = reactive<Record<string, any>>({
  fullName: '', nickname: '', nis: '', nisn: '', nik: '',
  gender: '', birthPlace: '', birthDate: '', religion: '',
  nationality: 'Indonesia', familyStatus: '', childOrder: undefined,
  siblingsCount: undefined, address: '', rtRw: '', village: '',
  district: '', city: '', province: '', postalCode: '',
  phone: '', email: '', entryDate: '', schoolYearId: '',
  classroomId: '', notes: '',
  educationHistory: {
    schoolName: '', level: '', certificateNumber: '', graduationYear: undefined,
  },
  father: { fullName: '', nik: '', birthDate: '', education: '', occupation: '', incomeRange: '', phone: '' },
  mother: { fullName: '', nik: '', birthDate: '', education: '', occupation: '', incomeRange: '', phone: '' },
  guardian: { fullName: '', nik: '', birthDate: '', education: '', occupation: '', incomeRange: '', phone: '' },
  health: { bloodType: '', heightCm: undefined, weightKg: undefined, specialNeeds: '', healthNotes: '', allergies: '' },
})

/**
 * Bug 2 & 3 FIX: Dropdown kelas difilter berdasarkan schoolYearId yang dipilih.
 * - Jika schoolYearId belum dipilih, tampilkan semua kelas (fallback).
 * - Computed ini reaktif — berubah otomatis saat form.schoolYearId berubah.
 * - classroomsStore.getOptionsForYear() menyaring list yang sudah di-cache di
 *   store tanpa request ulang ke backend.
 */
const filteredClassroomOptions = computed(() =>
  classroomsStore.getOptionsForYear(form.schoolYearId)
)

/**
 * Bug 3 FIX: Saat user memilih tahun pelajaran berbeda, reset pilihan kelas
 * agar tidak ada kelas dari tahun lama yang tertinggal di form.value.classroomId.
 * Hanya reset jika classroomId yang ada bukan bagian dari opsi baru.
 */
watch(() => form.schoolYearId, (newYearId, oldYearId) => {
  if (!oldYearId || newYearId === oldYearId) return
  const newOptions = classroomsStore.getOptionsForYear(newYearId)
  const stillValid = newOptions.some(o => o.value === form.classroomId)
  if (!stillValid) form.classroomId = ''
})

async function handleSubmit() {
  Object.keys(errors).forEach(k => delete errors[k])
  errorMsg.value = ''

  try {
    await studentSchema.validate(form, { abortEarly: false })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'inner' in err) {
      const inner = (err as { inner: { path: string; message: string }[] }).inner
      inner.forEach(e => { errors[e.path] = e.message })
      currentStep.value = 0 // Kembali ke step pertama jika ada error identitas
    }
    return
  }

  isSaving.value = true
  try {
    if (isEdit.value) {
      const updated = await studentsService.update(route.params.id as string, form as unknown as import('@/types').StudentFormData)
      studentsStore.updateInList(updated)
      toast.success('Data siswa berhasil diperbarui.')
    } else {
      await studentsService.create(form as unknown as import('@/types').StudentFormData)
      toast.success('Siswa baru berhasil ditambahkan.')
    }
    router.push('/students')
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Gagal menyimpan data.'
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  // Fetch classrooms tanpa schoolYearId dulu — semua kelas masuk ke store.
  // Setelah mount, filteredClassroomOptions akan reaktif menyaring per schoolYearId.
  await Promise.all([
    classroomsStore.fetch(),
    schoolYearStore.fetch(),
  ])

  // Default schoolYearId ke tahun aktif jika form kosong (mode create)
  if (!isEdit.value && !form.schoolYearId) {
    form.schoolYearId = schoolYearStore.activeSchoolYear?.id ?? ''
  }

  if (isEdit.value) {
    const student = await studentsStore.fetchDetail(route.params.id as string)
    if (student) {
      Object.assign(form, {
        fullName: student.fullName, nickname: student.nickname ?? '',
        nis: student.nis, nisn: student.nisn, nik: student.nik ?? '',
        gender: student.gender, birthPlace: student.birthPlace ?? '',
        birthDate: student.birthDate ?? '', religion: student.religion ?? '',
        familyStatus: student.familyStatus ?? '',
        childOrder: student.childOrder, siblingsCount: student.siblingsCount,
        address: student.address ?? '', rtRw: student.rtRw ?? '',
        village: student.village ?? '', district: student.district ?? '',
        city: student.city ?? '', province: student.province ?? '',
        postalCode: student.postalCode ?? '', phone: student.phone ?? '',
        email: student.email ?? '', entryDate: student.entryDate ?? '',
        notes: student.notes ?? '',
        classroomId: student.currentEnrollment?.classroomId ?? '',
        schoolYearId: student.currentEnrollment?.schoolYearId ?? '',
      })
      if (student.parents) {
        for (const p of student.parents) {
          if (form[p.relationship]) Object.assign(form[p.relationship], p)
        }
      }
      if (student.health) Object.assign(form.health, student.health)
      if (student.educationHistory?.[0]) Object.assign(form.educationHistory, student.educationHistory[0])
    }
  }
})
</script>
