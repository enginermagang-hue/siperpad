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
    series: { name: string; data: number[] }[] | number[]
    categories: string[]
    height?: number | string
    type?: 'line' | 'bar' | 'area' | 'pie' | 'donut'
    colors?: string[]
    stacked?: boolean
    horizontal?: boolean
  }>(),
  { height: 320, type: 'line', stacked: false, horizontal: false },
)

const VueApexCharts = shallowRef<unknown>(null)
const chartRef = shallowRef<unknown>(null)

onMounted(async () => {
  // client-only import — hindari bundle SSR Windows ESM
  const mod = await import('vue3-apexcharts')
  VueApexCharts.value = (mod as { default: unknown }).default ?? mod
})

const isPie = computed(() => props.type === 'pie' || props.type === 'donut')

const chartOptions = computed(() => {
  const base = {
    chart: {
      type: props.type === 'area' ? ('area' as const) : (props.type as 'line' | 'bar' | 'pie' | 'donut'),
      stacked: props.stacked,
      toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
      zoom: { enabled: false },
      fontFamily: 'Inter, sans-serif',
    },
    stroke: { width: props.type === 'bar' ? 0 : [3, 3], curve: 'smooth' as const },
    markers: { size: props.type === 'bar' ? 0 : 4 },
    dataLabels: { enabled: false },
    plotOptions: {
      bar: { horizontal: props.horizontal, borderRadius: 4, columnWidth: '55%' },
    },
    legend: { position: (isPie.value ? 'bottom' : 'top') as 'top' | 'bottom' },
    colors: props.colors || ['#1976D2', '#43A047', '#F9A825', '#E53935', '#8E24AA', '#00897B', '#6D4C41', '#546E7A'],
  }
  if (isPie.value) {
    return { ...base, labels: props.categories }
  }
  return {
    ...base,
    xaxis: { categories: props.categories },
    yaxis: { labels: { formatter: (v: number) => Number(v).toLocaleString('id-ID') } },
    tooltip: { shared: true, y: { formatter: (v: number) => Number(v).toLocaleString('id-ID') } },
  }
})

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
