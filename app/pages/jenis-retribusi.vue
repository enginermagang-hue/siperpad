<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <List class="shrink-0 size-9 text-primary" aria-hidden="true" />
        <h1 class="text-2xl font-medium text-foreground">Jenis Retribusi</h1>
      </div>
      <button
        v-if="isAdmin"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium
               text-primary-foreground hover:bg-primary-hover focus:outline-hidden focus:bg-primary-focus"
        @click="openAdd"
      >
        <Plus class="shrink-0 size-4" aria-hidden="true" />
        Tambah Jenis
      </button>
    </div>

    <div class="rounded-lg border border-card-line bg-card">
      <div class="flex flex-wrap items-center gap-3 p-4">
        <div class="w-full max-w-[260px]">
          <AppSelect v-model="filterKawasan" :items="kawasanOpts" placeholder="Semua kawasan" clearable @update:model-value="load" />
        </div>
        <div class="relative w-full max-w-[320px]">
          <Search
            class="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground-1"
            aria-hidden="true"
          />
          <input
            v-model="q"
            type="text"
            placeholder="Cari kode / kode rekening / nama..."
            class="w-full rounded-lg border border-layer-line bg-layer py-2 ps-8 pe-3 text-sm text-layer-foreground
                   focus:border-primary-focus focus:ring-primary-focus"
          />
        </div>
        <div class="ms-auto"><ViewModeToggle v-model="mode" /></div>
      </div>

      <!-- Mode tabel -->
      <div v-if="mode === 'table'" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-table-line text-sm">
          <thead>
            <tr class="text-start text-xs uppercase tracking-wide text-muted-foreground-1">
              <th class="px-3 py-2.5 text-start font-medium">Kode</th>
              <th class="px-3 py-2.5 text-start font-medium">Kode Rekening</th>
              <th class="px-3 py-2.5 text-start font-medium">Nama</th>
              <th class="px-3 py-2.5 text-start font-medium">Kawasan</th>
              <th class="px-3 py-2.5 text-start font-medium">Level</th>
              <th class="px-3 py-2.5 text-start font-medium">Urutan</th>
              <th class="px-3 py-2.5 text-end font-medium">Tarif</th>
              <th class="px-3 py-2.5 text-start font-medium">Mode</th>
              <th class="px-3 py-2.5 text-start font-medium">Status</th>
              <th v-if="isAdmin" class="w-[70px] px-3 py-2.5 text-start font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-table-line">
            <tr v-if="loading">
              <td colspan="10" class="py-6 text-center text-muted-foreground-1">Memuat...</td>
            </tr>
            <tr v-else-if="!filtered.length">
              <td colspan="10" class="py-6 text-center text-muted-foreground-1">Belum ada data</td>
            </tr>
            <tr v-for="r in paginated" v-else :key="r.id" class="hover:bg-layer-hover">
              <td class="px-3 py-2.5 font-medium text-foreground">{{ r.kode || '-' }}</td>
              <td class="px-3 py-2.5 font-medium text-foreground">{{ r.kode_rekening || '—' }}</td>
              <td class="px-3 py-2.5 text-foreground">{{ r.nama }}</td>
              <td class="px-3 py-2.5">
                <span class="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs text-surface-foreground">
                  {{ r.kawasan_kode }} — {{ r.kawasan_nama }}
                </span>
              </td>
              <td class="px-3 py-2.5 text-foreground">{{ r.level }}</td>
              <td class="px-3 py-2.5 text-foreground">{{ r.urutan }}</td>
              <td class="px-3 py-2.5 text-end text-foreground">{{ r.tarif ? fmt(r.tarif) : '—' }}</td>
              <td class="px-3 py-2.5">
                <span
                  v-if="r.mode_tarif === 'kuantitas'"
                  class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  <Calculator class="shrink-0 size-3" aria-hidden="true" />
                  Kuantitas<span v-if="r.satuan"> / {{ r.satuan }}</span>
                </span>
                <span v-else class="text-muted-foreground-1">Langsung</span>
              </td>
              <td class="px-3 py-2.5">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="aktifChip(r.aktif)">
                  {{ r.aktif ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td v-if="isAdmin" class="px-3 py-2.5">
                <AppMenu
                  :items="[
                    { label: 'Edit', icon: Pencil, onClick: () => openEdit(r) },
                    { label: 'Nonaktifkan', icon: Power, variant: 'danger', onClick: () => confirmDelete(r) },
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
          v-for="r in paginated"
          v-else
          :key="r.id"
          :title="`${r.kode || '-'} — ${r.nama}`"
          :subtitle="`${r.kawasan_kode} — ${r.kawasan_nama}`"
          :fields="[
            { label: 'Kode Rekening', value: r.kode_rekening || '—' },
            { label: 'Level', value: r.level },
            { label: 'Urutan', value: r.urutan },
            { label: 'Tarif', value: r.tarif ? fmt(r.tarif) : '—', class: 'text-end font-medium' },
          ]"
        >
          <template #badge>
            <span
              v-if="r.mode_tarif === 'kuantitas'"
              class="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
            >
              Kuantitas<span v-if="r.satuan"> / {{ r.satuan }}</span>
            </span>
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
              class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-amber-600 hover:bg-layer-hover focus:outline-hidden dark:text-amber-400"
              @click="confirmDelete(r)"
            >
              <Power class="shrink-0 size-3.5" aria-hidden="true" /> Nonaktifkan
            </button>
          </template>
        </RecordCard>
      </div>

      <!-- Mode compact -->
      <div v-else class="p-2">
        <div v-if="loading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
        <div v-else-if="!filtered.length" class="py-6 text-center text-muted-foreground-1">Belum ada data</div>
        <ul v-else class="divide-y divide-table-line">
          <li v-for="r in paginated" :key="r.id" class="flex items-center gap-2 py-2">
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm text-foreground">{{ r.kode || '-' }} — {{ r.nama }}</span>
              <span class="block truncate text-xs text-muted-foreground-1">{{ r.kawasan_kode }} — {{ r.kawasan_nama }}</span>
            </span>
            <span class="shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium" :class="aktifChip(r.aktif)">
              {{ r.aktif ? 'Aktif' : 'Nonaktif' }}
            </span>
            <AppMenu
              v-if="isAdmin"
              :items="[
                { label: 'Edit', icon: Pencil, onClick: () => openEdit(r) },
                { label: 'Nonaktifkan', icon: Power, variant: 'danger', onClick: () => confirmDelete(r) },
              ]"
            />
          </li>
        </ul>
      </div>

      <hr v-if="total" class="border-card-divider" />
      <div v-if="total" class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div class="flex items-center gap-2 text-sm text-muted-foreground-1">
          <span>Menampilkan {{ from }}–{{ to }} dari {{ total }} data</span>
          <div class="w-[90px]"><AppSelect v-model="perPage" :items="[5, 10, 25, 50]" :search="false" /></div>
          <span>per halaman</span>
        </div>
        <AppPagination v-model="currentPage" :length="pageCount" :total-visible="5" />
      </div>
    </div>

    <!-- Dialog tambah/edit -->
    <AppDialog
      v-model="dialog"
      :title="editing ? 'Edit Jenis Retribusi' : 'Tambah Jenis Retribusi'"
      :max-width="520"
      :icon="editing ? ListChecks : ListOrdered"
    >
      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Kawasan *</label>
        <AppSelect v-model="form.kawasan_id" :items="kawasanSelect" placeholder="Pilih kawasan" in-modal />
        <p v-if="err.kawasan_id" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.kawasan_id }}</p>
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Parent (opsional)</label>
        <AppSelect v-model="form.parent_id" :items="parentOpts" placeholder="— Tanpa parent (level 1) —" clearable in-modal />
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Kode</label>
        <input
          v-model="form.kode"
          type="text"
          placeholder="Contoh: A.1, B.2.1"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Kode Rekening</label>
        <input
          v-model="form.kode_rekening"
          type="text"
          placeholder="Contoh: 4.1.02,02.012"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
        <p class="mt-1 text-xs text-muted-foreground-1">
          Khusus induk &amp; sub-induk. Kosongkan untuk rincian/leaf.
        </p>
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Nama *</label>
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

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Mode Input</label>
        <AppSelect v-model="form.mode_tarif" :items="modeOpts" :search="false" in-modal />
        <p class="mt-1 text-xs text-muted-foreground-1">
          Kuantitas = unit × tarif (mis. parkir, karcis); Langsung = nilai Rp bulanan
        </p>
      </div>

      <div v-if="form.mode_tarif === 'kuantitas'" class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Satuan</label>
        <input
          v-model="form.satuan"
          type="text"
          placeholder="mis. orang, unit, hari, tiket"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">
          {{ form.mode_tarif === 'kuantitas' ? 'Tarif per satuan *' : 'Tarif (opsional)' }}
        </label>
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-2.5 text-xs text-muted-foreground-1">Rp</span>
          <input
            :value="tarifDisplay"
            type="text"
            inputmode="numeric"
            class="w-full rounded-lg border border-layer-line bg-layer py-2 ps-9 pe-3 text-sm text-layer-foreground
                   focus:border-primary-focus focus:ring-primary-focus"
            @input="onTarifInput"
          />
        </div>
        <p class="mt-1 text-xs text-muted-foreground-1">Untuk pos berbayar per unit/tiket</p>
        <p v-if="err.tarif" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.tarif }}</p>
      </div>

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

    <!-- Dialog nonaktifkan -->
    <AppDialog v-model="delDialog" title="Nonaktifkan jenis?" :max-width="420" :icon="Power">
      Yakin nonaktifkan <b>{{ delTarget?.nama }}</b> ({{ delTarget?.kode }})? Data histori tetap terjaga — status jadi Nonaktif (soft delete).
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
          class="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white
                 hover:bg-amber-700 focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none"
          :disabled="deleting"
          @click="doDelete"
        >
          <LoaderCircle v-if="deleting" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
          Nonaktifkan
        </button>
      </template>
    </AppDialog>

    <AppToast v-model="snack.show" :message="snack.msg" :color="snack.color" :timeout="3000" />
  </div>
</template>

<script setup lang="ts">
import {
  Calculator,
  List,
  ListChecks,
  ListOrdered,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  Search,
} from 'lucide-vue-next'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { mode } = useViewMode('jenis')

type Row = { id: number; kawasan_id: number; parent_id: number | null; kode: string; kode_rekening: string; nama: string; level: number; urutan: number; aktif: number; tarif: number | null; mode_tarif: string; satuan: string; kawasan_nama: string; kawasan_kode: string }
type Kawasan = { id: number; kode: string; nama: string }

const session = useUserSession()
const isAdmin = computed(() => String(session.user.value?.role || '') === 'admin')
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

function aktifChip(aktif: number) {
  return aktif
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
    : 'bg-surface text-surface-foreground'
}

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
