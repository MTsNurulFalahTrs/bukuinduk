<template>
  <div
    :class="[
      'relative inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden',
      sizeClass,
      !src ? colorClass : 'bg-slate-200',
    ]"
  >
    <img
      v-if="src"
      :src="src"
      :alt="name ?? 'Avatar'"
      class="h-full w-full object-cover"
      @error="imgError = true"
    />
    <span
      v-else
      :class="['font-semibold text-white select-none', textSizeClass]"
    >
      {{ initials(name) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { initials } from '@/utils'

interface Props {
  name?: string | null
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'blue' | 'green' | 'purple' | 'teal' | 'orange'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'blue',
})

const imgError = ref(false)

const sizeClass = computed(() => ({
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
}[props.size]))

const textSizeClass = computed(() => ({
  xs: 'text-xs',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
}[props.size]))

const colorClass = computed(() => ({
  blue:   'bg-primary-600',
  green:  'bg-green-600',
  purple: 'bg-purple-600',
  teal:   'bg-teal-600',
  orange: 'bg-orange-500',
}[props.color]))
</script>
