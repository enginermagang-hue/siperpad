<template>
  <div>
    <div class="mb-6 flex items-center gap-3">
      <ClipboardList class="shrink-0 size-9 text-primary" aria-hidden="true" />
      <h1 class="text-2xl font-medium text-foreground">Catatan Temuan</h1>
    </div>

    <VerifikasiNav />

    <div class="mb-4 rounded-lg border border-card-line bg-card p-4">
      <div class="mb-3 flex flex-wrap items-center gap-3">
        <div class="w-full max-w-[220px]">
          <AppSelect v-model="catKawasan" :items="kawasanOpts" placeholder="Kawasan *" />
        </div>
        <div class="w-full max-w-[110px]">
          <AppSelect v-model="catTahun" :items="[2024, 2025, 2026, 2027]" :search="false" />
        </div>
        <div class="w-full max-w-[150px]">
          <AppSelect v-model="catBulan" :items="bulanOpts" />
        </div>
        <input
          v-model="catIsi"
          type="text"
          placeholder="Catatan / temuan *"
          class="min-w-[280px] flex-1 rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium
                 text-primary-foreground hover:bg-primary-hover focus:outline-hidden focus:bg-primary-focus
                 disabled:opacity-50 disabled:pointer-events-none"
          :disabled="catSaving"
          @click="simpanCatatan"
        >
          <LoaderCircle v-if="catSaving" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
          <Plus v-else class="shrink-0 size-4" aria-hidden="true" />
          Tambah
        </button>
      </div>

      <div class="flex flex-wrap gap-3">
        <div class="w-full max-w-[160px]">
          <AppSelect v-model="catFilterStatus" :items="['terbuka', 'selesai']" placeholder="Semua" clearable @update:model-value="loadCatatan" />
        </div>
      </div>
    </div>

    <div class="rounded-lg border border-card-line bg-card">
      <div class="flex justify-end px-4 pt-3">
        <ViewModeToggle v-model="modeCatatan" />
      </div>

      <!-- Mode tabel -->
      <div v-if="modeCatatan === 'table'" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-table-line text-sm">
          <thead>
            <tr class="text-start text-xs uppercase tracking-wide text-muted-foreground-1">
              <th class="px-3 py-2.5 text-start font-medium">Periode</th>
              <th class="px-3 py-2.5 text-start font-medium">Kawasan</th>
              <th class="px-3 py-2.5 text-start font-medium">Pos</th>
              <th class="px-3 py-2.5 text-start font-medium">Catatan</th>
              <th class="px-3 py-2.5 text-start font-medium">Status</th>
              <th class="px-3 py-2.5 text-start font-medium">Oleh</th>
              <th class="w-[140px] px-3 py-2.5 text-start font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-table-line">
            <tr v-if="catLoading">
              <td colspan="7" class="py-6 text-center text-muted-foreground-1">Memuat...</td>
            </tr>
            <tr v-else-if="!catatan.length">
              <td colspan="7" class="py-6 text-center text-muted-foreground-1">Belum ada catatan</td>
            </tr>
            <tr v-for="c in catatan" v-else :key="c.id" class="hover:bg-layer-hover">
              <td class="px-3 py-2.5 text-foreground">{{ bulanLabel(c.bulan) }} {{ c.tahun }}</td>
              <td class="px-3 py-2.5">
                <span class="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs text-surface-foreground">
                  {{ c.kawasan_kode }}
                </span>
              </td>
              <td class="px-3 py-2.5 text-xs text-foreground">{{ c.jenis_nama || '—' }}</td>
              <td class="px-3 py-2.5 text-foreground">{{ c.isi }}</td>
              <td class="px-3 py-2.5">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="statusChip(c.status)">
                  {{ c.status }}
                </span>
              </td>
              <td class="px-3 py-2.5 text-xs text-foreground">{{ c.created_by_nama || '-' }}</td>
              <td class="px-3 py-2.5">
                <div class="flex items-center gap-0.5">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium
                           text-emerald-800 hover:bg-emerald-200 focus:outline-hidden
                           dark:bg-emerald-950/60 dark:text-emerald-300"
                    @click="toggleCatatan(c)"
                  >
                    {{ c.status === 'selesai' ? 'Buka' : 'Selesai' }}
                  </button>
                  <button
                    v-if="isAdmin"
                    type="button"
                    class="rounded-md p-1.5 text-red-600 hover:bg-layer-hover focus:outline-hidden dark:text-red-400"
                    aria-label="Hapus"
                    @click="hapusCatatan(c)"
                  >
                    <Trash2 class="shrink-0 size-4" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mode list -->
      <div v-else-if="modeCatatan === 'list'" class="p-3">
        <div v-if="catLoading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
        <div v-else-if="!catatan.length" class="py-6 text-center text-muted-foreground-1">Belum ada catatan</div>
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
            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="statusChip(c.status)">
              {{ c.status }}
            </span>
          </template>
          <div class="mt-2 text-sm text-foreground">{{ c.isi }}</div>
          <template #actions>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-700
                     hover:bg-layer-hover focus:outline-hidden dark:text-emerald-400"
              @click="toggleCatatan(c)"
            >
              {{ c.status === 'selesai' ? 'Buka' : 'Selesai' }}
            </button>
            <button
              v-if="isAdmin"
              type="button"
              class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-layer-hover
                     focus:outline-hidden dark:text-red-400"
              @click="hapusCatatan(c)"
            >
              <Trash2 class="shrink-0 size-3.5" aria-hidden="true" /> Hapus
            </button>
          </template>
        </RecordCard>
      </div>

      <!-- Mode compact -->
      <div v-else class="p-2">
        <div v-if="catLoading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
        <div v-else-if="!catatan.length" class="py-6 text-center text-muted-foreground-1">Belum ada catatan</div>
        <ul v-else class="divide-y divide-table-line">
          <li v-for="c in catatan" :key="c.id" class="flex items-start gap-2 py-2">
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm text-foreground">
                {{ bulanLabel(c.bulan) }} {{ c.tahun }} — {{ c.kawasan_kode }}
              </span>
              <span class="block truncate text-xs text-muted-foreground-1">{{ c.isi }}</span>
            </span>
            <span class="shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium" :class="statusChip(c.status)">
              {{ c.status }}
            </span>
            <AppMenu :items="menuItems(c)" />
          </li>
        </ul>
      </div>
    </div>

    <AppToast v-model="snack.show" :message="snack.msg" :color="snack.color" :timeout="3000" />
  </div>
</template>


<script setup lang="ts">
import { ClipboardList, LoaderCircle, Plus, Trash2, Undo2, Check } from 'lucide-vue-next'
import type { MenuItem } from '~/components/AppMenu.vue'

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

function statusChip(s: string) {
  return s === 'selesai'
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
    : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
}

function menuItems(c: CatRow): MenuItem[] {
  const items: MenuItem[] = [
    {
      label: c.status === 'selesai' ? 'Buka' : 'Selesai',
      icon: c.status === 'selesai' ? Undo2 : Check,
      onClick: () => toggleCatatan(c),
    },
  ]
  if (isAdmin.value) {
    items.push({ label: 'Hapus', icon: Trash2, variant: 'danger', onClick: () => hapusCatatan(c) })
  }
  return items
}

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
