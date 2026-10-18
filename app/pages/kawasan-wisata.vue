<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <MapPin class="shrink-0 size-9 text-primary" aria-hidden="true" />
        <h1 class="text-2xl font-medium text-foreground">Kawasan Wisata</h1>
      </div>
      <button
        v-if="isAdmin"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium
               text-primary-foreground hover:bg-primary-hover focus:outline-hidden focus:bg-primary-focus"
        @click="openAdd"
      >
        <Plus class="shrink-0 size-4" aria-hidden="true" />
        Tambah Kawasan
      </button>
    </div>

    <div class="rounded-lg border border-card-line bg-card">
      <div class="flex flex-wrap items-center justify-between gap-3 p-4">
        <div class="relative min-w-[240px] flex-1 max-w-[360px]">
          <Search
            class="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground-1"
            aria-hidden="true"
          />
          <input
            v-model="q"
            type="text"
            placeholder="Cari kode / nama..."
            class="w-full rounded-lg border border-layer-line bg-layer py-2 ps-8 pe-3 text-sm text-layer-foreground
                   focus:border-primary-focus focus:ring-primary-focus"
          />
        </div>
        <ViewModeToggle v-model="mode" />
      </div>

      <!-- Mode tabel -->
      <div v-if="mode === 'table'" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-table-line text-sm">
          <thead>
            <tr class="text-start text-xs uppercase tracking-wide text-muted-foreground-1">
              <th class="px-3 py-2.5 text-start font-medium">Kode</th>
              <th class="px-3 py-2.5 text-start font-medium">Nama</th>
              <th class="px-3 py-2.5 text-start font-medium">Urutan</th>
              <th class="px-3 py-2.5 text-start font-medium">Status</th>
              <th v-if="isAdmin" class="w-[70px] px-3 py-2.5 text-start font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-table-line">
            <tr v-if="loading">
              <td colspan="5" class="py-6 text-center text-muted-foreground-1">Memuat...</td>
            </tr>
            <tr v-else-if="!filtered.length">
              <td colspan="5" class="py-6 text-center text-muted-foreground-1">Belum ada data</td>
            </tr>
            <tr v-for="r in filtered" v-else :key="r.id" class="hover:bg-layer-hover">
              <td class="px-3 py-2.5 font-medium text-foreground">{{ r.kode }}</td>
              <td class="px-3 py-2.5 text-foreground">{{ r.nama }}</td>
              <td class="px-3 py-2.5 text-foreground">{{ r.urutan }}</td>
              <td class="px-3 py-2.5">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="aktifChip(r.aktif)">
                  {{ r.aktif ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td v-if="isAdmin" class="px-3 py-2.5">
                <AppMenu
                  :items="[
                    { label: 'Edit', icon: Pencil, onClick: () => openEdit(r) },
                    { label: 'Hapus', icon: Trash2, variant: 'danger', onClick: () => confirmDelete(r) },
                  ]"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mode list -->
      <div v-else-if="mode === 'list'" class="p-3">
        <div v-if="loading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
        <div v-else-if="!filtered.length" class="py-6 text-center text-muted-foreground-1">Belum ada data</div>
        <RecordCard
          v-for="r in filtered"
          v-else
          :key="r.id"
          :title="`${r.kode} — ${r.nama}`"
          :fields="[{ label: 'Urutan', value: r.urutan }]"
        >
          <template #badge>
            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="aktifChip(r.aktif)">
              {{ r.aktif ? 'Aktif' : 'Nonaktif' }}
            </span>
          </template>
          <template v-if="isAdmin" #actions>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-layer-hover focus:outline-hidden"
              @click="openEdit(r)"
            >
              <Pencil class="shrink-0 size-3.5" aria-hidden="true" /> Edit
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-layer-hover focus:outline-hidden dark:text-red-400"
              @click="confirmDelete(r)"
            >
              <Trash2 class="shrink-0 size-3.5" aria-hidden="true" /> Hapus
            </button>
          </template>
        </RecordCard>
      </div>

      <!-- Mode compact -->
      <div v-else class="p-2">
        <div v-if="loading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
        <div v-else-if="!filtered.length" class="py-6 text-center text-muted-foreground-1">Belum ada data</div>
        <ul v-else class="divide-y divide-table-line">
          <li v-for="r in filtered" :key="r.id" class="flex items-center gap-2 py-2">
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm text-foreground">{{ r.kode }} — {{ r.nama }}</span>
              <span class="block truncate text-xs text-muted-foreground-1">Urutan {{ r.urutan }}</span>
            </span>
            <span class="shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium" :class="aktifChip(r.aktif)">
              {{ r.aktif ? 'Aktif' : 'Nonaktif' }}
            </span>
            <AppMenu
              v-if="isAdmin"
              :items="[
                { label: 'Edit', icon: Pencil, onClick: () => openEdit(r) },
                { label: 'Hapus', icon: Trash2, variant: 'danger', onClick: () => confirmDelete(r) },
              ]"
            />
          </li>
        </ul>
      </div>
    </div>

    <!-- Dialog tambah/edit -->
    <AppDialog
      v-model="dialog"
      :title="editing ? 'Edit Kawasan' : 'Tambah Kawasan'"
      :max-width="480"
      :icon="editing ? MapPinned : MapPinPlus"
    >
      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Kode *</label>
        <input
          v-model="form.kode"
          type="text"
          placeholder="Contoh: A, B, C"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
        <p v-if="err.kode" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.kode }}</p>
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Nama kawasan *</label>
        <input
          v-model="form.nama"
          type="text"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
        <p v-if="err.nama" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.nama }}</p>
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Urutan</label>
        <input
          v-model.number="form.urutan"
          type="number"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
      </div>

      <!-- Switch aktif -->
      <label class="inline-flex cursor-pointer items-center gap-2">
        <span class="relative inline-block h-5 w-9">
          <input v-model="form.aktif" type="checkbox" class="peer sr-only" />
          <span class="absolute inset-0 rounded-full bg-line-4 transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary-focus"></span>
          <span class="absolute start-0.5 top-0.5 size-4 rounded-full bg-white transition-transform peer-checked:translate-x-4"></span>
        </span>
        <span class="text-sm text-foreground">Aktif</span>
      </label>

      <template #actions>
        <button
          type="button"
          class="rounded-lg px-3 py-2 text-sm text-foreground hover:bg-layer-hover focus:outline-hidden"
          @click="dialog = false"
        >
          Batal
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium
                 text-primary-foreground hover:bg-primary-hover focus:outline-hidden
                 disabled:opacity-50 disabled:pointer-events-none"
          :disabled="saving"
          @click="save"
        >
          <LoaderCircle v-if="saving" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
          Simpan
        </button>
      </template>
    </AppDialog>

    <!-- Dialog hapus -->
    <AppDialog v-model="delDialog" title="Hapus kawasan?" :max-width="420" :icon="Trash2">
      Yakin hapus <b>{{ delTarget?.nama }}</b> ({{ delTarget?.kode }})? Tidak bisa jika masih dipakai retribusi.
      <template #actions>
        <button
          type="button"
          class="rounded-lg px-3 py-2 text-sm text-foreground hover:bg-layer-hover focus:outline-hidden"
          @click="delDialog = false"
        >
          Batal
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white
                 hover:bg-red-700 focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none"
          :disabled="deleting"
          @click="doDelete"
        >
          <LoaderCircle v-if="deleting" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
          Hapus
        </button>
      </template>
    </AppDialog>

    <AppToast v-model="snack.show" :message="snack.msg" :color="snack.color" :timeout="3000" />
  </div>
</template>

<script setup lang="ts">
import { LoaderCircle, MapPin, MapPinPlus, MapPinned, Pencil, Plus, Search, Trash2 } from 'lucide-vue-next'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { mode } = useViewMode('kawasan')

type Row = { id: number; kode: string; nama: string; urutan: number; aktif: number }

const session = useUserSession()
const isAdmin = computed(() => String(session.user.value?.role || '') === 'admin')

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
const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' | 'warning' })

function aktifChip(aktif: number) {
  return aktif
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
    : 'bg-surface text-surface-foreground'
}

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
