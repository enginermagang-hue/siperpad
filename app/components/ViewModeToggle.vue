<template>
  <div
    class="inline-flex items-center rounded-lg border border-layer-line bg-layer p-0.5"
    role="group"
    aria-label="Mode tampilan"
  >
    <button
      v-for="opt in opts"
      :key="opt.value"
      type="button"
      class="inline-flex items-center justify-center rounded-md p-1.5 text-layer-foreground
             hover:bg-layer-hover focus:outline-hidden focus:bg-layer-focus"
      :class="modelValue === opt.value ? 'bg-primary/10 text-primary' : ''"
      :aria-pressed="modelValue === opt.value"
      :title="opt.title"
      :aria-label="opt.aria"
      @click="emit('update:modelValue', opt.value)"
    >
      <component :is="opt.icon" class="shrink-0 size-4" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Table2, List, Rows3 } from 'lucide-vue-next'
import type { ViewMode } from '~/composables/useViewMode'

defineProps<{ modelValue: ViewMode }>()
const emit = defineEmits<{ 'update:modelValue': [value: ViewMode] }>()

const opts = [
  { value: 'table' as ViewMode, icon: Table2, title: 'Tabel', aria: 'Tampilan tabel' },
  { value: 'list' as ViewMode, icon: List, title: 'List', aria: 'Tampilan list kartu' },
  { value: 'compact' as ViewMode, icon: Rows3, title: 'Compact', aria: 'Tampilan compact' },
]
</script>
