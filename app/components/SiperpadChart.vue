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
    <div v-else class="text-center py-8 text-muted-foreground-1">Memuat grafik...</div>
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

// ApexCharts merender SVG dengan warna sendiri (tidak ikut token CSS), jadi
// warna teks/grid harus diberikan eksplisit dan ikut berubah saat tema berganti.
const { isDark } = useTheme()

const chartTheme = computed(() =>
  isDark.value
    ? {
        // Selaras dengan palet dark di main.css (oklch 260.4 hue, chroma 0.031):
        // teks L 88%, grid L 36.5% (sama dengan --card-line).
        foreColor: '#cfd6e0',
        grid: '#353f4f',
        tooltipTheme: 'dark' as const,
      }
    : {
        foreColor: '#374151', // gray-700
        grid: '#e5e7eb',      // gray-200
        tooltipTheme: 'light' as const,
      },
)

const chartOptions = computed(() => {
  const t = chartTheme.value
  const base = {
    chart: {
      type: props.type === 'area' ? ('area' as const) : (props.type as 'line' | 'bar' | 'pie' | 'donut'),
      stacked: props.stacked,
      toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
      zoom: { enabled: false },
      fontFamily: 'Inter, sans-serif',
      foreColor: t.foreColor,
    },
    stroke: { width: props.type === 'bar' ? 0 : [3, 3], curve: 'smooth' as const },
    markers: { size: props.type === 'bar' ? 0 : 4 },
    dataLabels: { enabled: false },
    grid: { borderColor: t.grid, strokeDashArray: 4 },
    plotOptions: {
      bar: { horizontal: props.horizontal, borderRadius: 4, columnWidth: '55%' },
    },
    legend: { position: (isPie.value ? 'bottom' : 'top') as 'top' | 'bottom' },
    tooltip: { theme: t.tooltipTheme },
    colors: props.colors || ['#1976D2', '#43A047', '#F9A825', '#E53935', '#8E24AA', '#00897B', '#6D4C41', '#546E7A'],
  }
  if (isPie.value) {
    return { ...base, labels: props.categories }
  }
  return {
    ...base,
    xaxis: { categories: props.categories },
    yaxis: { labels: { formatter: (v: number) => Number(v).toLocaleString('id-ID') } },
    tooltip: {
      ...base.tooltip,
      shared: true,
      y: { formatter: (v: number) => Number(v).toLocaleString('id-ID') },
    },
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
