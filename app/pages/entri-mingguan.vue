<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div class="d-flex align-center">
        <v-icon size="36" color="primary" class="mr-3">mdi-table-large</v-icon>
        <h1 class="text-h4 font-weight-medium">Entri Mingguan</h1>
      </div>
      <div class="d-flex ga-2">
        <v-btn v-if="!meta?.locked" color="primary" variant="tonal" prepend-icon="mdi-send" :disabled="!hasDraft" :loading="ajukanLoading" @click="ajukanSemua">Ajukan Semua</v-btn>
        <v-chip v-if="meta?.locked" color="warning" prepend-icon="mdi-lock">Periode Terkunci</v-chip>
      </div>
    </div>

    <v-card flat elevation="2" class="mb-4">
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

    <v-card flat elevation="2">
      <v-table density="compact">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Jenis Penerimaan</th>
            <th class="text-right">Target</th>
            <th class="text-right">s/d Bulan Lalu</th>
            <th class="text-right" style="width:130px">Minggu I</th>
            <th class="text-right" style="width:130px">Minggu II</th>
            <th class="text-right" style="width:130px">Minggu III</th>
            <th class="text-right" style="width:130px">Minggu IV</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="9" class="text-center py-6">Memuat...</td></tr>
          <tr v-else-if="!rows.length"><td colspan="9" class="text-center py-6 text-medium-emphasis">Tidak ada pos penerimaan</td></tr>
          <tr v-for="r in rows" :key="r.jenis_id">
            <td class="font-weight-medium">{{ r.kode || '-' }}</td>
            <td>
              {{ r.nama }}
              <v-chip v-if="r.tarif" size="x-small" variant="tonal" class="ml-1">Tarif {{ fmt(r.tarif) }}</v-chip>
            </td>
            <td class="text-right">{{ fmt(r.target) }}</td>
            <td class="text-right text-medium-emphasis">{{ fmt(r.sBelum) }}</td>
            <td v-for="m in r.minggu" :key="m.minggu" class="text-right">
              <v-text-field
                v-model="m.input"
                density="compact"
                variant="outlined"
                hide-details
                inputmode="numeric"
                prefix="Rp"
                :disabled="!isAdmin || !!meta?.locked || (!!m.status && m.status !== 'draft')"
                :bg-color="m.status === 'disetujui' ? 'success-lighten-5' : m.status === 'diajukan' ? 'warning-lighten-5' : undefined"
                @update:model-value="onInput(m)"
                @blur="commit(r, m)"
                @keyup.enter="commit(r, m)"
              />
              <div v-if="m.status" class="text-caption text-medium-emphasis text-right">{{ m.status }}</div>
            </td>
            <td class="text-right font-weight-medium">{{ fmt(rowTotal(r)) }}</td>
          </tr>
        </tbody>
        <tfoot v-if="rows.length">
          <tr class="font-weight-bold">
            <td colspan="2">TOTAL</td>
            <td class="text-right">{{ fmt(sumTarget) }}</td>
            <td class="text-right">{{ fmt(sumSBebelum) }}</td>
            <td class="text-right">{{ fmt(sumMinggu[0]) }}</td>
            <td class="text-right">{{ fmt(sumMinggu[1]) }}</td>
            <td class="text-right">{{ fmt(sumMinggu[2]) }}</td>
            <td class="text-right">{{ fmt(sumMinggu[3]) }}</td>
            <td class="text-right">{{ fmt(sumTotal) }}</td>
          </tr>
        </tfoot>
      </v-table>
    </v-card>

    <v-snackbar v-model="snack.show" :color="snack.color" timeout="3000">{{ snack.msg }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

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

const rows = ref<GridRow[]>([])
const loading = ref(false)
const meta = ref<{ locked: boolean; bulanLabel: string } | null>(null)
const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' | 'warning' })
const ajukanLoading = ref(false)
const { formatRupiah: fmt, parseRupiahInput } = useCurrency()

function toast(msg: string, color: typeof snack.color = 'success') { snack.msg = msg; snack.color = color; snack.show = true }

const hasDraft = computed(() => rows.value.some((r) => r.minggu.some((m) => m.status === 'draft')))
function rowTotal(r: GridRow) { return r.minggu.reduce((s, m) => s + m.nilai, 0) }
const sumTarget = computed(() => rows.value.reduce((s, r) => s + r.target, 0))
const sumSBebelum = computed(() => rows.value.reduce((s, r) => s + r.sBelum, 0))
const sumMinggu = computed(() => [0, 1, 2, 3].map((i) => rows.value.reduce((s, r) => s + r.minggu[i]!.nilai, 0)))
const sumTotal = computed(() => sumMinggu.value.reduce((s, v) => s + v, 0))

function onInput(m: MingguCell) {
  m.nilai = parseRupiahInput(m.input)
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
    for (const row of r.data) for (const m of row.minggu) m.input = m.nilai ? m.nilai.toLocaleString('id-ID') : ''
    rows.value = r.data
    meta.value = r.meta
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat', 'error') }
  finally { loading.value = false }
}

async function commit(r: GridRow, m: MingguCell) {
  if (!isAdmin.value || meta.value?.locked) return
  if (m.status && m.status !== 'draft') return
  const val = parseRupiahInput(m.input)
  if (val === m.nilai && m.realisasi_id !== null) return
  if (val === m.nilai && m.realisasi_id === null && val === 0) return
  try {
    const res = await $fetch<{ id: number }>('/api/realisasi/grid', {
      method: 'POST',
      body: { jenis_retribusi_id: r.jenis_id, tahun: tahun.value, bulan: bulan.value, minggu: m.minggu, jumlah: val },
    })
    m.nilai = val
    m.input = val ? val.toLocaleString('id-ID') : ''
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

onMounted(async () => { await loadKawasan(); await load() })
</script>
