import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Classroom } from '@/types'
import { classroomsService } from '@/services'

export const useClassroomsStore = defineStore('classrooms', () => {
  const list = ref<Classroom[]>([])
  const isLoading = ref(false)
  const initialized = ref(false)
  const currentSchoolYearId = ref<string>('')

  // Opsi untuk dropdown (id + label)
  const classroomOptions = computed(() =>
    list.value.map(c => ({ value: c.id, label: c.name }))
  )

  const activeClassrooms = computed(() =>
    list.value.filter(c => c.isActive)
  )

  async function fetch(schoolYearId?: string): Promise<void> {
    const syId = schoolYearId ?? currentSchoolYearId.value
    if (initialized.value && syId === currentSchoolYearId.value) return

    isLoading.value = true
    try {
      list.value = await classroomsService.list(syId || undefined)
      currentSchoolYearId.value = syId
      initialized.value = true
    } catch {
      // Tangani di view
    } finally {
      isLoading.value = false
    }
  }

  async function refresh(schoolYearId?: string): Promise<void> {
    initialized.value = false
    await fetch(schoolYearId)
  }

  function addClassroom(c: Classroom) {
    list.value.push(c)
  }

  function updateClassroom(updated: Classroom) {
    const idx = list.value.findIndex(c => c.id === updated.id)
    if (idx !== -1) list.value[idx] = updated
  }

  function removeClassroom(id: string) {
    list.value = list.value.filter(c => c.id !== id)
  }

  return {
    list,
    isLoading,
    initialized,
    classroomOptions,
    activeClassrooms,
    fetch,
    refresh,
    addClassroom,
    updateClassroom,
    removeClassroom,
  }
})
