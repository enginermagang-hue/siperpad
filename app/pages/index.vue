<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div class="d-flex align-center">
        <v-icon size="36" color="primary" class="mr-3">mdi-view-dashboard</v-icon>
        <h1 class="text-h4 font-weight-medium">Dashboard SiPerPAD</h1>
      </div>
      <div class="d-flex ga-2 flex-wrap">
        <v-select v-model="filterKawasan" :items="kawasanOpts" item-title="label" item-value="value" label="Kawasan" density="compact" variant="outlined" hide-details clearable style="min-width: 180px" placeholder="Semua" @update:model-value="loadRekap" />
        <v-select v-model="tahun" :items="tahunOpts" density="compact" variant="outlined" hide-details style="min-width: 110px" @update:model-value="loadRekap" />
        <v-select v-model="scope" :items="scopeOpts" item-title="label" item-value="value" density="compact" variant="outlined" hide-details style="min-width: 130px" @update:model-value="loadRekap" />
      </div>
    </div>

    <v-row v-if="totals" class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-card flat elevation="2" class="pa-4 text-center">
          <div class="text-caption text-medium-emphasis">Total Target</div>
          <div class="text-h6 font-weight-bold">{{ fmt(totals.totalTarget) }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card flat elevation="2" class="pa-4 text-center">
          <div class="text-caption text-medium-emphasis">Total Realisasi</div>
          <div class="text-h6 font-weight-bold text-primary">{{ fmt(totals.totalRealisasi) }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card flat elevation="2" class="pa-4 text-center">
          <div class="text-caption text-medium-emphasis">Capaian</div>
          <div class="text-h6 font-weight-bold" :class="totals.capaian >= 100 ? 'text-success' : totals.capaian >= 75 ? 'text-warning' : 'text-error'">{{ totals.capaian }}%</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card flat elevation="2" class="pa-4 text-center">
          <div class="text-caption text-medium-emphasis">Selisih</div>
          <div class="text-h6 font-weight-bold" :class="totals.selisih >= 0 ? 'text-success' : 'text-error'">{{ fmt(totals.selisih) }}</div>
        </v-card>
      </v-col>
    </v-row>

    <v-card flat elevation="2" class="mb-6">
      <v-card-title class="d-flex align-center ga-2 flex-wrap">
        <v-icon>mdi-chart-line</v-icon> Realisasi vs Target — {{ scopeLabel }}
        <v-spacer />
        <v-btn variant="tonal" size="small" prepend-icon="mdi-image-outline" :disabled="loadingRekap || !timeseries.length" @click="chartRef?.exportPng()">Ekspor PNG</v-btn>
      </v-card-title>
      <v-card-text>
        <div v-if="loadingRekap" class="text-center py-8 text-medium-emphasis">Memuat grafik...</div>
        <SiperpadChart v-else ref="chartRef" :series="chartSeries" :categories="chartCategories" :height="320" />
      </v-card-text>
    </v-card>

    <v-row>
      <v-col cols="12" md="4">
        <v-card flat elevation="2" class="pa-6 text-center">
          <v-icon size="40" color="primary" class="mb-2">mdi-database</v-icon>
          <div class="text-h6">Database</div>
          <v-chip :color="dbHealthy ? 'success' : 'error'" size="small" class="mt-1">{{ dbStatus }}</v-chip>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card flat elevation="2" class="pa-6 text-center">
          <v-icon size="40" color="primary" class="mb-2">mdi-cloud-sync</v-icon>
          <div class="text-h6">Versi Aplikasi</div>
          <div class="text-body-1 font-weight-medium">0.1.0</div>
          <div class="text-caption text-medium-emphasis">Nuxt 4 + Vuetify 3</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card flat elevation="2" class="pa-6 text-center">
          <v-icon size="40" color="primary" class="mb-2">mdi-folder-link</v-icon>
          <div class="text-h6">Folder Sinkronisasi</div>
          <div class="text-caption text-medium-emphasis">Dropbox ? /siperpad</div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const session = useUserSession()
const dbHealth = await useFetch('/api/health')
const dbHealthy = dbHealth.data.value?.status === 'ok'
const dbStatus = dbHealth.pending.value ? 'Memeriksa...' : dbHealthy ? 'Terhubung' : dbHealth.error.value ? 'Gagal' : 'Tidak diketahui'

const kawasan = ref<{ id: number; kode: string; nama: string }[]>([])
const kawasanOpts = computed(() => kawasan.value.map((k) => ({ label: `${k.kode} — ${k.nama}`, value: k.id })))
const tahun = ref(new Date().getFullYear())
const tahunOpts = [2024, 2025, 2026, 2027]
const scope = ref<'bulanan' | 'triwulan' | 'tahunan'>('bulanan')
const scopeOpts = [
  { label: 'Bulanan', value: 'bulanan' },
  { label: 'Triwulan', value: 'triwulan' },
  { label: 'Tahunan', value: 'tahunan' },
]
const scopeLabel = computed(() => scopeOpts.find((s) => s.value === scope.value)?.label || scope.value)
const filterKawasan = ref<number | null>(null)

const chartRef = ref<{ exportPng: () => Promise<void> } | null>(null)
const loadingRekap = ref(false)
const totals = ref<{ totalTarget: number; totalRealisasi: number; capaian: number; selisih: number } | null>(null)
const timeseries = ref<{ label: string; target: number; realisasi: number; capaian: number }[]>([])

const chartCategories = computed(() => timeseries.value.map((p) => p.label))
const chartSeries = computed(() => [
  { name: 'Target', data: timeseries.value.map((p) => p.target) },
  { name: 'Realisasi', data: timeseries.value.map((p) => p.realisasi) },
])

const { formatRupiah: fmt } = useCurrency()

async function loadKawasan() {
  try {
    const r = await $fetch<{ data: { id: number; kode: string; nama: string }[] }>('/api/kawasan')
    kawasan.value = r.data
  } catch {}
}
async function loadRekap() {
  loadingRekap.value = true
  try {
    const q: Record<string, string> = { tahun: String(tahun.value), scope: scope.value }
    if (filterKawasan.value) q.kawasan_id = String(filterKawasan.value)
    const r = await $fetch<{ totals: typeof totals.value; timeseries: typeof timeseries.value }>('/api/laporan/rekap', { query: q })
    totals.value = r.totals
    timeseries.value = r.timeseries
  } catch {} finally { loadingRekap.value = false }
}

onMounted(async () => { await loadKawasan(); await loadRekap() })
</script>
