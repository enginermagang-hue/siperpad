<template>
  <div>
    <div class="d-flex align-center mb-6">
      <v-icon size="36" color="primary" class="mr-3">mdi-history</v-icon>
      <h1 class="text-h4 font-weight-medium">Audit Trail</h1>
    </div>

    <VerifikasiNav />

    <v-card flat elevation="0" class="mb-4">
      <v-card-text class="pb-0">
        <div class="d-flex flex-wrap ga-3 mb-4">
          <v-select v-model="auditEntitas" :items="['', 'realisasi', 'laporan_batch']" label="Entitas" density="compact" variant="outlined" hide-details clearable style="max-width: 200px" placeholder="Semua" @update:model-value="loadAudit" />
          <v-text-field v-model="auditId" density="compact" variant="outlined" placeholder="Entitas ID (opsional)" hide-details clearable style="max-width: 200px" @keyup.enter="loadAudit" />
          <v-btn color="primary" variant="tonal" @click="loadAudit">Cari</v-btn>
        </div>
      </v-card-text>
    </v-card>
    <v-card flat elevation="0">
      <div class="d-flex justify-end px-4 pt-3">
        <ViewModeToggle v-model="modeAudit" />
      </div>
      <v-table v-if="modeAudit === 'table'" density="default">
        <thead><tr><th>Waktu</th><th>User</th><th>Aksi</th><th>Entitas</th><th>ID</th><th>Before → After</th></tr></thead>
        <tbody>
          <tr v-if="auditLoading"><td colspan="6" class="text-center py-6">Memuat...</td></tr>
          <tr v-else-if="!auditRows.length"><td colspan="6" class="text-center py-6 text-medium-emphasis">Belum ada log</td></tr>
          <tr v-for="a in auditRows" :key="a.id">
            <td class="text-caption">{{ a.at }}</td>
            <td>{{ a.user_nama || a.user_email || a.user_id }}</td>
            <td><v-chip size="small" :color="auditColor(a.aksi)">{{ a.aksi }}</v-chip></td>
            <td>{{ a.entitas }}</td>
            <td>{{ a.entitas_id }}</td>
            <td class="text-caption">{{ a.before || '-' }} → {{ a.after || '-' }}</td>
          </tr>
        </tbody>
      </v-table>

      <div v-else-if="modeAudit === 'list'" class="pa-3">
        <div v-if="auditLoading" class="text-center py-6">Memuat...</div>
        <div v-else-if="!auditRows.length" class="text-center py-6 text-medium-emphasis">Belum ada log</div>
        <RecordCard
          v-for="a in auditRows"
          v-else
          :key="a.id"
          :title="a.aksi + ' — ' + a.entitas + ' #' + a.entitas_id"
          :subtitle="a.user_nama || a.user_email || a.user_id"
          :fields="[
            { label: 'Waktu', value: a.at },
          ]"
        >
          <div class="text-caption mt-1">{{ a.before || '-' }} → {{ a.after || '-' }}</div>
        </RecordCard>
      </div>

      <div v-else class="pa-2">
        <div v-if="auditLoading" class="text-center py-6">Memuat...</div>
        <div v-else-if="!auditRows.length" class="text-center py-6 text-medium-emphasis">Belum ada log</div>
        <v-list v-else density="compact" lines="two">
          <v-list-item v-for="a in auditRows" :key="a.id" :title="a.aksi + ' — ' + a.entitas + ' #' + a.entitas_id" :subtitle="a.at + ' · ' + (a.user_nama || a.user_email || a.user_id)">
            <template #append>
              <v-chip size="x-small" :color="auditColor(a.aksi)">{{ a.aksi }}</v-chip>
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

const { mode: modeAudit } = useViewMode('verifikasi-audit')
const { snack, toast } = useVerifikasiMaster()

type AuditRow = { id: number; at: string; user_id: number; user_nama: string; user_email: string; aksi: string; entitas: string; entitas_id: string; before: string; after: string }

const auditRows = ref<AuditRow[]>([])
const auditLoading = ref(false)
const auditEntitas = ref('')
const auditId = ref('')

function auditColor(a: string) { if (a.includes('SETUJU')) return 'success'; if (a.includes('TOLAK')) return 'error'; if (a.includes('AJUKAN')) return 'warning'; return 'grey' }

async function loadAudit() {
  auditLoading.value = true
  try {
    const params: Record<string, string> = { limit: '50' }
    if (auditEntitas.value) params.entitas = auditEntitas.value
    if (auditId.value.trim()) params.entitas_id = auditId.value.trim()
    const r = await $fetch<{ data: AuditRow[] }>('/api/audit-log', { query: params })
    auditRows.value = r.data
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat audit', 'error') }
  finally { auditLoading.value = false }
}

onMounted(loadAudit)
</script>

