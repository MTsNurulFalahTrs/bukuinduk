<template>
  <div>
    <AdminDashboard v-if="isAdmin" />
    <PrincipalDashboard v-else-if="isPrincipal" />
    <TeacherDashboard v-else-if="isTeacher" />
  </div>
</template>

<script setup lang="ts">
import { usePermission } from '@/composables'
import AdminDashboard from './AdminDashboard.vue'
import PrincipalDashboard from './PrincipalDashboard.vue'
import TeacherDashboard from './TeacherDashboard.vue'

const { isAdmin, isPrincipal, isTeacher } = usePermission()
</script>
