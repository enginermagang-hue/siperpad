<template>
  <div>
    <div class="d-flex align-center mb-6">
      <v-icon size="36" color="primary" class="mr-3">mdi-file-document-plus</v-icon>
      <h1 class="text-h4 font-weight-medium">{{ isUser ? 'Pengajuan Batch' : 'Batch Laporan' }}</h1>
    </div>

    <VerifikasiNav />

    <div class="d-flex justify-end mb-3">
      <v-btn v-if="isUser" color="primary" prepend-icon="mdi-plus" @click="batchDialog = true">Buat Batch</v-btn>
    </div>
    <v-card flat elevation="0" class="mb-4">
      <v-card-text class="pb-0">
        <div class="d-flex flex-wrap ga-3 mb-4">
          <v-select v-model="batchFilterKawasan" :items="kawasanOpts" item-title="label" item-value="value" label="Kawasan" density="compact" variant="outlined" hide-details clearable style="max-width: 200px" placeholder="Semua" @update:model-value="loadBatches" />
          <v-select v-model="batchFilterStatus" :items="['draft','diajukan','disetujui','ditolak']" density="compact" variant="outlined" hide-details clearable style="max-width: 160px" placeholder="Semua status" @update:model-value="loadBatches" />
        </div>
      </v-card-text>
    </v-card>
    <v-card flat elevation="0">
      <div class="d-flex justify-end px-4 pt-3">
        <ViewModeToggle v-model="modeBatch" />
      </div>
      <v-table v-if="modeBatch === 'table'" density="default">
        <thead><tr><th>Periode</th><th>Kawasan</th><th>Tipe</th><th>Tahun</th><th>Status</th><th style="width: 200px">Aksi</th></tr></thead>
        <tbody>
          <tr v-if="batchLoading"><td colspan="6" class="text-center py-6">Memuat...</td></tr>
          <tr v-else-if="!batches.length"><td colspan="6" class="text-center py-6 text-medium-emphasis">Belum ada batch</td></tr>
          <tr v-for="b in batches" :key="b.id">
            <td>{{ b.periode_start }} — {{ b.periode_end }}</td>
            <td><v-chip size="small" variant="tonal">{{ b.kawasan_kode }} — {{ b.kawasan_nama }}</v-chip></td>
            <td>{{ b.periode_type }}</td>
            <td>{{ b.tahun }}</td>
            <td><v-chip :color="batchColor(b.status)" size="small">{{ b.status }}</v-chip></td>
            <td>
              <v-btn v-if="b.status === 'draft' && isUser" size="small" color="primary" variant="tonal" class="mr-1" @click="ajukanBatch(b)">Ajukan</v-btn>
              <template v-if="b.status === 'diajukan' && canVerif">
                <v-btn size="small" color="success" variant="tonal" class="mr-1" @click="verifBatch(b, 'disetujui')">Setujui</v-btn>
                <v-btn size="small" color="error" variant="tonal" @click="verifBatch(b, 'ditolak')">Tolak</v-btn>
              </template>
            </td>
          </tr>
        </tbody>
      </v-table>

      <div v-else-if="modeBatch === 'list'" class="pa-3">
        <div v-if="batchLoading" class="text-center py-6">Memuat...</div>
        <div v-else-if="!batches.length" class="text-center py-6 text-medium-emphasis">Belum ada batch</div>
        <RecordCard
          v-for="b in batches"
          v-else
          :key="b.id"
          :title="b.periode_start + ' — ' + b.periode_end"
          :subtitle="b.kawasan_kode + ' — ' + b.kawasan_nama"
          :fields="[
            { label: 'Tipe', value: b.periode_type },
            { label: 'Tahun', value: b.tahun },
          ]"
        >
          <template #badge>
            <v-chip :color="batchColor(b.status)" size="small">{{ b.status }}</v-chip>
          </template>
          <template v-if="(b.status === 'draft' && isUser) || (b.status === 'diajukan' && canVerif)" #actions>
            <v-btn v-if="b.status === 'draft' && isUser" size="small" color="primary" variant="tonal" @click="ajukanBatch(b)">Ajukan</v-btn>
            <template v-if="b.status === 'diajukan' && canVerif">
              <v-btn size="small" color="success" variant="tonal" @click="verifBatch(b, 'disetujui')">Setujui</v-btn>
              <v-btn size="small" color="error" variant="tonal" @click="verifBatch(b, 'ditolak')">Tolak</v-btn>
            </template>
          </template>
        </RecordCard>
      </div>

      <div v-else class="pa-2">
        <div v-if="batchLoading" class="text-center py-6">Memuat...</div>
        <div v-else-if="!batches.length" class="text-center py-6 text-medium-emphasis">Belum ada batch</div>
        <v-list v-else density="compact" lines="one">
          <v-list-item v-for="b in batches" :key="b.id" :title="b.periode_start + ' — ' + b.periode_end" :subtitle="b.kawasan_kode + ' — ' + b.periode_type + ' ' + b.tahun">
            <template #append>
              <v-chip :color="batchColor(b.status)" size="x-small" class="mr-1">{{ b.status }}</v-chip>
              <v-menu location="bottom end">
                <template #activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
                </template>
                <v-list density="compact" min-width="160">
                  <v-list-item v-if="b.status === 'draft' && isUser" prepend-icon="mdi-send" title="Ajukan" @click="ajukanBatch(b)" />
                  <v-list-item v-if="b.status === 'diajukan' && canVerif" prepend-icon="mdi-check" title="Setujui" @click="verifBatch(b, 'disetujui')" />
                  <v-list-item v-if="b.status === 'diajukan' && canVerif" prepend-icon="mdi-close" title="Tolak" base-color="error" @click="verifBatch(b, 'ditolak')" />
                </v-list>
              </v-menu>
            </template>
          </v-list-item>
        </v-list>
      </div>
    </v-card>

    <AppDialog v-model="batchDialog" title="Buat Batch Laporan" :max-width="520" icon="mdi-file-document-plus">
      <v-select v-model="batchForm.kawasan_id" :items="kawasanOpts" item-title="label" item-value="value" label="Kawasan *" variant="outlined" density="compact" :error-messages="batchErr.kawasan_id" class="mb-2" />
      <v-select v-model="batchForm.periode_type" :items="['mingguan','bulanan','semester','tahunan']" label="Tipe Periode *" variant="outlined" density="compact" class="mb-2" />
      <v-text-field v-model="batchForm.periode_start" label="Periode Start *" type="date" variant="outlined" density="compact" class="mb-2" />
      <v-text-field v-model="batchForm.periode_end" label="Periode End *" type="date" variant="outlined" density="compact" class="mb-2" />
      <v-text-field v-model.number="batchForm.tahun" label="Tahun *" type="number" variant="outlined" density="compact" class="mb-2" />
      <v-text-field v-model="batchForm.catatan" label="Catatan" variant="outlined" density="compact" hide-details />
      <template #actions>
        <v-spacer />
        <v-btn variant="text" @click="batchDialog = false">Batal</v-btn>
        <v-btn color="primary" :loading="batchSaving" @click="createBatch">Simpan</v-btn>
      </template>
    </AppDialog>

    <v-snackbar v-model="snack.show" :color="snack.color" timeout="3000">{{ snack.msg }}</v-snackbar>
  </div>
</template>


<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const { mode: modeBatch } = useViewMode('verifikasi-batch')
const { isUser, canVerif, kawasanOpts, snack, toast, loadMaster } = useVerifikasiMaster()

type Batch = { id: number; kawasan_kode: string; kawasan_nama: string; periode_start: string; periode_end: string; periode_type: string; tahun: number; status: string }

const batches = ref<Batch[]>([])
const batchLoading = ref(false)
const batchFilterKawasan = ref<number | null>(null)
const batchFilterStatus = ref<string | null>(null)
const batchDialog = ref(false)
const batchSaving = ref(false)
const batchForm = reactive({ kawasan_id: null as number | null, periode_type: 'bulanan', periode_start: '', periode_end: '', tahun: new Date().getFullYear(), catatan: '' })
const batchErr = reactive({ kawasan_id: '' })

function batchColor(s: string) { if (s === 'disetujui') return 'success'; if (s === 'diajukan') return 'warning'; if (s === 'ditolak') return 'error'; return 'grey' }

async function loadBatches() {
  batchLoading.value = true
  try {
    const params: Record<string, string> = {}
    if (batchFilterKawasan.value) params.kawasan_id = String(batchFilterKawasan.value)
    if (batchFilterStatus.value) params.status = batchFilterStatus.value
    const r = await $fetch<{ data: Batch[] }>('/api/laporan/batch', { query: params })
    batches.value = r.data
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat batch', 'error') }
  finally { batchLoading.value = false }
}
async function createBatch() {
  batchErr.kawasan_id = ''
  if (!batchForm.kawasan_id) { batchErr.kawasan_id = 'Kawasan wajib'; return }
  if (!batchForm.periode_start || !batchForm.periode_end) { toast('Periode wajib', 'error'); return }
  batchSaving.value = true
  try {
    await $fetch('/api/laporan/batch', { method: 'POST', body: { kawasan_id: batchForm.kawasan_id, periode_type: batchForm.periode_type, periode_start: batchForm.periode_start, periode_end: batchForm.periode_end, tahun: Number(batchForm.tahun), catatan: batchForm.catatan } })
    toast('Batch dibuat')
    batchDialog.value = false
    batchForm.kawasan_id = null; batchForm.catatan = ''
    await loadBatches()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error') }
  finally { batchSaving.value = false }
}
async function ajukanBatch(b: { id: number }) {
  try { await $fetch('/api/laporan/batch/' + b.id + '/ajukan', { method: 'POST' }); toast('Batch diajukan'); await loadBatches() }
  catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error') }
}
async function verifBatch(b: { id: number }, aksi: string) {
  try {
    await $fetch('/api/laporan/batch/' + b.id + '/verifikasi', { method: 'POST', body: { aksi } })
    toast(aksi === 'disetujui' ? 'Batch disetujui' : 'Batch ditolak', aksi === 'disetujui' ? 'success' : 'warning')
    await loadBatches()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error') }
}

onMounted(async () => { await loadMaster(); await loadBatches() })
</script>

