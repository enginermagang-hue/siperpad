<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <FilePlus class="shrink-0 size-9 text-primary" aria-hidden="true" />
        <h1 class="text-2xl font-medium text-foreground">{{ isAdmin ? 'Pengajuan Batch' : 'Batch Laporan' }}</h1>
      </div>
      <button
        v-if="isAdmin"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium
               text-primary-foreground hover:bg-primary-hover focus:outline-hidden focus:bg-primary-focus"
        @click="openBatchDialog"
      >
        <Plus class="shrink-0 size-4" aria-hidden="true" />
        Buat Batch
      </button>
    </div>

    <VerifikasiNav />

    <div class="rounded-lg border border-card-line bg-card">
      <!-- Toolbar: filter + toggle view — satu baris di dalam card -->
      <div class="flex flex-wrap items-center gap-3 p-4">
        <div class="w-full max-w-[200px]">
          <AppSelect
            v-model="batchFilterKawasan"
            :items="kawasanOptsScoped"
            :disabled="!!scopedKawasanId"
            placeholder="Semua"
            clearable
            @update:model-value="loadBatches"
          />
        </div>
        <div class="w-full max-w-[160px]">
          <AppSelect v-model="batchFilterStatus" :items="statusOpts" placeholder="Semua status" clearable @update:model-value="loadBatches" />
        </div>
        <div class="ms-auto"><ViewModeToggle v-model="modeBatch" /></div>
      </div>

      <!-- Mode tabel -->
      <div v-if="modeBatch === 'table'" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-table-line text-sm">
          <thead>
            <tr class="text-start text-xs uppercase tracking-wide text-muted-foreground-1">
              <th class="px-3 py-2.5 text-start font-medium">Periode</th>
              <th class="px-3 py-2.5 text-start font-medium">Kawasan</th>
              <th class="px-3 py-2.5 text-start font-medium">Tipe</th>
              <th class="px-3 py-2.5 text-start font-medium">Tahun</th>
              <th class="px-3 py-2.5 text-start font-medium">Status</th>
              <th class="w-[200px] px-3 py-2.5 text-start font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-table-line">
            <tr v-if="batchLoading">
              <td colspan="6" class="py-6 text-center text-muted-foreground-1">Memuat...</td>
            </tr>
            <tr v-else-if="!batches.length">
              <td colspan="6" class="py-6 text-center text-muted-foreground-1">Belum ada batch</td>
            </tr>
            <tr v-for="b in batches" v-else :key="b.id" class="hover:bg-layer-hover">
              <td class="px-3 py-2.5 text-foreground">{{ b.periode_start }} — {{ b.periode_end }}</td>
              <td class="px-3 py-2.5">
                <span class="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs text-surface-foreground">
                  {{ b.kawasan_kode }} — {{ b.kawasan_nama }}
                </span>
              </td>
              <td class="px-3 py-2.5 text-foreground">{{ b.periode_type }}</td>
              <td class="px-3 py-2.5 text-foreground">{{ b.tahun }}</td>
              <td class="px-3 py-2.5">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="statusChip(b.status)">
                  {{ b.status }}
                </span>
              </td>
              <td class="px-3 py-2.5">
                <div class="flex flex-wrap gap-1">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-xs font-medium
                           text-foreground hover:bg-layer-hover focus:outline-hidden"
                    @click="navigateTo(`/verifikasi/batch/${b.id}`)"
                  >
                    <Eye class="shrink-0 size-3.5" aria-hidden="true" /> Detail
                  </button>
                  <button
                    v-if="b.status === 'draft' && isAdmin"
                    type="button"
                    class="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium
                           text-primary hover:bg-primary/20 focus:outline-hidden"
                    @click="ajukanBatch(b)"
                  >
                    <Send class="shrink-0 size-3.5" aria-hidden="true" /> Ajukan
                  </button>
                  <template v-if="b.status === 'diajukan' && isKepala">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium
                             text-emerald-800 hover:bg-emerald-200 focus:outline-hidden
                             dark:bg-emerald-950/60 dark:text-emerald-300"
                      @click="verifBatch(b, 'disetujui')"
                    >
                      <Check class="shrink-0 size-3.5" aria-hidden="true" /> Setujui
                    </button>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs font-medium
                             text-red-800 hover:bg-red-200 focus:outline-hidden
                             dark:bg-red-950/60 dark:text-red-300"
                      @click="verifBatch(b, 'ditolak')"
                    >
                      <X class="shrink-0 size-3.5" aria-hidden="true" /> Tolak
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mode list -->
      <div v-else-if="modeBatch === 'list'" class="p-3">
        <div v-if="batchLoading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
        <div v-else-if="!batches.length" class="py-6 text-center text-muted-foreground-1">Belum ada batch</div>
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
            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="statusChip(b.status)">
              {{ b.status }}
            </span>
          </template>
          <template #actions>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-foreground hover:bg-layer-hover focus:outline-hidden"
              @click="navigateTo(`/verifikasi/batch/${b.id}`)"
            >
              <Eye class="shrink-0 size-3.5" aria-hidden="true" /> Detail
            </button>
            <button
              v-if="b.status === 'draft' && isAdmin"
              type="button"
              class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-layer-hover focus:outline-hidden"
              @click="ajukanBatch(b)"
            >
              <Send class="shrink-0 size-3.5" aria-hidden="true" /> Ajukan
            </button>
            <template v-if="b.status === 'diajukan' && isKepala">
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-layer-hover focus:outline-hidden dark:text-emerald-400"
                @click="verifBatch(b, 'disetujui')"
              >
                <Check class="shrink-0 size-3.5" aria-hidden="true" /> Setujui
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-layer-hover focus:outline-hidden dark:text-red-400"
                @click="verifBatch(b, 'ditolak')"
              >
                <X class="shrink-0 size-3.5" aria-hidden="true" /> Tolak
              </button>
            </template>
          </template>
        </RecordCard>
      </div>

      <!-- Mode compact -->
      <div v-else class="p-2">
        <div v-if="batchLoading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
        <div v-else-if="!batches.length" class="py-6 text-center text-muted-foreground-1">Belum ada batch</div>
        <ul v-else class="divide-y divide-table-line">
          <li v-for="b in batches" :key="b.id" class="flex items-center gap-2 py-2">
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm text-foreground">{{ b.periode_start }} — {{ b.periode_end }}</span>
              <span class="block truncate text-xs text-muted-foreground-1">
                {{ b.kawasan_kode }} — {{ b.periode_type }} {{ b.tahun }}
              </span>
            </span>
            <span class="shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium" :class="statusChip(b.status)">
              {{ b.status }}
            </span>
            <AppMenu
              :items="menuItems(b)"
            />
          </li>
        </ul>
      </div>
    </div>

    <!-- Dialog buat batch -->
    <AppDialog v-model="batchDialog" title="Buat Batch Laporan" :max-width="520" :icon="FilePlus">
      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Kawasan *</label>
        <AppSelect v-model="batchForm.kawasan_id" :items="kawasanOptsScoped" :disabled="!!scopedKawasanId" placeholder="Pilih kawasan" in-modal />
        <p v-if="scopedKawasanId" class="mt-1 text-xs text-muted-foreground-1">Terkunci ke kawasan penugasan Anda.</p>
        <p v-if="batchErr.kawasan_id" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ batchErr.kawasan_id }}</p>
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Tipe Periode *</label>
        <AppSelect v-model="batchForm.periode_type" :items="periodeTypeOpts" :search="false" in-modal />
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Periode Start *</label>
        <input
          v-model="batchForm.periode_start"
          type="date"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Periode End *</label>
        <input
          v-model="batchForm.periode_end"
          type="date"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Tahun *</label>
        <input
          v-model.number="batchForm.tahun"
          type="number"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Catatan</label>
        <input
          v-model="batchForm.catatan"
          type="text"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
      </div>

      <template #actions>
        <button
          type="button"
          class="rounded-lg px-3 py-2 text-sm text-foreground hover:bg-layer-hover focus:outline-hidden"
          @click="batchDialog = false"
        >
          Batal
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium
                 text-primary-foreground hover:bg-primary-hover focus:outline-hidden
                 disabled:opacity-50 disabled:pointer-events-none"
          :disabled="batchSaving"
          @click="createBatch"
        >
          <LoaderCircle v-if="batchSaving" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
          Simpan
        </button>
      </template>
    </AppDialog>

    <AppToast v-model="snack.show" :message="snack.msg" :color="snack.color" :timeout="3000" />
  </div>
</template>


<script setup lang="ts">
import { Check, Eye, FilePlus, LoaderCircle, Plus, Send, X } from 'lucide-vue-next'
import type { MenuItem } from '~/components/AppMenu.vue'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { mode: modeBatch } = useViewMode('verifikasi-batch')
const session = useUserSession()
const isKepala = computed(() => String(session.user.value?.role || '') === 'kepala')
const { isAdmin, kawasanOptsScoped, scopedKawasanId, snack, toast, loadMaster } = useVerifikasiMaster()

type Batch = { id: number; kawasan_kode: string; kawasan_nama: string; periode_start: string; periode_end: string; periode_type: string; tahun: number; status: string }

const statusOpts = ['draft', 'diajukan', 'disetujui', 'ditolak']
const periodeTypeOpts = [
  { label: 'Mingguan', value: 'mingguan' },
  { label: 'Bulanan', value: 'bulanan' },
  { label: 'Semester', value: 'semester' },
  { label: 'Tahunan', value: 'tahunan' },
]

const batches = ref<Batch[]>([])
const batchLoading = ref(false)
const batchFilterKawasan = ref<number | null>(null)
const batchFilterStatus = ref<string | null>(null)
const batchDialog = ref(false)
const batchSaving = ref(false)
const batchForm = reactive({ kawasan_id: null as number | null, periode_type: 'bulanan', periode_start: '', periode_end: '', tahun: new Date().getFullYear(), catatan: '' })
const batchErr = reactive({ kawasan_id: '' })

function statusChip(s: string) {
  if (s === 'disetujui') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
  if (s === 'diajukan') return 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
  if (s === 'ditolak') return 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
  return 'bg-surface text-surface-foreground'
}

// Aksi yang tersedia per status/role, untuk mode compact (AppMenu).
function menuItems(b: Batch): MenuItem[] {
  const items: MenuItem[] = []
  items.push({ label: 'Detail', icon: Eye, onClick: () => navigateTo(`/verifikasi/batch/${b.id}`) })
  if (b.status === 'draft' && isAdmin.value) {
    items.push({ label: 'Ajukan', icon: Send, onClick: () => ajukanBatch(b) })
  }
  if (b.status === 'diajukan' && isKepala.value) {
    items.push({ label: 'Setujui', icon: Check, onClick: () => verifBatch(b, 'disetujui') })
    items.push({ label: 'Tolak', icon: X, variant: 'danger', onClick: () => verifBatch(b, 'ditolak') })
  }
  return items
}

async function loadBatches() {
  batchLoading.value = true
  try {
    const params: Record<string, string> = {}
    // Petugas: permintaan selalu dibatasi ke kawasan penugasan.
    const kawasanId = scopedKawasanId.value ?? batchFilterKawasan.value
    if (kawasanId) params.kawasan_id = String(kawasanId)
    if (batchFilterStatus.value) params.status = batchFilterStatus.value
    const r = await $fetch<{ data: Batch[] }>('/api/laporan/batch', { query: params })
    batches.value = r.data
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat batch', 'error') }
  finally { batchLoading.value = false }
}
function openBatchDialog() {
  // Petugas: kawasan sudah ditentukan oleh penugasan.
  if (scopedKawasanId.value) batchForm.kawasan_id = scopedKawasanId.value
  batchDialog.value = true
}
async function createBatch() {
  batchErr.kawasan_id = ''
  // Kawasan penugasan tidak bisa ditimpa dari klien.
  const kawasanId = scopedKawasanId.value ?? batchForm.kawasan_id
  if (!kawasanId) { batchErr.kawasan_id = 'Kawasan wajib'; return }
  if (!batchForm.periode_start || !batchForm.periode_end) { toast('Periode wajib', 'error'); return }
  batchSaving.value = true
  try {
    await $fetch('/api/laporan/batch', { method: 'POST', body: { kawasan_id: kawasanId, periode_type: batchForm.periode_type, periode_start: batchForm.periode_start, periode_end: batchForm.periode_end, tahun: Number(batchForm.tahun), catatan: batchForm.catatan } })
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

onMounted(async () => {
  await loadMaster()
  // Petugas: filter kawasan dikunci ke penugasan (tampil, tidak bisa diubah).
  if (scopedKawasanId.value) batchFilterKawasan.value = scopedKawasanId.value
  await loadBatches()
})
</script>
