<template>
  <div>
    <div class="d-flex align-center mb-6">
      <v-icon size="36" color="primary" class="mr-3">mdi-lock-outline</v-icon>
      <h1 class="text-h4 font-weight-medium">Kunci Periode</h1>
    </div>

    <VerifikasiNav />

    <v-card flat elevation="0" class="mb-4">
      <v-card-text>
        <div class="d-flex flex-wrap ga-3 align-center">
          <v-select v-model="lockKawasan" :items="kawasanOpts" item-title="label" item-value="value" label="Kawasan *" density="compact" variant="outlined" hide-details style="max-width: 240px" />
          <v-select v-model="lockTahun" :items="[2024, 2025, 2026, 2027]" label="Tahun" density="compact" variant="outlined" hide-details style="max-width: 110px" />
          <v-select v-model="lockBulan" :items="bulanOpts" item-title="label" item-value="value" label="Bulan" density="compact" variant="outlined" hide-details style="max-width: 150px" />
          <v-btn v-if="isAdmin" color="primary" prepend-icon="mdi-lock" :loading="lockLoading" @click="kunciPeriode">Kunci Periode</v-btn>
        </div>
        <div class="text-caption text-medium-emphasis mt-2">Kunci hanya bisa dilakukan setelah semua realisasi periode terverifikasi (disetujui). Hanya admin.</div>
      </v-card-text>
    </v-card>
    <v-card flat elevation="0">
      <div class="d-flex justify-end px-4 pt-3">
        <ViewModeToggle v-model="modeKunci" />
      </div>
      <v-table v-if="modeKunci === 'table'" density="default">
        <thead><tr><th>Tahun</th><th>Bulan</th><th>Kawasan</th><th>Dikunci oleh</th><th>Waktu</th><th style="width:120px">Aksi</th></tr></thead>
        <tbody>
          <tr v-if="lockRowsLoading"><td colspan="6" class="text-center py-6">Memuat...</td></tr>
          <tr v-else-if="!lockRows.length"><td colspan="6" class="text-center py-6 text-medium-emphasis">Belum ada periode terkunci</td></tr>
          <tr v-for="l in lockRows" :key="l.id">
            <td>{{ l.tahun }}</td>
            <td>{{ bulanLabel(l.bulan) }}</td>
            <td><v-chip size="small" variant="tonal">{{ l.kawasan_kode }} — {{ l.kawasan_nama }}</v-chip></td>
            <td>{{ l.locked_by_nama || '-' }}</td>
            <td class="text-caption">{{ l.locked_at }}</td>
            <td><v-btn v-if="isAdmin" size="small" color="warning" variant="tonal" @click="bukaKunci(l)">Buka</v-btn></td>
          </tr>
        </tbody>
      </v-table>

      <div v-else-if="modeKunci === 'list'" class="pa-3">
        <div v-if="lockRowsLoading" class="text-center py-6">Memuat...</div>
        <div v-else-if="!lockRows.length" class="text-center py-6 text-medium-emphasis">Belum ada periode terkunci</div>
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
            <v-btn size="small" color="warning" variant="tonal" prepend-icon="mdi-lock-open-variant" @click="bukaKunci(l)">Buka</v-btn>
          </template>
        </RecordCard>
      </div>

      <div v-else class="pa-2">
        <div v-if="lockRowsLoading" class="text-center py-6">Memuat...</div>
        <div v-else-if="!lockRows.length" class="text-center py-6 text-medium-emphasis">Belum ada periode terkunci</div>
        <v-list v-else density="compact" lines="one">
          <v-list-item v-for="l in lockRows" :key="l.id" :title="bulanLabel(l.bulan) + ' ' + l.tahun" :subtitle="l.kawasan_kode + ' — ' + (l.locked_by_nama || '-')">
            <template #append>
              <v-btn v-if="isAdmin" size="x-small" color="warning" variant="tonal" @click="bukaKunci(l)">Buka</v-btn>
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

