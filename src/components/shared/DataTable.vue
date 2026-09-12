<template>
  <div class="w-full">
    <!-- Loading overlay -->
    <div v-if="loading" class="space-y-2 py-2">
      <BaseSkeleton v-for="i in skeletonRows" :key="i" height="h-12" />
    </div>

    <template v-else>
      <!-- Empty state -->
      <BaseEmpty
        v-if="!rows.length"
        :title="emptyTitle"
        :description="emptyDescription"
        :type="emptyType"
      >
        <template v-if="$slots.empty" #action>
          <slot name="empty" />
        </template>
      </BaseEmpty>

      <!-- Table -->
      <div v-else class="overflow-x-auto -mx-4 sm:mx-0 scrollbar-thin">
        <table class="min-w-full divide-y divide-slate-100">
          <thead>
            <tr class="bg-slate-50">
              <th
                v-for="col in columns"
                :key="col.key"
                :class="[
                  'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap',
                  col.align === 'right' ? 'text-right' : '',
                  col.align === 'center' ? 'text-center' : '',
                  col.sticky === 'left' ? 'sticky left-0 z-10 bg-slate-50' : '',
                  col.sticky === 'right' ? 'sticky right-0 z-10 bg-slate-50' : '',
                  col.width ?? '',
                  col.class ?? '',
                ]"
              >
                <!-- Sortable column header -->
                <!-- BUG-4 FIX: gunakan activeSortKey()/activeSortDir() agar
                     indicator sinkron dengan state parent (controlled) atau
                     internal (uncontrolled). -->
                <button
                  v-if="col.sortable"
                  class="flex items-center gap-1 hover:text-slate-700 transition-colors"
                  @click="onSort(col.key)"
                >
                  {{ col.label }}
                  <span class="text-slate-300">
                    <svg v-if="activeSortKey() === col.key && activeSortDir() === 'asc'" class="h-3 w-3" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 4l4 8H4z"/>
                    </svg>
                    <svg v-else-if="activeSortKey() === col.key && activeSortDir() === 'desc'" class="h-3 w-3" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 12l-4-8h8z"/>
                    </svg>
                    <svg v-else class="h-3 w-3 opacity-40" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M5 7l3-4 3 4H5zm6 2l-3 4-3-4h6z"/>
                    </svg>
                  </span>
                </button>
                <span v-else>{{ col.label }}</span>
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100 bg-white">
            <tr
              v-for="(row, idx) in rows"
              :key="rowKey ? String(row[rowKey]) : idx"
              :class="[
                'transition-colors',
                clickable ? 'cursor-pointer hover:bg-slate-50' : '',
                striped && idx % 2 === 1 ? 'bg-slate-50/50' : '',
              ]"
              @click="clickable && $emit('rowClick', row)"
            >
              <td
                v-for="col in columns"
                :key="col.key"
                :class="[
                  'px-4 py-3 text-sm text-slate-700',
                  col.align === 'right' ? 'text-right' : '',
                  col.align === 'center' ? 'text-center' : '',
                  col.sticky === 'left' ? 'sticky left-0 z-10 bg-white' : '',
                  col.sticky === 'right' ? 'sticky right-0 z-10 bg-white' : '',
                  col.cellClass ?? '',
                ]"
              >
                <!-- Custom slot per kolom -->
                <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]" :index="idx">
                  {{ row[col.key] ?? '-' }}
                </slot>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'
import BaseEmpty from '@/components/ui/BaseEmpty.vue'

export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  sticky?: 'left' | 'right'
  width?: string       // e.g. 'w-32'
  class?: string       // header cell class
  cellClass?: string   // body cell class
}

interface Props {
  columns: TableColumn[]
  rows: Record<string, unknown>[]
  loading?: boolean
  skeletonRows?: number
  rowKey?: string
  clickable?: boolean
  striped?: boolean
  // BUG-4 FIX: Terima sortKey & sortDir dari parent agar indicator sort
  // di header sinkron dengan state filter yang aktif di store.
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  emptyTitle?: string
  emptyDescription?: string
  emptyType?: 'search' | 'data' | 'students' | 'default'
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  skeletonRows: 5,
  clickable: false,
  striped: false,
  emptyTitle: 'Tidak ada data',
  emptyType: 'default',
})

const emit = defineEmits<{
  rowClick: [row: Record<string, unknown>]
  sort: [key: string, dir: 'asc' | 'desc']
}>()

// BUG-10 FIX: Track kolom terakhir yang di-sort secara internal untuk
// menentukan arah toggle. Saat kolom BERBEDA diklik, selalu mulai dari 'asc'.
// Saat kolom SAMA diklik, toggle dari arah sebelumnya.
const internalSortKey = ref<string>('')
const internalSortDir = ref<'asc' | 'desc'>('asc')

function onSort(key: string) {
  // BUG-10 FIX: Reset ke 'asc' saat kolom baru dipilih
  const newDir = (internalSortKey.value === key && internalSortDir.value === 'asc')
    ? 'desc'
    : 'asc'
  internalSortKey.value = key
  internalSortDir.value = newDir
  emit('sort', key, newDir)
}

// BUG-4 FIX: Gunakan prop sortKey/sortDir jika disediakan parent (controlled),
// fallback ke state internal jika parent tidak meneruskan props ini.
function activeSortKey(): string {
  return props.sortKey !== undefined ? props.sortKey : internalSortKey.value
}
function activeSortDir(): 'asc' | 'desc' {
  return props.sortDir !== undefined ? props.sortDir : internalSortDir.value
}
</script>
