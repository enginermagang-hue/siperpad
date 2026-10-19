<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-layer-line px-3 py-2 text-sm font-medium
                 text-foreground hover:bg-layer-hover focus:outline-hidden"
          @click="goBack"
        >
          <ArrowLeft class="shrink-0 size-4" aria-hidden="true" /> Kembali
        </button>
        <FilePlus class="shrink-0 size-9 text-primary" aria-hidden="true" />
        <h1 class="text-2xl font-medium text-foreground">Detail Batch Laporan #{{ id }}</h1>
      </div>
    </div>

    <VerifikasiNav />

    <div v-if="loading" class="rounded-lg border border-card-line bg-card p-6 text-center text-muted-foreground-1">
      Memuat...
    </div>

    <template v-else-if="batch">
      <!-- Info batch -->
      <div class="mb-4 rounded-lg border border-card-line bg-card p-4">
        <div class="mb-3 flex items-center justify-between gap-2">
          <h2 class="text-base font-medium text-foreground">Informasi Batch</h2>
          <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="statusChip(batch.status)">
            {{ batch.status }}
          </span>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div class="text-xs text-muted-foreground-1">Periode</div>
            <div class="text-sm font-medium text-foreground">{{ batch.periode_start }} — {{ batch.periode_end }}</div>
          </div>
          <div>
            <div class="text-xs text-muted-foreground-1">Kawasan</div>
            <div class="text-sm font-medium text-foreground">{{ batch.kawasan_kode }} — {{ batch.kawasan_nama }}</div>
          </div>
          <div>
            <div class="text-xs text-muted-foreground-1">Tipe Periode</div>
            <div class="text-sm font-medium text-foreground">{{ batch.periode_type }}</div>
          </div>
          <div>
            <div class="text-xs text-muted-foreground-1">Tahun</div>
            <div class="text-sm font-medium text-foreground">{{ batch.tahun }}</div>
          </div>
          <div>
            <div class="text-xs text-muted-foreground-1">Diajukan Oleh</div>
            <div class="text-sm font-medium text-foreground">{{ batch.diajukan_nama || batch.diajukan_email || (batch.diajukan_oleh ?? '-') }}</div>
            <div v-if="batch.diajukan_at" class="text-xs text-muted-foreground-1">{{ batch.diajukan_at }}</div>
          </div>
          <div>
            <div class="text-xs text-muted-foreground-1">Diverifikasi Oleh</div>
            <div class="text-sm font-medium text-foreground">{{ batch.verified_nama || batch.verified_email || (batch.verified_by ?? '-') }}</div>
            <div v-if="batch.verified_at" class="text-xs text-muted-foreground-1">{{ batch.verified_at }}</div>
          </div>
          <div v-if="batch.catatan" class="sm:col-span-2 lg:col-span-3">
            <div class="text-xs text-muted-foreground-1">Catatan</div>
            <div class="text-sm text-foreground">{{ batch.catatan }}</div>
          </div>
        </div>
      </div>

      <!-- Ringkasan realisasi -->
      <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="rounded-lg border border-card-line bg-card p-4 text-center">
          <div class="text-xs text-muted-foreground-1">Jumlah Realisasi</div>
          <div class="text-lg font-bold text-foreground">{{ items.length }}</div>
        </div>
        <div class="rounded-lg border border-card-line bg-card p-4 text-center">
          <div class="text-xs text-muted-foreground-1">Total Realisasi</div>
          <div class="text-lg font-bold text-primary">{{ fmt(totalJumlah) }}</div>
        </div>
        <div class="rounded-lg border border-card-line bg-card p-4 text-center">
          <div class="text-xs text-muted-foreground-1">Disetujui</div>
          <div class="text-lg font-bold text-emerald-600 dark:text-emerald-400">{{ countStatus('disetujui') }}</div>
        </div>
      </div>

      <!-- Daftar realisasi (tab per minggu) -->
      <div v-if="!items.length" class="rounded-lg border border-card-line bg-card p-6 text-center text-muted-foreground-1">
        Belum ada realisasi pada periode ini
      </div>

      <div v-else class="rounded-lg border border-card-line bg-card">
        <!-- Tab minggu -->
        <div class="flex flex-wrap gap-1 border-b border-card-divider p-2">
          <button
            v-for="g in weekGroups"
            :key="g.key"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium focus:outline-hidden"
            :class="activeWeek === g.key
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:bg-layer-hover'"
            @click="activeWeek = g.key"
          >
            {{ g.label }}
            <span class="rounded-full bg-black/10 px-1.5 text-[11px] dark:bg-white/10">{{ g.items.length }}</span>
          </button>
        </div>

        <div v-if="activeGroup" class="p-4">
          <div class="mb-3 flex items-center justify-between gap-2">
            <h2 class="text-base font-medium text-foreground">{{ activeGroup.label }}</h2>
            <span class="text-sm font-medium text-primary">{{ fmt(activeGroup.total) }}</span>
          </div>
          <div class="overflow-x-auto">
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
                </tr>
              </thead>
              <tbody class="divide-y divide-table-line">
                <tr v-for="r in activeGroup.items" :key="r.id" class="hover:bg-layer-hover">
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
                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="statusChip(r.status)">
                      {{ r.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <AppToast v-model="snack.show" :message="snack.msg" :color="snack.color" :timeout="3000" />
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, FilePlus } from 'lucide-vue-next'

definePageMeta({ layout: 'default', middleware: 'auth' })

const route = useRoute()
const id = Number(route.params.id)

const { snack, toast, fmt } = useVerifikasiMaster()

type Batch = {
  id: number
  kawasan_id: number
  kawasan_kode: string
  kawasan_nama: string
  periode_type: string
  periode_start: string
  periode_end: string
  tahun: number
  status: string
  diajukan_oleh: number | null
  diajukan_nama: string | null
  diajukan_email: string | null
  diajukan_at: string | null
  verified_by: number | null
  verified_nama: string | null
  verified_email: string | null
  verified_at: string | null
  catatan: string
}
type Item = {
  id: number
  jenis_retribusi_id: number
  tanggal: string
  jumlah: number
  kuantitas: number | null
  tarif: number | null
  catatan: string
  batch_id: number | null
  status: string
  jenis_kode: string
  jenis_nama: string
  jenis_level: number
  kawasan_id: number
  kawasan_kode: string
  kawasan_nama: string
  target_nilai: number
  capaian: number
  minggu: number
}

const batch = ref<Batch | null>(null)
const items = ref<Item[]>([])
const loading = ref(false)
const activeWeek = ref<string | null>(null)

const totalJumlah = computed(() => items.value.reduce((s, r) => s + (Number(r.jumlah) || 0), 0))
function countStatus(s: string) { return items.value.filter((r) => r.status === s).length }

const MINGGU_LABEL: Record<number, string> = { 1: 'Minggu I', 2: 'Minggu II', 3: 'Minggu III', 4: 'Minggu IV' }
const BULAN_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const weekGroups = computed(() => {
  const map = new Map<string, { key: string; label: string; items: Item[]; total: number }>()
  for (const r of items.value) {
    const y = r.tanggal.slice(0, 4)
    const m = Number(r.tanggal.slice(5, 7))
    const key = `${y}-${m}-${r.minggu}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: `${MINGGU_LABEL[r.minggu] || 'Minggu ' + r.minggu} — ${BULAN_NAMES[m] || m} ${y}`,
        items: [],
        total: 0,
      })
    }
    const g = map.get(key)!
    g.items.push(r)
    g.total += Number(r.jumlah) || 0
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
})

const activeGroup = computed(() => weekGroups.value.find((g) => g.key === activeWeek.value) || weekGroups.value[0] || null)

watch(weekGroups, (groups) => {
  if (groups.length && !groups.some((g) => g.key === activeWeek.value)) {
    activeWeek.value = groups[0].key
  }
}, { immediate: true })

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

function goBack() { navigateTo('/verifikasi/batch') }

async function load() {
  loading.value = true
  try {
    const r = await $fetch<{ batch: Batch; items: Item[] }>(`/api/laporan/batch/${id}`)
    batch.value = r.batch
    items.value = r.items
  } catch (e: unknown) {
    toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat detail batch', 'error')
  } finally { loading.value = false }
}

onMounted(load)
</script>
