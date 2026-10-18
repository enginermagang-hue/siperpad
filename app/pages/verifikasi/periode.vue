<template>
  <div>
    <div class="mb-6 flex items-center gap-3">
      <Lock class="shrink-0 size-9 text-primary" aria-hidden="true" />
      <h1 class="text-2xl font-medium text-foreground">Kunci Periode</h1>
    </div>

    <VerifikasiNav />

    <div class="mb-4 rounded-lg border border-card-line bg-card p-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="w-full max-w-[240px]">
          <AppSelect v-model="lockKawasan" :items="kawasanOpts" placeholder="Kawasan *" />
        </div>
        <div class="w-full max-w-[110px]">
          <AppSelect v-model="lockTahun" :items="[2024, 2025, 2026, 2027]" :search="false" />
        </div>
        <div class="w-full max-w-[150px]">
          <AppSelect v-model="lockBulan" :items="bulanOpts" />
        </div>
        <button
          v-if="isAdmin"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium
                 text-primary-foreground hover:bg-primary-hover focus:outline-hidden focus:bg-primary-focus
                 disabled:opacity-50 disabled:pointer-events-none"
          :disabled="lockLoading"
          @click="kunciPeriode"
        >
          <LoaderCircle v-if="lockLoading" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
          <Lock v-else class="shrink-0 size-4" aria-hidden="true" />
          Kunci Periode
        </button>
      </div>
      <div class="mt-2 text-xs text-muted-foreground-1">
        Kunci hanya bisa dilakukan setelah semua realisasi periode terverifikasi (disetujui). Hanya admin.
      </div>
    </div>

    <div class="rounded-lg border border-card-line bg-card">
      <div class="flex justify-end px-4 pt-3">
        <ViewModeToggle v-model="modeKunci" />
      </div>

      <!-- Mode tabel -->
      <div v-if="modeKunci === 'table'" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-table-line text-sm">
          <thead>
            <tr class="text-start text-xs uppercase tracking-wide text-muted-foreground-1">
              <th class="px-3 py-2.5 text-start font-medium">Tahun</th>
              <th class="px-3 py-2.5 text-start font-medium">Bulan</th>
              <th class="px-3 py-2.5 text-start font-medium">Kawasan</th>
              <th class="px-3 py-2.5 text-start font-medium">Dikunci oleh</th>
              <th class="px-3 py-2.5 text-start font-medium">Waktu</th>
              <th class="w-[120px] px-3 py-2.5 text-start font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-table-line">
            <tr v-if="lockRowsLoading">
              <td colspan="6" class="py-6 text-center text-muted-foreground-1">Memuat...</td>
            </tr>
            <tr v-else-if="!lockRows.length">
              <td colspan="6" class="py-6 text-center text-muted-foreground-1">Belum ada periode terkunci</td>
            </tr>
            <tr v-for="l in lockRows" v-else :key="l.id" class="hover:bg-layer-hover">
              <td class="px-3 py-2.5 text-foreground">{{ l.tahun }}</td>
              <td class="px-3 py-2.5 text-foreground">{{ bulanLabel(l.bulan) }}</td>
              <td class="px-3 py-2.5">
                <span class="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs text-surface-foreground">
                  {{ l.kawasan_kode }} — {{ l.kawasan_nama }}
                </span>
              </td>
              <td class="px-3 py-2.5 text-foreground">{{ l.locked_by_nama || '-' }}</td>
              <td class="px-3 py-2.5 text-xs text-foreground">{{ l.locked_at }}</td>
              <td class="px-3 py-2.5">
                <button
                  v-if="isAdmin"
                  type="button"
                  class="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-medium
                         text-amber-900 hover:bg-amber-200 focus:outline-hidden
                         dark:bg-amber-950/60 dark:text-amber-300"
                  @click="bukaKunci(l)"
                >
                  Buka
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mode list -->
      <div v-else-if="modeKunci === 'list'" class="p-3">
        <div v-if="lockRowsLoading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
        <div v-else-if="!lockRows.length" class="py-6 text-center text-muted-foreground-1">Belum ada periode terkunci</div>
        <RecordCard
          v-for="l in lockRows"
          v-else
          :key="l.id"
          :title="bulanLabel(l.bulan) + ' ' + l.tahun"
          :subtitle="l.kawasan_kode + ' — ' + l.kawasan_nama"
          :fields="[
            { label: 'Dikunci oleh', value: l.locked_by_nama || '-' },
            { label: 'Waktu', value: l.locked_at },
          ]"
        >
          <template v-if="isAdmin" #actions>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-amber-700
                     hover:bg-layer-hover focus:outline-hidden dark:text-amber-400"
              @click="bukaKunci(l)"
            >
              <LockOpen class="shrink-0 size-3.5" aria-hidden="true" /> Buka
            </button>
          </template>
        </RecordCard>
      </div>

      <!-- Mode compact -->
      <div v-else class="p-2">
        <div v-if="lockRowsLoading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
        <div v-else-if="!lockRows.length" class="py-6 text-center text-muted-foreground-1">Belum ada periode terkunci</div>
        <ul v-else class="divide-y divide-table-line">
          <li v-for="l in lockRows" :key="l.id" class="flex items-center gap-2 py-2">
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm text-foreground">{{ bulanLabel(l.bulan) }} {{ l.tahun }}</span>
              <span class="block truncate text-xs text-muted-foreground-1">
                {{ l.kawasan_kode }} — {{ l.locked_by_nama || '-' }}
              </span>
            </span>
            <button
              v-if="isAdmin"
              type="button"
              class="shrink-0 inline-flex items-center rounded-md bg-amber-100 px-2 py-1 text-[11px] font-medium
                     text-amber-900 hover:bg-amber-200 focus:outline-hidden
                     dark:bg-amber-950/60 dark:text-amber-300"
              @click="bukaKunci(l)"
            >
              Buka
            </button>
          </li>
        </ul>
      </div>
    </div>

    <AppToast v-model="snack.show" :message="snack.msg" :color="snack.color" :timeout="3000" />
  </div>
</template>

<script setup lang="ts">
import { LoaderCircle, Lock, LockOpen } from 'lucide-vue-next'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { mode: modeKunci } = useViewMode('verifikasi-kunci')
const { isAdmin, kawasanOpts, snack, toast, bulanOpts, bulanLabel, loadMaster } = useVerifikasiMaster()

type LockRow = { id: number; tahun: number; bulan: number; kawasan_kode: string; kawasan_nama: string; locked_by_nama: string; locked_at: string }

const lockKawasan = ref<number | null>(null)
const lockTahun = ref(new Date().getFullYear())
const lockBulan = ref(new Date().getMonth() + 1)
const lockRows = ref<LockRow[]>([])
const lockRowsLoading = ref(false)
const lockLoading = ref(false)

async function loadLocks() {
  lockRowsLoading.value = true
  try { const r = await $fetch<{ data: LockRow[] }>('/api/periode-lock', { query: { tahun: String(lockTahun.value) } }); lockRows.value = r.data }
  catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat kunci', 'error') }
  finally { lockRowsLoading.value = false }
}
async function kunciPeriode() {
  if (!lockKawasan.value) { toast('Pilih kawasan', 'error'); return }
  lockLoading.value = true
  try {
    await $fetch('/api/periode-lock', { method: 'POST', body: { tahun: lockTahun.value, bulan: lockBulan.value, kawasan_id: lockKawasan.value } })
    toast('Periode dikunci')
    await loadLocks()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal mengunci', 'error') }
  finally { lockLoading.value = false }
}
async function bukaKunci(l: LockRow) {
  try { await $fetch('/api/periode-lock/' + l.id, { method: 'DELETE' }); toast('Kunci dibuka', 'warning'); await loadLocks() }
  catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal', 'error') }
}

onMounted(async () => { await loadMaster(); await loadLocks() })
</script>
