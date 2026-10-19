<template>
  <div>
    <div class="mb-6 flex items-center gap-3">
      <BadgeCheck class="shrink-0 size-9 text-primary" aria-hidden="true" />
      <h1 class="text-2xl font-medium text-foreground">Verifikasi</h1>
    </div>

    <VerifikasiNav />

    <div class="rounded-lg border border-card-line bg-card">
      <div class="flex flex-wrap items-center gap-3 p-4">
        <div class="w-full max-w-[200px]">
          <AppSelect v-model="filterKawasan" :items="kawasanOpts" placeholder="Semua" clearable @update:model-value="load" />
        </div>
        <div class="w-full max-w-[260px]">
          <AppSelect v-model="filterJenis" :items="jenisFilterOpts" placeholder="Semua jenis" clearable @update:model-value="load" />
        </div>
        <div class="relative w-full max-w-[260px]">
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
        <div class="ms-auto flex items-center gap-3">
          <button
            v-if="canVerif && filtered.length"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium
                   text-emerald-800 hover:bg-emerald-200 focus:outline-hidden
                   disabled:opacity-50 disabled:pointer-events-none dark:bg-emerald-950/60 dark:text-emerald-300"
            :disabled="bulkLoading"
            @click="verifMassal('disetujui')"
          >
            <LoaderCircle v-if="bulkLoading" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
            <CheckCheck v-else class="shrink-0 size-4" aria-hidden="true" />
            Setujui Semua ({{ filtered.length }})
          </button>
          <ViewModeToggle v-model="modeRealisasi" />
        </div>
      </div>

      <!-- Mode tabel -->
      <div v-if="modeRealisasi === 'table'" class="overflow-x-auto">
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
              <th class="px-3 py-2.5 text-start font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-table-line">
            <tr v-if="loading">
              <td colspan="8" class="py-6 text-center text-muted-foreground-1">Memuat...</td>
            </tr>
            <tr v-else-if="!filtered.length">
              <td colspan="8" class="py-6 text-center text-muted-foreground-1">Tidak ada realisasi diajukan</td>
            </tr>
            <tr v-for="r in paginated" v-else :key="r.id" class="hover:bg-layer-hover">
              <td class="px-3 py-2.5 text-foreground">{{ r.tanggal }}</td>
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
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="capaianChip(r.capaian)">
                  {{ r.capaian }}%
                </span>
              </td>
              <td class="px-3 py-2.5">
                <div class="flex flex-wrap gap-1">
                  <button
                    v-if="canVerif"
                    type="button"
                    class="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium
                           text-emerald-800 hover:bg-emerald-200 focus:outline-hidden
                           disabled:opacity-50 disabled:pointer-events-none
                           dark:bg-emerald-950/60 dark:text-emerald-300"
                    :disabled="actingId === r.id"
                    @click="verif(r, 'disetujui')"
                  >
                    <LoaderCircle v-if="actingId === r.id" class="shrink-0 size-3.5 animate-spin" aria-hidden="true" />
                    Setujui
                  </button>
                  <button
                    v-if="canVerif"
                    type="button"
                    class="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs font-medium
                           text-red-800 hover:bg-red-200 focus:outline-hidden
                           disabled:opacity-50 disabled:pointer-events-none
                           dark:bg-red-950/60 dark:text-red-300"
                    :disabled="actingId === r.id"
                    @click="verif(r, 'ditolak')"
                  >
                    Tolak
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mode list -->
      <div v-else-if="modeRealisasi === 'list'" class="p-3">
        <div v-if="loading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
        <div v-else-if="!filtered.length" class="py-6 text-center text-muted-foreground-1">Tidak ada realisasi diajukan</div>
        <RecordCard
          v-for="r in paginated"
          v-else
          :key="r.id"
          :title="(r.jenis_kode || '-') + ' — ' + r.jenis_nama"
          :subtitle="r.tanggal"
          :fields="[
            { label: 'Kawasan', value: r.kawasan_kode + ' — ' + r.kawasan_nama },
            { label: 'Jumlah', value: fmt(r.jumlah), class: 'text-end' },
            { label: 'Target', value: fmt(r.target_nilai), class: 'text-end' },
            { label: 'Capaian', value: r.capaian + '%', class: `text-end font-medium ${capaianText(r.capaian)}` },
          ]"
        >
          <template v-if="canVerif" #actions>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-700
                     hover:bg-layer-hover focus:outline-hidden disabled:opacity-50 dark:text-emerald-400"
              :disabled="actingId === r.id"
              @click="verif(r, 'disetujui')"
            >
              Setujui
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600
                     hover:bg-layer-hover focus:outline-hidden disabled:opacity-50 dark:text-red-400"
              :disabled="actingId === r.id"
              @click="verif(r, 'ditolak')"
            >
              Tolak
            </button>
          </template>
        </RecordCard>
      </div>

      <!-- Mode compact -->
      <div v-else class="p-2">
        <div v-if="loading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
        <div v-else-if="!filtered.length" class="py-6 text-center text-muted-foreground-1">Tidak ada realisasi diajukan</div>
        <ul v-else class="divide-y divide-table-line">
          <li v-for="r in paginated" :key="r.id" class="flex items-center gap-2 py-2">
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm text-foreground">{{ (r.jenis_kode || '-') }} — {{ r.jenis_nama }}</span>
              <span class="block truncate text-xs text-muted-foreground-1">{{ r.tanggal }}</span>
            </span>
            <span class="shrink-0 text-sm font-medium text-foreground">{{ fmt(r.jumlah) }}</span>
            <span class="shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium" :class="capaianChip(r.capaian)">
              {{ r.capaian }}%
            </span>
            <AppMenu
              v-if="canVerif"
              :items="[
                { label: 'Setujui', icon: Check, onClick: () => verif(r, 'disetujui') },
                { label: 'Tolak', icon: X, variant: 'danger', onClick: () => verif(r, 'ditolak') },
              ]"
            />
          </li>
        </ul>
      </div>

      <hr v-if="total" class="border-card-divider" />
      <div v-if="total" class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div class="flex items-center gap-2 text-sm text-muted-foreground-1">
          <span>Menampilkan {{ from }}–{{ to }} dari {{ total }}</span>
          <div class="w-[90px]"><AppSelect v-model="perPage" :items="[5, 10, 25, 50]" :search="false" /></div>
          <span>per halaman</span>
        </div>
        <AppPagination v-model="currentPage" :length="pageCount" :total-visible="5" />
      </div>
    </div>

    <AppToast v-model="snack.show" :message="snack.msg" :color="snack.color" :timeout="3000" />
  </div>
</template>


<script setup lang="ts">
import { BadgeCheck, Check, CheckCheck, LoaderCircle, Search, X } from 'lucide-vue-next'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { mode: modeRealisasi } = useViewMode('verifikasi-realisasi')
const { canVerif, jenisList, kawasanOpts, snack, toast, fmt, loadMaster } = useVerifikasiMaster()

type Row = { id: number; jenis_retribusi_id: number; tanggal: string; jumlah: number; jenis_kode: string; jenis_nama: string; kawasan_id: number; kawasan_kode: string; kawasan_nama: string; target_nilai: number; capaian: number; status: string; catatan?: string }

const rows = ref<Row[]>([])
const loading = ref(false)
const q = ref('')
const filterKawasan = ref<number | null>(null)
const filterJenis = ref<number | null>(null)
const jenisFilterOpts = computed(() => {
  const pool = filterKawasan.value ? jenisList.value.filter((j) => j.kawasan_id === filterKawasan.value) : jenisList.value
  return pool.map((j) => ({ label: (j.kode || '-') + ' — ' + j.nama, value: j.id }))
})
const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return rows.value
  return rows.value.filter((r) => (r.jenis_kode || '').toLowerCase().includes(s) || r.jenis_nama.toLowerCase().includes(s) || r.catatan?.toLowerCase().includes(s))
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
watch([q, filterKawasan, filterJenis], () => { currentPage.value = 1 })
watch(perPage, () => { currentPage.value = 1 })
watch(pageCount, (pc) => { if (currentPage.value > pc) currentPage.value = pc })

const actingId = ref<number | null>(null)
const bulkLoading = ref(false)

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

async function load() {
  loading.value = true
  try {
    const params: Record<string, string> = { status: 'diajukan' }
    if (filterKawasan.value) params.kawasan_id = String(filterKawasan.value)
    if (filterJenis.value) params.jenis_retribusi_id = String(filterJenis.value)
    const r = await $fetch<{ data: Row[] }>('/api/realisasi', { query: params })
    rows.value = r.data
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat', 'error') }
  finally { loading.value = false }
}
async function verif(r: Row, aksi: string) {
  actingId.value = r.id
  try {
    await $fetch('/api/realisasi/' + r.id + '/verifikasi', { method: 'POST', body: { aksi } })
    toast(aksi === 'disetujui' ? 'Disetujui' : 'Ditolak', aksi === 'disetujui' ? 'success' : 'warning')
    await load()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error') }
  finally { actingId.value = null }
}
async function verifMassal(aksi: string) {
  const ids = filtered.value.map((r) => r.id)
  if (!ids.length) return
  bulkLoading.value = true
  try {
    const r = await $fetch<{ count: number }>('/api/realisasi/verifikasi-massal', { method: 'POST', body: { ids, aksi } })
    toast(r.count + ' realisasi ' + aksi)
    await load()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error') }
  finally { bulkLoading.value = false }
}

onMounted(async () => { await loadMaster(); await load() })
</script>
