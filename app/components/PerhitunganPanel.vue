<template>
  <div class="p-4 bg-primary/5">
    <div class="flex items-center flex-wrap gap-2 mb-2">
      <Calculator class="shrink-0 size-4 text-primary" aria-hidden="true" />
      <span class="font-medium text-sm text-foreground">Langkah Perhitungan</span>
      <span v-if="title" class="text-sm text-muted-foreground-1">· {{ title }}</span>
      <span
        v-if="modeLabel"
        class="ms-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium
               bg-primary/10 text-primary"
      >
        {{ modeLabel }}
      </span>
    </div>
    <div v-if="subtitle" class="text-xs text-muted-foreground-1 mb-2">{{ subtitle }}</div>

    <div v-if="formula" class="mb-3">
      <code class="font-mono text-xs bg-primary/10 rounded px-1.5 py-0.5 text-foreground">{{ formula }}</code>
    </div>

    <div v-if="lines && lines.length" class="flex flex-col gap-1 mb-1">
      <div v-for="(l, i) in lines" :key="i" class="flex justify-between gap-3 text-sm">
        <span class="text-muted-foreground-1">
          <span v-if="l.op" class="inline-block w-3.5 font-bold">{{ l.op }}</span>{{ l.label }}
          <span v-if="l.note" class="block text-xs opacity-80">{{ l.note }}</span>
        </span>
        <span class="text-right font-medium shrink-0">{{ l.value }}</span>
      </div>
    </div>

    <hr class="my-2 border-line-1" />

    <div class="flex flex-col gap-1 text-sm">
      <div class="flex justify-between gap-3">
        <span class="text-muted-foreground-1">Target</span>
        <span class="text-right shrink-0">{{ fmt(target) }}</span>
      </div>
      <div class="flex justify-between gap-3">
        <span class="text-muted-foreground-1">{{ totalLabel }}</span>
        <span class="text-right font-medium shrink-0">{{ fmt(total) }}</span>
      </div>
      <div class="flex justify-between gap-3 items-center">
        <span class="text-muted-foreground-1">Capaian = {{ fmt(total) }} ÷ {{ fmt(target) }}</span>
        <span
          class="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
          :class="capaianBadgeClass"
        >
          {{ capaian }}%
        </span>
      </div>
    </div>

    <div v-if="basisNote" class="text-xs text-muted-foreground-1 mt-3">{{ basisNote }}</div>
  </div>
</template>

<script setup lang="ts">
import { Calculator } from 'lucide-vue-next'

type CalcLine = { op?: string; label: string; value: string; note?: string }

const props = withDefaults(defineProps<{
  title?: string
  subtitle?: string
  modeLabel?: string
  formula?: string
  lines?: CalcLine[]
  target: number
  total: number
  totalLabel?: string
  basisNote?: string
}>(), { totalLabel: 'Total' })

const { formatRupiah: fmt } = useCurrency()

// Samakan dengan server (server/utils/periode.ts `persen`): round(x*10000)/100, 0 bila target 0.
const capaian = computed(() => {
  const t = Number(props.target) || 0
  if (!t) return 0
  return Math.round((Number(props.total) / t) * 10000) / 100
})

const capaianBadgeClass = computed(() => {
  if (capaian.value >= 100) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
  if (capaian.value >= 75) return 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
  return 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
})
</script>
