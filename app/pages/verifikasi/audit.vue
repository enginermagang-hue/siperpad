<template>
  <div>
    <div class="mb-6 flex items-center gap-3">
      <History class="shrink-0 size-9 text-primary" aria-hidden="true" />
      <h1 class="text-2xl font-medium text-foreground">Audit Trail</h1>
    </div>

    <VerifikasiNav />

    <div class="mb-4 rounded-lg border border-card-line bg-card p-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="w-full max-w-[200px]">
          <AppSelect v-model="auditEntitas" :items="entitasOpts" placeholder="Semua" clearable :search="false" @update:model-value="loadAudit" />
        </div>
        <input
          v-model="auditId"
          type="text"
          placeholder="Entitas ID (opsional)"
          class="w-full max-w-[200px] rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
          @keyup.enter="loadAudit"
        />
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium
                 text-primary hover:bg-primary/20 focus:outline-hidden"
          @click="loadAudit"
        >
          <Search class="shrink-0 size-4" aria-hidden="true" />
          Cari
        </button>
      </div>
    </div>

    <div class="rounded-lg border border-card-line bg-card">
      <div class="flex justify-end px-4 pt-3">
        <ViewModeToggle v-model="modeAudit" />
      </div>

      <!-- Mode tabel -->
      <div v-if="modeAudit === 'table'" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-table-line text-sm">
          <thead>
            <tr class="text-start text-xs uppercase tracking-wide text-muted-foreground-1">
              <th class="px-3 py-2.5 text-start font-medium">Waktu</th>
              <th class="px-3 py-2.5 text-start font-medium">User</th>
              <th class="px-3 py-2.5 text-start font-medium">Aksi</th>
              <th class="px-3 py-2.5 text-start font-medium">Entitas</th>
              <th class="px-3 py-2.5 text-start font-medium">ID</th>
              <th class="px-3 py-2.5 text-start font-medium">Before → After</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-table-line">
            <tr v-if="auditLoading">
              <td colspan="6" class="py-6 text-center text-muted-foreground-1">Memuat...</td>
            </tr>
            <tr v-else-if="!auditRows.length">
              <td colspan="6" class="py-6 text-center text-muted-foreground-1">Belum ada log</td>
            </tr>
            <tr v-for="a in auditRows" v-else :key="a.id" class="hover:bg-layer-hover">
              <td class="px-3 py-2.5 text-xs text-foreground">{{ a.at }}</td>
              <td class="px-3 py-2.5 text-foreground">{{ a.user_nama || a.user_email || a.user_id }}</td>
              <td class="px-3 py-2.5">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="auditChip(a.aksi)">
                  {{ a.aksi }}
                </span>
              </td>
              <td class="px-3 py-2.5 text-foreground">{{ a.entitas }}</td>
              <td class="px-3 py-2.5 text-foreground">{{ a.entitas_id }}</td>
              <td class="px-3 py-2.5 text-xs text-muted-foreground-1">{{ a.before || '-' }} → {{ a.after || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mode list -->
      <div v-else-if="modeAudit === 'list'" class="p-3">
        <div v-if="auditLoading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
        <div v-else-if="!auditRows.length" class="py-6 text-center text-muted-foreground-1">Belum ada log</div>
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
          <div class="mt-1 text-xs text-muted-foreground-1">{{ a.before || '-' }} → {{ a.after || '-' }}</div>
        </RecordCard>
      </div>

      <!-- Mode compact -->
      <div v-else class="p-2">
        <div v-if="auditLoading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
        <div v-else-if="!auditRows.length" class="py-6 text-center text-muted-foreground-1">Belum ada log</div>
        <ul v-else class="divide-y divide-table-line">
          <li v-for="a in auditRows" :key="a.id" class="flex items-start gap-2 py-2">
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm text-foreground">
                {{ a.aksi }} — {{ a.entitas }} #{{ a.entitas_id }}
              </span>
              <span class="block truncate text-xs text-muted-foreground-1">
                {{ a.at }} · {{ a.user_nama || a.user_email || a.user_id }}
              </span>
            </span>
            <span class="shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium" :class="auditChip(a.aksi)">
              {{ a.aksi }}
            </span>
          </li>
        </ul>
      </div>
    </div>

    <AppToast v-model="snack.show" :message="snack.msg" :color="snack.color" :timeout="3000" />
  </div>
</template>

<script setup lang="ts">
import { History, Search } from 'lucide-vue-next'

definePageMeta({ layout: 'default', middleware: 'auth' })

const { mode: modeAudit } = useViewMode('verifikasi-audit')
const { snack, toast } = useVerifikasiMaster()

type AuditRow = { id: number; at: string; user_id: number; user_nama: string; user_email: string; aksi: string; entitas: string; entitas_id: string; before: string; after: string }

const auditRows = ref<AuditRow[]>([])
const auditLoading = ref(false)
const auditEntitas = ref<string | null>(null)
const auditId = ref('')

const entitasOpts = ['realisasi', 'laporan_batch']

function auditChip(a: string) {
  if (a.includes('SETUJU')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
  if (a.includes('TOLAK')) return 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
  if (a.includes('AJUKAN')) return 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
  return 'bg-surface text-surface-foreground'
}

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
