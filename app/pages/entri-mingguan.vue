<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <Table2 class="shrink-0 size-9 text-primary" aria-hidden="true" />
        <h1 class="text-2xl font-medium text-foreground">Entri Mingguan</h1>
      </div>
      <div class="flex items-center gap-3">
        <span
          v-if="meta?.locked"
          class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium
                 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300"
        >
          <Lock class="shrink-0 size-3.5" aria-hidden="true" />
          Periode Terkunci
        </span>
        <button
          v-if="isUser"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium
                 text-primary-foreground hover:bg-primary-hover focus:outline-hidden focus:bg-primary-focus
                 disabled:opacity-50 disabled:pointer-events-none"
          :disabled="!kawasanId || !!meta?.locked"
          @click="openInput"
        >
          <Plus class="shrink-0 size-4" aria-hidden="true" />
          Input Entri
        </button>
      </div>
    </div>

    <!-- Filter -->
    <div class="mb-4 rounded-lg border border-card-line bg-card p-4">
      <div class="flex flex-wrap gap-3">
        <div class="w-full max-w-[260px]">
          <AppSelect
            v-model="kawasanId"
            :items="kawasanOpts"
            :disabled="!!scopedKawasanId"
            placeholder="Kawasan *"
            @update:model-value="load"
          />
        </div>
        <div class="w-full max-w-[150px]">
          <AppSelect v-model="bulan" :items="bulanOpts" @update:model-value="load" />
        </div>
        <div class="w-full max-w-[110px]">
          <AppSelect v-model="tahun" :items="tahunOpts" :search="false" @update:model-value="load" />
        </div>
      </div>
      <div class="mt-3 text-xs text-muted-foreground-1">
        Minggu I: tgl 1–7 · II: 8–14 · III: 15–21 · IV: 22–akhir bulan. Tekan
        <b class="text-foreground">Input Entri</b> lalu pilih jenis penerimaan untuk mengisi nilai minggu aktif.
        Total &amp; realisasi kumulatif dihitung otomatis dari data <b class="text-foreground">disetujui</b>.
      </div>
    </div>

    <!-- Tab minggu + toggle mode -->
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <div class="flex-1 border-b border-line-2">
        <nav class="-mb-px flex flex-wrap gap-x-1" aria-label="Pilih minggu">
          <button
            v-for="w in mingguTabs"
            :key="w.value"
            type="button"
            class="whitespace-nowrap border-b-2 px-3 py-2 text-sm focus:outline-hidden focus:bg-layer-focus"
            :class="tabMinggu === w.value
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground-1 hover:text-foreground hover:border-line-4'"
            :aria-current="tabMinggu === w.value ? 'page' : undefined"
            @click="tabMinggu = w.value"
          >
            {{ w.label }}
            <span class="ms-1 text-xs text-muted-foreground-1">({{ w.range }})</span>
          </button>
        </nav>
      </div>
      <ViewModeToggle v-model="mode" />
    </div>

    <div class="rounded-lg border border-card-line bg-card">
      <!-- Mode tabel -->
      <div v-if="mode === 'table'" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-table-line text-sm">
          <thead>
            <tr class="text-start text-xs uppercase tracking-wide text-muted-foreground-1">
              <th class="px-3 py-2.5 text-start font-medium">Kode</th>
              <th class="px-3 py-2.5 text-start font-medium">Jenis Penerimaan</th>
              <th class="px-3 py-2.5 text-end font-medium">Target</th>
              <th class="px-3 py-2.5 text-end font-medium">s/d Bulan Lalu</th>
              <th class="px-3 py-2.5 text-end font-medium">Nilai {{ labelMingguAktif }}</th>
              <th class="px-3 py-2.5 text-end font-medium">Total Bulanan</th>
              <th class="w-[120px] px-3 py-2.5 text-start font-medium">Status</th>
              <th v-if="isUser" class="px-3 py-2.5 text-start font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-table-line">
            <tr v-if="loading">
              <td :colspan="colCount" class="py-6 text-center text-muted-foreground-1">Memuat...</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td :colspan="colCount" class="py-6 text-center text-muted-foreground-1">Tidak ada pos penerimaan</td>
            </tr>
            <template v-for="r in rows" v-else :key="r.jenis_id">
              <tr class="cursor-pointer hover:bg-primary/5" @click="toggleExpand(r.jenis_id)">
                <td class="px-3 py-2.5 font-medium text-foreground">
                  <ChevronRight
                    class="me-1 inline size-4 align-middle transition-transform"
                    :class="expandedId === r.jenis_id ? 'rotate-90' : ''"
                    aria-hidden="true"
                  />
                  {{ r.kode || '-' }}
                </td>
                <td class="px-3 py-2.5 text-foreground">
                  {{ r.nama }}
                  <span
                    v-if="r.tarif"
                    class="ms-1 inline-flex items-center rounded-full bg-surface px-1.5 py-0.5 text-[11px] text-surface-foreground"
                  >
                    Tarif {{ fmt(r.tarif) }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-end text-foreground">{{ fmt(r.target) }}</td>
                <td class="px-3 py-2.5 text-end text-muted-foreground-1">{{ fmt(r.sBelum) }}</td>
                <td class="px-3 py-2.5 text-end font-medium text-foreground">
                  {{ fmt(cellOf(r).nilai) }}
                  <div
                    v-if="cellOf(r).kuantitas != null && cellOf(r).tarif != null"
                    class="text-xs text-muted-foreground-1"
                  >
                    {{ Number(cellOf(r).kuantitas).toLocaleString('id-ID') }} × {{ fmt(cellOf(r).tarif) }}
                  </div>
                </td>
                <td class="px-3 py-2.5 text-end font-medium text-foreground">{{ fmt(rowTotal(r)) }}</td>
                <td class="px-3 py-2.5">
                  <template v-if="cellOf(r).status">
                    <span
                      v-if="isCellLocked(r)"
                      class="group relative inline-flex"
                      title="Terkunci — sudah diajukan, tidak bisa diubah"
                    >
                      <span
                        class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        :class="statusChip(cellOf(r).status)"
                      >
                        <Lock class="shrink-0 size-3" aria-hidden="true" />
                        {{ cellOf(r).status }}
                      </span>
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="statusChip(cellOf(r).status)"
                    >
                      {{ cellOf(r).status }}
                    </span>
                  </template>
                  <span v-else class="text-muted-foreground-1">-</span>
                </td>
                <td v-if="isUser" class="px-3 py-2.5">
                  <AppMenu
                    v-if="cellOf(r).status === 'draft'"
                    :disabled="!!meta?.locked"
                    :items="[
                      { label: 'Edit', icon: Pencil, onClick: () => openEdit(r) },
                      { label: 'Hapus', icon: Trash2, variant: 'danger', onClick: () => confirmDelete(r) },
                    ]"
                  />
                </td>
              </tr>
              <tr v-if="expandedId === r.jenis_id">
                <td :colspan="colCount" class="p-0">
                  <PerhitunganPanel
                    :title="`${r.kode || '-'} — ${r.nama}`"
                    :subtitle="`${kawasanLabel} · ${labelBulan} ${tahun}`"
                    :mode-label="modeLabelOf(r)"
                    :formula="formulaOf(r)"
                    :lines="panelLines(r)"
                    :target="r.target"
                    :total="rowTotal(r)"
                    total-label="Total Bulanan"
                    basis-note="Grid memakai basis draft + diajukan + disetujui (kecuali ditolak). Angka resmi rekap/ekspor hanya status disetujui."
                  />
                </td>
              </tr>
            </template>
          </tbody>
          <tfoot v-if="rows.length">
            <tr class="border-t-2 border-line-3 font-bold text-foreground">
              <td colspan="2" class="px-3 py-2.5">TOTAL</td>
              <td class="px-3 py-2.5 text-end">{{ fmt(sumTarget) }}</td>
              <td class="px-3 py-2.5 text-end">{{ fmt(sumSBebelum) }}</td>
              <td class="px-3 py-2.5 text-end">{{ fmt(sumMingguAktif) }}</td>
              <td class="px-3 py-2.5 text-end">{{ fmt(sumTotal) }}</td>
              <td></td>
              <td v-if="isUser"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Mode list -->
      <div v-else-if="mode === 'list'" class="p-3">
        <div v-if="loading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
        <div v-else-if="!rows.length" class="py-6 text-center text-muted-foreground-1">Tidak ada pos penerimaan</div>
        <template v-else>
          <RecordCard
            v-for="r in rows"
            :key="r.jenis_id"
            :title="`${r.kode || '-'} — ${r.nama}`"
            :fields="[
              { label: 'Target', value: fmt(r.target), class: 'text-end' },
              { label: 's/d Bulan Lalu', value: fmt(r.sBelum), class: 'text-end' },
              { label: `Nilai ${labelMingguAktif}`, value: fmt(cellOf(r).nilai), class: 'text-end font-medium' },
              { label: 'Total Bulanan', value: fmt(rowTotal(r)), class: 'text-end font-medium' },
            ]"
          >
            <template #badge>
              <span
                v-if="cellOf(r).status"
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                :class="statusChip(cellOf(r).status)"
              >
                <Lock v-if="isCellLocked(r)" class="shrink-0 size-3" aria-hidden="true" />
                {{ cellOf(r).status }}
              </span>
              <span v-else class="text-xs text-muted-foreground-1">-</span>
            </template>
            <div
              v-if="cellOf(r).kuantitas != null && cellOf(r).tarif != null"
              class="mt-1 text-xs text-muted-foreground-1"
            >
              {{ Number(cellOf(r).kuantitas).toLocaleString('id-ID') }} × {{ fmt(cellOf(r).tarif) }}
            </div>
            <template v-if="isUser && cellOf(r).status === 'draft'" #actions>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-layer-hover
                       focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none"
                :disabled="!!meta?.locked"
                @click="openEdit(r)"
              >
                <Pencil class="shrink-0 size-3.5" aria-hidden="true" /> Edit
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-layer-hover
                       focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none dark:text-red-400"
                :disabled="!!meta?.locked"
                @click="confirmDelete(r)"
              >
                <Trash2 class="shrink-0 size-3.5" aria-hidden="true" /> Hapus
              </button>
            </template>
          </RecordCard>
        </template>
      </div>

      <!-- Mode compact -->
      <div v-else class="p-2">
        <div v-if="loading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
        <div v-else-if="!rows.length" class="py-6 text-center text-muted-foreground-1">Tidak ada pos penerimaan</div>
        <ul v-else class="divide-y divide-table-line">
          <li v-for="r in rows" :key="r.jenis_id" class="flex items-center gap-2 py-2">
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm text-foreground">{{ r.kode || '-' }} — {{ r.nama }}</span>
            </span>
            <span class="shrink-0 text-sm font-medium text-foreground">{{ fmt(cellOf(r).nilai) }}</span>
            <span
              v-if="cellOf(r).status"
              class="shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium"
              :class="statusChip(cellOf(r).status)"
            >
              <Lock v-if="isCellLocked(r)" class="shrink-0 size-3" aria-hidden="true" />
              {{ cellOf(r).status }}
            </span>
            <AppMenu
              v-if="isUser && cellOf(r).status === 'draft'"
              :disabled="!!meta?.locked"
              :items="[
                { label: 'Edit', icon: Pencil, onClick: () => openEdit(r) },
                { label: 'Hapus', icon: Trash2, variant: 'danger', onClick: () => confirmDelete(r) },
              ]"
            />
          </li>
        </ul>
      </div>

      <hr class="border-card-divider" />
      <div class="flex flex-wrap items-center justify-between gap-3 p-4">
        <div class="text-sm text-muted-foreground-1">
          Total {{ labelMingguAktif }}: <b class="text-foreground">{{ fmt(sumMingguAktif) }}</b> ·
          Total Bulanan: <b class="text-foreground">{{ fmt(sumTotal) }}</b>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-if="isUser && !meta?.locked"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-secondary-line bg-secondary/5 px-3 py-2
                   text-sm font-medium text-secondary hover:bg-secondary/10 focus:outline-hidden
                   disabled:opacity-50 disabled:pointer-events-none"
            :disabled="!hasDraftMinggu(tabMinggu) || ajukanMingguLoading"
            @click="ajukanMingguIni"
          >
            <LoaderCircle v-if="ajukanMingguLoading" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
            <Send v-else class="shrink-0 size-4" aria-hidden="true" />
            Ajukan Minggu Ini
          </button>
          <button
            v-if="isUser && !meta?.locked"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium
                   text-primary hover:bg-primary/20 focus:outline-hidden
                   disabled:opacity-50 disabled:pointer-events-none"
            :disabled="!hasDraft || ajukanLoading"
            @click="ajukanSemua"
          >
            <LoaderCircle v-if="ajukanLoading" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
            <Send v-else class="shrink-0 size-4" aria-hidden="true" />
            Ajukan Semua
          </button>
        </div>
      </div>
    </div>

    <!-- Dialog input/edit -->
    <AppDialog
      v-model="dialog"
      :title="`${editing ? 'Edit Entri' : 'Tambah Entri'} — ${labelMingguAktif}`"
      :max-width="560"
      :icon="editing ? Pencil : Plus"
    >
      <div class="mb-3 text-xs text-muted-foreground-1">
        {{ kawasanLabel }} · {{ meta?.bulanLabel || bulanOpts.find((b) => b.value === bulan)?.label }} {{ tahun }} ·
        {{ labelMingguAktif }}
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Jenis Penerimaan *</label>
        <AppSelect
          v-model="form.jenis_retribusi_id"
          :items="jenisOpts"
          placeholder="Pilih jenis penerimaan"
          :disabled="!!editing"
          in-modal
          @update:model-value="onJenisChange"
        />
        <p v-if="err.jenis" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.jenis }}</p>
      </div>

      <div v-if="selectedMode === 'kuantitas'" class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">
          Jumlah unit{{ selectedSatuan ? ` (${selectedSatuan})` : '' }} *
        </label>
        <input
          v-model.number="form.kuantitas"
          type="number"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
        <p v-if="err.nilai" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.nilai }}</p>
      </div>

      <div v-else class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Nilai {{ labelMingguAktif }} *</label>
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

      <div
        v-if="selectedMode === 'kuantitas' && selectedRow"
        class="mb-2 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm
               text-blue-800 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-200"
      >
        <Info class="mt-0.5 shrink-0 size-4" aria-hidden="true" />
        <span>
          Perhitungan: <b>{{ (Number(form.kuantitas) || 0).toLocaleString('id-ID') }}</b>
          <span v-if="selectedRow.tarif"> × {{ fmt(selectedRow.tarif) }}</span>
          <span v-else class="text-red-600 dark:text-red-400"> — tarif belum diisi</span>
          = <b>{{ fmt(previewTotal) }}</b>
        </span>
      </div>

      <div
        v-if="selectedMode === 'kuantitas' && selectedRow && !selectedRow.tarif"
        class="mb-2 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm
               text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
      >
        <TriangleAlert class="mt-0.5 shrink-0 size-4" aria-hidden="true" />
        <span>
          Tarif belum diisi untuk jenis ini. Lengkapi dulu di
          <b>Master → Jenis Retribusi</b> sebelum menyimpan.
        </span>
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

      <div
        v-if="selectedRow"
        class="mt-2 flex flex-col gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm
               text-blue-800 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-200"
      >
        <span>Target: <b>{{ fmt(selectedRow.target) }}</b></span>
        <span>s/d Bulan Lalu: <b>{{ fmt(selectedRow.sBelum) }}</b></span>
        <span>Total Bulanan (sebelum perubahan): <b>{{ fmt(rowTotal(selectedRow)) }}</b></span>
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
          @click="saveEntri"
        >
          <LoaderCircle v-if="saving" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
          Simpan
        </button>
      </template>
    </AppDialog>

    <!-- Dialog hapus -->
    <AppDialog v-model="delDialog" title="Hapus entri?" :max-width="420" :icon="Trash2">
      Yakin hapus entri <b>{{ delTarget?.nama }}</b> untuk <b>{{ labelMingguAktif }}</b>?
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
import {
  ChevronRight,
  Info,
  LoaderCircle,
  Lock,
  Pencil,
  Plus,
  Send,
  Table2,
  Trash2,
  TriangleAlert,
} from 'lucide-vue-next'
definePageMeta({ layout: 'default', middleware: 'auth' })

const { mode } = useViewMode('entri-mingguan')

type MingguCell = { minggu: number; nilai: number; saved: number; kuantitas: number | null; tarif: number | null; realisasi_id: number | null; status: string | null; catatan: string }
type GridRow = { jenis_id: number; kode: string; nama: string; level: number; tarif: number | null; mode_tarif: string; satuan: string; target: number; sBelum: number; minggu: MingguCell[]; totalMingguan: number }
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

const kawasan = ref<Kawasan[]>([])
const kawasanOpts = computed(() => kawasan.value.map((k) => ({ label: `${k.kode} — ${k.nama}`, value: k.id })))
const kawasanId = ref<number | null>(null)
const kawasanLabel = computed(() => kawasanOpts.value.find((k) => k.value === kawasanId.value)?.label || '-')
const tahun = ref(new Date().getFullYear())
const tahunOpts = [2024, 2025, 2026, 2027]
const bulan = ref(new Date().getMonth() + 1)
const bulanOpts = [
  { label: 'Januari', value: 1 }, { label: 'Februari', value: 2 }, { label: 'Maret', value: 3 }, { label: 'April', value: 4 },
  { label: 'Mei', value: 5 }, { label: 'Juni', value: 6 }, { label: 'Juli', value: 7 }, { label: 'Agustus', value: 8 },
  { label: 'September', value: 9 }, { label: 'Oktober', value: 10 }, { label: 'November', value: 11 }, { label: 'Desember', value: 12 },
]

const rows = ref<GridRow[]>([])
const jenisList = ref<Jenis[]>([])
const loading = ref(false)
const meta = ref<{ locked: boolean; bulanLabel: string } | null>(null)
const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' | 'warning' })
const ajukanLoading = ref(false)
const ajukanMingguLoading = ref(false)
const tabMinggu = ref(1)
const { formatRupiah: fmt, useRupiahInput } = useCurrency()

const mingguTabs = [
  { value: 1, label: 'Minggu I', range: '1–7' },
  { value: 2, label: 'Minggu II', range: '8–14' },
  { value: 3, label: 'Minggu III', range: '15–21' },
  { value: 4, label: 'Minggu IV', range: '22–akhir' },
]
const labelMingguAktif = computed(() => mingguTabs.find((w) => w.value === tabMinggu.value)?.label || `Minggu ${tabMinggu.value}`)

const colCount = computed(() => (isUser.value ? 8 : 7))

const jenisOpts = computed(() => jenisList.value
  .filter((j) => !j.has_child)
  .map((j) => {
    const st = cellStatusOf(j.id)
    const locked = isStatusLocked(st)
    return {
      label: `${j.kode || '-'} — ${j.nama}${locked ? ` (${st})` : ''}`,
      value: j.id,
      props: { disabled: locked },
    }
  }))

function toast(msg: string, color: typeof snack.color = 'success') { snack.msg = msg; snack.color = color; snack.show = true }

function statusChip(s: string | null) {
  if (s === 'disetujui') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
  if (s === 'diajukan') return 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
  if (s === 'ditolak') return 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
  return 'bg-surface text-surface-foreground'
}

// Ambil sel minggu yang sedang aktif dari sebuah baris.
function cellOf(r: GridRow): MingguCell { return r.minggu[tabMinggu.value - 1]! }

// Sel terkunci bila sudah masuk alur verifikasi (bukan draft) — tidak bisa diubah.
function isCellLocked(r: GridRow): boolean {
  return isStatusLocked(cellOf(r).status)
}

function isStatusLocked(s: string | null): boolean {
  return !!s && s !== 'draft'
}

// Status sel minggu aktif untuk sebuah jenis (untuk menonaktifkan opsi di modal).
function cellStatusOf(jenisId: number): string | null {
  const r = rows.value.find((row) => row.jenis_id === jenisId)
  return r ? cellOf(r).status : null
}

const hasDraft = computed(() => rows.value.some((r) => r.minggu.some((m) => m.status === 'draft')))
function hasDraftMinggu(minggu: number) { return rows.value.some((r) => r.minggu[minggu - 1]?.status === 'draft') }
function rowTotal(r: GridRow) { return r.minggu.reduce((s, m) => s + m.nilai, 0) }
const sumTarget = computed(() => rows.value.reduce((s, r) => s + r.target, 0))
const sumSBebelum = computed(() => rows.value.reduce((s, r) => s + r.sBelum, 0))
const sumMinggu = computed(() => [0, 1, 2, 3].map((i) => rows.value.reduce((s, r) => s + r.minggu[i]!.nilai, 0)))
const sumMingguAktif = computed(() => rows.value.reduce((s, r) => s + r.minggu[tabMinggu.value - 1]!.nilai, 0))
const sumTotal = computed(() => sumMinggu.value.reduce((s, v) => s + v, 0))

// ── Panel langkah perhitungan (inline expand) ─────────────────────
const expandedId = ref<number | null>(null)
function toggleExpand(id: number) { expandedId.value = expandedId.value === id ? null : id }

const labelBulan = computed(() => meta.value?.bulanLabel || bulanOpts.find((b) => b.value === bulan.value)?.label || '')

function modeLabelOf(r: GridRow): string {
  if (r.mode_tarif === 'kuantitas') {
    const parts = ['Kuantitas']
    if (r.satuan) parts.push(r.satuan)
    if (r.tarif) parts.push(`tarif ${fmt(r.tarif)}`)
    return parts.join(' · ')
  }
  return 'Langsung'
}

function formulaOf(r: GridRow): string {
  return r.mode_tarif === 'kuantitas' ? 'jumlah = round(kuantitas × tarif)' : 'jumlah = nilai Rupiah yang diinput'
}

function panelLines(r: GridRow) {
  const lines: { op?: string; label: string; value: string; note?: string }[] = [
    { label: 's/d Bulan Lalu', value: fmt(r.sBelum) },
  ]
  mingguTabs.forEach((w, i) => {
    const cell = r.minggu[i]!
    const noteParts: string[] = []
    if (cell.kuantitas != null && cell.tarif != null) noteParts.push(`${Number(cell.kuantitas).toLocaleString('id-ID')} × ${fmt(cell.tarif)}`)
    if (cell.status) noteParts.push(cell.status)
    lines.push({ op: '+', label: `${w.label} (tgl ${w.range})`, value: fmt(cell.nilai), note: noteParts.join(' · ') || undefined })
  })
  return lines
}

// ── Modal input/edit ──────────────────────────────────────────────
const dialog = ref(false)
const editing = ref<GridRow | null>(null)
const saving = ref(false)
const form = reactive<{ jenis_retribusi_id: number | null; nilai: number; kuantitas: number; catatan: string }>({ jenis_retribusi_id: null, nilai: 0, kuantitas: 0, catatan: '' })
const err = reactive({ jenis: '', nilai: '' })
const { display: nilaiDisplay, onInput: onNilaiInput } = useRupiahInput(toRef(form, 'nilai'))

const selectedRow = computed<GridRow | null>(() => {
  if (editing.value) return editing.value
  if (!form.jenis_retribusi_id) return null
  return rows.value.find((r) => r.jenis_id === form.jenis_retribusi_id) || null
})

// Mode input mengikuti jenis terpilih (mode_tarif per leaf).
const selectedMode = computed(() => (selectedRow.value?.mode_tarif === 'kuantitas' ? 'kuantitas' : 'langsung'))
const selectedSatuan = computed(() => selectedRow.value?.satuan || '')
const previewTotal = computed(() => Math.round((Number(form.kuantitas) || 0) * (selectedRow.value?.tarif || 0)))

// Saat jenis dipilih: tolak bila minggu aktif sudah terkunci (pengaman bila
// opsi lolos via keyboard/autocomplete meski sudah disabled).
function onJenisChange(val: string | number | null) {
  if (val == null) return
  const st = cellStatusOf(Number(val))
  if (isStatusLocked(st)) {
    form.jenis_retribusi_id = null
    err.jenis = ''
    toast(`Entri ${labelMingguAktif.value} untuk jenis ini sudah ${st}, tidak bisa diubah`, 'error')
  }
}

function openInput() {
  if (!isUser.value || meta.value?.locked) return
  editing.value = null
  form.jenis_retribusi_id = null
  form.nilai = 0
  form.kuantitas = 0
  form.catatan = ''
  err.jenis = ''; err.nilai = ''
  dialog.value = true
}

function openEdit(r: GridRow) {
  if (!isUser.value || meta.value?.locked) return
  const cell = cellOf(r)
  if (cell.status !== 'draft') return
  editing.value = r
  form.jenis_retribusi_id = r.jenis_id
  form.nilai = cell.nilai
  form.kuantitas = cell.kuantitas ?? 0
  form.catatan = cell.catatan || ''
  err.jenis = ''; err.nilai = ''
  dialog.value = true
}

async function saveEntri() {
  err.jenis = ''; err.nilai = ''
  if (!form.jenis_retribusi_id) err.jenis = 'Jenis wajib dipilih'
  if (selectedMode.value === 'kuantitas') {
    if (!Number.isFinite(Number(form.kuantitas)) || Number(form.kuantitas) < 0) err.nilai = 'Jumlah unit harus >= 0'
    if (!selectedRow.value?.tarif) err.nilai = 'Tarif belum diisi di Master Jenis Retribusi'
  } else if (!Number.isFinite(Number(form.nilai)) || Number(form.nilai) < 0) {
    err.nilai = 'Nilai harus >= 0'
  }
  if (err.jenis || err.nilai) return

  const target = rows.value.find((r) => r.jenis_id === form.jenis_retribusi_id)
  const cell = target ? cellOf(target) : null
  if (cell && cell.status && cell.status !== 'draft') {
    toast('Entri minggu ini sudah diajukan/disetujui, tidak bisa diubah', 'error')
    return
  }

  saving.value = true
  try {
    const body: Record<string, unknown> = {
      jenis_retribusi_id: form.jenis_retribusi_id,
      tahun: tahun.value,
      bulan: bulan.value,
      minggu: tabMinggu.value,
      catatan: form.catatan.trim(),
    }
    if (selectedMode.value === 'kuantitas') body.kuantitas = Number(form.kuantitas)
    else body.jumlah = Number(form.nilai)

    await $fetch('/api/realisasi/grid', { method: 'POST', body })
    toast(editing.value ? 'Entri diperbarui' : 'Entri tersimpan')
    dialog.value = false
    await load()
  } catch (e: unknown) {
    toast((e as { data?: { message?: string } })?.data?.message || (e instanceof Error ? e.message : String(e)), 'error')
  } finally { saving.value = false }
}

// ── Hapus entri draft ─────────────────────────────────────────────
const delDialog = ref(false)
const delTarget = ref<GridRow | null>(null)
const deleting = ref(false)

function confirmDelete(r: GridRow) {
  if (!isUser.value || meta.value?.locked) return
  const cell = cellOf(r)
  if (cell.status !== 'draft' || !cell.realisasi_id) return
  delTarget.value = r
  delDialog.value = true
}

async function doDelete() {
  const r = delTarget.value
  if (!r) return
  const cell = cellOf(r)
  if (!cell.realisasi_id) return
  deleting.value = true
  try {
    await $fetch(`/api/realisasi/${cell.realisasi_id}`, { method: 'DELETE' })
    toast('Entri dihapus')
    delDialog.value = false
    await load()
  } catch (e: unknown) {
    toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error')
  } finally { deleting.value = false }
}

// ── Data loading ──────────────────────────────────────────────────
async function loadKawasan() {
  try {
    const r = await $fetch<{ data: Kawasan[] }>('/api/kawasan')
    kawasan.value = r.data
    // Petugas dengan penugasan kawasan: pilihan dikunci ke kawasan tersebut.
    if (scopedKawasanId.value) {
      kawasanId.value = scopedKawasanId.value
      return
    }
    if (!kawasanId.value && r.data.length) kawasanId.value = r.data[0]!.id
  } catch {}
}
async function loadJenis() {
  try { const r = await $fetch<{ data: Jenis[] }>('/api/jenis-retribusi'); jenisList.value = r.data } catch {}
}
async function load() {
  if (!kawasanId.value) return
  loading.value = true
  try {
    const r = await $fetch<{ data: (Omit<GridRow, 'minggu'> & { minggu: Omit<MingguCell, 'saved'>[] })[]; meta: typeof meta.value }>('/api/realisasi/grid', {
      query: { kawasan_id: String(kawasanId.value), tahun: String(tahun.value), bulan: String(bulan.value) },
    })
    rows.value = r.data.map((row) => ({ ...row, minggu: row.minggu.map((m) => ({ ...m, saved: m.nilai })) }))
    meta.value = r.meta
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat', 'error') }
  finally { loading.value = false }
}

async function ajukanSemua() {
  if (!kawasanId.value) return
  ajukanLoading.value = true
  try {
    const r = await $fetch<{ count: number }>('/api/realisasi/ajukan-massal', {
      method: 'POST',
      body: { kawasan_id: kawasanId.value, tahun: tahun.value, bulan: bulan.value },
    })
    toast(`${r.count} realisasi diajukan`)
    await load()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal', 'error') }
  finally { ajukanLoading.value = false }
}

async function ajukanMingguIni() {
  if (!kawasanId.value) return
  ajukanMingguLoading.value = true
  try {
    const r = await $fetch<{ count: number }>('/api/realisasi/ajukan-massal', {
      method: 'POST',
      body: { kawasan_id: kawasanId.value, tahun: tahun.value, bulan: bulan.value, minggu: tabMinggu.value },
    })
    toast(`${r.count} realisasi ${labelMingguAktif.value} diajukan`)
    await load()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal', 'error') }
  finally { ajukanMingguLoading.value = false }
}

onMounted(async () => { await loadKawasan(); await loadJenis(); await load() })
</script>
