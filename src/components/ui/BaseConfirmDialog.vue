<template>
  <BaseModal
    :model-value="modelValue"
    :title="title"
    size="sm"
    :show-close="false"
    :close-on-backdrop="false"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="flex gap-4 items-start">
      <div :class="['p-2 rounded-full shrink-0', iconBg]">
        <component :is="icon" :class="['h-5 w-5', iconColor]" />
      </div>
      <div>
        <p class="text-sm text-slate-600 leading-relaxed">{{ message }}</p>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-3 justify-end">
        <BaseButton variant="outline" size="sm" @click="$emit('update:modelValue', false)">
          {{ cancelText }}
        </BaseButton>
        <BaseButton :variant="confirmVariant" size="sm" :loading="loading" @click="$emit('confirm')">
          {{ confirmText }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Trash2, CheckCircle } from 'lucide-vue-next'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

interface Props {
  modelValue: boolean
  title?: string
  message?: string
  type?: 'danger' | 'warning' | 'info'
  confirmText?: string
  cancelText?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Konfirmasi',
  message: 'Apakah Anda yakin ingin melanjutkan?',
  type: 'warning',
  confirmText: 'Ya, Lanjutkan',
  cancelText: 'Batal',
  loading: false,
})

defineEmits<{
  'update:modelValue': [v: boolean]
  'confirm': []
}>()

const icon = computed(() => ({
  danger: Trash2,
  warning: AlertTriangle,
  info: CheckCircle,
}[props.type]))

const iconBg = computed(() => ({
  danger: 'bg-red-100',
  warning: 'bg-amber-100',
  info: 'bg-blue-100',
}[props.type]))

const iconColor = computed(() => ({
  danger: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
}[props.type]))

const confirmVariant = computed(() => ({
  danger: 'danger' as const,
  warning: 'primary' as const,
  info: 'primary' as const,
}[props.type]))
</script>
