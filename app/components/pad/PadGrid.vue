<template>
  <div>
    <v-card flat elevation="0" class="mb-4 border border-thin">
      <v-card-text>
        <div class="d-flex flex-wrap ga-3">
          <v-select v-model="kawasanId" :items="kawasanOpts" item-title="label" item-value="value" label="Kawasan *" density="compact" variant="outlined" hide-details style="max-width: 260px" @update:model-value="load" />
          <v-select v-model="bulan" :items="bulanOpts" item-title="label" item-value="value" label="Bulan" density="compact" variant="outlined" hide-details style="max-width: 150px" @update:model-value="load" />
          <v-select v-model="tahun" :items="tahunOpts" density="compact" variant="outlined" hide-details style="max-width: 110px" @update:model-value="load" />
          <v-text-field v-model="q" density="compact" variant="outlined" placeholder="Cari kode / nama..." prepend-inner-icon="mdi-magnify" hide-details clearable style="max-width: 220px" />
        </div>
        <div class="text-caption text-medium-emphasis mt-3">
          {{ mingguRanges[0] }} · {{ mingguRanges[1] }} · {{ mingguRanges[2] }} · {{ mingguRanges[3] }}
          — Isi nilai lalu Enter / klik di luar untuk simpan. Total dihitung dari data <b>disetujui</b> saja.
        </div>
      </v-card-text>
    </v-card>

    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-3">
      <v-tabs v-model="mingguTab" color="primary" density="compact" show-arrows>
        <v-tab v-for="i in 4" :key="i" :value="i">
          Minggu {{ roman(i) }}
          <v-chip size="x-small" variant="tonal" class="ml-2">{{ fmt(sumMinggu[i-1] ?? 0) }}</v-chip>
          <v-chip v-if="draftCountPerMinggu[i-1]" size="x-small" color="warning" variant="flat" class="ml-1">{{ draftCountPerMinggu[i-1] }} draft</v-chip>
        </v-tab>
      </v-tabs>
      <div class="d-flex ga-2">
        <v-btn size="small" variant="text" icon="mdi-chevron-left" :disabled="mingguTab <= 1" @click="mingguTab--" />
        <v-btn size="small" variant="text" icon="mdi-chevron-right" :disabled="mingguTab >= 4" @click="mingguTab++" />
      </div>
    </div>

    <v-card flat elevation="0" class="mb-3 border border-thin">
      <v-card-text class="py-2">
        <div class="d-flex flex-wrap ga-4 text-body-2">
          <span><span class="text-medium-emphasis">{{ weekLabel(mingguTab) }}:</span> <b>{{ fmt(sumMinggu[mingguTab-1] ?? 0) }}</b></span>
          <span><span class="text-medium-emphasis">Total bulan:</span> <b>{{ fmt(sumTotal) }}</b></span>
          <span><span class="text-medium-emphasis">Terisi:</span> <b>{{ filledCountTab }}/{{ filteredRows.length }}</b> <span class="text-medium-emphasis">pos</span></span>
          <span v-if="meta?.locked"><v-chip size="small" color="warning" prepend-icon="mdi-lock">Periode Terkunci</v-chip></span>
        </div>
      </v-card-text>
    </v-card>

    <div v-if="loading" class="d-flex justify-center py-8"><v-progress-circular indeterminate color="primary" /></div>

    <template v-else>
      <div v-if="!filteredRows.length" class="text-center py-8 text-medium-emphasis">
        <v-icon size="40" class="mb-2">mdi-inbox-outline</v-icon>
        <div>{{ q ? 'Tidak ada yang cocok dengan pencarian' : 'Tidak ada pos penerimaan' }}</div>
      </div>

      <!-- Desktop table (>= md) : 1 input per baris -->
      <v-card v-if="filteredRows.length" flat elevation="0" class="d-none d-md-block mb-4 border border-thin">
        <v-table density="compact">
          <thead>
            <tr>
              <th style="width:110px">Kode</th>
              <th>Jenis Penerimaan</th>
              <th class="text-right" style="width:130px">Target</th>
              <th class="text-right" style="width:130px">s/d Bln Lalu</th>
              <th class="text-right" style="width:200px">{{ weekLabel(mingguTab) }}</th>
              <th style="width:110px">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filteredRows" :key="r.jenis_id">
              <td class="font-weight-medium">{{ r.kode || '-' }}</td>
              <td>
                {{ r.nama }}
                <v-chip v-if="r.tarif" size="x-small" variant="tonal" class="ml-1">Tarif {{ fmt(r.tarif) }}</v-chip>
              </td>
              <td class="text-right">{{ fmt(r.target) }}</td>
              <td class="text-right text-medium-emphasis">{{ fmt(r.sBelum) }}</td>
              <td class="text-right">
                <v-text-field
                  :model-value="cellFor(r, mingguTab).input"
                  density="compact"
                  variant="outlined"
                  hide-details
                  inputmode="numeric"
                  prefix="Rp"
                  :disabled="!canEdit(cellFor(r, mingguTab))"
                  :bg-color="cellBg(cellFor(r, mingguTab))"
                  @update:model-value="onInput(cellFor(r, mingguTab), $event)"
                  @blur="commit(r, cellFor(r, mingguTab))"
                  @keyup.enter="commit(r, cellFor(r, mingguTab))"
                />
              </td>
              <td><v-chip :color="statusColor(cellFor(r, mingguTab).status)" size="small" variant="tonal">{{ cellFor(r, mingguTab).status || '—' }}</v-chip></td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <!-- Mobile cards -->
      <div v-if="filteredRows.length" class="d-md-none d-flex flex-column ga-3 mb-4">
        <v-card v-for="r in filteredRows" :key="r.jenis_id" flat elevation="0" :class="cardBorder(cellFor(r, mingguTab))">
          <v-card-text class="pb-2">
            <div class="d-flex align-start justify-space-between ga-2">
              <div class="text-body-2 font-weight-medium">{{ r.kode || '-' }} — {{ r.nama }}</div>
              <v-chip :color="statusColor(cellFor(r, mingguTab).status)" size="x-small">{{ cellFor(r, mingguTab).status || '—' }}</v-chip>
            </div>
            <div v-if="r.tarif" class="mt-1"><v-chip size="x-small" variant="tonal">Tarif {{ fmt(r.tarif) }}</v-chip></div>
            <div class="d-flex ga-4 mt-2 text-caption text-medium-emphasis">
              <span>Target <b class="text-medium-emphasis">{{ fmt(r.target) }}</b></span>
              <span>s/d lalu <b class="text-medium-emphasis">{{ fmt(r.sBelum) }}</b></span>
            </div>
            <v-text-field
              :model-value="cellFor(r, mingguTab).input"
              class="mt-3"
              density="compact"
              variant="outlined"
              hide-details
              inputmode="numeric"
              :label="weekLabel(mingguTab)"
              prefix="Rp"
              :disabled="!canEdit(cellFor(r, mingguTab))"
              :bg-color="cellBg(cellFor(r, mingguTab))"
              @update:model-value="onInput(cellFor(r, mingguTab), $event)"
              @blur="commit(r, cellFor(r, mingguTab))"
              @keyup.enter="commit(r, cellFor(r, mingguTab))"
            />
          </v-card-text>
        </v-card>
      </div>

      <v-card flat elevation="0" class="mb-4 border border-thin">
        <v-card-text class="d-flex flex-wrap align-center justify-space-between ga-3">
          <div class="text-body-2">
            <span class="text-medium-emphasis">Total {{ weekLabel(mingguTab) }}:</span> <b>{{ fmt(sumMingguFiltered[mingguTab-1] ?? 0) }}</b>
            <span class="mx-2 text-medium-emphasis">·</span>
            <span class="text-medium-emphasis">Total bulan (semua Minggu):</span> <b>{{ fmt(sumTotal) }}</b>
          </div>
          <div class="d-flex ga-2">
            <v-btn color="primary" variant="tonal" prepend-icon="mdi-send" :disabled="!hasDraftTab" :loading="ajukanLoading" @click="ajukanMinggu">Ajukan Minggu {{ roman(mingguTab) }}</v-btn>
            <v-btn color="primary" variant="flat" prepend-icon="mdi-send-circle" :disabled="!hasDraft" :loading="ajukanLoading" @click="ajukanSemua">Ajukan Semua</v-btn>
          </div>
        </v-card-text>
      </v-card>

      <v-expansion-panels variant="accordion" class="mb-4 border border-thin rounded" elevation="0">
        <v-expansion-panel title="Ringkasan 4 minggu (read-only)">
          <template #text>
            <v-table density="compact">
              <thead><tr><th>Kode</th><th>Jenis</th><th class="text-right">I</th><th class="text-right">II</th><th class="text-right">III</th><th class="text-right">IV</th><th class="text-right">Total</th></tr></thead>
              <tbody>
                <tr v-for="r in filteredRows" :key="r.jenis_id">
                  <td>{{ r.kode || '-' }}</td>
                  <td class="text-truncate" style="max-width: 180px">{{ r.nama }}</td>
                  <td v-for="m in r.minggu" :key="m.minggu" class="text-right">{{ m.nilai ? fmt(m.nilai) : '—' }}</td>
                  <td class="text-right font-weight-medium">{{ fmt(rowTotal(r)) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="font-weight-bold"><td colspan="2">TOTAL</td><td v-for="i in 4" :key="i" class="text-right">{{ fmt(sumMinggu[i-1] ?? 0) }}</td><td class="text-right">{{ fmt(sumTotal) }}</td></tr>
              </tfoot>
            </v-table>
          </template>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>

    <v-snackbar v-model="snack.show" :color="snack.color" timeout="3000">{{ snack.msg }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
type MingguCell = { minggu: number; nilai: number; input: string; realisasi_id: number | null; status: string | null; catatan: string }
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
const q = ref('')
const mingguTab = ref<number>(weekForToday(bulan.value, tahun.value))

const rows = ref<GridRow[]>([])
const loading = ref(false)
const meta = ref<{ locked: boolean; bulanLabel: string } | null>(null)
const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' | 'warning' })
const ajukanLoading = ref(false)
const { formatRupiah: fmt, formatRupiahInput, parseRupiahInput } = useCurrency()

function toast(msg: string, color: typeof snack.color = 'success') { snack.msg = msg; snack.color = color; snack.show = true }

function roman(n: number) { return ['', 'I', 'II', 'III', 'IV'][n] || String(n) }
function weekForToday(b: number, y: number) {
  const now = new Date()
  if (now.getFullYear() !== y || now.getMonth() + 1 !== b) return 1
  const d = now.getDate()
  if (d <= 7) return 1
  if (d <= 14) return 2
  if (d <= 21) return 3
  return 4
}
function weekLabel(n: number) { return `Minggu ${roman(n)}` }
function lastDay(y: number, m: number) { return new Date(y, m, 0).getDate() }
const mingguRanges = computed(() => {
  const y = tahun.value, m = bulan.value
  const last = lastDay(y, m)
  return [`Minggu I: tgl 1–7`, `Minggu II: 8–14`, `Minggu III: 15–21`, `Minggu IV: 22–${last}`]
})

const filteredRows = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return rows.value
  return rows.value.filter((r) => (r.kode || '').toLowerCase().includes(s) || r.nama.toLowerCase().includes(s))
})

function cellFor(r: GridRow, tab: number) { return r.minggu[tab - 1]! }
function canEdit(m: MingguCell) {
  if (!isAdmin.value || !!meta.value?.locked) return false
  if (m.status && m.status !== 'draft') return false
  return true
}
function statusColor(s: string | null) {
  if (s === 'disetujui') return 'success'
  if (s === 'diajukan') return 'warning'
  if (s === 'ditolak') return 'error'
  if (s === 'draft') return 'grey'
  return 'grey'
}
function cellBg(m: MingguCell) {
  if (m.status === 'disetujui') return 'success-lighten-5'
  if (m.status === 'diajukan') return 'warning-lighten-5'
  if (m.status === 'draft') return undefined
  return undefined
}
function cardBorder(m: MingguCell) {
  if (m.status === 'disetujui') return 'border-s-lg border-success'
  if (m.status === 'diajukan') return 'border-s-lg border-warning'
  return ''
}

function rowTotal(r: GridRow) { return r.minggu.reduce((s, m) => s + m.nilai, 0) }
const sumMinggu = computed(() => [0, 1, 2, 3].map((i) => rows.value.reduce((s, r) => s + r.minggu[i]!.nilai, 0)))
const sumMingguFiltered = computed(() => [0, 1, 2, 3].map((i) => filteredRows.value.reduce((s, r) => s + r.minggu[i]!.nilai, 0)))
const sumTotal = computed(() => sumMinggu.value.reduce((s, v) => s + v, 0))
const draftCountPerMinggu = computed(() => [0, 1, 2, 3].map((i) => rows.value.reduce((s, r) => s + (r.minggu[i]!.status === 'draft' ? 1 : 0), 0)))
const hasDraft = computed(() => rows.value.some((r) => r.minggu.some((m) => m.status === 'draft')))
const hasDraftTab = computed(() => filteredRows.value.some((r) => cellFor(r, mingguTab.value).status === 'draft') || rows.value.some((r) => r.minggu[mingguTab.value - 1]!.status === 'draft'))
const filledCountTab = computed(() => filteredRows.value.filter((r) => cellFor(r, mingguTab.value).nilai > 0).length)

function onInput(m: MingguCell, raw: string) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  m.input = digits ? Number(digits).toLocaleString('id-ID') : ''
  m.nilai = digits ? Number(digits) : 0
}

async function loadKawasan() {
  try { const r = await $fetch<{ data: typeof kawasan.value }>('/api/kawasan'); kawasan.value = r.data; if (!kawasanId.value && r.data.length) kawasanId.value = r.data[0]!.id } catch {}
}
async function load() {
  if (!kawasanId.value) return
  loading.value = true
  try {
    const r = await $fetch<{ data: GridRow[]; meta: typeof meta.value }>('/api/realisasi/grid', {
      query: { kawasan_id: String(kawasanId.value), tahun: String(tahun.value), bulan: String(bulan.value) },
    })
    for (const row of r.data) for (const m of row.minggu) {
      const anyM = m as unknown as { input?: string }
      anyM.input = m.nilai ? formatRupiahInput(m.nilai) : ''
    }
    rows.value = r.data
    meta.value = r.meta
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat', 'error') }
  finally { loading.value = false }
}

async function commit(r: GridRow, m: MingguCell) {
  if (!canEdit(m)) return
  const val = parseRupiahInput(m.input)
  // guard: avoid no-op creates
  if (val === m.nilai && m.realisasi_id !== null) {
    m.input = val ? formatRupiahInput(val) : ''
    return
  }
  if (val === m.nilai && m.realisasi_id === null && val === 0) return
  try {
    const res = await $fetch<{ id: number }>('/api/realisasi/grid', {
      method: 'POST',
      body: { jenis_retribusi_id: r.jenis_id, tahun: tahun.value, bulan: bulan.value, minggu: m.minggu, jumlah: val },
    })
    m.nilai = val
    m.input = val ? formatRupiahInput(val) : ''
    m.realisasi_id = res.id
    m.status = 'draft'
    toast('Tersimpan')
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal menyimpan', 'error') }
}

async function ajukanMinggu() {
  if (!kawasanId.value) return
  ajukanLoading.value = true
  try {
    const r = await $fetch<{ count: number }>('/api/realisasi/ajukan-massal', {
      method: 'POST',
      body: { kawasan_id: kawasanId.value, tahun: tahun.value, bulan: bulan.value, minggu: mingguTab.value },
    })
    toast(`${r.count} realisasi Minggu ${roman(mingguTab.value)} diajukan`)
    await load()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal', 'error') }
  finally { ajukanLoading.value = false }
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

watch([tahun, bulan], () => { mingguTab.value = weekForToday(bulan.value, tahun.value) })

onMounted(async () => { await loadKawasan(); await load() })
</script>
