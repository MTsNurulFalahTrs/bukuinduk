import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SchoolYear, Grade } from '@/types'
import { classroomsService } from '@/services'

export const useSchoolYearStore = defineStore('schoolYear', () => {
  const schoolYears = ref<SchoolYear[]>([])
  const grades = ref<Grade[]>([])
  const isLoading = ref(false)
  const initialized = ref(false)

  const activeSchoolYear = computed<SchoolYear | null>(
    () => schoolYears.value.find(sy => sy.isActive) ?? null
  )

  const activeSchoolYearName = computed(() => activeSchoolYear.value?.name ?? '')

  const schoolYearOptions = computed(() =>
    schoolYears.value.map(sy => ({
      value: sy.id,
      label: sy.name + (sy.isActive ? ' (Aktif)' : ''),
    }))
  )

  const gradeOptions = computed(() =>
    grades.value.map(g => ({ value: g.id, label: g.name }))
  )

  async function fetch(): Promise<void> {
    if (initialized.value) return
    isLoading.value = true
    try {
      const [syList, gradeList] = await Promise.all([
        classroomsService.listSchoolYears(),
        classroomsService.listGrades(),
      ])
      schoolYears.value = syList
      grades.value = gradeList
      initialized.value = true
    } catch {
      // Gagal fetch tidak fatal — view akan handle error sendiri
    } finally {
      isLoading.value = false
    }
  }

  async function refresh(): Promise<void> {
    initialized.value = false
    await fetch()
  }

  function addSchoolYear(sy: SchoolYear) {
    schoolYears.value.push(sy)
  }

  function updateSchoolYear(updated: SchoolYear) {
    const idx = schoolYears.value.findIndex(s => s.id === updated.id)

    // BUG-08 FIX: Jika id tidak ditemukan di list (misalnya data belum di-fetch),
    // tambahkan sebagai item baru daripada silent fail.
    if (idx !== -1) {
      schoolYears.value[idx] = updated
    } else {
      schoolYears.value.push(updated)
    }

    // Jika tahun ini di-set aktif, nonaktifkan semua yang lain
    if (updated.isActive) {
      schoolYears.value = schoolYears.value.map(s =>
        s.id === updated.id ? s : { ...s, isActive: false }
      )
    }
  }

  function removeSchoolYear(id: string) {
    schoolYears.value = schoolYears.value.filter(s => s.id !== id)
  }

  return {
    schoolYears,
    grades,
    isLoading,
    initialized,
    activeSchoolYear,
    activeSchoolYearName,
    schoolYearOptions,
    gradeOptions,
    fetch,
    refresh,
    addSchoolYear,
    updateSchoolYear,
    removeSchoolYear,
  }
})
