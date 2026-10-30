<template>
  <div>
    <div class="mb-4">
      <h1 class="font-bold text-[22px] tracking-wide text-foreground">DASHBOARD UTAMA</h1>
      <div class="text-sm text-muted-foreground-2">
        Rekapitulasi PAD Kawasan Wisata Kampung Seni Flobamorata &amp; Pantai Lasiana
      </div>
      <hr class="mt-3 border-line-2" />
    </div>

    <!-- Filter bar -->
    <div
      class="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-card-line bg-card p-3"
    >
      <NuxtLink
        v-if="isUser"
        to="/pad"
        class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium
               text-primary-foreground hover:bg-primary-hover focus:outline-hidden focus:bg-primary-focus"
      >
        <Plus class="shrink-0 size-4" aria-hidden="true" />
        Tambah Data Realisasi
      </NuxtLink>

      <div class="flex flex-wrap items-center gap-2" :class="isUser ? 'ms-auto' : 'flex-1'">
        <div class="min-w-[170px]" :class="filterGrow">
          <AppSelect
            v-model="filterKawasan"
            :items="kawasanOpts"
            placeholder="Kawasan: Semua"
            clearable
            @update:model-value="loadRekap"
          />
        </div>
        <div class="min-w-[110px]" :class="filterGrow">
          <AppSelect v-model="tahun" :items="tahunOpts" @update:model-value="loadRekap" />
        </div>
        <div class="min-w-[175px]" :class="filterGrow">
          <AppSelect
            v-model="bulan"
            :items="bulanOpts"
            placeholder="Pilih Bulan/Minggu"
            @update:model-value="loadRekap"
          />
        </div>
        <div class="min-w-[125px]" :class="filterGrow">
          <AppSelect v-model="scope" :items="scopeOpts" @update:model-value="loadRekap" />
        </div>
        <div class="relative min-w-[160px]" :class="filterGrow">
          <Search
            class="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground-1"
            aria-hidden="true"
          />
          <input
            v-model="pencarian"
            type="text"
            placeholder="Pencarian"
            class="w-full rounded-lg border border-layer-line bg-layer py-2 ps-8 pe-3 text-sm text-layer-foreground
                   focus:border-primary-focus focus:ring-primary-focus"
          />
        </div>
      </div>
    </div>

    <!-- KPI -->
    <div v-if="totals" class="mb-4 grid grid-cols-12 gap-4">
      <div class="col-span-12 sm:col-span-6 md:col-span-3">
        <div class="rounded-lg border border-card-line bg-card p-4 text-center">
          <div class="text-xs text-muted-foreground-1">Target Penerimaan {{ tahun }}</div>
          <div class="text-lg font-bold text-foreground">{{ fmt(totals.totalTarget) }}</div>
        </div>
      </div>
      <div class="col-span-12 sm:col-span-6 md:col-span-3">
        <div class="rounded-lg border border-card-line bg-card p-4 text-center">
          <div class="text-xs text-muted-foreground-1">Realisasi s/d {{ bulanLabel }}</div>
          <div class="text-lg font-bold text-primary">{{ fmt(kumulatif?.kumulatif ?? 0) }}</div>
        </div>
      </div>
      <div class="col-span-12 sm:col-span-6 md:col-span-3">
        <div class="rounded-lg border border-card-line bg-card p-4 text-center">
          <div class="text-xs text-muted-foreground-1">% Capai</div>
          <div class="text-lg font-bold" :class="capaianClass">
            {{ capaianKumulatif == null ? '-' : `${capaianKumulatif}%` }}
          </div>
        </div>
      </div>
      <div class="col-span-12 sm:col-span-6 md:col-span-3">
        <div class="rounded-lg border border-card-line bg-card p-4 text-center">
          <div class="text-xs text-muted-foreground-1">
            Realisasi {{ bulanLabel }} vs {{ banding?.a?.label ?? '-' }}
          </div>
          <div
            class="text-lg font-bold"
            :class="(banding?.total?.selisih ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
          >
            {{ fmt(banding?.total?.selisih ?? 0) }}
            <span class="text-xs">
              ({{ banding?.total?.persen == null ? '-' : `${banding?.total?.persen}%` }})
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <div class="col-span-12 md:col-span-7">
        <div class="mb-4 rounded-lg border border-card-line bg-card">
          <div class="flex flex-wrap items-center gap-2 border-b border-card-divider px-4 py-3">
            <ChartLine class="shrink-0 size-4 text-muted-foreground-1" aria-hidden="true" />
            <span class="font-medium text-foreground">Realisasi vs Target — {{ scopeLabel }}</span>
            <button
              type="button"
              class="ms-auto inline-flex items-center gap-1.5 rounded-lg border border-layer-line px-2.5 py-1.5
                     text-xs font-medium text-primary hover:bg-layer-hover
                     focus:outline-hidden focus:bg-layer-focus
                     disabled:opacity-50 disabled:pointer-events-none"
              :disabled="loadingRekap || !timeseries.length"
              @click="chartRef?.exportPng()"
            >
              <Image class="shrink-0 size-3.5" aria-hidden="true" />
              Ekspor PNG
            </button>
          </div>
          <div class="p-4">
            <div v-if="loadingRekap" class="py-8 text-center text-muted-foreground-1">Memuat grafik...</div>
            <SiperpadChart v-else ref="chartRef" :series="chartSeries" :categories="chartCategories" :height="300" />
          </div>
        </div>
      </div>

      <div class="col-span-12 md:col-span-5">
        <div class="mb-4 rounded-lg border border-card-line bg-card">
          <div class="flex items-center gap-2 border-b border-card-divider px-4 py-3">
            <CalendarDays class="shrink-0 size-4 text-muted-foreground-1" aria-hidden="true" />
            <span class="font-medium text-foreground">Tren Mingguan {{ bulanLabel }}</span>
          </div>
          <div class="p-4">
            <SiperpadChart
              :series="mingguanSeries"
              :categories="['Minggu I', 'Minggu II', 'Minggu III', 'Minggu IV']"
              :height="300"
              type="bar"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <div class="col-span-12 md:col-span-7">
        <div class="mb-4 rounded-lg border border-card-line bg-card">
          <div class="flex flex-wrap items-center gap-2 border-b border-card-divider px-4 py-3">
            <Trophy class="shrink-0 size-4 text-muted-foreground-1" aria-hidden="true" />
            <span class="font-medium text-foreground">
              Top Kontributor PAD — {{ bulanLabel }} {{ tahun }}
            </span>
            <div class="ms-auto"><ViewModeToggle v-model="mode" /></div>
          </div>
          <div class="p-4">
            <div v-if="!topKontributor.length" class="py-4 text-center text-muted-foreground-1">
              Belum ada realisasi disetujui pada periode ini
            </div>

            <div v-else-if="mode === 'table'" class="overflow-x-auto">
              <table class="min-w-full divide-y divide-table-line text-sm">
                <thead>
                  <tr class="text-start text-xs uppercase tracking-wide text-muted-foreground-1">
                    <th class="w-10 px-2 py-2 text-start font-medium">#</th>
                    <th class="px-2 py-2 text-start font-medium">Pos Penerimaan</th>
                    <th class="px-2 py-2 text-start font-medium">Kawasan</th>
                    <th class="px-2 py-2 text-end font-medium">Nilai</th>
                    <th class="px-2 py-2 text-end font-medium">Kontribusi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-table-line">
                  <tr v-for="(t, i) in topKontributor" :key="t.jenis_id">
                    <td class="px-2 py-2 text-muted-foreground-1">{{ i + 1 }}</td>
                    <td class="px-2 py-2 text-foreground">{{ t.kode }} — {{ t.nama }}</td>
                    <td class="px-2 py-2">
                      <span class="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs text-surface-foreground">
                        {{ t.kawasan_kode }}
                      </span>
                    </td>
                    <td class="px-2 py-2 text-end text-foreground">{{ fmt(t.nilai) }}</td>
                    <td class="px-2 py-2 text-end">
                      <span class="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {{ t.persen }}%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else-if="mode === 'list'">
              <RecordCard
                v-for="(t, i) in topKontributor"
                :key="t.jenis_id"
                :title="`${i + 1}. ${t.kode} — ${t.nama}`"
                :subtitle="t.kawasan_kode"
                :fields="[
                  { label: 'Nilai', value: fmt(t.nilai), class: 'text-end font-medium' },
                  { label: 'Kontribusi', value: t.persen + '%', class: 'text-end' },
                ]"
              />
            </div>

            <ul v-else class="divide-y divide-table-line">
              <li
                v-for="(t, i) in topKontributor"
                :key="t.jenis_id"
                class="flex items-center gap-2 py-2"
              >
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm text-foreground">{{ i + 1 }}. {{ t.kode }} — {{ t.nama }}</span>
                  <span class="block truncate text-xs text-muted-foreground-1">{{ t.kawasan_kode }}</span>
                </span>
                <span class="shrink-0 text-sm font-medium text-foreground">{{ fmt(t.nilai) }}</span>
                <span class="shrink-0 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                  {{ t.persen }}%
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="col-span-12 md:col-span-5">
        <div class="mb-4 rounded-lg border border-card-line bg-card">
          <div class="flex items-center gap-2 border-b border-card-divider px-4 py-3">
            <ChartPie class="shrink-0 size-4 text-muted-foreground-1" aria-hidden="true" />
            <span class="font-medium text-foreground">Komposisi Kontributor</span>
          </div>
          <div class="p-4">
            <SiperpadChart
              v-if="topKontributor.length"
              :series="topKontributor.map((t) => t.nilai)"
              :categories="topKontributor.map((t) => t.nama)"
              :height="300"
              type="donut"
              rupiah
            />
            <div v-else class="py-4 text-center text-muted-foreground-1">Tidak ada data</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <div class="col-span-12 md:col-span-4">
        <div class="rounded-lg border border-card-line bg-card p-6 text-center">
          <Database class="mx-auto mb-2 size-10 text-primary" aria-hidden="true" />
          <div class="text-base font-medium text-foreground">Database</div>
          <span
            class="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
            :class="dbHealthy
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'"
          >
            {{ dbStatus }}
          </span>
        </div>
      </div>
      <div class="col-span-12 md:col-span-4">
        <div class="rounded-lg border border-card-line bg-card p-6 text-center">
          <RefreshCw class="mx-auto mb-2 size-10 text-primary" aria-hidden="true" />
          <div class="text-base font-medium text-foreground">Versi Aplikasi</div>
          <div class="text-base font-medium text-foreground">0.1.0</div>
          <div class="text-xs text-muted-foreground-1">Nuxt 4 + Preline UI</div>
        </div>
      </div>
      <div class="col-span-12 md:col-span-4">
        <div class="rounded-lg border border-card-line bg-card p-6 text-center">
          <FolderSync class="mx-auto mb-2 size-10 text-primary" aria-hidden="true" />
          <div class="text-base font-medium text-foreground">Folder Sinkronisasi</div>
          <div class="text-xs text-muted-foreground-1">Dropbox /siperpad</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CalendarDays,
  ChartLine,
  ChartPie,
  Database,
  FolderSync,
  Image,
  Plus,
  RefreshCw,
  Search,
  Trophy,
} from 'lucide-vue-next'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { mode } = useViewMode('dashboard-top')

const session = useUserSession()
const isUser = computed(() => String(session.user.value?.role || '') === 'user')
const filterGrow = computed(() => (isUser.value ? '' : 'flex-1'))
const dbHealth = await useFetch('/api/health')
const dbHealthy = dbHealth.data.value?.status === 'ok'
const dbStatus = dbHealth.pending.value
  ? 'Memeriksa...'
  : dbHealthy
    ? 'Terhubung'
    : dbHealth.error.value
      ? 'Gagal'
      : 'Tidak diketahui'

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

const capaianKumulatif = computed<number | null>(() => {
  const t = totals.value?.totalTarget ?? 0
  if (!t) return null
  return Math.round(((kumulatif.value?.kumulatif ?? 0) / t) * 10000) / 100
})

const capaianClass = computed(() => {
  if (capaianKumulatif.value == null) return 'text-muted-foreground-1'
  if (capaianKumulatif.value >= 100) return 'text-emerald-600 dark:text-emerald-400'
  if (capaianKumulatif.value >= 75) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
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
