<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <Banknote class="shrink-0 size-9 text-primary" aria-hidden="true" />
        <h1 class="text-2xl font-medium text-foreground">Data PAD — Realisasi</h1>
      </div>
      <button
        v-if="isUser"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium
               text-primary-foreground hover:bg-primary-hover focus:outline-hidden focus:bg-primary-focus"
        @click="openAdd"
      >
        <Plus class="shrink-0 size-4" aria-hidden="true" />
        Tambah Realisasi
      </button>
    </div>

    <div class="rounded-lg border border-card-line bg-card">
      <!-- Toolbar: filter (dropdown), search, toggle view — satu baris -->
      <div class="flex flex-wrap items-center gap-2 px-4 pt-3">
        <AppMenu
          placement="bottom-start"
          auto-close="inside"
          root-class="[--auto-close:inside]"
          aria-label="Filter"
          menu-class="min-w-[300px]"
          toggle-class="gap-1.5 px-2.5 py-1.5 border border-layer-line rounded-lg text-sm"
        >
          <template #toggle>
            <SlidersHorizontal class="shrink-0 size-4" aria-hidden="true" />
            <span>Filter</span>
            <span
              v-if="activeFilterCount"
              class="inline-flex items-center justify-center min-w-4 h-4 px-1
                     rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none"
            >
              {{ activeFilterCount }}
            </span>
            <ChevronDown class="shrink-0 size-3.5 text-muted-foreground-1" aria-hidden="true" />
          </template>

          <template #content>
            <div class="flex flex-col gap-2 p-1">
              <AppSelect
                v-model="filterKawasan"
                :items="kawasanOpts"
                :disabled="!!scopedKawasanId"
                placeholder="Kawasan: Semua"
                clearable
                @update:model-value="load"
              />
              <AppSelect
                v-model="filterJenis"
                :items="jenisFilterOpts"
                placeholder="Semua jenis"
                clearable
                @update:model-value="load"
              />
              <AppSelect
                v-model="filterStatus"
                :items="statusOpts"
                placeholder="Semua status"
                clearable
                @update:model-value="load"
              />
              <button
                type="button"
                class="mt-1 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm
                       text-muted-foreground-1 hover:bg-layer-hover focus:outline-hidden
                       disabled:opacity-50 disabled:pointer-events-none"
                :disabled="!activeFilterCount"
                @click="resetFilters"
              >
                <RotateCcw class="shrink-0 size-3.5" aria-hidden="true" />
                Reset filter
              </button>
            </div>
          </template>
        </AppMenu>

        <div class="relative order-last w-full sm:order-none sm:w-auto sm:max-w-[260px] sm:flex-1">
          <Search
            class="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground-1"
            aria-hidden="true"
          />
          <input
            v-model="q"
            type="text"
            placeholder="Cari kode/nama/catatan..."
            class="w-full rounded-lg border border-layer-line bg-layer py-2 ps-8 pe-3 text-sm text-layer-foreground
                   focus:border-primary-focus focus:ring-primary-focus"
          />
        </div>

        <ViewModeToggle v-model="mode" class="ms-auto" />
      </div>

      <!-- Mode tabel -->
      <div v-if="mode === 'table'" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-table-line text-sm">
          <thead>
            <tr class="text-start text-xs uppercase tracking-wide text-muted-foreground-1">
              <th class="px-3 py-2.5 text-start font-medium">Tanggal</th>
              <th class="px-3 py-2.5 text-start font-medium">Kode</th>
              <th class="px-3 py-2.5 text-start font-medium">Jenis</th>
              <th class="px-3 py-2.5 text-start font-medium">Kawasan</th>
              <th class="px-3 py-2.5 text-end font-medium">Jumlah</th>
              <th class="px-3 py-2.5 text-end font-medium">Target</th>
              <th class="px-3 py-2.5 text-end font-medium">Capaian</th>
              <th class="px-3 py-2.5 text-start font-medium">Status</th>
              <th v-if="isUser" class="w-[140px] px-3 py-2.5 text-start font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-table-line">
            <tr v-if="loading">
              <td :colspan="colCount" class="py-6 text-center text-muted-foreground-1">Memuat...</td>
            </tr>
            <tr v-else-if="!filtered.length">
              <td :colspan="colCount" class="py-6 text-center text-muted-foreground-1">Belum ada data</td>
            </tr>
            <template v-for="r in paginated" :key="r.id">
              <tr class="hover:bg-primary/5">
                <td class="px-3 py-2.5 text-foreground">
                  {{ r.tanggal }}
                </td>
                <td class="px-3 py-2.5 font-medium text-foreground">{{ r.jenis_kode || '-' }}</td>
                <td class="px-3 py-2.5 text-foreground">{{ r.jenis_nama }}</td>
                <td class="px-3 py-2.5">
                  <span class="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs text-surface-foreground">
                    {{ r.kawasan_kode }} — {{ r.kawasan_nama }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-end text-foreground">{{ fmt(r.jumlah) }}</td>
                <td class="px-3 py-2.5 text-end text-foreground">{{ fmt(r.target_nilai) }}</td>
                <td class="px-3 py-2.5 text-end">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="capaianChip(r.capaian)"
                  >
                    {{ r.capaian }}%
                  </span>
                </td>
                <td class="px-3 py-2.5">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="statusChip(r.status)"
                  >
                    {{ r.status }}
                  </span>
                </td>
                <td v-if="isUser" class="px-3 py-2.5">
                  <div class="flex items-center gap-0.5">
                    <button
                      v-if="r.status === 'draft'"
                      type="button"
                      class="rounded-md p-1.5 text-muted-foreground-1 hover:bg-layer-hover focus:outline-hidden"
                      aria-label="Edit"
                      @click.stop="openEdit(r)"
                    >
                      <Pencil class="shrink-0 size-4" aria-hidden="true" />
                    </button>
                    <button
                      v-if="r.status === 'draft'"
                      type="button"
                      class="rounded-md p-1.5 text-primary hover:bg-layer-hover focus:outline-hidden"
                      aria-label="Ajukan"
                      @click.stop="confirmAjukan(r)"
                    >
                      <Send class="shrink-0 size-4" aria-hidden="true" />
                    </button>
                    <button
                      v-if="r.status === 'draft'"
                      type="button"
                      class="rounded-md p-1.5 text-red-600 hover:bg-layer-hover focus:outline-hidden dark:text-red-400"
                      aria-label="Hapus"
                      @click.stop="confirmDelete(r)"
                    >
                      <Trash2 class="shrink-0 size-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            </template>
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
          :title="`${r.jenis_kode || '-'} — ${r.jenis_nama}`"
          :subtitle="r.tanggal"
          :fields="[
            { label: 'Kawasan', value: `${r.kawasan_kode} — ${r.kawasan_nama}` },
            { label: 'Jumlah', value: fmt(r.jumlah), class: 'text-end' },
            { label: 'Target', value: fmt(r.target_nilai), class: 'text-end' },
            { label: 'Capaian', value: r.capaian + '%', class: `text-end font-medium ${capaianText(r.capaian)}` },
          ]"
        >
          <template #badge>
            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="statusChip(r.status)">
              {{ r.status }}
            </span>
          </template>
          <template v-if="isUser && r.status === 'draft'" #actions>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-layer-hover focus:outline-hidden"
              @click="openEdit(r)"
            >
              <Pencil class="shrink-0 size-3.5" aria-hidden="true" /> Edit
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-layer-hover focus:outline-hidden"
              @click="confirmAjukan(r)"
            >
              <Send class="shrink-0 size-3.5" aria-hidden="true" /> Ajukan
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
          <li v-for="r in paginated" :key="r.id" class="flex items-center gap-2 py-2">
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm text-foreground">{{ r.jenis_kode || '-' }} — {{ r.jenis_nama }}</span>
              <span class="block truncate text-xs text-muted-foreground-1">{{ r.tanggal }}</span>
            </span>
            <span class="shrink-0 text-sm text-muted-foreground-1">{{ fmt(r.jumlah) }}</span>
            <span class="shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium" :class="statusChip(r.status)">
              {{ r.status }}
            </span>
            <AppMenu
              v-if="isUser && r.status === 'draft'"
              :items="[
                { label: 'Edit', icon: Pencil, onClick: () => openEdit(r) },
                { label: 'Ajukan', icon: Send, onClick: () => confirmAjukan(r) },
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
          <div class="w-[90px]">
            <AppSelect v-model="perPage" :items="[5, 10, 25, 50]" :search="false" />
          </div>
          <span>per halaman</span>
        </div>
        <AppPagination v-model="currentPage" :length="pageCount" :total-visible="5" />
      </div>
    </div>

    <!-- Contoh langkah perhitungan (statis, bukan per baris) -->
    <CollapsibleCard class="mt-4" title="Langkah Perhitungan">
      <PerhitunganPanel
        :show-header="false"
        mode-label="Contoh"
        formula="capaian = jumlah ÷ target tahun"
        :lines="[
          { label: 'Jumlah realisasi', value: fmt(15000000) },
          { label: 'Status', value: 'disetujui' },
        ]"
        :target="120000000"
        :total="15000000"
        total-label="Jumlah"
        basis-note="Contoh ilustrasi (bukan data aktual): target tahun berjalan Rp 120.000.000 dengan realisasi disetujui Rp 15.000.000 menghasilkan capaian 12,5%. Angka resmi hanya status disetujui."
      />
    </CollapsibleCard>

    <!-- Dialog tambah/edit -->
    <AppDialog
      v-model="dialog"
      :title="editing ? 'Edit Realisasi' : 'Tambah Realisasi'"
      :max-width="520"
      :icon="editing ? Pencil : CircleDollarSign"
    >
      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Jenis Retribusi *</label>
        <AppSelect
          v-model="form.jenis_retribusi_id"
          :items="jenisOpts"
          placeholder="Pilih jenis"
          in-modal
          @update:model-value="onJenisChange"
        />
        <p v-if="err.jenis" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.jenis }}</p>
      </div>

      <div v-if="targetInfo !== null" class="mb-2 text-xs text-muted-foreground-1">
        Target {{ targetYear }}: <b class="text-foreground">{{ fmt(targetInfo) }}</b> — Capaian:
        <b :class="previewCapaian >= 100 ? 'text-emerald-600 dark:text-emerald-400' : previewCapaian >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'">
          {{ previewCapaian }}%
        </b>
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Tanggal *</label>
        <input
          v-model="form.tanggal"
          type="date"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
          @change="onTanggalChange"
        />
        <p v-if="err.tanggal" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.tanggal }}</p>
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">
          {{ modeKuantitas ? 'Jumlah (Kuantitas) *' : 'Jumlah *' }}
        </label>
        <input
          v-if="modeKuantitas"
          v-model.number="form.kuantitas"
          type="number"
          min="0"
          step="1"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
        <RupiahField v-else v-model="form.jumlah" />
        <p v-if="err.jumlah" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.jumlah }}</p>
        <p v-if="err.kuantitas" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.kuantitas }}</p>
        <p v-if="modeKuantitas" class="mt-1 text-xs text-muted-foreground-1">
          {{ form.kuantitas || 0 }} {{ satuanJenis }} &times; {{ fmt(jenisTarif) }} =
          <b class="text-foreground">{{ fmt(jumlahEfektif) }}</b>
        </p>
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Catatan</label>
        <input
          v-model="form.catatan"
          type="text"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
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
    <AppDialog v-model="delDialog" title="Hapus realisasi?" :max-width="420" :icon="Trash2">
      Yakin hapus realisasi <b>{{ delTarget?.jenis_nama }}</b> tanggal {{ delTarget?.tanggal }}?
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

    <!-- Dialog ajukan -->
    <AppDialog v-model="ajukanDialog" title="Ajukan realisasi?" :max-width="420" :icon="Send">
      Realisasi akan diajukan untuk verifikasi. Tidak bisa diedit lagi setelah diajukan.
      <template #actions>
        <button
          type="button"
          class="rounded-lg px-3 py-2 text-sm text-foreground hover:bg-layer-hover focus:outline-hidden"
          @click="ajukanDialog = false"
        >
          Batal
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium
                 text-primary-foreground hover:bg-primary-hover focus:outline-hidden
                 disabled:opacity-50 disabled:pointer-events-none"
          :disabled="ajukanLoading"
          @click="doAjukan"
        >
          <LoaderCircle v-if="ajukanLoading" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
          Ajukan
        </button>
      </template>
    </AppDialog>

    <AppToast v-model="snack.show" :message="snack.msg" :color="snack.color" :timeout="3000" />
  </div>
</template>

<script setup lang="ts">
import {
  Banknote,
  ChevronDown,
  CircleDollarSign,
  LoaderCircle,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
} from 'lucide-vue-next'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { mode } = useViewMode('pad')

type Row = { id: number; jenis_retribusi_id: number; tanggal: string; jumlah: number; catatan: string; batch_id: number | null; status: string; created_by: number; jenis_kode: string; jenis_nama: string; kawasan_id: number; kawasan_kode: string; kawasan_nama: string; target_nilai: number; capaian: number }
type Kawasan = { id: number; kode: string; nama: string }
type Jenis = { id: number; kode: string; nama: string; kawasan_id: number; level: number; has_child: number; tarif: number | null; mode_tarif: string; satuan: string }

const session = useUserSession()
const isUser = computed(() => String(session.user.value?.role) === 'user')
// Penugasan kawasan petugas (null = bebas memilih kawasan).
const scopedKawasanId = computed<number | null>(() => {
  const v = session.user.value?.kawasan_id
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
})
const colCount = computed(() => (isUser.value ? 9 : 8))

const kawasan = ref<Kawasan[]>([])
const jenisList = ref<Jenis[]>([])
const rows = ref<Row[]>([])
const loading = ref(false)
const q = ref('')
const filterKawasan = ref<number | null>(null)
const filterJenis = ref<number | null>(null)
const filterStatus = ref<string | null>(null)
const statusOpts = ['draft', 'diajukan', 'disetujui', 'ditolak']

// Jumlah filter aktif (kawasan terkunci oleh penugasan tidak dihitung).
const activeFilterCount = computed(() =>
  [filterJenis.value, filterStatus.value, scopedKawasanId.value ? null : filterKawasan.value]
    .filter((v) => v !== null && v !== '').length,
)

const kawasanOpts = computed(() => kawasan.value.map((k) => ({ label: `${k.kode} — ${k.nama}`, value: k.id })))
const jenisFilterOpts = computed(() => {
  const pool = filterKawasan.value ? jenisList.value.filter((j) => j.kawasan_id === filterKawasan.value) : jenisList.value
  return pool.map((j) => ({ label: `${j.kode || '-'} — ${j.nama}`, value: j.id }))
})
const jenisOpts = computed(() => {
  // Petugas dengan penugasan kawasan: hanya jenis dari kawasan tersebut
  const filtered = scopedKawasanId.value 
    ? jenisList.value.filter((j) => j.kawasan_id === scopedKawasanId.value)
    : jenisList.value
  return filtered.filter((j) => !j.has_child).map((j) => {
    const kw = kawasan.value.find((k) => k.id === j.kawasan_id)
    const kwLabel = kw ? `${kw.kode} — ` : ''
    return { label: `${kwLabel}${j.kode || '-'} — ${j.nama}`, value: j.id }
  })
})

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
const form = reactive<{ jenis_retribusi_id: number | null; tanggal: string; jumlah: number; kuantitas: number; catatan: string }>({ jenis_retribusi_id: null, tanggal: new Date().toISOString().slice(0, 10), jumlah: 0, kuantitas: 0, catatan: '' })
const err = reactive({ jenis: '', tanggal: '', jumlah: '', kuantitas: '' })
const { formatRupiah: fmt } = useCurrency()
const targetInfo = ref<number | null>(null)

// Mode tarif jenis terpilih: 'kuantitas' (unit x tarif) atau 'langsung' (Rp).
const selectedJenis = computed(() => jenisList.value.find((j) => j.id === form.jenis_retribusi_id) ?? null)
const modeKuantitas = computed(() => selectedJenis.value?.mode_tarif === 'kuantitas')
const jenisTarif = computed(() => Number(selectedJenis.value?.tarif) || 0)
const satuanJenis = computed(() => selectedJenis.value?.satuan || 'unit')
// Nilai Rupiah efektif: mode kuantitas dihitung otomatis dari kuantitas x tarif.
const jumlahEfektif = computed(() => (modeKuantitas.value ? Math.round((Number(form.kuantitas) || 0) * jenisTarif.value) : Number(form.jumlah) || 0))

const targetYear = computed(() => form.tanggal ? Number(form.tanggal.slice(0, 4)) : new Date().getFullYear())
const previewCapaian = computed(() => {
  const t = targetInfo.value ?? 0
  const j = jumlahEfektif.value
  return t > 0 ? Math.round((j / t) * 10000) / 100 : 0
})

function statusChip(s: string) {
  if (s === 'disetujui') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
  if (s === 'diajukan') return 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
  if (s === 'ditolak') return 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
  return 'bg-surface text-surface-foreground'
}
function capaianChip(v: number) {
  if (v >= 100) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
  if (v >= 75) return 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
  return 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
}
function capaianText(v: number) {
  if (v >= 100) return 'text-emerald-600 dark:text-emerald-400'
  if (v >= 75) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
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
    // Petugas dengan penugasan kawasan: filter dikunci ke kawasan tersebut.
    if (scopedKawasanId.value) filterKawasan.value = scopedKawasanId.value
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

// Reset filter ke default (kawasan tetap terkunci bila ada penugasan).
async function resetFilters() {
  filterKawasan.value = scopedKawasanId.value ?? null
  filterJenis.value = null
  filterStatus.value = null
  await load()
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

function openAdd() {
  editing.value = null
  form.jenis_retribusi_id = filterJenis.value ?? null
  form.tanggal = new Date().toISOString().slice(0, 10)
  form.jumlah = 0
  form.kuantitas = 0
  form.catatan = ''
  err.jenis = ''; err.tanggal = ''; err.jumlah = ''; err.kuantitas = ''
  targetInfo.value = null
  dialog.value = true
  if (form.jenis_retribusi_id) fetchTarget()
}
function openEdit(r: Row) {
  editing.value = r
  form.jenis_retribusi_id = r.jenis_retribusi_id
  form.tanggal = r.tanggal
  form.jumlah = r.jumlah
  // Data lama tanpa jejak kuantitas: turunkan dari jumlah / tarif bila memungkinkan.
  const tarif = Number(jenisList.value.find((j) => j.id === r.jenis_retribusi_id)?.tarif) || 0
  form.kuantitas = tarif > 0 ? Math.round(r.jumlah / tarif) : 0
  form.catatan = r.catatan
  err.jenis = ''; err.tanggal = ''; err.jumlah = ''; err.kuantitas = ''
  dialog.value = true
  fetchTarget()
}
function confirmDelete(r: Row) { delTarget.value = r; delDialog.value = true }
function confirmAjukan(r: Row) { ajukanTarget.value = r; ajukanDialog.value = true }

async function save() {
  err.jenis = ''; err.tanggal = ''; err.jumlah = ''; err.kuantitas = ''
  if (!form.jenis_retribusi_id) err.jenis = 'Jenis wajib dipilih'
  if (!form.tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(form.tanggal)) err.tanggal = 'Tanggal wajib YYYY-MM-DD'
  if (modeKuantitas.value) {
    if (!Number.isFinite(Number(form.kuantitas)) || Number(form.kuantitas) < 0) err.kuantitas = 'Kuantitas harus >= 0'
  } else if (!Number.isFinite(Number(form.jumlah)) || Number(form.jumlah) < 0) {
    err.jumlah = 'Jumlah harus >= 0'
  }
  if (err.jenis || err.tanggal || err.jumlah || err.kuantitas) return
  saving.value = true
  try {
    const body = {
      jenis_retribusi_id: form.jenis_retribusi_id,
      tanggal: form.tanggal,
      jumlah: jumlahEfektif.value,
      kuantitas: modeKuantitas.value ? Number(form.kuantitas) : null,
      catatan: form.catatan.trim(),
    }
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
