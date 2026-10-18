<template>
  <div class="rounded-lg border border-card-line bg-card">
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-t-lg px-4 py-3 text-start
             hover:bg-card-header focus:outline-hidden focus:bg-card-header"
      :aria-expanded="open"
      :aria-controls="bodyId"
      @click="open = !open"
    >
      <Calculator class="shrink-0 size-4 text-primary" aria-hidden="true" />
      <span class="flex-1 text-sm font-medium text-foreground">{{ title }}</span>
      <ChevronDown
        class="shrink-0 size-4 text-muted-foreground-1 transition-transform"
        :class="open ? 'rotate-180' : ''"
        aria-hidden="true"
      />
    </button>
    <div v-show="open" :id="bodyId" class="border-t border-card-divider">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Calculator, ChevronDown } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  title?: string
  defaultOpen?: boolean
}>(), { title: 'Langkah Perhitungan', defaultOpen: true })

const open = ref(props.defaultOpen)
// SSR-safe id untuk aria-controls (useId tersedia via auto-import Nuxt).
const bodyId = useId()
</script>
