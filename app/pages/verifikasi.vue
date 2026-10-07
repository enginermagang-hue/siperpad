<template>
  <div>
    <div class="d-flex align-center mb-6">
      <v-icon size="36" color="primary" class="mr-3">mdi-check-decagram</v-icon>
      <h1 class="text-h4 font-weight-medium">Verifikasi</h1>
    </div>

    <v-tabs v-model="tab" class="mb-4" color="primary">
      <v-tab value="realisasi">Realisasi Diajukan</v-tab>
      <v-tab value="batch">Batch Laporan</v-tab>
      <v-tab value="periode">Kunci Periode</v-tab>
      <v-tab value="catatan">Catatan Temuan</v-tab>
      <v-tab value="audit">Audit Trail</v-tab>
    </v-tabs>

    <!-- Realisasi -->
    <div v-show="tab === 'realisasi'">
      <v-card flat elevation="2" class="mb-4">
        <v-card-text class="pb-0">
          <div class="d-flex flex-wrap ga-3 mb-4">
            <v-select v-model="filterKawasan" :items="kawasanOpts" item-title="label" item-value="value" label="Kawasan" density="compact" variant="outlined" hide-details clearable style="max-width: 200px" placeholder="Semua" @update:model-value="load" />
            <v-select v-model="filterJenis" :items="jenisFilterOpts" item-title="label" item-value="value" label="Jenis" density="compact" variant="outlined" hide-details clearable style="max-width: 260px" placeholder="Semua jenis" @update:model-value="load" />
            <v-text-field v-model="q" density="compact" variant="outlined" placeholder="Cari kode/nama/catatan..." prepend-inner-icon="mdi-magnify" hide-details clearable style="max-width: 260px" />
            <v-spacer />
            <v-btn v-if="canVerif && filtered.length" color="success" variant="tonal" prepend-icon="mdi-check-all" :loading="bulkLoading" @click="verifMassal('disetujui')">Setujui Semua ({{ filtered.length }})</v-btn>
          </div>
        </v-card-text>
      </v-card>

      <v-card flat elevation="2">
        <v-table density="comfortable">
          <thead><tr><th>Tanggal</th><th>Kode</th><th>Jenis</th><th>Kawasan</th><th class="text-right">Jumlah</th><th class="text-right">Target</th><th class="text-right">Capaian</th><th>Aksi</th></tr></thead>
          <tbody>
            <tr v-if="loading"><td colspan="8" class="text-center py-6">Memuat...</td></tr>
            <tr v-else-if="!filtered.length"><td colspan="8" class="text-center py-6 text-medium-emphasis">Tidak ada realisasi diajukan</td></tr>
            <tr v-for="r in paginated" :key="r.id">
              <td>{{ r.tanggal }}</td>
              <td class="font-weight-medium">{{ r.jenis_kode || '-' }}</td>
              <td>{{ r.jenis_nama }}</td>
              <td><v-chip size="small" variant="tonal">{{ r.kawasan_kode }} — {{ r.kawasan_nama }}</v-chip></td>
              <td class="text-right">{{ fmt(r.jumlah) }}</td>
              <td class="text-right">{{ fmt(r.target_nilai) }}</td>
              <td class="text-right"><v-chip :color="r.capaian >= 100 ? 'success' : r.capaian >= 75 ? 'warning' : 'error'" size="small">{{ r.capaian }}%</v-chip></td>
              <td>
                <v-btn v-if="canVerif" size="small" color="success" variant="tonal" class="mr-1" :loading="actingId === r.id" @click="verif(r, 'disetujui')">Setujui</v-btn>
                <v-btn v-if="canVerif" size="small" color="error" variant="tonal" :loading="actingId === r.id" @click="verif(r, 'ditolak')">Tolak</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
        <v-divider v-if="total" />
        <div v-if="total" class="d-flex align-center justify-space-between flex-wrap ga-3 px-4 py-3">
          <div class="d-flex align-center ga-2 text-body-2 text-medium-emphasis">
            <span>Menampilkan {{ from }}–{{ to }} dari {{ total }}</span>
            <v-select v-model="perPage" :items="[5, 10, 25, 50]" density="compact" variant="outlined" hide-details style="max-width: 90px" />
            <span>per halaman</span>
          </div>
          <v-pagination v-if="pageCount > 1" v-model="currentPage" :length="pageCount" :total-visible="5" density="compact" />
        </div>
      </v-card>
    </div>

    <!-- Batch -->
    <div v-show="tab === 'batch'">
      <div class="d-flex justify-end mb-3">
        <v-btn v-if="isAdmin" color="primary" prepend-icon="mdi-plus" @click="batchDialog = true">Buat Batch</v-btn>
      </div>
      <v-card flat elevation="2" class="mb-4">
        <v-card-text class="pb-0">
          <div class="d-flex flex-wrap ga-3 mb-4">
            <v-select v-model="batchFilterKawasan" :items="kawasanOpts" item-title="label" item-value="value" label="Kawasan" density="compact" variant="outlined" hide-details clearable style="max-width: 200px" placeholder="Semua" @update:model-value="loadBatches" />
            <v-select v-model="batchFilterStatus" :items="['draft','diajukan','disetujui','ditolak']" density="compact" variant="outlined" hide-details clearable style="max-width: 160px" placeholder="Semua status" @update:model-value="loadBatches" />
          </div>
        </v-card-text>
      </v-card>
      <v-card flat elevation="2">
        <v-table density="comfortable">
          <thead><tr><th>Periode</th><th>Kawasan</th><th>Tipe</th><th>Tahun</th><th>Status</th><th style="width: 200px">Aksi</th></tr></thead>
          <tbody>
            <tr v-if="batchLoading"><td colspan="6" class="text-center py-6">Memuat...</td></tr>
            <tr v-else-if="!batches.length"><td colspan="6" class="text-center py-6 text-medium-emphasis">Belum ada batch</td></tr>
            <tr v-for="b in batches" :key="b.id">
              <td>{{ b.periode_start }} — {{ b.periode_end }}</td>
              <td><v-chip size="small" variant="tonal">{{ b.kawasan_kode }} — {{ b.kawasan_nama }}</v-chip></td>
              <td>{{ b.periode_type }}</td>
              <td>{{ b.tahun }}</td>
              <td><v-chip :color="batchColor(b.status)" size="small">{{ b.status }}</v-chip></td>
              <td>
                <v-btn v-if="b.status === 'draft' && isAdmin" size="small" color="primary" variant="tonal" class="mr-1" @click="ajukanBatch(b)">Ajukan</v-btn>
                <template v-if="b.status === 'diajukan' && canVerif">
                  <v-btn size="small" color="success" variant="tonal" class="mr-1" @click="verifBatch(b, 'disetujui')">Setujui</v-btn>
                  <v-btn size="small" color="error" variant="tonal" @click="verifBatch(b, 'ditolak')">Tolak</v-btn>
                </template>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <v-dialog v-model="batchDialog" max-width="520" persistent>
        <v-card>
          <v-card-title class="text-h6">Buat Batch Laporan</v-card-title>
          <v-card-text>
            <v-select v-model="batchForm.kawasan_id" :items="kawasanOpts" item-title="label" item-value="value" label="Kawasan *" variant="outlined" density="compact" :error-messages="batchErr.kawasan_id" class="mb-2" />
            <v-select v-model="batchForm.periode_type" :items="['mingguan','bulanan','semester','tahunan']" label="Tipe Periode *" variant="outlined" density="compact" class="mb-2" />
            <v-text-field v-model="batchForm.periode_start" label="Periode Start *" type="date" variant="outlined" density="compact" class="mb-2" />
            <v-text-field v-model="batchForm.periode_end" label="Periode End *" type="date" variant="outlined" density="compact" class="mb-2" />
            <v-text-field v-model.number="batchForm.tahun" label="Tahun *" type="number" variant="outlined" density="compact" class="mb-2" />
            <v-text-field v-model="batchForm.catatan" label="Catatan" variant="outlined" density="compact" hide-details />
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn variant="text" @click="batchDialog = false">Batal</v-btn><v-btn color="primary" :loading="batchSaving" @click="createBatch">Simpan</v-btn></v-card-actions>
        </v-card>
      </v-dialog>
    </div>

    <!-- Kunci Periode -->
    <div v-show="tab === 'periode'">
      <v-card flat elevation="2" class="mb-4">
        <v-card-text>
          <div class="d-flex flex-wrap ga-3 align-center">
            <v-select v-model="lockKawasan" :items="kawasanOpts" item-title="label" item-value="value" label="Kawasan *" density="compact" variant="outlined" hide-details style="max-width: 240px" />
            <v-select v-model="lockTahun" :items="[2024, 2025, 2026, 2027]" label="Tahun" density="compact" variant="outlined" hide-details style="max-width: 110px" />
            <v-select v-model="lockBulan" :items="bulanOpts" item-title="label" item-value="value" label="Bulan" density="compact" variant="outlined" hide-details style="max-width: 150px" />
            <v-btn v-if="isAdmin" color="primary" prepend-icon="mdi-lock" :loading="lockLoading" @click="kunciPeriode">Kunci Periode</v-btn>
          </div>
          <div class="text-caption text-medium-emphasis mt-2">Kunci hanya bisa dilakukan setelah semua realisasi periode terverifikasi (disetujui). Hanya admin.</div>
        </v-card-text>
      </v-card>
      <v-card flat elevation="2">
        <v-table density="comfortable">
          <thead><tr><th>Tahun</th><th>Bulan</th><th>Kawasan</th><th>Dikunci oleh</th><th>Waktu</th><th style="width:120px">Aksi</th></tr></thead>
          <tbody>
            <tr v-if="lockRowsLoading"><td colspan="6" class="text-center py-6">Memuat...</td></tr>
            <tr v-else-if="!lockRows.length"><td colspan="6" class="text-center py-6 text-medium-emphasis">Belum ada periode terkunci</td></tr>
            <tr v-for="l in lockRows" :key="l.id">
              <td>{{ l.tahun }}</td>
              <td>{{ bulanLabel(l.bulan) }}</td>
              <td><v-chip size="small" variant="tonal">{{ l.kawasan_kode }} — {{ l.kawasan_nama }}</v-chip></td>
              <td>{{ l.locked_by_nama || '-' }}</td>
              <td class="text-caption">{{ l.locked_at }}</td>
              <td><v-btn v-if="isAdmin" size="small" color="warning" variant="tonal" @click="bukaKunci(l)">Buka</v-btn></td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>

    <!-- Catatan Temuan -->
    <div v-show="tab === 'catatan'">
      <v-card flat elevation="2" class="mb-4">
        <v-card-text>
          <div class="d-flex flex-wrap ga-3 align-center mb-3">
            <v-select v-model="catKawasan" :items="kawasanOpts" item-title="label" item-value="value" label="Kawasan *" density="compact" variant="outlined" hide-details style="max-width: 220px" />
            <v-select v-model="catTahun" :items="[2024, 2025, 2026, 2027]" label="Tahun" density="compact" variant="outlined" hide-details style="max-width: 110px" />
            <v-select v-model="catBulan" :items="bulanOpts" item-title="label" item-value="value" label="Bulan" density="compact" variant="outlined" hide-details style="max-width: 150px" />
            <v-text-field v-model="catIsi" label="Catatan / temuan *" density="compact" variant="outlined" hide-details style="min-width: 280px" />
            <v-btn color="primary" prepend-icon="mdi-plus" :loading="catSaving" @click="simpanCatatan">Tambah</v-btn>
          </div>
          <div class="d-flex flex-wrap ga-3">
            <v-select v-model="catFilterStatus" :items="['terbuka','selesai']" label="Status" density="compact" variant="outlined" hide-details clearable placeholder="Semua" style="max-width: 160px" @update:model-value="loadCatatan" />
          </div>
        </v-card-text>
      </v-card>
      <v-card flat elevation="2">
        <v-table density="comfortable">
          <thead><tr><th>Periode</th><th>Kawasan</th><th>Pos</th><th>Catatan</th><th>Status</th><th>Oleh</th><th style="width:140px">Aksi</th></tr></thead>
          <tbody>
            <tr v-if="catLoading"><td colspan="7" class="text-center py-6">Memuat...</td></tr>
            <tr v-else-if="!catatan.length"><td colspan="7" class="text-center py-6 text-medium-emphasis">Belum ada catatan</td></tr>
            <tr v-for="c in catatan" :key="c.id">
              <td>{{ bulanLabel(c.bulan) }} {{ c.tahun }}</td>
              <td><v-chip size="small" variant="tonal">{{ c.kawasan_kode }}</v-chip></td>
              <td class="text-caption">{{ c.jenis_nama || '—' }}</td>
              <td>{{ c.isi }}</td>
              <td><v-chip size="small" :color="c.status === 'selesai' ? 'success' : 'warning'">{{ c.status }}</v-chip></td>
              <td class="text-caption">{{ c.created_by_nama || '-' }}</td>
              <td>
                <v-btn size="small" variant="tonal" color="success" class="mr-1" @click="toggleCatatan(c)">{{ c.status === 'selesai' ? 'Buka' : 'Selesai' }}</v-btn>
                <v-btn v-if="isAdmin" size="small" variant="text" color="error" icon="mdi-delete" @click="hapusCatatan(c)" />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>

    <!-- Audit -->
    <div v-show="tab === 'audit'">
      <v-card flat elevation="2" class="mb-4">
        <v-card-text class="pb-0">
          <div class="d-flex flex-wrap ga-3 mb-4">
            <v-select v-model="auditEntitas" :items="['', 'realisasi', 'laporan_batch']" label="Entitas" density="compact" variant="outlined" hide-details clearable style="max-width: 200px" placeholder="Semua" @update:model-value="loadAudit" />
            <v-text-field v-model="auditId" density="compact" variant="outlined" placeholder="Entitas ID (opsional)" hide-details clearable style="max-width: 200px" @keyup.enter="loadAudit" />
            <v-btn color="primary" variant="tonal" @click="loadAudit">Cari</v-btn>
          </div>
        </v-card-text>
      </v-card>
      <v-card flat elevation="2">
        <v-table density="comfortable">
          <thead><tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Entitas</th><th>ID</th><th>Before → After</th></tr></thead>
          <tbody>
            <tr v-if="auditLoading"><td colspan="6" class="text-center py-6">Memuat...</td></tr>
            <tr v-else-if="!auditRows.length"><td colspan="6" class="text-center py-6 text-medium-emphasis">Belum ada log</td></tr>
            <tr v-for="a in auditRows" :key="a.id">
              <td class="text-caption">{{ a.at }}</td>
              <td>{{ a.user_nama || a.user_email || a.user_id }}</td>
              <td><v-chip size="small" :color="auditColor(a.aksi)">{{ a.aksi }}</v-chip></td>
              <td>{{ a.entitas }}</td>
              <td>{{ a.entitas_id }}</td>
              <td class="text-caption">{{ a.before || '-' }} → {{ a.after || '-' }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>

    <v-snackbar v-model="snack.show" :color="snack.color" timeout="3000">{{ snack.msg }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })
type Row = { id: number; jenis_retribusi_id: number; tanggal: string; jumlah: number; jenis_kode: string; jenis_nama: string; kawasan_id: number; kawasan_kode: string; kawasan_nama: string; target_nilai: number; capaian: number; status: string; catatan?: string }
type Kawasan = { id: number; kode: string; nama: string }
type Jenis = { id: number; kode: string; nama: string; kawasan_id: number }

const session = useUserSession()
const role = computed(() => String(session.user.value?.role || ''))
const isAdmin = computed(() => role.value === 'admin')
const canVerif = computed(() => ['verifikator', 'kepala', 'admin'].includes(role.value))

const tab = ref('realisasi')

// Realisasi
const kawasan = ref<Kawasan[]>([])
const jenisList = ref<Jenis[]>([])
const rows = ref<Row[]>([])
const loading = ref(false)
const q = ref('')
const filterKawasan = ref<number | null>(null)
const filterJenis = ref<number | null>(null)
const kawasanOpts = computed(() => kawasan.value.map((k) => ({ label: `${k.kode} — ${k.nama}`, value: k.id })))
const jenisFilterOpts = computed(() => {
  const pool = filterKawasan.value ? jenisList.value.filter((j) => j.kawasan_id === filterKawasan.value) : jenisList.value
  return pool.map((j) => ({ label: `${j.kode || '-'} — ${j.nama}`, value: j.id }))
})
const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return rows.value
  return rows.value.filter((r) => (r.jenis_kode || '').toLowerCase().includes(s) || r.jenis_nama.toLowerCase().includes(s) || r.catatan?.toLowerCase().includes(s))
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
watch([q, filterKawasan, filterJenis], () => { currentPage.value = 1 })
watch(perPage, () => { currentPage.value = 1 })
watch(pageCount, (pc) => { if (currentPage.value > pc) currentPage.value = pc })

const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' | 'warning' })
function toast(msg: string, color: typeof snack.color = 'success') { snack.msg = msg; snack.color = color; snack.show = true }
const { formatRupiah: fmt } = useCurrency()
const actingId = ref<number | null>(null)
const bulkLoading = ref(false)

const bulanOpts = [
  { label: 'Januari', value: 1 }, { label: 'Februari', value: 2 }, { label: 'Maret', value: 3 }, { label: 'April', value: 4 },
  { label: 'Mei', value: 5 }, { label: 'Juni', value: 6 }, { label: 'Juli', value: 7 }, { label: 'Agustus', value: 8 },
  { label: 'September', value: 9 }, { label: 'Oktober', value: 10 }, { label: 'November', value: 11 }, { label: 'Desember', value: 12 },
]
function bulanLabel(b: number) { return bulanOpts.find((x) => x.value === Number(b))?.label || String(b) }

async function verifMassal(aksi: string) {
  const ids = filtered.value.map((r) => r.id)
  if (!ids.length) return
  bulkLoading.value = true
  try {
    const r = await $fetch<{ count: number }>('/api/realisasi/verifikasi-massal', { method: 'POST', body: { ids, aksi } })
    toast(`${r.count} realisasi ${aksi}`)
    await load(); await loadAudit()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error') }
  finally { bulkLoading.value = false }
}

// Kunci Periode
type LockRow = { id: number; tahun: number; bulan: number; kawasan_kode: string; kawasan_nama: string; locked_by_nama: string; locked_at: string }
const lockKawasan = ref<number | null>(null)
const lockTahun = ref(new Date().getFullYear())
const lockBulan = ref(new Date().getMonth() + 1)
const lockRows = ref<LockRow[]>([])
const lockRowsLoading = ref(false)
const lockLoading = ref(false)
async function loadLocks() {
  lockRowsLoading.value = true
  try { const r = await $fetch<{ data: LockRow[] }>('/api/periode-lock', { query: { tahun: String(lockTahun.value) } }); lockRows.value = r.data }
  catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat kunci', 'error') }
  finally { lockRowsLoading.value = false }
}
async function kunciPeriode() {
  if (!lockKawasan.value) { toast('Pilih kawasan', 'error'); return }
  lockLoading.value = true
  try {
    await $fetch('/api/periode-lock', { method: 'POST', body: { tahun: lockTahun.value, bulan: lockBulan.value, kawasan_id: lockKawasan.value } })
    toast('Periode dikunci')
    await loadLocks(); await loadAudit()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal mengunci', 'error') }
  finally { lockLoading.value = false }
}
async function bukaKunci(l: LockRow) {
  try { await $fetch(`/api/periode-lock/${l.id}`, { method: 'DELETE' }); toast('Kunci dibuka', 'warning'); await loadLocks(); await loadAudit() }
  catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal', 'error') }
}

// Catatan Temuan
type CatRow = { id: number; tahun: number; bulan: number; kawasan_kode: string; jenis_nama: string | null; isi: string; status: string; created_by_nama: string | null }
const catatan = ref<CatRow[]>([])
const catLoading = ref(false)
const catSaving = ref(false)
const catKawasan = ref<number | null>(null)
const catTahun = ref(new Date().getFullYear())
const catBulan = ref(new Date().getMonth() + 1)
const catIsi = ref('')
const catFilterStatus = ref<string | null>(null)
async function loadCatatan() {
  catLoading.value = true
  try {
    const params: Record<string, string> = {}
    if (catFilterStatus.value) params.status = catFilterStatus.value
    const r = await $fetch<{ data: CatRow[] }>('/api/catatan', { query: params })
    catatan.value = r.data
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat catatan', 'error') }
  finally { catLoading.value = false }
}
async function simpanCatatan() {
  if (!catKawasan.value) { toast('Pilih kawasan', 'error'); return }
  if (!catIsi.value.trim()) { toast('Isi catatan wajib', 'error'); return }
  catSaving.value = true
  try {
    await $fetch('/api/catatan', { method: 'POST', body: { tahun: catTahun.value, bulan: catBulan.value, kawasan_id: catKawasan.value, isi: catIsi.value.trim() } })
    toast('Catatan ditambahkan')
    catIsi.value = ''
    await loadCatatan()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal', 'error') }
  finally { catSaving.value = false }
}
async function toggleCatatan(c: CatRow) {
  try {
    await $fetch(`/api/catatan/${c.id}`, { method: 'PUT', body: { status: c.status === 'selesai' ? 'terbuka' : 'selesai' } })
    await loadCatatan()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal', 'error') }
}
async function hapusCatatan(c: CatRow) {
  try { await $fetch(`/api/catatan/${c.id}`, { method: 'DELETE' }); toast('Catatan dihapus', 'warning'); await loadCatatan() }
  catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal', 'error') }
}

async function loadKawasan() { try { const r = await $fetch<{ data: Kawasan[] }>('/api/kawasan'); kawasan.value = r.data } catch {} }
async function loadJenis() { try { const r = await $fetch<{ data: Jenis[] }>('/api/jenis-retribusi'); jenisList.value = r.data } catch {} }
async function load() {
  loading.value = true
  try {
    const params: Record<string, string> = { status: 'diajukan' }
    if (filterKawasan.value) params.kawasan_id = String(filterKawasan.value)
    if (filterJenis.value) params.jenis_retribusi_id = String(filterJenis.value)
    const r = await $fetch<{ data: Row[] }>('/api/realisasi', { query: params })
    rows.value = r.data
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat', 'error') }
  finally { loading.value = false }
}
async function verif(r: Row, aksi: string) {
  actingId.value = r.id
  try {
    await $fetch(`/api/realisasi/${r.id}/verifikasi`, { method: 'POST', body: { aksi } })
    toast(aksi === 'disetujui' ? 'Disetujui' : 'Ditolak', aksi === 'disetujui' ? 'success' : 'warning')
    await load()
    await loadAudit()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error') }
  finally { actingId.value = null }
}

// Batch
const batches = ref<Record<string, unknown>[]>([]) as unknown as Ref<{ id: number; kawasan_kode: string; kawasan_nama: string; periode_start: string; periode_end: string; periode_type: string; tahun: number; status: string }[]>
const batchLoading = ref(false)
const batchFilterKawasan = ref<number | null>(null)
const batchFilterStatus = ref<string | null>(null)
const batchDialog = ref(false)
const batchSaving = ref(false)
const batchForm = reactive({ kawasan_id: null as number | null, periode_type: 'bulanan', periode_start: '', periode_end: '', tahun: new Date().getFullYear(), catatan: '' })
const batchErr = reactive({ kawasan_id: '' })
function batchColor(s: string) { if (s === 'disetujui') return 'success'; if (s === 'diajukan') return 'warning'; if (s === 'ditolak') return 'error'; return 'grey' }
async function loadBatches() {
  batchLoading.value = true
  try {
    const params: Record<string, string> = {}
    if (batchFilterKawasan.value) params.kawasan_id = String(batchFilterKawasan.value)
    if (batchFilterStatus.value) params.status = batchFilterStatus.value
    const r = await $fetch<{ data: typeof batches.value }>('/api/laporan/batch', { query: params })
    batches.value = r.data
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat batch', 'error') }
  finally { batchLoading.value = false }
}
async function createBatch() {
  batchErr.kawasan_id = ''
  if (!batchForm.kawasan_id) { batchErr.kawasan_id = 'Kawasan wajib'; return }
  if (!batchForm.periode_start || !batchForm.periode_end) { toast('Periode wajib', 'error'); return }
  batchSaving.value = true
  try {
    await $fetch('/api/laporan/batch', { method: 'POST', body: { kawasan_id: batchForm.kawasan_id, periode_type: batchForm.periode_type, periode_start: batchForm.periode_start, periode_end: batchForm.periode_end, tahun: Number(batchForm.tahun), catatan: batchForm.catatan } })
    toast('Batch dibuat')
    batchDialog.value = false
    batchForm.kawasan_id = null; batchForm.catatan = ''
    await loadBatches()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error') }
  finally { batchSaving.value = false }
}
async function ajukanBatch(b: { id: number }) {
  try { await $fetch(`/api/laporan/batch/${b.id}/ajukan`, { method: 'POST' }); toast('Batch diajukan'); await loadBatches(); await loadAudit() } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error') }
}
async function verifBatch(b: { id: number }, aksi: string) {
  try { await $fetch(`/api/laporan/batch/${b.id}/verifikasi`, { method: 'POST', body: { aksi } }); toast(aksi === 'disetujui' ? 'Batch disetujui' : 'Batch ditolak', aksi === 'disetujui' ? 'success' : 'warning'); await loadBatches(); await loadAudit() } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error') }
}

// Audit
const auditRows = ref<Record<string, unknown>[]>([]) as unknown as Ref<{ id: number; at: string; user_id: number; user_nama: string; user_email: string; aksi: string; entitas: string; entitas_id: string; before: string; after: string }[]>
const auditLoading = ref(false)
const auditEntitas = ref('')
const auditId = ref('')
function auditColor(a: string) { if (a.includes('SETUJU')) return 'success'; if (a.includes('TOLAK')) return 'error'; if (a.includes('AJUKAN')) return 'warning'; return 'grey' }
async function loadAudit() {
  auditLoading.value = true
  try {
    const params: Record<string, string> = { limit: '50' }
    if (auditEntitas.value) params.entitas = auditEntitas.value
    if (auditId.value.trim()) params.entitas_id = auditId.value.trim()
    const r = await $fetch<{ data: typeof auditRows.value }>('/api/audit-log', { query: params })
    auditRows.value = r.data
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat audit', 'error') }
  finally { auditLoading.value = false }
}

onMounted(async () => { await loadKawasan(); await loadJenis(); await load(); await loadBatches(); await loadAudit(); await loadLocks(); await loadCatatan() })
watch(tab, (v) => {
  if (v === 'audit') loadAudit()
  if (v === 'batch') loadBatches()
  if (v === 'realisasi') load()
  if (v === 'periode') loadLocks()
  if (v === 'catatan') loadCatatan()
})
</script>
