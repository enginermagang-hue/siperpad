<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div class="d-flex align-center">
        <v-icon size="36" color="primary" class="mr-3">mdi-chart-bar</v-icon>
        <h1 class="text-h4 font-weight-medium">Laporan Rekap PAD</h1>
      </div>
      <div v-if="isAdminOrKepala" class="d-flex ga-2">
        <v-btn :loading="exporting === 'csv'" variant="tonal" prepend-icon="mdi-file-delimited" @click="doExport('csv')">CSV</v-btn>
        <v-btn :loading="exporting === 'xlsx'" variant="tonal" color="success" prepend-icon="mdi-microsoft-excel" @click="doExport('xlsx')">XLSX</v-btn>
        <v-btn :loading="exporting === 'pdf'" color="primary" prepend-icon="mdi-file-pdf-box" @click="doExport('pdf')">PDF</v-btn>
      </div>
    </div>

    <v-card flat elevation="2" class="mb-4">
      <v-card-text class="pb-0">
        <div class="d-flex flex-wrap ga-3 mb-2">
          <v-select v-model="filterKawasan" :items="kawasanOpts" item-title="label" item-value="value" label="Kawasan" density="compact" variant="outlined" hide-details clearable style="max-width: 240px" placeholder="Semua kawasan" @update:model-value="load" />
          <v-select v-model="tahun" :items="tahunOpts" label="Tahun" density="compact" variant="outlined" hide-details style="max-width: 120px" @update:model-value="load" />
          <v-select v-model="bulan" :items="bulanOpts" item-title="label" item-value="value" label="Bulan" density="compact" variant="outlined" hide-details style="max-width: 160px" @update:model-value="load" />
          <v-text-field v-model="q" density="compact" variant="outlined" placeholder="Cari kode / nama..." prepend-inner-icon="mdi-magnify" hide-details clearable style="max-width: 300px" />
        </div>
      </v-card-text>
    </v-card>

    <v-row v-if="totals" class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-card flat elevation="2" class="pa-4 text-center"><div class="text-caption text-medium-emphasis">Total Target</div><div class="text-h6 font-weight-bold">{{ fmt(totals.totalTarget) }}</div></v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card flat elevation="2" class="pa-4 text-center"><div class="text-caption text-medium-emphasis">Total Realisasi</div><div class="text-h6 font-weight-bold text-primary">{{ fmt(totals.totalRealisasi) }}</div></v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card flat elevation="2" class="pa-4 text-center"><div class="text-caption text-medium-emphasis">Capaian</div><div class="text-h6 font-weight-bold" :class="totals.capaian >= 100 ? 'text-success' : totals.capaian >= 75 ? 'text-warning' : 'text-error'">{{ totals.capaian }}%</div></v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card flat elevation="2" class="pa-4 text-center"><div class="text-caption text-medium-emphasis">Selisih</div><div class="text-h6 font-weight-bold" :class="totals.selisih >= 0 ? 'text-success' : 'text-error'">{{ fmt(totals.selisih) }}</div></v-card>
      </v-col>
    </v-row>

    <v-card flat elevation="2">
      <v-table density="default">
        <thead><tr><th>Kode</th><th>Jenis Retribusi</th><th>Kawasan</th><th class="text-right">Target</th><th class="text-right">Realisasi</th><th class="text-right">Capaian</th><th class="text-right">Selisih</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="text-center py-6">Memuat...</td></tr>
          <tr v-else-if="!filtered.length"><td colspan="7" class="text-center py-6 text-medium-emphasis">Belum ada data</td></tr>
          <tr v-for="r in paginated" :key="r.id">
            <td class="font-weight-medium">{{ r.kode || '-' }}</td>
            <td>{{ r.nama }}</td>
            <td><v-chip size="small" variant="tonal">{{ r.kawasan_kode }} — {{ r.kawasan_nama }}</v-chip></td>
            <td class="text-right">{{ fmt(r.target) }}</td>
            <td class="text-right">{{ fmt(r.realisasi) }}</td>
            <td class="text-right"><v-chip :color="r.capaian >= 100 ? 'success' : r.capaian >= 75 ? 'warning' : 'error'" size="small">{{ r.capaian }}%</v-chip></td>
            <td class="text-right" :class="r.selisih >= 0 ? 'text-success' : 'text-error'">{{ fmt(r.selisih) }}</td>
          </tr>
        </tbody>
      </v-table>
      <v-divider v-if="total" />
      <div v-if="total" class="d-flex align-center justify-space-between flex-wrap ga-3 px-4 py-3">
        <div class="d-flex align-center ga-2 text-body-2 text-medium-emphasis">
          <span>Menampilkan {{ from }}–{{ to }} dari {{ total }} data</span>
          <v-select v-model="perPage" :items="[5, 10, 25, 50]" density="compact" variant="outlined" hide-details style="max-width: 90px" />
          <span>per halaman</span>
        </div>
        <v-pagination v-if="pageCount > 1" v-model="currentPage" :length="pageCount" :total-visible="5" density="compact" />
      </div>
    </v-card>

    <v-snackbar v-model="snack.show" :color="snack.color" timeout="3000">{{ snack.msg }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

type RekapRow = { id: number; kode: string; nama: string; level: number; urutan: number; kawasan_id: number; kawasan_kode: string; kawasan_nama: string; target: number; realisasi: number; capaian: number; selisih: number }

const session = useUserSession()
const role = computed(() => String(session.user.value?.role || ''))
const isAdminOrKepala = computed(() => ['admin', 'kepala'].includes(role.value))

const kawasan = ref<{ id: number; kode: string; nama: string }[]>([])
const kawasanOpts = computed(() => kawasan.value.map((k) => ({ label: `${k.kode} — ${k.nama}`, value: k.id })))
const filterKawasan = ref<number | null>(null)
const tahun = ref(new Date().getFullYear())
const tahunOpts = [2024, 2025, 2026, 2027]
const bulan = ref(new Date().getMonth() + 1)
const bulanOpts = [
  { label: 'Januari', value: 1 }, { label: 'Februari', value: 2 }, { label: 'Maret', value: 3 }, { label: 'April', value: 4 },
  { label: 'Mei', value: 5 }, { label: 'Juni', value: 6 }, { label: 'Juli', value: 7 }, { label: 'Agustus', value: 8 },
  { label: 'September', value: 9 }, { label: 'Oktober', value: 10 }, { label: 'November', value: 11 }, { label: 'Desember', value: 12 },
]
const q = ref('')
const loading = ref(false)
const perJenis = ref<RekapRow[]>([])
const totals = ref<{ totalTarget: number; totalRealisasi: number; capaian: number; selisih: number } | null>(null)
const exporting = ref('')

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return perJenis.value
  return perJenis.value.filter((r) => (r.kode || '').toLowerCase().includes(s) || r.nama.toLowerCase().includes(s) || r.kawasan_nama.toLowerCase().includes(s))
})
const currentPage = ref(1)
const perPage = ref(10)
const total = computed(() => filtered.value.length)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const from = computed(() => total.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1)
const to = computed(() => Math.min(currentPage.value * perPage.value, total.value))
const paginated = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  return filtered.value.slice(start, start + perPage.value)
})
watch([q, filterKawasan, tahun, bulan], () => { currentPage.value = 1 })
watch(perPage, () => { currentPage.value = 1 })
watch(pageCount, (pc) => { if (currentPage.value > pc) currentPage.value = pc })

const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' })
function toast(msg: string, color: typeof snack.color = 'success') { snack.msg = msg; snack.color = color; snack.show = true }
const { formatRupiah: fmt } = useCurrency()

async function loadKawasan() {
  try {
    const r = await $fetch<{ data: { id: number; kode: string; nama: string }[] }>('/api/kawasan')
    kawasan.value = r.data
  } catch {}
}
async function load() {
  loading.value = true
  try {
    const q2: Record<string, string> = { tahun: String(tahun.value) }
    if (filterKawasan.value) q2.kawasan_id = String(filterKawasan.value)
    const r = await $fetch<{ perJenis: RekapRow[]; totals: typeof totals.value }>('/api/laporan/rekap', { query: q2 })
    perJenis.value = r.perJenis
    totals.value = r.totals
  } catch (e: unknown) {
    toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat', 'error')
  } finally { loading.value = false }
}

async function doExport(format: string) {
  exporting.value = format
  try {
    const params = new URLSearchParams({ format, tahun: String(tahun.value), bulan: String(bulan.value) })
    if (filterKawasan.value) params.set('kawasan_id', String(filterKawasan.value))
    const res = await fetch(`/api/laporan/export?${params.toString()}`, { credentials: 'include' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error((j as { message?: string }).message || res.statusText)
    }
    const blob = await res.blob()
    const cd = res.headers.get('content-disposition') || ''
    const m = cd.match(/filename="?([^"]+)"?/)
    const filename = m?.[1] || `rekap-${tahun.value}.${format}`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast(`Unduhan ${format.toUpperCase()} dimulai`)
  } catch (e: unknown) {
    toast((e as Error).message || String(e), 'error')
  } finally { exporting.value = '' }
}

onMounted(async () => { await loadKawasan(); await load() })
</script>
