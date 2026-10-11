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
        <div class="d-flex flex-wrap ga-3 mb-4 align-center">
          <v-select v-model="filterKawasan" :items="kawasanOpts" item-title="label" item-value="value" label="Filter kawasan" density="compact" variant="outlined" hide-details clearable style="max-width: 260px" placeholder="Semua kawasan" @update:model-value="load" />
          <v-text-field v-model="q" density="compact" variant="outlined" placeholder="Cari kode / kode rekening / nama..." prepend-inner-icon="mdi-magnify" hide-details clearable style="max-width: 320px" />
          <v-spacer />
          <ViewModeToggle v-model="mode" />
        </div>
      </v-card-text>

      <v-table v-if="mode === 'table'" density="default">
        <thead><tr><th>Kode</th><th>Kode Rekening</th><th>Nama</th><th>Kawasan</th><th>Level</th><th>Urutan</th><th class="text-right">Tarif</th><th>Mode</th><th>Status</th><th v-if="isAdmin" style="width: 70px">Aksi</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="10" class="text-center py-6">Memuat...</td></tr>
          <tr v-else-if="!filtered.length"><td colspan="10" class="text-center py-6 text-medium-emphasis">Belum ada data</td></tr>
          <tr v-for="r in paginated" :key="r.id">
            <td class="font-weight-medium">{{ r.kode || '-' }}</td>
            <td class="font-weight-medium">{{ r.kode_rekening || '—' }}</td>
            <td>{{ r.nama }}</td>
            <td><v-chip size="small" variant="tonal">{{ r.kawasan_kode }} — {{ r.kawasan_nama }}</v-chip></td>
            <td>{{ r.level }}</td>
            <td>{{ r.urutan }}</td>
            <td class="text-right">{{ r.tarif ? fmt(r.tarif) : '—' }}</td>
            <td>
              <v-chip v-if="r.mode_tarif === 'kuantitas'" size="small" color="primary" variant="tonal" prepend-icon="mdi-calculator">Kuantitas<span v-if="r.satuan"> / {{ r.satuan }}</span></v-chip>
              <span v-else class="text-medium-emphasis">Langsung</span>
            </td>
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

      <div v-else-if="mode === 'list'" class="pa-3">
        <div v-if="loading" class="text-center py-6">Memuat...</div>
        <div v-else-if="!filtered.length" class="text-center py-6 text-medium-emphasis">Belum ada data</div>
        <RecordCard
          v-for="r in paginated"
          v-else
          :key="r.id"
          :title="`${r.kode || '-'} — ${r.nama}`"
          :subtitle="`${r.kawasan_kode} — ${r.kawasan_nama}`"
          :fields="[
            { label: 'Kode Rekening', value: r.kode_rekening || '—' },
            { label: 'Level', value: r.level },
            { label: 'Urutan', value: r.urutan },
            { label: 'Tarif', value: r.tarif ? fmt(r.tarif) : '—', class: 'text-right font-weight-medium' },
          ]"
        >
          <template #badge>
            <v-chip v-if="r.mode_tarif === 'kuantitas'" size="x-small" color="primary" variant="tonal">Kuantitas<span v-if="r.satuan"> / {{ r.satuan }}</span></v-chip>
            <v-chip :color="r.aktif ? 'success' : 'grey'" size="small">{{ r.aktif ? 'Aktif' : 'Nonaktif' }}</v-chip>
          </template>
          <template v-if="isAdmin" #actions>
            <v-btn size="small" variant="text" prepend-icon="mdi-pencil" @click="openEdit(r)">Edit</v-btn>
            <v-btn size="small" variant="text" color="warning" prepend-icon="mdi-power" @click="confirmDelete(r)">Nonaktifkan</v-btn>
          </template>
        </RecordCard>
      </div>

      <div v-else class="pa-2">
        <div v-if="loading" class="text-center py-6">Memuat...</div>
        <div v-else-if="!filtered.length" class="text-center py-6 text-medium-emphasis">Belum ada data</div>
        <v-list v-else density="compact" lines="one">
          <v-list-item v-for="r in paginated" :key="r.id" :title="`${r.kode || '-'} — ${r.nama}`" :subtitle="`${r.kawasan_kode} — ${r.kawasan_nama}`">
            <template #append>
              <v-chip :color="r.aktif ? 'success' : 'grey'" size="x-small" class="mr-1">{{ r.aktif ? 'Aktif' : 'Nonaktif' }}</v-chip>
              <v-menu v-if="isAdmin" location="bottom end">
                <template #activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
                </template>
                <v-list density="compact" min-width="160">
                  <v-list-item prepend-icon="mdi-pencil" title="Edit" @click="openEdit(r)" />
                  <v-list-item prepend-icon="mdi-power" title="Nonaktifkan" base-color="warning" @click="confirmDelete(r)" />
                </v-list>
              </v-menu>
            </template>
          </v-list-item>
        </v-list>
      </div>
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

    <AppDialog v-model="dialog" :title="editing ? 'Edit Jenis Retribusi' : 'Tambah Jenis Retribusi'" :max-width="520" :icon="editing ? 'mdi-format-list-checks' : 'mdi-format-list-bulleted-square'">
      <v-select v-model="form.kawasan_id" :items="kawasanSelect" item-title="label" item-value="value" label="Kawasan *" variant="outlined" density="compact" :error-messages="err.kawasan_id" class="mb-2" />
      <v-select v-model="form.parent_id" :items="parentOpts" item-title="label" item-value="value" label="Parent (opsional)" variant="outlined" density="compact" hide-details clearable class="mb-2" placeholder="— Tanpa parent (level 1) —" />
      <v-text-field v-model="form.kode" label="Kode" variant="outlined" density="compact" class="mb-2" placeholder="Contoh: A.1, B.2.1" />
      <v-text-field v-model="form.kode_rekening" label="Kode Rekening" variant="outlined" density="compact" class="mb-2" placeholder="Contoh: 4.1.02,02.012" hint="Khusus induk & sub-induk. Kosongkan untuk rincian/leaf." persistent-hint />
      <v-text-field v-model="form.nama" label="Nama *" variant="outlined" density="compact" :error-messages="err.nama" class="mb-2" />
      <v-text-field v-model.number="form.urutan" label="Urutan" type="number" variant="outlined" density="compact" class="mb-2" />
      <v-select v-model="form.mode_tarif" :items="modeOpts" item-title="label" item-value="value" label="Mode Input" variant="outlined" density="compact" class="mb-2" hint="Kuantitas = unit × tarif (mis. parkir, karcis); Langsung = nilai Rp bulanan" persistent-hint />
      <v-text-field v-if="form.mode_tarif === 'kuantitas'" v-model="form.satuan" label="Satuan" variant="outlined" density="compact" class="mb-2" placeholder="mis. orang, unit, hari, tiket" hide-details />
      <v-text-field :model-value="tarifDisplay" :label="form.mode_tarif === 'kuantitas' ? 'Tarif per satuan *' : 'Tarif (opsional)'" variant="outlined" density="compact" prefix="Rp" inputmode="numeric" :error-messages="err.tarif" hint="Untuk pos berbayar per unit/tiket" persistent-hint class="mb-2" @input="onTarifInput" />
      <v-switch v-model="form.aktif" label="Aktif" color="primary" hide-details />
      <template #actions>
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">Batal</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Simpan</v-btn>
      </template>
    </AppDialog>

    <AppDialog v-model="delDialog" title="Nonaktifkan jenis?" :max-width="420" icon="mdi-power">
      Yakin nonaktifkan <b>{{ delTarget?.nama }}</b> ({{ delTarget?.kode }})? Data histori tetap terjaga — status jadi Nonaktif (soft delete).
      <template #actions>
        <v-spacer />
        <v-btn variant="text" @click="delDialog = false">Batal</v-btn>
        <v-btn color="warning" :loading="deleting" @click="doDelete">Nonaktifkan</v-btn>
      </template>
    </AppDialog>

    <v-snackbar v-model="snack.show" :color="snack.color" timeout="3000">{{ snack.msg }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const { mode } = useViewMode('jenis')

type Row = { id: number; kawasan_id: number; parent_id: number | null; kode: string; kode_rekening: string; nama: string; level: number; urutan: number; aktif: number; tarif: number | null; mode_tarif: string; satuan: string; kawasan_nama: string; kawasan_kode: string }
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
  return rows.value.filter(r => (r.kode || '').toLowerCase().includes(s) || (r.kode_rekening || '').toLowerCase().includes(s) || r.nama.toLowerCase().includes(s) || r.kawasan_nama.toLowerCase().includes(s))
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
const modeOpts = [
  { label: 'Langsung (nilai Rp)', value: 'langsung' },
  { label: 'Kuantitas × tarif', value: 'kuantitas' },
]
const form = reactive<{ kawasan_id: number | null; parent_id: number | null; kode: string; kode_rekening: string; nama: string; urutan: number; aktif: boolean; tarif: number; mode_tarif: string; satuan: string }>({ kawasan_id: null, parent_id: null, kode: '', kode_rekening: '', nama: '', urutan: 0, aktif: true, tarif: 0, mode_tarif: 'langsung', satuan: '' })
const err = reactive({ kawasan_id: '', nama: '', tarif: '' })
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
  form.parent_id = null; form.kode = ''; form.kode_rekening = ''; form.nama = ''; form.urutan = 0; form.aktif = true; form.tarif = 0; form.mode_tarif = 'langsung'; form.satuan = ''
  err.kawasan_id = ''; err.nama = ''; err.tarif = ''
  dialog.value = true
}
function openEdit(r: Row) {
  editing.value = r
  form.kawasan_id = r.kawasan_id; form.parent_id = r.parent_id; form.kode = r.kode; form.kode_rekening = r.kode_rekening || ''; form.nama = r.nama; form.urutan = r.urutan; form.aktif = !!r.aktif; form.tarif = r.tarif ?? 0; form.mode_tarif = r.mode_tarif === 'kuantitas' ? 'kuantitas' : 'langsung'; form.satuan = r.satuan || ''
  err.kawasan_id = ''; err.nama = ''; err.tarif = ''
  dialog.value = true
}
function confirmDelete(r: Row) { delTarget.value = r; delDialog.value = true }

async function save() {
  err.kawasan_id = ''; err.nama = ''; err.tarif = ''
  if (!form.kawasan_id) err.kawasan_id = 'Kawasan wajib dipilih'
  if (!form.nama.trim()) err.nama = 'Nama wajib diisi'
  if (form.mode_tarif === 'kuantitas' && (!Number(form.tarif) || Number(form.tarif) <= 0)) err.tarif = 'Tarif wajib diisi untuk mode kuantitas'
  if (err.kawasan_id || err.nama || err.tarif) return
  saving.value = true
  try {
    const body = { kawasan_id: form.kawasan_id, parent_id: form.parent_id, kode: form.kode.trim(), kode_rekening: form.kode_rekening.trim(), nama: form.nama.trim(), urutan: Number(form.urutan) || 0, aktif: form.aktif ? 1 : 0, tarif: Number(form.tarif) || null, mode_tarif: form.mode_tarif, satuan: form.satuan.trim() }
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
