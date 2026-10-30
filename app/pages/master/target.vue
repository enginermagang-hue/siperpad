<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <Target class="shrink-0 size-9 text-primary" aria-hidden="true" />
        <h1 class="text-2xl font-medium text-foreground">Target Tahunan</h1>
      </div>
      <button
        v-if="isAdmin"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium
               text-primary-foreground hover:bg-primary-hover focus:outline-hidden focus:bg-primary-focus"
        @click="openAdd"
      >
        <Plus class="shrink-0 size-4" aria-hidden="true" />
        Tambah Target
      </button>
    </div>

    <div class="mb-4 rounded-lg border border-card-line bg-card p-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="w-full max-w-[240px]">
          <AppSelect v-model="filterKawasan" :items="kawasanOpts" placeholder="Semua" clearable @update:model-value="load" />
        </div>
        <div class="w-full max-w-[120px]">
          <AppSelect v-model="tahun" :items="tahunOpts" :search="false" @update:model-value="load" />
        </div>
        <div class="relative w-full max-w-[320px]">
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
        <div class="ms-auto"><ViewModeToggle v-model="mode" /></div>
      </div>
    </div>

    <div class="rounded-lg border border-card-line bg-card">
      <!-- Mode tabel -->
      <div v-if="mode === 'table'" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-table-line text-sm">
          <thead>
            <tr class="text-start text-xs uppercase tracking-wide text-muted-foreground-1">
              <th class="px-3 py-2.5 text-start font-medium">Kode</th>
              <th class="px-3 py-2.5 text-start font-medium">Jenis Retribusi</th>
              <th class="px-3 py-2.5 text-start font-medium">Kawasan</th>
              <th class="px-3 py-2.5 text-start font-medium">Tahun</th>
              <th class="px-3 py-2.5 text-end font-medium">Target</th>
              <th v-if="isAdmin" class="w-[70px] px-3 py-2.5 text-start font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-table-line">
            <tr v-if="loading">
              <td colspan="6" class="py-6 text-center text-muted-foreground-1">Memuat...</td>
            </tr>
            <tr v-else-if="!filtered.length">
              <td colspan="6" class="py-6 text-center text-muted-foreground-1">Belum ada target untuk tahun ini</td>
            </tr>
            <tr v-for="r in paginated" v-else :key="r.id" class="hover:bg-layer-hover">
              <td class="px-3 py-2.5 font-medium text-foreground">{{ r.kode || '-' }}</td>
              <td class="px-3 py-2.5 text-foreground">
                {{ r.nama }}
                <span
                  v-if="r.nilai_induk != null"
                  class="ms-1 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium
                         text-amber-900 dark:bg-amber-950/60 dark:text-amber-300"
                >
                  Induk tertulis: {{ fmt(r.nilai_induk) }}
                </span>
              </td>
              <td class="px-3 py-2.5">
                <span class="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs text-surface-foreground">
                  {{ r.kawasan_kode }} — {{ r.kawasan_nama }}
                </span>
              </td>
              <td class="px-3 py-2.5 text-foreground">{{ r.tahun }}</td>
              <td class="px-3 py-2.5 text-end text-foreground">{{ fmt(r.nilai) }}</td>
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
        <div v-else-if="!filtered.length" class="py-6 text-center text-muted-foreground-1">Belum ada target untuk tahun ini</div>
        <RecordCard
          v-for="r in paginated"
          v-else
          :key="r.id"
          :title="`${r.kode || '-'} — ${r.nama}`"
          :subtitle="`${r.kawasan_kode} — ${r.kawasan_nama}`"
          :fields="[
            { label: 'Tahun', value: r.tahun },
            { label: 'Target', value: fmt(r.nilai), class: 'text-end font-medium' },
          ]"
        >
          <template #badge>
            <span
              v-if="r.nilai_induk != null"
              class="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium
                     text-amber-900 dark:bg-amber-950/60 dark:text-amber-300"
            >
              Induk: {{ fmt(r.nilai_induk) }}
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
        <div v-else-if="!filtered.length" class="py-6 text-center text-muted-foreground-1">Belum ada target untuk tahun ini</div>
        <ul v-else class="divide-y divide-table-line">
          <li v-for="r in paginated" :key="r.id" class="flex items-center gap-2 py-2">
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm text-foreground">{{ r.kode || '-' }} — {{ r.nama }}</span>
              <span class="block truncate text-xs text-muted-foreground-1">{{ r.kawasan_kode }} — {{ r.tahun }}</span>
            </span>
            <span class="shrink-0 text-sm font-medium text-foreground">{{ fmt(r.nilai) }}</span>
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
      :title="editing ? 'Edit Target' : 'Tambah Target'"
      :max-width="520"
      :icon="editing ? Target : Plus"
    >
      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Jenis Retribusi *</label>
        <AppSelect v-model="form.jenis_retribusi_id" :items="jenisOpts" placeholder="Pilih jenis retribusi" in-modal />
        <p v-if="err.jenis" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.jenis }}</p>
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Tahun *</label>
        <input
          v-model.number="form.tahun"
          type="number"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
        <p v-if="err.tahun" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.tahun }}</p>
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Nilai Target *</label>
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-2.5 text-xs text-muted-foreground-1">Rp</span>
          <input
            :value="nilaiDisplay"
            type="text"
            inputmode="numeric"
            class="w-full rounded-lg border border-layer-line bg-layer py-2 ps-9 pe-3 text-sm text-layer-foreground
                   focus:border-primary-focus focus:ring-primary-focus"
            @input="onNilaiInput"
          />
        </div>
        <p v-if="err.nilai" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.nilai }}</p>
      </div>

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
    <AppDialog v-model="delDialog" title="Hapus target?" :max-width="420" :icon="Trash2">
      Yakin hapus target <b>{{ delTarget?.nama }}</b> tahun {{ delTarget?.tahun }}?
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
import { LoaderCircle, Pencil, Plus, Search, Target, Trash2 } from 'lucide-vue-next'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { mode } = useViewMode('target')

type Row = { id: number; jenis_retribusi_id: number; tahun: number; nilai: number; nilai_induk: number | null; kode: string; nama: string; level: number; kawasan_id: number; kawasan_kode: string; kawasan_nama: string }
type Kawasan = { id: number; kode: string; nama: string }
type Jenis = { id: number; kode: string; nama: string; kawasan_id: number }

const session = useUserSession()
const isAdmin = computed(() => String(session.user.value?.role || '') === 'admin')

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
const { formatRupiah: fmt, useRupiahInput } = useCurrency()
const { display: nilaiDisplay, onInput: onNilaiInput } = useRupiahInput(toRef(form, 'nilai'))
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
