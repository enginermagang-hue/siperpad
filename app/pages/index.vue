<template>
  <div>
    <div class="mb-4">
      <h1 class="font-weight-bold" style="font-size: 22px; letter-spacing: 0.02em" :style="{ color: isDark ? '#f1f5f9' : '#0f172a' }">DASHBOARD UTAMA</h1>
      <div class="text-body-2" :style="{ color: isDark ? '#94a3b8' : '#475569' }">Rekapitulasi PAD Kawasan Wisata Kampung Seni Flobamorata & Pantai Lasiana</div>
      <v-divider class="mt-3" />
    </div>

    <v-card flat class="mb-4 pa-3 d-flex align-center flex-wrap ga-3" :style="{ border: isDark ? '1px solid #334155' : '1px solid #e5e7eb', borderRadius: '10px', background: isDark ? '#1e293b' : '#fff' }">
      <v-btn color="primary" prepend-icon="mdi-plus" to="/entri-mingguan">Tambah Data Realisasi</v-btn>
      <v-spacer />
      <div class="d-flex ga-2 flex-wrap align-center">
        <v-select v-model="filterKawasan" :items="kawasanOpts" item-title="label" item-value="value" label="Kawasan" density="compact" variant="outlined" hide-details clearable style="min-width: 170px" placeholder="Semua" @update:model-value="loadRekap" />
        <v-select v-model="tahun" :items="tahunOpts" density="compact" variant="outlined" hide-details style="min-width: 110px" label="Tahun" @update:model-value="loadRekap" />
        <v-select v-model="bulan" :items="bulanOpts" item-title="label" item-value="value" label="Pilih Bulan/Minggu" density="compact" variant="outlined" hide-details style="min-width: 175px" @update:model-value="loadRekap" />
        <v-select v-model="scope" :items="scopeOpts" item-title="label" item-value="value" density="compact" variant="outlined" hide-details style="min-width: 125px" @update:model-value="loadRekap" />
        <v-text-field v-model="pencarian" density="compact" variant="outlined" hide-details placeholder="Pencarian" style="min-width: 160px" prepend-inner-icon="mdi-magnify" clearable />
      </div>
    </v-card>

    <!-- Anomali target -->
    <v-alert v-if="anomali.length" type="warning" variant="tonal" class="mb-4" prominent>
      <div class="font-weight-bold mb-1">Peringatan Anomali Target ({{ anomali.length }}) — perlu konfirmasi Bendahara Penerimaan</div>
      <div v-for="a in anomali" :key="a.jenis_id" class="text-body-2">
        {{ a.kode }} — {{ a.nama }}: target induk {{ fmt(a.nilai_induk) }} ≠ jumlah anak {{ fmt(a.jumlah_anak) }}
        <b>(selisih {{ fmt(a.selisih) }})</b>
      </div>
    </v-alert>

    <!-- KPI -->
    <v-row v-if="totals" class="mb-2">
      <v-col cols="12" sm="6" md="3">
        <v-card flat elevation="0" class="pa-4 text-center border border-thin">
          <div class="text-caption text-medium-emphasis">Target Penerimaan {{ tahun }}</div>
          <div class="text-h6 font-weight-bold">{{ fmt(totals.totalTarget) }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card flat elevation="0" class="pa-4 text-center border border-thin">
          <div class="text-caption text-medium-emphasis">Realisasi s/d {{ bulanLabel }}</div>
          <div class="text-h6 font-weight-bold text-primary">{{ fmt(kumulatif?.kumulatif ?? 0) }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card flat elevation="0" class="pa-4 text-center border border-thin">
          <div class="text-caption text-medium-emphasis">% Capai</div>
          <div class="text-h6 font-weight-bold" :class="capaianKumulatif == null ? 'text-medium-emphasis' : capaianKumulatif >= 100 ? 'text-success' : capaianKumulatif >= 75 ? 'text-warning' : 'text-error'">{{ capaianKumulatif == null ? '-' : `${capaianKumulatif}%` }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card flat elevation="0" class="pa-4 text-center border border-thin">
          <div class="text-caption text-medium-emphasis">Realisasi {{ bulanLabel }} vs {{ banding?.a?.label ?? '-' }}</div>
          <div class="text-h6 font-weight-bold" :class="(banding?.total?.selisih ?? 0) >= 0 ? 'text-success' : 'text-error'">
            {{ fmt(banding?.total?.selisih ?? 0) }}
            <span class="text-caption">({{ banding?.total?.persen == null ? '-' : `${banding?.total?.persen}%` }})</span>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="7">
        <v-card flat elevation="0" class="mb-4  border border-thin">
          <v-card-title class="d-flex align-center ga-2 flex-wrap">
            <v-icon>mdi-chart-line</v-icon> Realisasi vs Target — {{ scopeLabel }}
            <v-spacer />
            <v-btn variant="tonal" size="small" prepend-icon="mdi-image-outline" :disabled="loadingRekap || !timeseries.length" @click="chartRef?.exportPng()">Ekspor PNG</v-btn>
          </v-card-title>
          <v-card-text>
            <div v-if="loadingRekap" class="text-center py-8 text-medium-emphasis">Memuat grafik...</div>
            <SiperpadChart v-else ref="chartRef" :series="chartSeries" :categories="chartCategories" :height="300" />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="5">
        <v-card flat elevation="0" class="mb-4 border border-thin">
          <v-card-title class="d-flex align-center ga-2"><v-icon>mdi-calendar-week</v-icon> Tren Mingguan {{ bulanLabel }}</v-card-title>
          <v-card-text>
            <SiperpadChart :series="mingguanSeries" :categories="['Minggu I', 'Minggu II', 'Minggu III', 'Minggu IV']" :height="300" type="bar" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="7">
        <v-card flat elevation="0" class="mb-4 border border-thin">
          <v-card-title class="d-flex align-center ga-2"><v-icon>mdi-trophy</v-icon> Top Kontributor PAD — {{ bulanLabel }} {{ tahun }}</v-card-title>
          <v-card-text>
            <div v-if="!topKontributor.length" class="text-medium-emphasis py-4 text-center">Belum ada realisasi disetujui pada periode ini</div>
            <v-table v-else density="comfortable">
              <thead><tr><th style="width:40px">#</th><th>Pos Penerimaan</th><th>Kawasan</th><th class="text-right">Nilai</th><th class="text-right">Kontribusi</th></tr></thead>
              <tbody>
                <tr v-for="(t, i) in topKontributor" :key="t.jenis_id">
                  <td>{{ i + 1 }}</td>
                  <td>{{ t.kode }} — {{ t.nama }}</td>
                  <td><v-chip size="small" variant="tonal">{{ t.kawasan_kode }}</v-chip></td>
                  <td class="text-right">{{ fmt(t.nilai) }}</td>
                  <td class="text-right"><v-chip size="small" color="primary" variant="tonal">{{ t.persen }}%</v-chip></td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="5">
        <v-card flat elevation="0" class="mb-4 border border-thin">
          <v-card-title class="d-flex align-center ga-2"><v-icon>mdi-chart-donut</v-icon> Komposisi Kontributor</v-card-title>
          <v-card-text>
            <SiperpadChart v-if="topKontributor.length" :series="topKontributor.map((t) => t.nilai)" :categories="topKontributor.map((t) => t.nama)" :height="300" type="donut" />
            <div v-else class="text-medium-emphasis py-4 text-center">Tidak ada data</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="4">
        <v-card flat elevation="0" class="pa-6 text-center border border-thin">
          <v-icon size="40" color="primary" class="mb-2">mdi-database</v-icon>
          <div class="text-h6">Database</div>
          <v-chip :color="dbHealthy ? 'success' : 'error'" size="small" class="mt-1">{{ dbStatus }}</v-chip>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card flat elevation="0" class="pa-6 text-center border border-thin">
          <v-icon size="40" color="primary" class="mb-2">mdi-cloud-sync</v-icon>
          <div class="text-h6">Versi Aplikasi</div>
          <div class="text-body-1 font-weight-medium">0.1.0</div>
          <div class="text-caption text-medium-emphasis">Nuxt 4 + Vuetify 3</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card flat elevation="0" class="pa-6 text-center border border-thin">
          <v-icon size="40" color="primary" class="mb-2">mdi-folder-link</v-icon>
          <div class="text-h6">Folder Sinkronisasi</div>
          <div class="text-caption text-medium-emphasis">Dropbox /siperpad</div>
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

const { isDark } = useDarkMode()
const kawasan = ref<{ id: number; kode: string; nama: string }[]>([])
const kawasanOpts = computed(() => kawasan.value.map((k) => ({ label: `${k.kode} — ${k.nama}`, value: k.id })))
const tahunState = useState<number>('tahun', () => new Date().getFullYear())
const tahun = tahunState
const pencarian = ref('')
const tahunOpts = [2024, 2025, 2026, 2027]
const bulan = ref(new Date().getMonth() + 1)
const bulanOpts = [
  { label: 'Januari', value: 1 }, { label: 'Februari', value: 2 }, { label: 'Maret', value: 3 }, { label: 'April', value: 4 },
  { label: 'Mei', value: 5 }, { label: 'Juni', value: 6 }, { label: 'Juli', value: 7 }, { label: 'Agustus', value: 8 },
  { label: 'September', value: 9 }, { label: 'Oktober', value: 10 }, { label: 'November', value: 11 }, { label: 'Desember', value: 12 },
]
const scope = ref<'bulanan' | 'triwulan' | 'tahunan'>('bulanan')
const scopeOpts = [
  { label: 'Bulanan', value: 'bulanan' },
  { label: 'Triwulan', value: 'triwulan' },
  { label: 'Tahunan', value: 'tahunan' },
]
const scopeLabel = computed(() => scopeOpts.find((s) => s.value === scope.value)?.label || scope.value)
const bulanLabel = computed(() => bulanOpts.find((b) => b.value === bulan.value)?.label || String(bulan.value))
const filterKawasan = ref<number | null>(null)

const chartRef = ref<{ exportPng: () => Promise<void> } | null>(null)
const loadingRekap = ref(false)
const totals = ref<{ totalTarget: number; totalRealisasi: number; capaian: number | null; selisih: number } | null>(null)
const timeseries = ref<{ label: string; target: number; realisasi: number; capaian: number }[]>([])
const kumulatif = ref<{ kumulatif: number; bulanIni: number; sBelum: number } | null>(null)
const topKontributor = ref<{ jenis_id: number; kode: string; nama: string; kawasan_kode: string; kawasan_nama: string; nilai: number; persen: number }[]>([])
const banding = ref<{ a: { label: string }; b: { label: string }; total: { a: number; b: number; selisih: number; persen: number | null } } | null>(null)
const mingguan = ref<{ minggu: number; nilai: number }[]>([])
const anomali = ref<{ jenis_id: number; kode: string; nama: string; nilai_induk: number; jumlah_anak: number; selisih: number }[]>([])

const capaianKumulatif = computed<number | null>(() => {
  const t = totals.value?.totalTarget ?? 0
  if (!t) return null
  return Math.round(((kumulatif.value?.kumulatif ?? 0) / t) * 10000) / 100
})

const chartCategories = computed(() => timeseries.value.map((p) => p.label))
const chartSeries = computed(() => [
  { name: 'Target', data: timeseries.value.map((p) => p.target) },
  { name: 'Realisasi', data: timeseries.value.map((p) => p.realisasi) },
])
const mingguanSeries = computed(() => [{ name: 'Realisasi', data: mingguan.value.map((m) => m.nilai) }])

const { formatRupiah: fmt } = useCurrency()

async function loadKawasan() {
  try {
    const r = await $fetch<{ data: { id: number; kode: string; nama: string }[] }>('/api/kawasan')
    kawasan.value = r.data
  } catch {}
}
async function loadAnomali() {
  try {
    const r = await $fetch<{ data: typeof anomali.value }>('/api/target/anomali', { query: { tahun: String(tahun.value) } })
    anomali.value = r.data
  } catch {}
}
async function loadRekap() {
  loadingRekap.value = true
  try {
    const q: Record<string, string> = { tahun: String(tahun.value), scope: scope.value, bulan: String(bulan.value) }
    if (filterKawasan.value) q.kawasan_id = String(filterKawasan.value)
    const r = await $fetch<{
      totals: typeof totals.value
      timeseries: typeof timeseries.value
      kumulatif: typeof kumulatif.value
      topKontributor: typeof topKontributor.value
      banding: typeof banding.value
    }>('/api/laporan/rekap', { query: q })
    totals.value = r.totals
    timeseries.value = r.timeseries
    kumulatif.value = r.kumulatif
    topKontributor.value = r.topKontributor
    banding.value = r.banding
    await loadMingguanData()
    await loadAnomali()
  } catch {} finally { loadingRekap.value = false }
}

// Tren mingguan bulan terpilih: ambil dari grid endpoint (kawasan tunggal) atau
// agregasi ringkasan. Bila "semua kawasan", jumlahkan dua kawasan.
async function loadMingguanData() {
  const ids = filterKawasan.value ? [filterKawasan.value] : kawasan.value.map((k) => k.id)
  const acc = [0, 0, 0, 0]
  let ok = false
  for (const id of ids) {
    try {
      const r = await $fetch<{ meta: { locked: boolean }; data: { minggu: { minggu: number; nilai: number }[] }[] }>('/api/realisasi/grid', {
        query: { kawasan_id: String(id), tahun: String(tahun.value), bulan: String(bulan.value) },
      })
      for (const row of r.data) for (const m of row.minggu) acc[m.minggu - 1] = (acc[m.minggu - 1] ?? 0) + m.nilai
      ok = true
    } catch {}
  }
  mingguan.value = ok ? acc.map((v, i) => ({ minggu: i + 1, nilai: v })) : []
}

onMounted(async () => { await loadKawasan(); await loadRekap() })
</script>
