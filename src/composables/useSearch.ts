import { ref, watch } from 'vue'
import { DEBOUNCE_DELAY } from '@/constants'

/**
 * Composable untuk debounced search.
 * `query` adalah nilai yang diketik user (langsung).
 * `debouncedQuery` adalah nilai yang digunakan untuk request API.
 */
export function useSearch(onSearch: (q: string) => void, delay = DEBOUNCE_DELAY) {
  const query = ref('')
  let timer: ReturnType<typeof setTimeout> | null = null

  watch(query, (newVal) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      onSearch(newVal.trim())
    }, delay)
  })

  function clear() {
    query.value = ''
    if (timer) clearTimeout(timer)
    onSearch('')
  }

  return { query, clear }
}
