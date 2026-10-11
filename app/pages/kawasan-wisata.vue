<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div class="d-flex align-center">
        <v-icon size="36" color="primary" class="mr-3">mdi-map-marker-multiple</v-icon>
        <h1 class="text-h4 font-weight-medium">Kawasan Wisata</h1>
      </div>
      <v-btn v-if="isAdmin" color="primary" prepend-icon="mdi-plus" @click="openAdd">Tambah Kawasan</v-btn>
    </div>

    <v-card flat elevation="0">
      <v-card-text class="pb-0">
        <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
          <v-text-field v-model="q" density="compact" variant="outlined" placeholder="Cari kode / nama..." prepend-inner-icon="mdi-magnify" hide-details clearable style="max-width: 360px" class="flex-grow-1" />
          <ViewModeToggle v-model="mode" />
        </div>
      </v-card-text>

      <v-table v-if="mode === 'table'" density="default">
        <thead><tr><th>Kode</th><th>Nama</th><th>Urutan</th><th>Status</th><th v-if="isAdmin" style="width: 70px">Aksi</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="5" class="text-center py-6">Memuat...</td></tr>
          <tr v-else-if="!filtered.length"><td colspan="5" class="text-center py-6 text-medium-emphasis">Belum ada data</td></tr>
          <tr v-for="r in filtered" :key="r.id">
            <td class="font-weight-medium">{{ r.kode }}</td>
            <td>{{ r.nama }}</td>
            <td>{{ r.urutan }}</td>
            <td><v-chip :color="r.aktif ? 'success' : 'grey'" size="small">{{ r.aktif ? 'Aktif' : 'Nonaktif' }}</v-chip></td>
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

      <div v-else-if="mode === 'list'" class="pa-3">
        <div v-if="loading" class="text-center py-6">Memuat...</div>
        <div v-else-if="!filtered.length" class="text-center py-6 text-medium-emphasis">Belum ada data</div>
        <RecordCard
          v-for="r in filtered"
          v-else
          :key="r.id"
          :title="`${r.kode} — ${r.nama}`"
          :fields="[{ label: 'Urutan', value: r.urutan }]"
        >
          <template #badge>
            <v-chip :color="r.aktif ? 'success' : 'grey'" size="small">{{ r.aktif ? 'Aktif' : 'Nonaktif' }}</v-chip>
          </template>
          <template v-if="isAdmin" #actions>
            <v-btn size="small" variant="text" prepend-icon="mdi-pencil" @click="openEdit(r)">Edit</v-btn>
            <v-btn size="small" variant="text" color="error" prepend-icon="mdi-delete" @click="confirmDelete(r)">Hapus</v-btn>
          </template>
        </RecordCard>
      </div>

      <div v-else class="pa-2">
        <div v-if="loading" class="text-center py-6">Memuat...</div>
        <div v-else-if="!filtered.length" class="text-center py-6 text-medium-emphasis">Belum ada data</div>
        <v-list v-else density="compact" lines="one">
          <v-list-item v-for="r in filtered" :key="r.id" :title="`${r.kode} — ${r.nama}`" :subtitle="`Urutan ${r.urutan}`">
            <template #append>
              <v-chip :color="r.aktif ? 'success' : 'grey'" size="x-small" class="mr-1">{{ r.aktif ? 'Aktif' : 'Nonaktif' }}</v-chip>
              <v-menu v-if="isAdmin" location="bottom end">
                <template #activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
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
    </v-card>

    <AppDialog v-model="dialog" :title="editing ? 'Edit Kawasan' : 'Tambah Kawasan'" :max-width="480" :icon="editing ? 'mdi-map-marker-radius' : 'mdi-map-marker-plus'">
      <v-text-field v-model="form.kode" label="Kode *" variant="outlined" density="compact" :error-messages="err.kode" class="mb-2" placeholder="Contoh: A, B, C" />
      <v-text-field v-model="form.nama" label="Nama kawasan *" variant="outlined" density="compact" :error-messages="err.nama" class="mb-2" />
      <v-text-field v-model.number="form.urutan" label="Urutan" type="number" variant="outlined" density="compact" class="mb-2" />
      <v-switch v-model="form.aktif" label="Aktif" color="primary" hide-details />
      <template #actions>
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">Batal</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Simpan</v-btn>
      </template>
    </AppDialog>

    <AppDialog v-model="delDialog" title="Hapus kawasan?" :max-width="420" icon="mdi-delete">
      Yakin hapus <b>{{ delTarget?.nama }}</b> ({{ delTarget?.kode }})? Tidak bisa jika masih dipakai retribusi.
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

const { mode } = useViewMode('kawasan')

type Row = { id: number; kode: string; nama: string; urutan: number; aktif: number }

const session = useUserSession()
const isAdmin = computed(() => session.user.value?.role === 'admin')

const rows = ref<Row[]>([])
const loading = ref(false)
const q = ref('')
const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return rows.value
  return rows.value.filter(r => r.kode.toLowerCase().includes(s) || r.nama.toLowerCase().includes(s))
})

const dialog = ref(false)
const editing = ref<Row | null>(null)
const saving = ref(false)
const form = reactive({ kode: '', nama: '', urutan: 0, aktif: true })
const err = reactive({ kode: '', nama: '' })

const delDialog = ref(false)
const delTarget = ref<Row | null>(null)
const deleting = ref(false)
const snack = reactive({ show: false, msg: '', color: 'success' })

function toast(msg: string, color: 'success' | 'error' = 'success') {
  snack.msg = msg; snack.color = color; snack.show = true
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ data: Row[] }>('/api/kawasan')
    rows.value = res.data
  } catch (e: unknown) {
    toast(e instanceof Error ? e.message : 'Gagal memuat', 'error')
  } finally { loading.value = false }
}

function openAdd() {
  editing.value = null
  form.kode = ''; form.nama = ''; form.urutan = rows.value.length + 1; form.aktif = true
  err.kode = ''; err.nama = ''
  dialog.value = true
}
function openEdit(r: Row) {
  editing.value = r
  form.kode = r.kode; form.nama = r.nama; form.urutan = r.urutan; form.aktif = !!r.aktif
  err.kode = ''; err.nama = ''
  dialog.value = true
}
function confirmDelete(r: Row) { delTarget.value = r; delDialog.value = true }

async function save() {
  err.kode = ''; err.nama = ''
  if (!form.kode.trim()) err.kode = 'Kode wajib diisi'
  if (!form.nama.trim()) err.nama = 'Nama wajib diisi'
  if (err.kode || err.nama) return
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/kawasan/${editing.value.id}`, { method: 'PUT', body: { kode: form.kode.trim(), nama: form.nama.trim(), urutan: Number(form.urutan) || 0, aktif: form.aktif ? 1 : 0 } })
      toast('Kawasan diperbarui')
    } else {
      await $fetch('/api/kawasan', { method: 'POST', body: { kode: form.kode.trim(), nama: form.nama.trim(), urutan: Number(form.urutan) || 0, aktif: form.aktif ? 1 : 0 } })
      toast('Kawasan ditambahkan')
    }
    dialog.value = false
    await load()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    // $fetch throws with data.message
    const detail = (e as { data?: { message?: string } })?.data?.message || msg
    toast(detail, 'error')
  } finally { saving.value = false }
}

async function doDelete() {
  if (!delTarget.value) return
  deleting.value = true
  try {
    await $fetch(`/api/kawasan/${delTarget.value.id}`, { method: 'DELETE' })
    toast('Kawasan dihapus')
    delDialog.value = false
    await load()
  } catch (e: unknown) {
    const detail = (e as { data?: { message?: string } })?.data?.message || (e instanceof Error ? e.message : String(e))
    toast(detail, 'error')
  } finally { deleting.value = false }
}

onMounted(load)
</script>
