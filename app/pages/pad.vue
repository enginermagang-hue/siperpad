<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div class="d-flex align-center">
        <v-icon size="36" color="primary" class="mr-3">mdi-cash-multiple</v-icon>
        <h1 class="text-h4 font-weight-medium">Data PAD — Realisasi</h1>
      </div>
      <v-btn v-if="isAdmin" color="primary" prepend-icon="mdi-plus" @click="openAdd">Tambah Realisasi</v-btn>
    </div>

    <v-card flat elevation="2" class="mb-4">
      <v-card-text class="pb-0">
        <div class="d-flex flex-wrap ga-3 mb-4">
          <v-select v-model="filterKawasan" :items="kawasanOpts" item-title="label" item-value="value" label="Kawasan" density="compact" variant="outlined" hide-details clearable style="max-width: 200px" placeholder="Semua" @update:model-value="load" />
          <v-select v-model="filterJenis" :items="jenisFilterOpts" item-title="label" item-value="value" label="Jenis" density="compact" variant="outlined" hide-details clearable style="max-width: 260px" placeholder="Semua jenis" @update:model-value="load" />
          <v-select v-model="filterStatus" :items="statusOpts" density="compact" variant="outlined" hide-details clearable style="max-width: 160px" placeholder="Semua status" @update:model-value="load" />
          <v-text-field v-model="q" density="compact" variant="outlined" placeholder="Cari kode/nama/catatan..." prepend-inner-icon="mdi-magnify" hide-details clearable style="max-width: 260px" />
        </div>
      </v-card-text>
    </v-card>

    <v-card flat elevation="2">
      <v-table density="comfortable">
        <thead><tr><th>Tanggal</th><th>Kode</th><th>Jenis</th><th>Kawasan</th><th class="text-right">Jumlah</th><th class="text-right">Target</th><th class="text-right">Capaian</th><th>Status</th><th v-if="isAdmin" style="width: 140px">Aksi</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="9" class="text-center py-6">Memuat...</td></tr>
          <tr v-else-if="!filtered.length"><td colspan="9" class="text-center py-6 text-medium-emphasis">Belum ada data</td></tr>
          <tr v-for="r in paginated" :key="r.id">
            <td>{{ r.tanggal }}</td>
            <td class="font-weight-medium">{{ r.jenis_kode || '-' }}</td>
            <td>{{ r.jenis_nama }}</td>
            <td><v-chip size="small" variant="tonal">{{ r.kawasan_kode }} — {{ r.kawasan_nama }}</v-chip></td>
            <td class="text-right">{{ fmt(r.jumlah) }}</td>
            <td class="text-right">{{ fmt(r.target_nilai) }}</td>
            <td class="text-right"><v-chip :color="r.capaian >= 100 ? 'success' : r.capaian >= 75 ? 'warning' : 'error'" size="small">{{ r.capaian }}%</v-chip></td>
            <td><v-chip :color="statusColor(r.status)" size="small">{{ r.status }}</v-chip></td>
            <td v-if="isAdmin">
              <v-btn v-if="r.status === 'draft'" icon="mdi-pencil" variant="text" size="small" @click="openEdit(r)" />
              <v-btn v-if="r.status === 'draft'" icon="mdi-send" variant="text" size="small" color="primary" @click="confirmAjukan(r)" />
              <v-btn v-if="r.status === 'draft'" icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDelete(r)" />
            </td>
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

    <v-dialog v-model="dialog" max-width="520" persistent>
      <v-card>
        <v-card-title class="text-h6">{{ editing ? 'Edit Realisasi' : 'Tambah Realisasi' }}</v-card-title>
        <v-card-text>
          <v-select v-model="form.jenis_retribusi_id" :items="jenisOpts" item-title="label" item-value="value" label="Jenis Retribusi *" variant="outlined" density="compact" :error-messages="err.jenis" class="mb-2" @update:model-value="onJenisChange" />
          <div v-if="targetInfo !== null" class="text-caption text-medium-emphasis mb-2">Target {{ targetYear }}: <b>{{ fmt(targetInfo) }}</b> — Capaian: <b :class="previewCapaian >= 100 ? 'text-success' : previewCapaian >= 75 ? 'text-warning' : 'text-error'">{{ previewCapaian }}%</b></div>
          <v-text-field v-model="form.tanggal" label="Tanggal *" type="date" variant="outlined" density="compact" :error-messages="err.tanggal" class="mb-2" @update:model-value="onTanggalChange" />
          <v-text-field v-model="jumlahDisplay" label="Jumlah *" variant="outlined" density="compact" prefix="Rp" inputmode="numeric" :error-messages="err.jumlah" class="mb-2" @update:model-value="updatePreview" />
          <v-text-field v-model="form.catatan" label="Catatan" variant="outlined" density="compact" hide-details class="mb-2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Batal</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">Simpan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="delDialog" max-width="420" persistent>
      <v-card>
        <v-card-title class="text-h6">Hapus realisasi?</v-card-title>
        <v-card-text>Yakin hapus realisasi <b>{{ delTarget?.jenis_nama }}</b> tanggal {{ delTarget?.tanggal }}?</v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="delDialog = false">Batal</v-btn><v-btn color="error" :loading="deleting" @click="doDelete">Hapus</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="ajukanDialog" max-width="420" persistent>
      <v-card>
        <v-card-title class="text-h6">Ajukan realisasi?</v-card-title>
        <v-card-text>Realisasi akan diajukan untuk verifikasi. Tidak bisa diedit lagi setelah diajukan.</v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="ajukanDialog = false">Batal</v-btn><v-btn color="primary" :loading="ajukanLoading" @click="doAjukan">Ajukan</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.show" :color="snack.color" timeout="3000">{{ snack.msg }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

type Row = { id: number; jenis_retribusi_id: number; tanggal: string; jumlah: number; catatan: string; batch_id: number | null; status: string; created_by: number; jenis_kode: string; jenis_nama: string; kawasan_id: number; kawasan_kode: string; kawasan_nama: string; target_nilai: number; capaian: number }
type Kawasan = { id: number; kode: string; nama: string }
type Jenis = { id: number; kode: string; nama: string; kawasan_id: number; level: number; has_child: number }

const session = useUserSession()
const isAdmin = computed(() => String(session.user.value?.role) === 'admin')

const kawasan = ref<Kawasan[]>([])
const jenisList = ref<Jenis[]>([])
const rows = ref<Row[]>([])
const loading = ref(false)
const q = ref('')
const filterKawasan = ref<number | null>(null)
const filterJenis = ref<number | null>(null)
const filterStatus = ref<string | null>(null)
const statusOpts = ['draft', 'diajukan', 'disetujui', 'ditolak']

const kawasanOpts = computed(() => kawasan.value.map((k) => ({ label: `${k.kode} — ${k.nama}`, value: k.id })))
const jenisFilterOpts = computed(() => {
  const pool = filterKawasan.value ? jenisList.value.filter((j) => j.kawasan_id === filterKawasan.value) : jenisList.value
  return pool.map((j) => ({ label: `${j.kode || '-'} — ${j.nama}`, value: j.id }))
})
const jenisOpts = computed(() => jenisList.value.filter((j) => !j.has_child).map((j) => {
  const kw = kawasan.value.find((k) => k.id === j.kawasan_id)
  const kwLabel = kw ? `${kw.kode} — ` : ''
  return { label: `${kwLabel}${j.kode || '-'} — ${j.nama}`, value: j.id }
}))

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return rows.value
  return rows.value.filter((r) => (r.jenis_kode || '').toLowerCase().includes(s) || r.jenis_nama.toLowerCase().includes(s) || (r.catatan || '').toLowerCase().includes(s) || r.kawasan_nama.toLowerCase().includes(s))
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
watch([q, filterKawasan, filterJenis, filterStatus], () => { currentPage.value = 1 })
watch(perPage, () => { currentPage.value = 1 })
watch(pageCount, (pc) => { if (currentPage.value > pc) currentPage.value = pc })

const dialog = ref(false)
const editing = ref<Row | null>(null)
const saving = ref(false)
const form = reactive<{ jenis_retribusi_id: number | null; tanggal: string; jumlah: number; catatan: string }>({ jenis_retribusi_id: null, tanggal: new Date().toISOString().slice(0, 10), jumlah: 0, catatan: '' })
const err = reactive({ jenis: '', tanggal: '', jumlah: '' })
const { formatRupiah: fmt } = useCurrency()
const jumlahDisplay = useRupiahModel(toRef(form, 'jumlah'))
const targetInfo = ref<number | null>(null)
const targetYear = computed(() => form.tanggal ? Number(form.tanggal.slice(0, 4)) : new Date().getFullYear())
const previewCapaian = computed(() => {
  const t = targetInfo.value ?? 0
  const j = Number(form.jumlah) || 0
  return t > 0 ? Math.round((j / t) * 10000) / 100 : 0
})

function statusColor(s: string) {
  if (s === 'disetujui') return 'success'
  if (s === 'diajukan') return 'warning'
  if (s === 'ditolak') return 'error'
  return 'grey'
}
function toast(msg: string, color: 'success' | 'error' | 'warning' = 'success') { snack.msg = msg; snack.color = color; snack.show = true }
const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' | 'warning' })
const delDialog = ref(false)
const delTarget = ref<Row | null>(null)
const deleting = ref(false)
const ajukanDialog = ref(false)
const ajukanTarget = ref<Row | null>(null)
const ajukanLoading = ref(false)

async function loadKawasan() {
  try {
    const r = await $fetch<{ data: Kawasan[] }>('/api/kawasan')
    kawasan.value = r.data
  } catch {}
}
async function loadJenis() {
  try {
    const r = await $fetch<{ data: Jenis[] }>('/api/jenis-retribusi')
    jenisList.value = r.data
  } catch {}
}
async function load() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (filterKawasan.value) params.kawasan_id = String(filterKawasan.value)
    if (filterJenis.value) params.jenis_retribusi_id = String(filterJenis.value)
    if (filterStatus.value) params.status = filterStatus.value
    const r = await $fetch<{ data: Row[] }>('/api/realisasi', { query: params })
    rows.value = r.data
  } catch (e: unknown) {
    toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat', 'error')
  } finally { loading.value = false }
}

async function fetchTarget() {
  if (!form.jenis_retribusi_id || !form.tanggal) { targetInfo.value = null; return }
  const y = Number(form.tanggal.slice(0, 4))
  if (!y) { targetInfo.value = null; return }
  try {
    const r = await $fetch<{ nilai: number }>('/api/target', { query: { jenis_retribusi_id: String(form.jenis_retribusi_id), tahun: String(y) } })
    targetInfo.value = r.nilai
  } catch { targetInfo.value = 0 }
}
function onJenisChange() { fetchTarget() }
function onTanggalChange() { fetchTarget() }
function updatePreview() {}

function openAdd() {
  editing.value = null
  form.jenis_retribusi_id = filterJenis.value ?? null
  form.tanggal = new Date().toISOString().slice(0, 10)
  form.jumlah = 0
  form.catatan = ''
  err.jenis = ''; err.tanggal = ''; err.jumlah = ''
  targetInfo.value = null
  dialog.value = true
  if (form.jenis_retribusi_id) fetchTarget()
}
function openEdit(r: Row) {
  editing.value = r
  form.jenis_retribusi_id = r.jenis_retribusi_id
  form.tanggal = r.tanggal
  form.jumlah = r.jumlah
  form.catatan = r.catatan
  err.jenis = ''; err.tanggal = ''; err.jumlah = ''
  dialog.value = true
  fetchTarget()
}
function confirmDelete(r: Row) { delTarget.value = r; delDialog.value = true }
function confirmAjukan(r: Row) { ajukanTarget.value = r; ajukanDialog.value = true }

async function save() {
  err.jenis = ''; err.tanggal = ''; err.jumlah = ''
  if (!form.jenis_retribusi_id) err.jenis = 'Jenis wajib dipilih'
  if (!form.tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(form.tanggal)) err.tanggal = 'Tanggal wajib YYYY-MM-DD'
  if (!Number.isFinite(Number(form.jumlah)) || Number(form.jumlah) < 0) err.jumlah = 'Jumlah harus >= 0'
  if (err.jenis || err.tanggal || err.jumlah) return
  saving.value = true
  try {
    const body = { jenis_retribusi_id: form.jenis_retribusi_id, tanggal: form.tanggal, jumlah: Number(form.jumlah), catatan: form.catatan.trim() }
    if (editing.value) {
      await $fetch(`/api/realisasi/${editing.value.id}`, { method: 'PUT', body })
      toast('Realisasi diperbarui')
    } else {
      await $fetch('/api/realisasi', { method: 'POST', body })
      toast('Realisasi ditambahkan')
    }
    dialog.value = false
    await load()
  } catch (e: unknown) {
    toast((e as { data?: { message?: string } })?.data?.message || (e instanceof Error ? e.message : String(e)), 'error')
  } finally { saving.value = false }
}
async function doDelete() {
  if (!delTarget.value) return
  deleting.value = true
  try {
    await $fetch(`/api/realisasi/${delTarget.value.id}`, { method: 'DELETE' })
    toast('Realisasi dihapus')
    delDialog.value = false
    await load()
  } catch (e: unknown) {
    toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error')
  } finally { deleting.value = false }
}
async function doAjukan() {
  if (!ajukanTarget.value) return
  ajukanLoading.value = true
  try {
    await $fetch(`/api/realisasi/${ajukanTarget.value.id}/ajukan`, { method: 'POST' })
    toast('Realisasi diajukan')
    ajukanDialog.value = false
    await load()
  } catch (e: unknown) {
    toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error')
  } finally { ajukanLoading.value = false }
}

onMounted(async () => { await loadKawasan(); await loadJenis(); await load() })
</script>
