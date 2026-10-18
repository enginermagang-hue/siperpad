<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div class="d-flex align-center">
        <v-icon size="36" color="primary" class="mr-3">mdi-table-large</v-icon>
        <h1 class="text-h4 font-weight-medium">Entri Mingguan</h1>
      </div>
      <div class="d-flex align-center ga-3">
        <v-chip v-if="meta?.locked" color="warning" prepend-icon="mdi-lock">Periode Terkunci</v-chip>
        <v-btn v-if="isUser" color="primary" prepend-icon="mdi-plus" :disabled="!kawasanId || !!meta?.locked" @click="openInput">Input Entri</v-btn>
      </div>
    </div>

    <v-card flat elevation="0" class="mb-4">
      <v-card-text>
        <div class="d-flex flex-wrap ga-3">
          <v-select v-model="kawasanId" :items="kawasanOpts" item-title="label" item-value="value" label="Kawasan *" density="compact" variant="outlined" hide-details style="max-width: 260px" @update:model-value="load" />
          <v-select v-model="bulan" :items="bulanOpts" item-title="label" item-value="value" label="Bulan" density="compact" variant="outlined" hide-details style="max-width: 150px" @update:model-value="load" />
          <v-select v-model="tahun" :items="tahunOpts" density="compact" variant="outlined" hide-details style="max-width: 110px" @update:model-value="load" />
        </div>
        <div class="text-caption text-medium-emphasis mt-3">
          Minggu I: tgl 1–7 · II: 8–14 · III: 15–21 · IV: 22–akhir bulan. Tekan <b>Input Entri</b> lalu pilih jenis penerimaan untuk mengisi nilai minggu aktif.
          Total & realisasi kumulatif dihitung otomatis dari data <b>disetujui</b>.
        </div>
      </v-card-text>
    </v-card>

    <div class="d-flex align-center ga-2 mb-4 flex-wrap">
      <v-tabs v-model="tabMinggu" color="primary" class="flex-grow-1">
        <v-tab v-for="w in mingguTabs" :key="w.value" :value="w.value">
          {{ w.label }}
          <span class="text-caption text-medium-emphasis ml-1">({{ w.range }})</span>
        </v-tab>
      </v-tabs>
      <ViewModeToggle v-model="mode" />
    </div>

    <v-card flat elevation="0">
      <v-table v-if="mode === 'table'" density="default">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Jenis Penerimaan</th>
            <th class="text-right">Target</th>
            <th class="text-right">s/d Bulan Lalu</th>
            <th class="text-right">Nilai {{ labelMingguAktif }}</th>
            <th class="text-right">Total Bulanan</th>
            <th style="width:120px">Status</th>
            <th v-if="isUser">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td :colspan="colCount" class="text-center py-6">Memuat...</td></tr>
          <tr v-else-if="!rows.length"><td :colspan="colCount" class="text-center py-6 text-medium-emphasis">Tidak ada pos penerimaan</td></tr>
          <template v-for="r in rows" :key="r.jenis_id">
            <tr class="expand-row" @click="toggleExpand(r.jenis_id)">
              <td class="font-weight-medium">
                <v-icon size="small" class="expand-chevron mr-1" :class="{ 'expand-chevron--open': expandedId === r.jenis_id }">mdi-chevron-right</v-icon>
                {{ r.kode || '-' }}
              </td>
              <td>
                {{ r.nama }}
                <v-chip v-if="r.tarif" size="x-small" variant="tonal" class="ml-1">Tarif {{ fmt(r.tarif) }}</v-chip>
              </td>
              <td class="text-right">{{ fmt(r.target) }}</td>
              <td class="text-right text-medium-emphasis">{{ fmt(r.sBelum) }}</td>
              <td class="text-right font-weight-medium">
                {{ fmt(cellOf(r).nilai) }}
                <div v-if="cellOf(r).kuantitas != null && cellOf(r).tarif != null" class="text-caption text-medium-emphasis">
                  {{ Number(cellOf(r).kuantitas).toLocaleString('id-ID') }} × {{ fmt(cellOf(r).tarif) }}
                </div>
              </td>
              <td class="text-right font-weight-medium">{{ fmt(rowTotal(r)) }}</td>
              <td>
                <template v-if="cellOf(r).status">
                  <template v-if="isCellLocked(r)">
                    <v-tooltip location="top" text="Terkunci — sudah diajukan, tidak bisa diubah" :open-delay="200">
                      <template #activator="{ props }">
                        <v-chip v-bind="props" size="small" :color="statusColor(cellOf(r).status)" variant="tonal" prepend-icon="mdi-lock">{{ cellOf(r).status }}</v-chip>
                      </template>
                    </v-tooltip>
                  </template>
                  <v-chip v-else size="small" :color="statusColor(cellOf(r).status)" variant="tonal">{{ cellOf(r).status }}</v-chip>
                </template>
                <span v-else class="text-medium-emphasis">-</span>
              </td>
              <td v-if="isUser">
                <v-menu v-if="cellOf(r).status === 'draft'" location="bottom end">
                  <template #activator="{ props }">
                    <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" :disabled="!!meta?.locked" @click.stop />
                  </template>
                  <v-list density="compact" min-width="160">
                    <v-list-item prepend-icon="mdi-pencil" title="Edit" @click="openEdit(r)" />
                    <v-list-item prepend-icon="mdi-delete" title="Hapus" base-color="error" @click="confirmDelete(r)" />
                  </v-list>
                </v-menu>
              </td>
            </tr>
            <tr v-if="expandedId === r.jenis_id">
              <td :colspan="colCount" class="pa-0">
                <PerhitunganPanel
                  :title="`${r.kode || '-'} — ${r.nama}`"
                  :subtitle="`${kawasanLabel} · ${labelBulan} ${tahun}`"
                  :mode-label="modeLabelOf(r)"
                  :formula="formulaOf(r)"
                  :lines="panelLines(r)"
                  :target="r.target"
                  :total="rowTotal(r)"
                  total-label="Total Bulanan"
                  basis-note="Grid memakai basis draft + diajukan + disetujui (kecuali ditolak). Angka resmi rekap/ekspor hanya status disetujui."
                />
              </td>
            </tr>
          </template>
        </tbody>
        <tfoot v-if="rows.length">
          <tr class="font-weight-bold">
            <td colspan="2">TOTAL</td>
            <td class="text-right">{{ fmt(sumTarget) }}</td>
            <td class="text-right">{{ fmt(sumSBebelum) }}</td>
            <td class="text-right">{{ fmt(sumMingguAktif) }}</td>
            <td class="text-right">{{ fmt(sumTotal) }}</td>
            <td></td>
            <td v-if="isUser"></td>
          </tr>
        </tfoot>
      </v-table>

      <div v-else-if="mode === 'list'" class="pa-3">
        <div v-if="loading" class="text-center py-6">Memuat...</div>
        <div v-else-if="!rows.length" class="text-center py-6 text-medium-emphasis">Tidak ada pos penerimaan</div>
        <template v-else>
          <RecordCard
            v-for="r in rows"
            :key="r.jenis_id"
            :title="`${r.kode || '-'} — ${r.nama}`"
            :fields="[
              { label: 'Target', value: fmt(r.target), class: 'text-right' },
              { label: 's/d Bulan Lalu', value: fmt(r.sBelum), class: 'text-right' },
              { label: `Nilai ${labelMingguAktif}`, value: fmt(cellOf(r).nilai), class: 'text-right font-weight-medium' },
              { label: 'Total Bulanan', value: fmt(rowTotal(r)), class: 'text-right font-weight-medium' },
            ]"
          >
            <template #badge>
              <v-chip v-if="cellOf(r).status" size="small" :color="statusColor(cellOf(r).status)" variant="tonal" :prepend-icon="isCellLocked(r) ? 'mdi-lock' : undefined">{{ cellOf(r).status }}</v-chip>
              <span v-else class="text-medium-emphasis text-caption">-</span>
            </template>
            <div v-if="cellOf(r).kuantitas != null && cellOf(r).tarif != null" class="text-caption text-medium-emphasis mt-1">
              {{ Number(cellOf(r).kuantitas).toLocaleString('id-ID') }} × {{ fmt(cellOf(r).tarif) }}
            </div>
            <template v-if="isUser && cellOf(r).status === 'draft'" #actions>
              <v-btn size="small" variant="text" prepend-icon="mdi-pencil" :disabled="!!meta?.locked" @click="openEdit(r)">Edit</v-btn>
              <v-btn size="small" variant="text" color="error" prepend-icon="mdi-delete" :disabled="!!meta?.locked" @click="confirmDelete(r)">Hapus</v-btn>
            </template>
          </RecordCard>
        </template>
      </div>

      <div v-else class="pa-2">
        <div v-if="loading" class="text-center py-6">Memuat...</div>
        <div v-else-if="!rows.length" class="text-center py-6 text-medium-emphasis">Tidak ada pos penerimaan</div>
        <v-list v-else density="compact" lines="one">
          <v-list-item v-for="r in rows" :key="r.jenis_id" :title="`${r.kode || '-'} — ${r.nama}`">
            <template #append>
              <span class="text-body-2 font-weight-medium mr-2">{{ fmt(cellOf(r).nilai) }}</span>
              <v-chip v-if="cellOf(r).status" size="x-small" :color="statusColor(cellOf(r).status)" variant="tonal" class="mr-1" :prepend-icon="isCellLocked(r) ? 'mdi-lock' : undefined">{{ cellOf(r).status }}</v-chip>
              <v-menu v-if="isUser && cellOf(r).status === 'draft'" location="bottom end">
                <template #activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" :disabled="!!meta?.locked" />
                </template>
                <v-list density="compact" min-width="160">
                  <v-list-item prepend-icon="mdi-pencil" title="Edit" @click="openEdit(r)" />
                  <v-list-item prepend-icon="mdi-delete" title="Hapus" base-color="error" @click="confirmDelete(r)" />
                </v-list>
              </v-menu>
            </template>
          </v-list-item>
        </v-list>
      </div>

      <v-divider />
      <v-card-text class="d-flex flex-wrap justify-space-between align-center ga-3">
        <div class="text-body-2 text-medium-emphasis">
          Total {{ labelMingguAktif }}: <b>{{ fmt(sumMingguAktif) }}</b> · Total Bulanan: <b>{{ fmt(sumTotal) }}</b>
        </div>
        <div class="d-flex ga-2">
          <v-btn v-if="isUser && !meta?.locked" color="secondary" variant="tonal" prepend-icon="mdi-send-clock" :disabled="!hasDraftMinggu(tabMinggu)" :loading="ajukanMingguLoading" @click="ajukanMingguIni">Ajukan Minggu Ini</v-btn>
          <v-btn v-if="isUser && !meta?.locked" color="primary" variant="tonal" prepend-icon="mdi-send" :disabled="!hasDraft" :loading="ajukanLoading" @click="ajukanSemua">Ajukan Semua</v-btn>
        </div>
      </v-card-text>
    </v-card>

    <AppDialog v-model="dialog" :title="`${editing ? 'Edit Entri' : 'Tambah Entri'} — ${labelMingguAktif}`" :max-width="560" :icon="editing ? 'mdi-pencil' : 'mdi-plus'">
      <div class="text-caption text-medium-emphasis mb-3">
        {{ kawasanLabel }} · {{ meta?.bulanLabel || bulanOpts.find((b) => b.value === bulan)?.label }} {{ tahun }} · {{ labelMingguAktif }}
      </div>
      <v-autocomplete
        v-model="form.jenis_retribusi_id"
        :items="jenisOpts"
        item-title="label"
        item-value="value"
        label="Jenis Penerimaan *"
        variant="outlined"
        density="compact"
        :disabled="!!editing"
        :error-messages="err.jenis"
        class="mb-2"
        @update:model-value="onJenisChange"
      />
      <v-text-field
        v-if="selectedMode === 'kuantitas'"
        v-model.number="form.kuantitas"
        :label="`Jumlah unit${selectedSatuan ? ` (${selectedSatuan})` : ''} *`"
        type="number"
        variant="outlined"
        density="compact"
        :error-messages="err.nilai"
        class="mb-2"
      />
      <v-text-field
        v-else
        :model-value="nilaiDisplay"
        :label="`Nilai ${labelMingguAktif} *`"
        variant="outlined"
        density="compact"
        prefix="Rp"
        inputmode="numeric"
        :error-messages="err.nilai"
        class="mb-2"
        @input="onNilaiInput"
      />
      <v-alert v-if="selectedMode === 'kuantitas' && selectedRow" type="info" variant="tonal" density="compact" class="mb-2">
        <div class="text-body-2">
          Perhitungan: <b>{{ (Number(form.kuantitas) || 0).toLocaleString('id-ID') }}</b>
          <span v-if="selectedRow.tarif"> × {{ fmt(selectedRow.tarif) }}</span>
          <span v-else class="text-error"> — tarif belum diisi</span>
          = <b>{{ fmt(previewTotal) }}</b>
        </div>
      </v-alert>
      <v-alert v-if="selectedMode === 'kuantitas' && selectedRow && !selectedRow.tarif" type="warning" variant="tonal" density="compact" class="mb-2">
        Tarif belum diisi untuk jenis ini. Lengkapi dulu di <b>Master → Jenis Retribusi</b> sebelum menyimpan.
      </v-alert>
      <v-text-field v-model="form.catatan" label="Catatan" variant="outlined" density="compact" hide-details class="mb-2" />
      <v-alert v-if="selectedRow" type="info" variant="tonal" density="compact" class="mt-2">
        <div class="text-body-2">Target: <b>{{ fmt(selectedRow.target) }}</b></div>
        <div class="text-body-2">s/d Bulan Lalu: <b>{{ fmt(selectedRow.sBelum) }}</b></div>
        <div class="text-body-2">Total Bulanan (sebelum perubahan): <b>{{ fmt(rowTotal(selectedRow)) }}</b></div>
      </v-alert>
      <template #actions>
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">Batal</v-btn>
        <v-btn color="primary" :loading="saving" @click="saveEntri">Simpan</v-btn>
      </template>
    </AppDialog>

    <AppDialog v-model="delDialog" title="Hapus entri?" :max-width="420" icon="mdi-delete">
      Yakin hapus entri <b>{{ delTarget?.nama }}</b> untuk <b>{{ labelMingguAktif }}</b>?
      <template #actions>
        <v-spacer />
        <v-btn variant="text" @click="delDialog = false">Batal</v-btn>
        <v-btn color="error" :loading="deleting" @click="doDelete">Hapus</v-btn>
      </template>
    </AppDialog>

    <v-snackbar v-model="snack.show" :color="snack.color" timeout="3000">{{ snack.msg }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const { mode } = useViewMode('entri-mingguan')

type MingguCell = { minggu: number; nilai: number; saved: number; kuantitas: number | null; tarif: number | null; realisasi_id: number | null; status: string | null; catatan: string }
type GridRow = { jenis_id: number; kode: string; nama: string; level: number; tarif: number | null; mode_tarif: string; satuan: string; target: number; sBelum: number; minggu: MingguCell[]; totalMingguan: number }
type Kawasan = { id: number; kode: string; nama: string }
type Jenis = { id: number; kode: string; nama: string; kawasan_id: number; level: number; has_child: number; tarif: number | null; mode_tarif: string; satuan: string }

const session = useUserSession()
const isUser = computed(() => String(session.user.value?.role) === 'user')

const kawasan = ref<Kawasan[]>([])
const kawasanOpts = computed(() => kawasan.value.map((k) => ({ label: `${k.kode} — ${k.nama}`, value: k.id })))
const kawasanId = ref<number | null>(null)
const kawasanLabel = computed(() => kawasanOpts.value.find((k) => k.value === kawasanId.value)?.label || '-')
const tahun = ref(new Date().getFullYear())
const tahunOpts = [2024, 2025, 2026, 2027]
const bulan = ref(new Date().getMonth() + 1)
const bulanOpts = [
  { label: 'Januari', value: 1 }, { label: 'Februari', value: 2 }, { label: 'Maret', value: 3 }, { label: 'April', value: 4 },
  { label: 'Mei', value: 5 }, { label: 'Juni', value: 6 }, { label: 'Juli', value: 7 }, { label: 'Agustus', value: 8 },
  { label: 'September', value: 9 }, { label: 'Oktober', value: 10 }, { label: 'November', value: 11 }, { label: 'Desember', value: 12 },
]

const rows = ref<GridRow[]>([])
const jenisList = ref<Jenis[]>([])
const loading = ref(false)
const meta = ref<{ locked: boolean; bulanLabel: string } | null>(null)
const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' | 'warning' })
const ajukanLoading = ref(false)
const ajukanMingguLoading = ref(false)
const tabMinggu = ref(1)
const { formatRupiah: fmt, useRupiahInput } = useCurrency()

const mingguTabs = [
  { value: 1, label: 'Minggu I', range: '1–7' },
  { value: 2, label: 'Minggu II', range: '8–14' },
  { value: 3, label: 'Minggu III', range: '15–21' },
  { value: 4, label: 'Minggu IV', range: '22–akhir' },
]
const labelMingguAktif = computed(() => mingguTabs.find((w) => w.value === tabMinggu.value)?.label || `Minggu ${tabMinggu.value}`)

const colCount = computed(() => (isUser.value ? 8 : 7))

const jenisOpts = computed(() => jenisList.value
  .filter((j) => !j.has_child)
  .map((j) => {
    const st = cellStatusOf(j.id)
    const locked = isStatusLocked(st)
    return {
      label: `${j.kode || '-'} — ${j.nama}${locked ? ` (${st})` : ''}`,
      value: j.id,
      props: { disabled: locked },
    }
  }))

function toast(msg: string, color: typeof snack.color = 'success') { snack.msg = msg; snack.color = color; snack.show = true }

function statusColor(s: string | null) {
  if (s === 'disetujui') return 'success'
  if (s === 'diajukan') return 'warning'
  if (s === 'ditolak') return 'error'
  return 'grey'
}

// Ambil sel minggu yang sedang aktif dari sebuah baris.
function cellOf(r: GridRow): MingguCell { return r.minggu[tabMinggu.value - 1]! }

// Sel terkunci bila sudah masuk alur verifikasi (bukan draft) — tidak bisa diubah.
function isCellLocked(r: GridRow): boolean {
  return isStatusLocked(cellOf(r).status)
}

function isStatusLocked(s: string | null): boolean {
  return !!s && s !== 'draft'
}

// Status sel minggu aktif untuk sebuah jenis (untuk menonaktifkan opsi di modal).
function cellStatusOf(jenisId: number): string | null {
  const r = rows.value.find((row) => row.jenis_id === jenisId)
  return r ? cellOf(r).status : null
}

const hasDraft = computed(() => rows.value.some((r) => r.minggu.some((m) => m.status === 'draft')))
function hasDraftMinggu(minggu: number) { return rows.value.some((r) => r.minggu[minggu - 1]?.status === 'draft') }
function rowTotal(r: GridRow) { return r.minggu.reduce((s, m) => s + m.nilai, 0) }
const sumTarget = computed(() => rows.value.reduce((s, r) => s + r.target, 0))
const sumSBebelum = computed(() => rows.value.reduce((s, r) => s + r.sBelum, 0))
const sumMinggu = computed(() => [0, 1, 2, 3].map((i) => rows.value.reduce((s, r) => s + r.minggu[i]!.nilai, 0)))
const sumMingguAktif = computed(() => rows.value.reduce((s, r) => s + r.minggu[tabMinggu.value - 1]!.nilai, 0))
const sumTotal = computed(() => sumMinggu.value.reduce((s, v) => s + v, 0))

// ── Panel langkah perhitungan (inline expand) ─────────────────────
const expandedId = ref<number | null>(null)
function toggleExpand(id: number) { expandedId.value = expandedId.value === id ? null : id }

const labelBulan = computed(() => meta.value?.bulanLabel || bulanOpts.find((b) => b.value === bulan.value)?.label || '')

function modeLabelOf(r: GridRow): string {
  if (r.mode_tarif === 'kuantitas') {
    const parts = ['Kuantitas']
    if (r.satuan) parts.push(r.satuan)
    if (r.tarif) parts.push(`tarif ${fmt(r.tarif)}`)
    return parts.join(' · ')
  }
  return 'Langsung'
}

function formulaOf(r: GridRow): string {
  return r.mode_tarif === 'kuantitas' ? 'jumlah = round(kuantitas × tarif)' : 'jumlah = nilai Rupiah yang diinput'
}

function panelLines(r: GridRow) {
  const lines: { op?: string; label: string; value: string; note?: string }[] = [
    { label: 's/d Bulan Lalu', value: fmt(r.sBelum) },
  ]
  mingguTabs.forEach((w, i) => {
    const cell = r.minggu[i]!
    const noteParts: string[] = []
    if (cell.kuantitas != null && cell.tarif != null) noteParts.push(`${Number(cell.kuantitas).toLocaleString('id-ID')} × ${fmt(cell.tarif)}`)
    if (cell.status) noteParts.push(cell.status)
    lines.push({ op: '+', label: `${w.label} (tgl ${w.range})`, value: fmt(cell.nilai), note: noteParts.join(' · ') || undefined })
  })
  return lines
}

// ── Modal input/edit ──────────────────────────────────────────────
const dialog = ref(false)
const editing = ref<GridRow | null>(null)
const saving = ref(false)
const form = reactive<{ jenis_retribusi_id: number | null; nilai: number; kuantitas: number; catatan: string }>({ jenis_retribusi_id: null, nilai: 0, kuantitas: 0, catatan: '' })
const err = reactive({ jenis: '', nilai: '' })
const { display: nilaiDisplay, onInput: onNilaiInput } = useRupiahInput(toRef(form, 'nilai'))

const selectedRow = computed<GridRow | null>(() => {
  if (editing.value) return editing.value
  if (!form.jenis_retribusi_id) return null
  return rows.value.find((r) => r.jenis_id === form.jenis_retribusi_id) || null
})

// Mode input mengikuti jenis terpilih (mode_tarif per leaf).
const selectedMode = computed(() => (selectedRow.value?.mode_tarif === 'kuantitas' ? 'kuantitas' : 'langsung'))
const selectedSatuan = computed(() => selectedRow.value?.satuan || '')
const previewTotal = computed(() => Math.round((Number(form.kuantitas) || 0) * (selectedRow.value?.tarif || 0)))

// Saat jenis dipilih: tolak bila minggu aktif sudah terkunci (pengaman bila
// opsi lolos via keyboard/autocomplete meski sudah disabled).
function onJenisChange(val: number | null) {
  if (val == null) return
  const st = cellStatusOf(Number(val))
  if (isStatusLocked(st)) {
    form.jenis_retribusi_id = null
    err.jenis = ''
    toast(`Entri ${labelMingguAktif.value} untuk jenis ini sudah ${st}, tidak bisa diubah`, 'error')
  }
}

function openInput() {
  if (!isUser.value || meta.value?.locked) return
  editing.value = null
  form.jenis_retribusi_id = null
  form.nilai = 0
  form.kuantitas = 0
  form.catatan = ''
  err.jenis = ''; err.nilai = ''
  dialog.value = true
}

function openEdit(r: GridRow) {
  if (!isUser.value || meta.value?.locked) return
  const cell = cellOf(r)
  if (cell.status !== 'draft') return
  editing.value = r
  form.jenis_retribusi_id = r.jenis_id
  form.nilai = cell.nilai
  form.kuantitas = cell.kuantitas ?? 0
  form.catatan = cell.catatan || ''
  err.jenis = ''; err.nilai = ''
  dialog.value = true
}

async function saveEntri() {
  err.jenis = ''; err.nilai = ''
  if (!form.jenis_retribusi_id) err.jenis = 'Jenis wajib dipilih'
  if (selectedMode.value === 'kuantitas') {
    if (!Number.isFinite(Number(form.kuantitas)) || Number(form.kuantitas) < 0) err.nilai = 'Jumlah unit harus >= 0'
    if (!selectedRow.value?.tarif) err.nilai = 'Tarif belum diisi di Master Jenis Retribusi'
  } else if (!Number.isFinite(Number(form.nilai)) || Number(form.nilai) < 0) {
    err.nilai = 'Nilai harus >= 0'
  }
  if (err.jenis || err.nilai) return

  const target = rows.value.find((r) => r.jenis_id === form.jenis_retribusi_id)
  const cell = target ? cellOf(target) : null
  if (cell && cell.status && cell.status !== 'draft') {
    toast('Entri minggu ini sudah diajukan/disetujui, tidak bisa diubah', 'error')
    return
  }

  saving.value = true
  try {
    const body: Record<string, unknown> = {
      jenis_retribusi_id: form.jenis_retribusi_id,
      tahun: tahun.value,
      bulan: bulan.value,
      minggu: tabMinggu.value,
      catatan: form.catatan.trim(),
    }
    if (selectedMode.value === 'kuantitas') body.kuantitas = Number(form.kuantitas)
    else body.jumlah = Number(form.nilai)

    await $fetch('/api/realisasi/grid', { method: 'POST', body })
    toast(editing.value ? 'Entri diperbarui' : 'Entri tersimpan')
    dialog.value = false
    await load()
  } catch (e: unknown) {
    toast((e as { data?: { message?: string } })?.data?.message || (e instanceof Error ? e.message : String(e)), 'error')
  } finally { saving.value = false }
}

// ── Hapus entri draft ─────────────────────────────────────────────
const delDialog = ref(false)
const delTarget = ref<GridRow | null>(null)
const deleting = ref(false)

function confirmDelete(r: GridRow) {
  if (!isUser.value || meta.value?.locked) return
  const cell = cellOf(r)
  if (cell.status !== 'draft' || !cell.realisasi_id) return
  delTarget.value = r
  delDialog.value = true
}

async function doDelete() {
  const r = delTarget.value
  if (!r) return
  const cell = cellOf(r)
  if (!cell.realisasi_id) return
  deleting.value = true
  try {
    await $fetch(`/api/realisasi/${cell.realisasi_id}`, { method: 'DELETE' })
    toast('Entri dihapus')
    delDialog.value = false
    await load()
  } catch (e: unknown) {
    toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error')
  } finally { deleting.value = false }
}

// ── Data loading ──────────────────────────────────────────────────
async function loadKawasan() {
  try { const r = await $fetch<{ data: Kawasan[] }>('/api/kawasan'); kawasan.value = r.data; if (!kawasanId.value && r.data.length) kawasanId.value = r.data[0]!.id } catch {}
}
async function loadJenis() {
  try { const r = await $fetch<{ data: Jenis[] }>('/api/jenis-retribusi'); jenisList.value = r.data } catch {}
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

onMounted(async () => { await loadKawasan(); await loadJenis(); await load() })
</script>

<style scoped>
.expand-row {
  cursor: pointer;
}
.expand-row:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}
.expand-chevron {
  transition: transform 0.15s ease;
  vertical-align: middle;
}
.expand-chevron--open {
  transform: rotate(90deg);
}
</style>
