<template>
  <div class="perhitungan-panel pa-4">
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <v-icon size="small" color="primary">mdi-calculator</v-icon>
      <span class="font-weight-medium text-body-2">Langkah Perhitungan</span>
      <span v-if="title" class="text-body-2 text-medium-emphasis">· {{ title }}</span>
      <v-chip v-if="modeLabel" size="x-small" variant="tonal" color="primary" class="ml-1">{{ modeLabel }}</v-chip>
    </div>
    <div v-if="subtitle" class="text-caption text-medium-emphasis mb-2">{{ subtitle }}</div>

    <div v-if="formula" class="mb-3">
      <code class="perhitungan-formula">{{ formula }}</code>
    </div>

    <div v-if="lines && lines.length" class="d-flex flex-column ga-1 mb-1">
      <div v-for="(l, i) in lines" :key="i" class="d-flex justify-space-between ga-3 text-body-2">
        <span class="text-medium-emphasis">
          <span v-if="l.op" class="perhitungan-op">{{ l.op }}</span>{{ l.label }}
          <span v-if="l.note" class="d-block text-caption" style="opacity: 0.8">{{ l.note }}</span>
        </span>
        <span class="text-right font-weight-medium flex-shrink-0">{{ l.value }}</span>
      </div>
    </div>

    <v-divider class="my-2" />

    <div class="d-flex flex-column ga-1 text-body-2">
      <div class="d-flex justify-space-between ga-3">
        <span class="text-medium-emphasis">Target</span>
        <span class="text-right flex-shrink-0">{{ fmt(target) }}</span>
      </div>
      <div class="d-flex justify-space-between ga-3">
        <span class="text-medium-emphasis">{{ totalLabel }}</span>
        <span class="text-right font-weight-medium flex-shrink-0">{{ fmt(total) }}</span>
      </div>
      <div class="d-flex justify-space-between ga-3 align-center">
        <span class="text-medium-emphasis">Capaian = {{ fmt(total) }} ÷ {{ fmt(target) }}</span>
        <v-chip size="small" :color="capaianColor" variant="tonal" class="flex-shrink-0">{{ capaian }}%</v-chip>
      </div>
    </div>

    <div v-if="basisNote" class="text-caption text-medium-emphasis mt-3">{{ basisNote }}</div>
  </div>
</template>

<script setup lang="ts">
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
const capaianColor = computed(() => (capaian.value >= 100 ? 'success' : capaian.value >= 75 ? 'warning' : 'error'))
</script>

<style scoped>
.perhitungan-panel {
  background: rgba(var(--v-theme-primary), 0.04);
}
.perhitungan-formula {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  background: rgba(var(--v-theme-primary), 0.08);
  border-radius: 4px;
  padding: 2px 6px;
}
.perhitungan-op {
  display: inline-block;
  width: 14px;
  font-weight: 700;
}
</style>
