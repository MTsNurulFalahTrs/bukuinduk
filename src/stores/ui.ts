import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useUiStore = defineStore('ui', () => {
  // ── Sidebar ───────────────────────────────────────────────────
  const sidebarCollapsed = ref(
    localStorage.getItem('sidebar_collapsed') === 'true'
  )
  const mobileSidebarOpen = ref(false)

  watch(sidebarCollapsed, v =>
    localStorage.setItem('sidebar_collapsed', String(v))
  )

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function openMobileSidebar() {
    mobileSidebarOpen.value = true
    document.body.style.overflow = 'hidden'
  }

  function closeMobileSidebar() {
    mobileSidebarOpen.value = false
    document.body.style.overflow = ''
  }

  // ── Global loading ────────────────────────────────────────────
  const globalLoading = ref(false)
  const globalLoadingText = ref('Memuat...')

  function showGlobalLoading(text = 'Memuat...') {
    globalLoadingText.value = text
    globalLoading.value = true
  }

  function hideGlobalLoading() {
    globalLoading.value = false
  }

  // ── Page title ────────────────────────────────────────────────
  const pageTitle = ref('Buku Induk Digital')

  function setPageTitle(title: string) {
    pageTitle.value = title
    document.title = `${title} — Buku Induk Digital`
  }

  return {
    sidebarCollapsed,
    mobileSidebarOpen,
    toggleSidebar,
    openMobileSidebar,
    closeMobileSidebar,
    globalLoading,
    globalLoadingText,
    showGlobalLoading,
    hideGlobalLoading,
    pageTitle,
    setPageTitle,
  }
})
