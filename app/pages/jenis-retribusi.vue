<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div class="d-flex align-center">
        <v-icon size="36" color="primary" class="mr-3">mdi-format-list-bulleted</v-icon>
        <h1 class="text-h4 font-weight-medium">Jenis Retribusi</h1>
      </div>
      <v-btn v-if="isAdmin" color="primary" prepend-icon="mdi-plus" @click="openAdd">Tambah Jenis</v-btn>
    </div>

    <v-card flat elevation="0">
      <v-card-text class="pb-0">
        <div class="d-flex flex-wrap ga-3 mb-4">
          <v-select v-model="filterKawasan" :items="kawasanOpts" item-title="label" item-value="value" label="Filter kawasan" density="compact" variant="outlined" hide-details clearable style="max-width: 260px" placeholder="Semua kawasan" @update:model-value="load" />
          <v-text-field v-model="q" density="compact" variant="outlined" placeholder="Cari kode / nama..." prepend-inner-icon="mdi-magnify" hide-details clearable style="max-width: 320px" />
        </div>
      </v-card-text>

      <v-table density="default">
        <thead><tr><th>Kode</th><th>Nama</th><th>Kawasan</th><th>Level</th><th>Urutan</th><th class="text-right">Tarif</th><th>Status</th><th v-if="isAdmin" style="width: 70px">Aksi</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="8" class="text-center py-6">Memuat...</td></tr>
          <tr v-else-if="!filtered.length"><td colspan="8" class="text-center py-6 text-medium-emphasis">Belum ada data</td></tr>
          <tr v-for="r in paginated" :key="r.id">
            <td class="font-weight-medium">{{ r.kode || '-' }}</td>
            <td>{{ r.nama }}</td>
            <td><v-chip size="small" variant="tonal">{{ r.kawasan_kode }} — {{ r.kawasan_nama }}</v-chip></td>
            <td>{{ r.level }}</td>
            <td>{{ r.urutan }}</td>
            <td class="text-right">{{ r.tarif ? fmt(r.tarif) : '—' }}</td>
            <td><v-chip :color="r.aktif ? 'success' : 'grey'" size="small">{{ r.aktif ? 'Aktif' : 'Nonaktif' }}</v-chip></td>
            <td v-if="isAdmin">
              <v-menu location="bottom end">
                <template #activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
                </template>
                <v-list density="compact" min-width="160">
                  <v-list-item prepend-icon="mdi-pencil" title="Edit" @click="openEdit(r)" />
                  <v-list-item prepend-icon="mdi-power" title="Nonaktifkan" base-color="warning" @click="confirmDelete(r)" />
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
      <v-card elevation="2" :border="false">
        <v-card-title class="text-h6">{{ editing ? 'Edit Jenis Retribusi' : 'Tambah Jenis Retribusi' }}</v-card-title>
        <v-card-text>
          <v-select v-model="form.kawasan_id" :items="kawasanSelect" item-title="label" item-value="value" label="Kawasan *" variant="outlined" density="compact" :error-messages="err.kawasan_id" class="mb-2" />
          <v-select v-model="form.parent_id" :items="parentOpts" item-title="label" item-value="value" label="Parent (opsional)" variant="outlined" density="compact" hide-details clearable class="mb-2" placeholder="— Tanpa parent (level 1) —" />
          <v-text-field v-model="form.kode" label="Kode" variant="outlined" density="compact" class="mb-2" placeholder="Contoh: A.1, B.2.1" />
          <v-text-field v-model="form.nama" label="Nama *" variant="outlined" density="compact" :error-messages="err.nama" class="mb-2" />
          <v-text-field v-model.number="form.urutan" label="Urutan" type="number" variant="outlined" density="compact" class="mb-2" />
          <v-text-field :model-value="tarifDisplay" label="Tarif (opsional)" variant="outlined" density="compact" prefix="Rp" inputmode="numeric" class="mb-2" hint="Untuk pos berbayar per unit/tiket" persistent-hint @input="onTarifInput" />
          <v-switch v-model="form.aktif" label="Aktif" color="primary" hide-details />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Batal</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">Simpan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="delDialog" max-width="420" persistent>
      <v-card elevation="2" :border="false">
        <v-card-title class="text-h6">Nonaktifkan jenis?</v-card-title>
        <v-card-text>Yakin nonaktifkan <b>{{ delTarget?.nama }}</b> ({{ delTarget?.kode }})? Data histori tetap terjaga — status jadi Nonaktif (soft delete).</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="delDialog = false">Batal</v-btn>
          <v-btn color="warning" :loading="deleting" @click="doDelete">Nonaktifkan</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.show" :color="snack.color" timeout="3000">{{ snack.msg }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

type Row = { id: number; kawasan_id: number; parent_id: number | null; kode: string; nama: string; level: number; urutan: number; aktif: number; tarif: number | null; kawasan_nama: string; kawasan_kode: string }
type Kawasan = { id: number; kode: string; nama: string }

const session = useUserSession()
const isAdmin = computed(() => session.user.value?.role === 'admin')
const { formatRupiah: fmt, useRupiahInput } = useCurrency()

const kawasan = ref<Kawasan[]>([])
const rows = ref<Row[]>([])
const loading = ref(false)
const q = ref('')
const filterKawasan = ref<number | null>(null)

const kawasanOpts = computed(() => kawasan.value.map(k => ({ label: `${k.kode} — ${k.nama}`, value: k.id })))
const kawasanSelect = computed(() => kawasanOpts.value)

const parentOpts = computed(() => {
  const kw = form.kawasan_id as unknown as number | null
  // ponytail: flat list only — hierarchical tree view could replace this when deep nesting matters
  const pool = kw ? rows.value.filter(r => r.kawasan_id === kw) : rows.value
  const exclude = editing.value?.id
  return pool.filter(r => r.id !== exclude).map(r => ({ label: `${r.kode || '-'} — ${r.nama} (Lv ${r.level})`, value: r.id }))
})

const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return rows.value
  return rows.value.filter(r => (r.kode || '').toLowerCase().includes(s) || r.nama.toLowerCase().includes(s) || r.kawasan_nama.toLowerCase().includes(s))
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
watch([q, filterKawasan], () => { currentPage.value = 1 })
watch(perPage, () => { currentPage.value = 1 })
watch(pageCount, (pc) => { if (currentPage.value > pc) currentPage.value = pc })

const dialog = ref(false)
const editing = ref<Row | null>(null)
const saving = ref(false)
const form = reactive<{ kawasan_id: number | null; parent_id: number | null; kode: string; nama: string; urutan: number; aktif: boolean; tarif: number }>({ kawasan_id: null, parent_id: null, kode: '', nama: '', urutan: 0, aktif: true, tarif: 0 })
const err = reactive({ kawasan_id: '', nama: '' })
const { display: tarifDisplay, onInput: onTarifInput } = useRupiahInput(toRef(form, 'tarif'))

const delDialog = ref(false)
const delTarget = ref<Row | null>(null)
const deleting = ref(false)
const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' | 'warning' })

function toast(msg: string, color: typeof snack.color = 'success') { snack.msg = msg; snack.color = color; snack.show = true }

async function loadKawasan() {
  try {
    const res = await $fetch<{ data: Kawasan[] }>('/api/kawasan')
    kawasan.value = res.data
  } catch {}
}

async function load() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (filterKawasan.value) params.kawasan_id = String(filterKawasan.value)
    const res = await $fetch<{ data: Row[] }>('/api/jenis-retribusi', { query: params })
    rows.value = res.data
  } catch (e: unknown) {
    toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat', 'error')
  } finally { loading.value = false }
}

function openAdd() {
  editing.value = null
  form.kawasan_id = filterKawasan.value ?? (kawasan.value[0]?.id ?? null)
  form.parent_id = null; form.kode = ''; form.nama = ''; form.urutan = 0; form.aktif = true; form.tarif = 0
  err.kawasan_id = ''; err.nama = ''
  dialog.value = true
}
function openEdit(r: Row) {
  editing.value = r
  form.kawasan_id = r.kawasan_id; form.parent_id = r.parent_id; form.kode = r.kode; form.nama = r.nama; form.urutan = r.urutan; form.aktif = !!r.aktif; form.tarif = r.tarif ?? 0
  err.kawasan_id = ''; err.nama = ''
  dialog.value = true
}
function confirmDelete(r: Row) { delTarget.value = r; delDialog.value = true }

async function save() {
  err.kawasan_id = ''; err.nama = ''
  if (!form.kawasan_id) err.kawasan_id = 'Kawasan wajib dipilih'
  if (!form.nama.trim()) err.nama = 'Nama wajib diisi'
  if (err.kawasan_id || err.nama) return
  saving.value = true
  try {
    const body = { kawasan_id: form.kawasan_id, parent_id: form.parent_id, kode: form.kode.trim(), nama: form.nama.trim(), urutan: Number(form.urutan) || 0, aktif: form.aktif ? 1 : 0, tarif: Number(form.tarif) || null }
    if (editing.value) {
      await $fetch(`/api/jenis-retribusi/${editing.value.id}`, { method: 'PUT', body })
      toast('Jenis diperbarui')
    } else {
      await $fetch('/api/jenis-retribusi', { method: 'POST', body })
      toast('Jenis ditambahkan')
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
    await $fetch(`/api/jenis-retribusi/${delTarget.value.id}`, { method: 'DELETE' })
    toast('Jenis dinonaktifkan', 'warning')
    delDialog.value = false
    await load()
  } catch (e: unknown) {
    toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error')
  } finally { deleting.value = false }
}

onMounted(async () => { await loadKawasan(); await load() })
</script>
