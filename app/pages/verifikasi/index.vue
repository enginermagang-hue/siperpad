<template>
  <div>
    <div class="d-flex align-center mb-6">
      <v-icon size="36" color="primary" class="mr-3">mdi-check-decagram</v-icon>
      <h1 class="text-h4 font-weight-medium">Verifikasi</h1>
    </div>

    <VerifikasiNav />

    <v-card flat elevation="0" class="mb-4">
      <v-card-text class="pb-0">
        <div class="d-flex flex-wrap ga-3 mb-4">
          <v-select v-model="filterKawasan" :items="kawasanOpts" item-title="label" item-value="value" label="Kawasan" density="compact" variant="outlined" hide-details clearable style="max-width: 200px" placeholder="Semua" @update:model-value="load" />
          <v-select v-model="filterJenis" :items="jenisFilterOpts" item-title="label" item-value="value" label="Jenis" density="compact" variant="outlined" hide-details clearable style="max-width: 260px" placeholder="Semua jenis" @update:model-value="load" />
          <v-text-field v-model="q" density="compact" variant="outlined" placeholder="Cari kode/nama/catatan..." prepend-inner-icon="mdi-magnify" hide-details clearable style="max-width: 260px" />
          <v-spacer />
          <v-btn v-if="canVerif && filtered.length" color="success" variant="tonal" prepend-icon="mdi-check-all" :loading="bulkLoading" @click="verifMassal('disetujui')">Setujui Semua ({{ filtered.length }})</v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-card flat elevation="0">
      <div class="d-flex justify-end px-4 pt-3">
        <ViewModeToggle v-model="modeRealisasi" />
      </div>
      <v-table v-if="modeRealisasi === 'table'" density="default">
        <thead><tr><th>Tanggal</th><th>Kode</th><th>Jenis</th><th>Kawasan</th><th class="text-right">Jumlah</th><th class="text-right">Target</th><th class="text-right">Capaian</th><th>Aksi</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="8" class="text-center py-6">Memuat...</td></tr>
          <tr v-else-if="!filtered.length"><td colspan="8" class="text-center py-6 text-medium-emphasis">Tidak ada realisasi diajukan</td></tr>
          <tr v-for="r in paginated" :key="r.id">
            <td>{{ r.tanggal }}</td>
            <td class="font-weight-medium">{{ r.jenis_kode || '-' }}</td>
            <td>{{ r.jenis_nama }}</td>
            <td><v-chip size="small" variant="tonal">{{ r.kawasan_kode }} — {{ r.kawasan_nama }}</v-chip></td>
            <td class="text-right">{{ fmt(r.jumlah) }}</td>
            <td class="text-right">{{ fmt(r.target_nilai) }}</td>
            <td class="text-right"><v-chip :color="r.capaian >= 100 ? 'success' : r.capaian >= 75 ? 'warning' : 'error'" size="small">{{ r.capaian }}%</v-chip></td>
            <td>
              <v-btn v-if="canVerif" size="small" color="success" variant="tonal" class="mr-1" :loading="actingId === r.id" @click="verif(r, 'disetujui')">Setujui</v-btn>
              <v-btn v-if="canVerif" size="small" color="error" variant="tonal" :loading="actingId === r.id" @click="verif(r, 'ditolak')">Tolak</v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>

      <div v-else-if="modeRealisasi === 'list'" class="pa-3">
        <div v-if="loading" class="text-center py-6">Memuat...</div>
        <div v-else-if="!filtered.length" class="text-center py-6 text-medium-emphasis">Tidak ada realisasi diajukan</div>
        <RecordCard
          v-for="r in paginated"
          v-else
          :key="r.id"
          :title="(r.jenis_kode || '-') + ' — ' + r.jenis_nama"
          :subtitle="r.tanggal"
          :fields="[
            { label: 'Kawasan', value: r.kawasan_kode + ' — ' + r.kawasan_nama },
            { label: 'Jumlah', value: fmt(r.jumlah), class: 'text-right' },
            { label: 'Target', value: fmt(r.target_nilai), class: 'text-right' },
            { label: 'Capaian', value: r.capaian + '%', class: r.capaian >= 100 ? 'text-success' : r.capaian >= 75 ? 'text-warning' : 'text-error' },
          ]"
        >
          <template v-if="canVerif" #actions>
            <v-btn size="small" color="success" variant="tonal" :loading="actingId === r.id" @click="verif(r, 'disetujui')">Setujui</v-btn>
            <v-btn size="small" color="error" variant="tonal" :loading="actingId === r.id" @click="verif(r, 'ditolak')">Tolak</v-btn>
          </template>
        </RecordCard>
      </div>

      <div v-else class="pa-2">
        <div v-if="loading" class="text-center py-6">Memuat...</div>
        <div v-else-if="!filtered.length" class="text-center py-6 text-medium-emphasis">Tidak ada realisasi diajukan</div>
        <v-list v-else density="compact" lines="one">
          <v-list-item v-for="r in paginated" :key="r.id" :title="(r.jenis_kode || '-') + ' — ' + r.jenis_nama" :subtitle="r.tanggal">
            <template #append>
              <span class="text-body-2 font-weight-medium mr-2">{{ fmt(r.jumlah) }}</span>
              <v-chip :color="r.capaian >= 100 ? 'success' : r.capaian >= 75 ? 'warning' : 'error'" size="x-small" class="mr-1">{{ r.capaian }}%</v-chip>
              <v-menu v-if="canVerif" location="bottom end">
                <template #activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
                </template>
                <v-list density="compact" min-width="160">
                  <v-list-item prepend-icon="mdi-check" title="Setujui" @click="verif(r, 'disetujui')" />
                  <v-list-item prepend-icon="mdi-close" title="Tolak" base-color="error" @click="verif(r, 'ditolak')" />
                </v-list>
              </v-menu>
            </template>
          </v-list-item>
        </v-list>
      </div>
      <v-divider v-if="total" />
      <div v-if="total" class="d-flex align-center justify-space-between flex-wrap ga-3 px-4 py-3">
        <div class="d-flex align-center ga-2 text-body-2 text-medium-emphasis">
          <span>Menampilkan {{ from }}–{{ to }} dari {{ total }}</span>
          <v-select v-model="perPage" :items="[5, 10, 25, 50]" density="compact" variant="outlined" hide-details style="max-width: 90px" />
          <span>per halaman</span>
        </div>
        <v-pagination v-if="pageCount > 1" v-model="currentPage" :length="pageCount" :total-visible="5" density="compact" />
      </div>
    </v-card>

    <v-snackbar v-model="snack.show" :color="snack.color" timeout="3000">{{ snack.msg }}</v-snackbar>
  </div>
</template>


<script setup lang="ts">
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

