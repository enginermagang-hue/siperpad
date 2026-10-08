<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div class="d-flex align-center">
        <v-icon size="36" color="primary" class="mr-3">mdi-table-large</v-icon>
        <h1 class="text-h4 font-weight-medium">Entri Mingguan</h1>
      </div>
      <v-chip v-if="meta?.locked" color="warning" prepend-icon="mdi-lock">Periode Terkunci</v-chip>
    </div>

    <v-card flat elevation="0" class="mb-4">
      <v-card-text>
        <div class="d-flex flex-wrap ga-3">
          <v-select v-model="kawasanId" :items="kawasanOpts" item-title="label" item-value="value" label="Kawasan *" density="compact" variant="outlined" hide-details style="max-width: 260px" @update:model-value="load" />
          <v-select v-model="bulan" :items="bulanOpts" item-title="label" item-value="value" label="Bulan" density="compact" variant="outlined" hide-details style="max-width: 150px" @update:model-value="load" />
          <v-select v-model="tahun" :items="tahunOpts" density="compact" variant="outlined" hide-details style="max-width: 110px" @update:model-value="load" />
        </div>
        <div class="text-caption text-medium-emphasis mt-3">
          Minggu I: tgl 1–7 · II: 8–14 · III: 15–21 · IV: 22–akhir bulan. Isi nilai lalu tekan Enter / klik di luar sel untuk menyimpan.
          Total & realisasi kumulatif dihitung otomatis dari data <b>disetujui</b>.
        </div>
      </v-card-text>
    </v-card>

    <v-tabs v-model="tabMinggu" color="primary" class="mb-4">
      <v-tab v-for="w in mingguTabs" :key="w.value" :value="w.value">
        {{ w.label }}
        <span class="text-caption text-medium-emphasis ml-1">({{ w.range }})</span>
      </v-tab>
    </v-tabs>

    <v-card flat elevation="0">
      <v-table density="default">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Jenis Penerimaan</th>
            <th class="text-right">Target</th>
            <th class="text-right">s/d Bulan Lalu</th>
            <th class="text-right" style="width:150px">Nilai {{ labelMingguAktif }}</th>
            <th style="width:110px">Status</th>
            <th class="text-right">Total Bulanan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="text-center py-6">Memuat...</td></tr>
          <tr v-else-if="!rows.length"><td colspan="7" class="text-center py-6 text-medium-emphasis">Tidak ada pos penerimaan</td></tr>
          <tr v-for="r in rows" :key="r.jenis_id">
            <td class="font-weight-medium">{{ r.kode || '-' }}</td>
            <td>
              {{ r.nama }}
              <v-chip v-if="r.tarif" size="x-small" variant="tonal" class="ml-1">Tarif {{ fmt(r.tarif) }}</v-chip>
            </td>
            <td class="text-right">{{ fmt(r.target) }}</td>
            <td class="text-right text-medium-emphasis">{{ fmt(r.sBelum) }}</td>
            <td class="text-right">
              <RupiahField
                v-model="cellOf(r).nilai"
                :disabled="!isAdmin || !!meta?.locked || (!!cellOf(r).status && cellOf(r).status !== 'draft')"
                :bg-color="cellOf(r).status === 'disetujui' ? 'success-lighten-5' : cellOf(r).status === 'diajukan' ? 'warning-lighten-5' : undefined"
                @blur="commit(r, cellOf(r))"
                @enter="commit(r, cellOf(r))"
              />
            </td>
            <td>
              <v-chip v-if="cellOf(r).status" size="small" :color="statusColor(cellOf(r).status)" variant="tonal">{{ cellOf(r).status }}</v-chip>
              <span v-else class="text-medium-emphasis">-</span>
            </td>
            <td class="text-right font-weight-medium">{{ fmt(rowTotal(r)) }}</td>
          </tr>
        </tbody>
        <tfoot v-if="rows.length">
          <tr class="font-weight-bold">
            <td colspan="2">TOTAL</td>
            <td class="text-right">{{ fmt(sumTarget) }}</td>
            <td class="text-right">{{ fmt(sumSBebelum) }}</td>
            <td class="text-right">{{ fmt(sumMingguAktif) }}</td>
            <td></td>
            <td class="text-right">{{ fmt(sumTotal) }}</td>
          </tr>
        </tfoot>
      </v-table>

      <v-divider />
      <v-card-text class="d-flex flex-wrap justify-space-between align-center ga-3">
        <div class="text-body-2 text-medium-emphasis">
          Total {{ labelMingguAktif }}: <b>{{ fmt(sumMingguAktif) }}</b> · Total Bulanan: <b>{{ fmt(sumTotal) }}</b>
        </div>
        <div class="d-flex ga-2">
          <v-btn v-if="!meta?.locked" color="secondary" variant="tonal" prepend-icon="mdi-send-clock" :disabled="!hasDraftMinggu(tabMinggu)" :loading="ajukanMingguLoading" @click="ajukanMingguIni">Ajukan Minggu Ini</v-btn>
          <v-btn v-if="!meta?.locked" color="primary" variant="tonal" prepend-icon="mdi-send" :disabled="!hasDraft" :loading="ajukanLoading" @click="ajukanSemua">Ajukan Semua</v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-snackbar v-model="snack.show" :color="snack.color" timeout="3000">{{ snack.msg }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

type MingguCell = { minggu: number; nilai: number; saved: number; realisasi_id: number | null; status: string | null; catatan: string }
type GridRow = { jenis_id: number; kode: string; nama: string; level: number; tarif: number | null; target: number; sBelum: number; minggu: MingguCell[]; totalMingguan: number }

const session = useUserSession()
const isAdmin = computed(() => String(session.user.value?.role) === 'admin')

const kawasan = ref<{ id: number; kode: string; nama: string }[]>([])
const kawasanOpts = computed(() => kawasan.value.map((k) => ({ label: `${k.kode} — ${k.nama}`, value: k.id })))
const kawasanId = ref<number | null>(null)
const tahun = ref(new Date().getFullYear())
const tahunOpts = [2024, 2025, 2026, 2027]
const bulan = ref(new Date().getMonth() + 1)
const bulanOpts = [
  { label: 'Januari', value: 1 }, { label: 'Februari', value: 2 }, { label: 'Maret', value: 3 }, { label: 'April', value: 4 },
  { label: 'Mei', value: 5 }, { label: 'Juni', value: 6 }, { label: 'Juli', value: 7 }, { label: 'Agustus', value: 8 },
  { label: 'September', value: 9 }, { label: 'Oktober', value: 10 }, { label: 'November', value: 11 }, { label: 'Desember', value: 12 },
]

const rows = ref<GridRow[]>([])
const loading = ref(false)
const meta = ref<{ locked: boolean; bulanLabel: string } | null>(null)
const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' | 'warning' })
const ajukanLoading = ref(false)
const ajukanMingguLoading = ref(false)
const tabMinggu = ref(1)
const { formatRupiah: fmt } = useCurrency()

const mingguTabs = [
  { value: 1, label: 'Minggu I', range: '1–7' },
  { value: 2, label: 'Minggu II', range: '8–14' },
  { value: 3, label: 'Minggu III', range: '15–21' },
  { value: 4, label: 'Minggu IV', range: '22–akhir' },
]
const labelMingguAktif = computed(() => mingguTabs.find((w) => w.value === tabMinggu.value)?.label || `Minggu ${tabMinggu.value}`)

function toast(msg: string, color: typeof snack.color = 'success') { snack.msg = msg; snack.color = color; snack.show = true }

function statusColor(s: string | null) {
  if (s === 'disetujui') return 'success'
  if (s === 'diajukan') return 'warning'
  if (s === 'ditolak') return 'error'
  return 'grey'
}

// Ambil sel minggu yang sedang aktif dari sebuah baris.
function cellOf(r: GridRow): MingguCell { return r.minggu[tabMinggu.value - 1]! }

const hasDraft = computed(() => rows.value.some((r) => r.minggu.some((m) => m.status === 'draft')))
function hasDraftMinggu(minggu: number) { return rows.value.some((r) => r.minggu[minggu - 1]?.status === 'draft') }
function rowTotal(r: GridRow) { return r.minggu.reduce((s, m) => s + m.nilai, 0) }
const sumTarget = computed(() => rows.value.reduce((s, r) => s + r.target, 0))
const sumSBebelum = computed(() => rows.value.reduce((s, r) => s + r.sBelum, 0))
const sumMinggu = computed(() => [0, 1, 2, 3].map((i) => rows.value.reduce((s, r) => s + r.minggu[i]!.nilai, 0)))
const sumMingguAktif = computed(() => rows.value.reduce((s, r) => s + r.minggu[tabMinggu.value - 1]!.nilai, 0))
const sumTotal = computed(() => sumMinggu.value.reduce((s, v) => s + v, 0))

async function loadKawasan() {
  try { const r = await $fetch<{ data: typeof kawasan.value }>('/api/kawasan'); kawasan.value = r.data; if (!kawasanId.value && r.data.length) kawasanId.value = r.data[0]!.id } catch {}
}
async function load() {
  if (!kawasanId.value) return
  loading.value = true
  try {
    const r = await $fetch<{ data: (Omit<GridRow, 'minggu'> & { minggu: Omit<MingguCell, 'saved'>[] })[]; meta: typeof meta.value }>('/api/realisasi/grid', {
      query: { kawasan_id: String(kawasanId.value), tahun: String(tahun.value), bulan: String(bulan.value) },
    })
    rows.value = r.data.map((row) => ({ ...row, minggu: row.minggu.map((m) => ({ ...m, saved: m.nilai })) }))
    meta.value = r.meta
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat', 'error') }
  finally { loading.value = false }
}

async function commit(r: GridRow, m: MingguCell) {
  if (!isAdmin.value || meta.value?.locked) return
  if (m.status && m.status !== 'draft') return
  const val = Number(m.nilai) || 0
  if (val === m.saved && m.realisasi_id !== null) return
  if (val === 0 && m.realisasi_id === null) return
  try {
    const res = await $fetch<{ id: number }>('/api/realisasi/grid', {
      method: 'POST',
      body: { jenis_retribusi_id: r.jenis_id, tahun: tahun.value, bulan: bulan.value, minggu: m.minggu, jumlah: val },
    })
    m.nilai = val
    m.saved = val
    m.realisasi_id = res.id
    m.status = 'draft'
    toast('Tersimpan')
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal menyimpan', 'error') }
}

async function ajukanSemua() {
  if (!kawasanId.value) return
  ajukanLoading.value = true
  try {
    const r = await $fetch<{ count: number }>('/api/realisasi/ajukan-massal', {
      method: 'POST',
      body: { kawasan_id: kawasanId.value, tahun: tahun.value, bulan: bulan.value },
    })
    toast(`${r.count} realisasi diajukan`)
    await load()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal', 'error') }
  finally { ajukanLoading.value = false }
}

async function ajukanMingguIni() {
  if (!kawasanId.value) return
  ajukanMingguLoading.value = true
  try {
    const r = await $fetch<{ count: number }>('/api/realisasi/ajukan-massal', {
      method: 'POST',
      body: { kawasan_id: kawasanId.value, tahun: tahun.value, bulan: bulan.value, minggu: tabMinggu.value },
    })
    toast(`${r.count} realisasi ${labelMingguAktif.value} diajukan`)
    await load()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal', 'error') }
  finally { ajukanMingguLoading.value = false }
}

onMounted(async () => { await loadKawasan(); await load() })
</script>
