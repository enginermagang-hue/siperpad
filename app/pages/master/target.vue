<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div class="d-flex align-center">
        <v-icon size="36" color="primary" class="mr-3">mdi-bullseye-arrow</v-icon>
        <h1 class="text-h4 font-weight-medium">Target Tahunan</h1>
      </div>
      <v-btn v-if="isAdmin" color="primary" prepend-icon="mdi-plus" @click="openAdd">Tambah Target</v-btn>
    </div>

    <v-card flat elevation="2" class="mb-4">
      <v-card-text class="pb-0">
        <div class="d-flex flex-wrap ga-3 mb-4">
          <v-select v-model="filterKawasan" :items="kawasanOpts" item-title="label" item-value="value" label="Kawasan" density="compact" variant="outlined" hide-details clearable style="max-width: 240px" placeholder="Semua" @update:model-value="load" />
          <v-select v-model="tahun" :items="tahunOpts" label="Tahun" density="compact" variant="outlined" hide-details style="max-width: 120px" @update:model-value="load" />
          <v-text-field v-model="q" density="compact" variant="outlined" placeholder="Cari kode / nama..." prepend-inner-icon="mdi-magnify" hide-details clearable style="max-width: 320px" />
        </div>
      </v-card-text>
    </v-card>

    <v-card flat elevation="2">
      <v-table density="comfortable">
        <thead><tr><th>Kode</th><th>Jenis Retribusi</th><th>Kawasan</th><th>Tahun</th><th class="text-right">Target</th><th v-if="isAdmin" style="width: 70px">Aksi</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="6" class="text-center py-6">Memuat...</td></tr>
          <tr v-else-if="!filtered.length"><td colspan="6" class="text-center py-6 text-medium-emphasis">Belum ada target untuk tahun ini</td></tr>
          <tr v-for="r in paginated" :key="r.id">
            <td class="font-weight-medium">{{ r.kode || '-' }}</td>
            <td>{{ r.nama }}</td>
            <td><v-chip size="small" variant="tonal">{{ r.kawasan_kode }} — {{ r.kawasan_nama }}</v-chip></td>
            <td>{{ r.tahun }}</td>
            <td class="text-right">{{ fmt(r.nilai) }}</td>
            <td v-if="isAdmin">
              <v-menu location="bottom end">
                <template #activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
                </template>
                <v-list density="compact" min-width="160">
                  <v-list-item prepend-icon="mdi-pencil" title="Edit" @click="openEdit(r)" />
                  <v-list-item prepend-icon="mdi-delete" title="Hapus" base-color="error" @click="confirmDelete(r)" />
                </v-list>
              </v-menu>
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
        <v-card-title class="text-h6">{{ editing ? 'Edit Target' : 'Tambah Target' }}</v-card-title>
        <v-card-text>
          <v-select v-model="form.jenis_retribusi_id" :items="jenisOpts" item-title="label" item-value="value" label="Jenis Retribusi *" variant="outlined" density="compact" :error-messages="err.jenis" class="mb-2" />
          <v-text-field v-model.number="form.tahun" label="Tahun *" type="number" variant="outlined" density="compact" :error-messages="err.tahun" class="mb-2" />
          <v-text-field v-model="nilaiDisplay" label="Nilai Target *" variant="outlined" density="compact" prefix="Rp" inputmode="numeric" :error-messages="err.nilai" class="mb-2" />
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="dialog = false">Batal</v-btn><v-btn color="primary" :loading="saving" @click="save">Simpan</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="delDialog" max-width="420" persistent>
      <v-card>
        <v-card-title class="text-h6">Hapus target?</v-card-title>
        <v-card-text>Yakin hapus target <b>{{ delTarget?.nama }}</b> tahun {{ delTarget?.tahun }}?</v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="delDialog = false">Batal</v-btn><v-btn color="error" :loading="deleting" @click="doDelete">Hapus</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.show" :color="snack.color" timeout="3000">{{ snack.msg }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })
type Row = { id: number; jenis_retribusi_id: number; tahun: number; nilai: number; kode: string; nama: string; level: number; kawasan_id: number; kawasan_kode: string; kawasan_nama: string }
type Kawasan = { id: number; kode: string; nama: string }
type Jenis = { id: number; kode: string; nama: string; kawasan_id: number }

const session = useUserSession()
const isAdmin = computed(() => String(session.user.value?.role) === 'admin')

const kawasan = ref<Kawasan[]>([])
const jenisList = ref<Jenis[]>([])
const rows = ref<Row[]>([])
const loading = ref(false)
const q = ref('')
const filterKawasan = ref<number | null>(null)
const tahun = ref(new Date().getFullYear())
const tahunOpts = [2024, 2025, 2026, 2027, 2028]

const kawasanOpts = computed(() => kawasan.value.map((k) => ({ label: `${k.kode} — ${k.nama}`, value: k.id })))
const jenisOpts = computed(() => jenisList.value.map((j) => {
  const kw = kawasan.value.find((k) => k.id === j.kawasan_id)
  return { label: `${kw ? kw.kode + ' — ' : ''}${j.kode || '-'} — ${j.nama}`, value: j.id }
}))

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return rows.value
  return rows.value.filter((r) => (r.kode || '').toLowerCase().includes(s) || r.nama.toLowerCase().includes(s))
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
watch([q, filterKawasan, tahun], () => { currentPage.value = 1 })
watch(perPage, () => { currentPage.value = 1 })
watch(pageCount, (pc) => { if (currentPage.value > pc) currentPage.value = pc })

const dialog = ref(false)
const editing = ref<Row | null>(null)
const saving = ref(false)
const form = reactive<{ jenis_retribusi_id: number | null; tahun: number; nilai: number }>({ jenis_retribusi_id: null, tahun: new Date().getFullYear(), nilai: 0 })
const err = reactive({ jenis: '', tahun: '', nilai: '' })
const { formatRupiah: fmt } = useCurrency()
const nilaiDisplay = useRupiahModel(toRef(form, 'nilai'))
const delDialog = ref(false)
const delTarget = ref<Row | null>(null)
const deleting = ref(false)
const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' | 'warning' })
function toast(msg: string, color: typeof snack.color = 'success') { snack.msg = msg; snack.color = color; snack.show = true }

async function loadKawasan() { try { const r = await $fetch<{ data: Kawasan[] }>('/api/kawasan'); kawasan.value = r.data } catch {} }
async function loadJenis() { try { const r = await $fetch<{ data: Jenis[] }>('/api/jenis-retribusi'); jenisList.value = r.data } catch {} }
async function load() {
  loading.value = true
  try {
    const params: Record<string, string> = { tahun: String(tahun.value) }
    if (filterKawasan.value) params.kawasan_id = String(filterKawasan.value)
    const r = await $fetch<{ data: Row[] }>('/api/target', { query: params })
    rows.value = r.data || []
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat', 'error') }
  finally { loading.value = false }
}

function openAdd() {
  editing.value = null
  form.jenis_retribusi_id = null; form.tahun = tahun.value; form.nilai = 0
  err.jenis = ''; err.tahun = ''; err.nilai = ''
  dialog.value = true
}
function openEdit(r: Row) {
  editing.value = r
  form.jenis_retribusi_id = r.jenis_retribusi_id; form.tahun = r.tahun; form.nilai = r.nilai
  err.jenis = ''; err.tahun = ''; err.nilai = ''
  dialog.value = true
}
function confirmDelete(r: Row) { delTarget.value = r; delDialog.value = true }

async function save() {
  err.jenis = ''; err.tahun = ''; err.nilai = ''
  if (!form.jenis_retribusi_id) err.jenis = 'Jenis wajib dipilih'
  if (!form.tahun || form.tahun < 2000) err.tahun = 'Tahun tidak valid'
  if (!Number.isFinite(Number(form.nilai)) || Number(form.nilai) < 0) err.nilai = 'Nilai harus >= 0'
  if (err.jenis || err.tahun || err.nilai) return
  saving.value = true
  try {
    await $fetch('/api/target', { method: 'POST', body: { jenis_retribusi_id: form.jenis_retribusi_id, tahun: Number(form.tahun), nilai: Number(form.nilai) } })
    toast(editing.value ? 'Target diperbarui' : 'Target disimpan')
    dialog.value = false
    await load()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error') }
  finally { saving.value = false }
}
async function doDelete() {
  if (!delTarget.value) return
  deleting.value = true
  try {
    await $fetch(`/api/target/${delTarget.value.id}`, { method: 'DELETE' })
    toast('Target dihapus', 'warning')
    delDialog.value = false
    await load()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error') }
  finally { deleting.value = false }
}

onMounted(async () => { await loadKawasan(); await loadJenis(); await load() })
</script>
