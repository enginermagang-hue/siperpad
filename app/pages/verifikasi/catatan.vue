<template>
  <div>
    <div class="d-flex align-center mb-6">
      <v-icon size="36" color="primary" class="mr-3">mdi-clipboard-alert-outline</v-icon>
      <h1 class="text-h4 font-weight-medium">Catatan Temuan</h1>
    </div>

    <VerifikasiNav />

    <v-card flat elevation="0" class="mb-4">
      <v-card-text>
        <div class="d-flex flex-wrap ga-3 align-center mb-3">
          <v-select v-model="catKawasan" :items="kawasanOpts" item-title="label" item-value="value" label="Kawasan *" density="compact" variant="outlined" hide-details style="max-width: 220px" />
          <v-select v-model="catTahun" :items="[2024, 2025, 2026, 2027]" label="Tahun" density="compact" variant="outlined" hide-details style="max-width: 110px" />
          <v-select v-model="catBulan" :items="bulanOpts" item-title="label" item-value="value" label="Bulan" density="compact" variant="outlined" hide-details style="max-width: 150px" />
          <v-text-field v-model="catIsi" label="Catatan / temuan *" density="compact" variant="outlined" hide-details style="min-width: 280px" />
          <v-btn color="primary" prepend-icon="mdi-plus" :loading="catSaving" @click="simpanCatatan">Tambah</v-btn>
        </div>
        <div class="d-flex flex-wrap ga-3">
          <v-select v-model="catFilterStatus" :items="['terbuka','selesai']" label="Status" density="compact" variant="outlined" hide-details clearable placeholder="Semua" style="max-width: 160px" @update:model-value="loadCatatan" />
        </div>
      </v-card-text>
    </v-card>
    <v-card flat elevation="0">
      <div class="d-flex justify-end px-4 pt-3">
        <ViewModeToggle v-model="modeCatatan" />
      </div>
      <v-table v-if="modeCatatan === 'table'" density="default">
        <thead><tr><th>Periode</th><th>Kawasan</th><th>Pos</th><th>Catatan</th><th>Status</th><th>Oleh</th><th style="width:140px">Aksi</th></tr></thead>
        <tbody>
          <tr v-if="catLoading"><td colspan="7" class="text-center py-6">Memuat...</td></tr>
          <tr v-else-if="!catatan.length"><td colspan="7" class="text-center py-6 text-medium-emphasis">Belum ada catatan</td></tr>
          <tr v-for="c in catatan" :key="c.id">
            <td>{{ bulanLabel(c.bulan) }} {{ c.tahun }}</td>
            <td><v-chip size="small" variant="tonal">{{ c.kawasan_kode }}</v-chip></td>
            <td class="text-caption">{{ c.jenis_nama || '—' }}</td>
            <td>{{ c.isi }}</td>
            <td><v-chip size="small" :color="c.status === 'selesai' ? 'success' : 'warning'">{{ c.status }}</v-chip></td>
            <td class="text-caption">{{ c.created_by_nama || '-' }}</td>
            <td>
              <v-btn size="small" variant="tonal" color="success" class="mr-1" @click="toggleCatatan(c)">{{ c.status === 'selesai' ? 'Buka' : 'Selesai' }}</v-btn>
              <v-btn v-if="isAdmin" size="small" variant="text" color="error" icon="mdi-delete" @click="hapusCatatan(c)" />
            </td>
          </tr>
        </tbody>
      </v-table>

      <div v-else-if="modeCatatan === 'list'" class="pa-3">
        <div v-if="catLoading" class="text-center py-6">Memuat...</div>
        <div v-else-if="!catatan.length" class="text-center py-6 text-medium-emphasis">Belum ada catatan</div>
        <RecordCard
          v-for="c in catatan"
          v-else
          :key="c.id"
          :title="bulanLabel(c.bulan) + ' ' + c.tahun + ' — ' + c.kawasan_kode"
          :subtitle="c.jenis_nama || '—'"
          :fields="[
            { label: 'Oleh', value: c.created_by_nama || '-' },
          ]"
        >
          <template #badge>
            <v-chip size="small" :color="c.status === 'selesai' ? 'success' : 'warning'">{{ c.status }}</v-chip>
          </template>
          <div class="text-body-2 mt-2">{{ c.isi }}</div>
          <template #actions>
            <v-btn size="small" variant="tonal" color="success" @click="toggleCatatan(c)">{{ c.status === 'selesai' ? 'Buka' : 'Selesai' }}</v-btn>
            <v-btn v-if="isAdmin" size="small" variant="text" color="error" prepend-icon="mdi-delete" @click="hapusCatatan(c)">Hapus</v-btn>
          </template>
        </RecordCard>
      </div>

      <div v-else class="pa-2">
        <div v-if="catLoading" class="text-center py-6">Memuat...</div>
        <div v-else-if="!catatan.length" class="text-center py-6 text-medium-emphasis">Belum ada catatan</div>
        <v-list v-else density="compact" lines="two">
          <v-list-item v-for="c in catatan" :key="c.id" :title="bulanLabel(c.bulan) + ' ' + c.tahun + ' — ' + c.kawasan_kode" :subtitle="c.isi">
            <template #append>
              <v-chip size="x-small" :color="c.status === 'selesai' ? 'success' : 'warning'" class="mr-1">{{ c.status }}</v-chip>
              <v-menu location="bottom end">
                <template #activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
                </template>
                <v-list density="compact" min-width="160">
                  <v-list-item :prepend-icon="c.status === 'selesai' ? 'mdi-check' : 'mdi-undo'" :title="c.status === 'selesai' ? 'Buka' : 'Selesai'" @click="toggleCatatan(c)" />
                  <v-list-item v-if="isAdmin" prepend-icon="mdi-delete" title="Hapus" base-color="error" @click="hapusCatatan(c)" />
                </v-list>
              </v-menu>
            </template>
          </v-list-item>
        </v-list>
      </div>
    </v-card>

    <v-snackbar v-model="snack.show" :color="snack.color" timeout="3000">{{ snack.msg }}</v-snackbar>
  </div>
</template>


<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const { mode: modeCatatan } = useViewMode('verifikasi-catatan')
const { isAdmin, kawasanOpts, snack, toast, bulanOpts, bulanLabel, loadMaster } = useVerifikasiMaster()

type CatRow = { id: number; tahun: number; bulan: number; kawasan_kode: string; jenis_nama: string | null; isi: string; status: string; created_by_nama: string | null }

const catatan = ref<CatRow[]>([])
const catLoading = ref(false)
const catSaving = ref(false)
const catKawasan = ref<number | null>(null)
const catTahun = ref(new Date().getFullYear())
const catBulan = ref(new Date().getMonth() + 1)
const catIsi = ref('')
const catFilterStatus = ref<string | null>(null)

async function loadCatatan() {
  catLoading.value = true
  try {
    const params: Record<string, string> = {}
    if (catFilterStatus.value) params.status = catFilterStatus.value
    const r = await $fetch<{ data: CatRow[] }>('/api/catatan', { query: params })
    catatan.value = r.data
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat catatan', 'error') }
  finally { catLoading.value = false }
}
async function simpanCatatan() {
  if (!catKawasan.value) { toast('Pilih kawasan', 'error'); return }
  if (!catIsi.value.trim()) { toast('Isi catatan wajib', 'error'); return }
  catSaving.value = true
  try {
    await $fetch('/api/catatan', { method: 'POST', body: { tahun: catTahun.value, bulan: catBulan.value, kawasan_id: catKawasan.value, isi: catIsi.value.trim() } })
    toast('Catatan ditambahkan')
    catIsi.value = ''
    await loadCatatan()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal', 'error') }
  finally { catSaving.value = false }
}
async function toggleCatatan(c: CatRow) {
  try {
    await $fetch('/api/catatan/' + c.id, { method: 'PUT', body: { status: c.status === 'selesai' ? 'terbuka' : 'selesai' } })
    await loadCatatan()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal', 'error') }
}
async function hapusCatatan(c: CatRow) {
  try { await $fetch('/api/catatan/' + c.id, { method: 'DELETE' }); toast('Catatan dihapus', 'warning'); await loadCatatan() }
  catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal', 'error') }
}

onMounted(async () => { await loadMaster(); await loadCatatan() })
</script>

