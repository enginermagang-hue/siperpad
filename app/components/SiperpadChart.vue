<template>
  <ClientOnly fallback-tag="div" fallback="Memuat grafik...">
    <component
      :is="VueApexCharts"
      v-if="VueApexCharts"
      ref="chartRef"
      :options="chartOptions"
      :series="series"
      :height="height"
    />
    <div v-else class="text-center py-8 text-medium-emphasis">Memuat grafik...</div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { shallowRef, onMounted } from 'vue'

const props = withDefaults(
  defineProps<{
    series: { name: string; data: number[] }[]
    categories: string[]
    height?: number | string
  }>(),
  { height: 320 },
)

const VueApexCharts = shallowRef<unknown>(null)
const chartRef = shallowRef<unknown>(null)

onMounted(async () => {
  // client-only import — hindari bundle SSR Windows ESM
  const mod = await import('vue3-apexcharts')
  VueApexCharts.value = (mod as { default: unknown }).default ?? mod
})

const chartOptions = computed(() => ({
  chart: {
    type: 'line' as const,
    toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
    zoom: { enabled: false },
    fontFamily: 'Inter, sans-serif',
  },
  stroke: { width: [3, 3], curve: 'smooth' as const },
  markers: { size: 4 },
  dataLabels: { enabled: false },
  xaxis: { categories: props.categories },
  yaxis: { labels: { formatter: (v: number) => Number(v).toLocaleString('id-ID') } },
  tooltip: { shared: true, y: { formatter: (v: number) => Number(v).toLocaleString('id-ID') } },
  legend: { position: 'top' as const },
  colors: ['#1976D2', '#43A047'],
}))

// expose export helper for parent — ponytail: add PNG/SVG export via chart.dataURI when needed
defineExpose({
  exportPng: async () => {
    const el = chartRef.value as { chart?: { dataURI: () => Promise<{ imgURI: string }> } } | null
    if (el?.chart?.dataURI) {
      const { imgURI } = await el.chart.dataURI()
      const a = document.createElement('a')
      a.href = imgURI
      a.download = `chart-${Date.now()}.png`
      a.click()
    }
  },
})
</script>
