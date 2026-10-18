<template>
  <nav v-if="length > 1" class="flex items-center gap-1" aria-label="Navigasi halaman">
    <button
      type="button"
      class="inline-flex items-center justify-center size-8 rounded-lg border border-layer-line text-layer-foreground
             hover:bg-layer-hover focus:outline-hidden focus:bg-layer-focus
             disabled:opacity-40 disabled:pointer-events-none"
      :disabled="modelValue <= 1"
      aria-label="Halaman sebelumnya"
      @click="go(modelValue - 1)"
    >
      <ChevronLeft class="shrink-0 size-4" aria-hidden="true" />
    </button>

    <template v-for="(p, i) in pages" :key="`${p}-${i}`">
      <span v-if="p === '…'" class="px-1 text-sm text-muted-foreground-1 select-none">…</span>
      <button
        v-else
        type="button"
        class="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg border text-sm
               focus:outline-hidden focus:bg-layer-focus"
        :class="
          p === modelValue
            ? 'bg-primary border-primary text-primary-foreground font-medium'
            : 'border-layer-line text-layer-foreground hover:bg-layer-hover'
        "
        :aria-current="p === modelValue ? 'page' : undefined"
        @click="go(Number(p))"
      >
        {{ p }}
      </button>
    </template>

    <button
      type="button"
      class="inline-flex items-center justify-center size-8 rounded-lg border border-layer-line text-layer-foreground
             hover:bg-layer-hover focus:outline-hidden focus:bg-layer-focus
             disabled:opacity-40 disabled:pointer-events-none"
      :disabled="modelValue >= length"
      aria-label="Halaman berikutnya"
      @click="go(modelValue + 1)"
    >
      <ChevronRight class="shrink-0 size-4" aria-hidden="true" />
    </button>
  </nav>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    modelValue: number
    length: number
    /** Jumlah tombol angka yang ditampilkan (setara total-visible Vuetify). */
    totalVisible?: number
  }>(),
  { totalVisible: 5 },
)

const emit = defineEmits<{ 'update:modelValue': [v: number] }>()

/**
 * Hitung nomor halaman yang tampil, dengan elipsis.
 * Contoh (length=10, current=5, visible=5): 1 … 4 5 6 … 10
 */
const pages = computed<(number | '…')[]>(() => {
  const total = Math.max(1, props.length)
  const current = Math.min(Math.max(1, props.modelValue), total)
  const visible = Math.max(3, props.totalVisible)

  if (total <= visible) return Array.from({ length: total }, (_, i) => i + 1)

  const half = Math.floor((visible - 1) / 2)
  let start = Math.max(2, current - half)
  let end = Math.min(total - 1, start + visible - 3)

  if (end - start < visible - 3) start = Math.max(2, end - (visible - 3))

  const out: (number | '…')[] = [1]
  if (start > 2) out.push('…')
  for (let p = start; p <= end; p++) out.push(p)
  if (end < total - 1) out.push('…')
  out.push(total)
  return out
})

function go(p: number) {
  const next = Math.min(Math.max(1, p), Math.max(1, props.length))
  if (next !== props.modelValue) emit('update:modelValue', next)
}
</script>
