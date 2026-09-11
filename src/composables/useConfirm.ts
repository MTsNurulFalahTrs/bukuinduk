import { ref } from 'vue'

interface ConfirmOptions {
  title?: string
  message: string
  type?: 'danger' | 'warning' | 'info'
  confirmText?: string
  cancelText?: string
}

/**
 * Composable untuk dialog konfirmasi yang reusable.
 * Contoh penggunaan:
 *
 * const { confirmState, confirm, resolve } = useConfirm()
 *
 * async function handleDelete() {
 *   const ok = await confirm({ message: 'Hapus siswa ini?', type: 'danger' })
 *   if (ok) await deleteStudent(id)
 * }
 */
export function useConfirm() {
  const isOpen = ref(false)
  const isLoading = ref(false)
  const options = ref<ConfirmOptions>({ message: '' })

  let _resolve: ((v: boolean) => void) | null = null

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    options.value = opts
    isOpen.value = true
    return new Promise(resolve => {
      _resolve = resolve
    })
  }

  function onConfirm() {
    _resolve?.(true)
    isOpen.value = false
  }

  function onCancel() {
    _resolve?.(false)
    isOpen.value = false
  }

  return { isOpen, isLoading, options, confirm, onConfirm, onCancel }
}
