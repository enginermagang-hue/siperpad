<template>
  <div>
    <div class="d-flex align-center mb-6">
      <v-icon size="36" color="primary" class="mr-3">mdi-cog-outline</v-icon>
      <h1 class="text-h4 font-weight-medium">Pengaturan</h1>
    </div>

    <v-row>
      <v-col cols="12" md="6">
        <v-card flat elevation="2" class="mb-4">
          <v-card-title class="text-h6">Ganti Password</v-card-title>
          <v-card-text>
            <v-text-field v-model="curPw" label="Password lama *" type="password" variant="outlined" density="compact" :error-messages="err.cur" class="mb-2" />
            <v-text-field v-model="newPw" label="Password baru *" type="password" variant="outlined" density="compact" :error-messages="err.next" class="mb-2" hint="Minimal 6 karakter" persistent-hint />
            <v-text-field v-model="confirmPw" label="Konfirmasi password baru *" type="password" variant="outlined" density="compact" :error-messages="err.confirm" class="mb-2" />
          </v-card-text>
          <v-card-actions><v-spacer /><v-btn color="primary" :loading="saving" @click="changePw">Simpan Password</v-btn></v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card flat elevation="2" class="mb-4">
          <v-card-title class="text-h6">Info Sistem</v-card-title>
          <v-card-text>
            <div v-if="infoLoading" class="text-medium-emphasis py-4">Memuat...</div>
            <template v-else-if="info">
              <div class="text-body-2 mb-1">Login sebagai <b>{{ info.user.nama }}</b> ({{ info.user.email }}) — <v-chip size="small" variant="tonal">{{ info.user.role }}</v-chip></div>
              <v-divider class="my-3" />
              <div class="text-body-2 mb-2"><b>Data</b></div>
              <div class="d-flex flex-wrap ga-2 mb-3">
                <v-chip size="small">Users: {{ info.counts.users }}</v-chip>
                <v-chip size="small">Kawasan: {{ info.counts.kawasan }}</v-chip>
                <v-chip size="small">Jenis: {{ info.counts.jenis }}</v-chip>
                <v-chip size="small">Target: {{ info.counts.target }}</v-chip>
                <v-chip size="small">Realisasi: {{ info.counts.realisasi }}</v-chip>
                <v-chip size="small">Batch: {{ info.counts.batch }}</v-chip>
                <v-chip size="small">Audit: {{ info.counts.audit }}</v-chip>
              </div>
              <div class="text-body-2 mb-2"><b>Dropbox</b> <v-chip :color="info.dropbox.ready ? 'success' : 'warning'" size="small" class="ml-2">{{ info.dropbox.ready ? 'Terkonfigurasi' : 'Belum dikonfigurasi' }}</v-chip></div>
              <div class="text-caption text-medium-emphasis mb-3">Folder: {{ info.dropbox.folder }}</div>
              <v-btn v-if="isAdmin" color="primary" variant="tonal" prepend-icon="mdi-cloud-upload" :loading="syncing" :disabled="!info.dropbox.ready" @click="syncDropbox">Sinkron ke Dropbox</v-btn>
              <div v-if="syncMsg" class="text-caption mt-2" :class="syncOk ? 'text-success' : 'text-error'">{{ syncMsg }}</div>
            </template>
            <div v-else class="text-medium-emphasis">Gagal memuat info sistem</div>
          </v-card-text>
        </v-card>

        <v-card flat elevation="2">
          <v-card-text class="text-caption text-medium-emphasis">
            <div class="mb-1"><b>SiPerPAD</b> — Rekap PAD Lasiana &amp; Kampung Seni</div>
            <div>Dokumen SOP: <code>docs/SOP_SIPERPAD.md</code></div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snack.show" :color="snack.color" timeout="3000">{{ snack.msg }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })
const session = useUserSession()
const isAdmin = computed(() => String(session.user.value?.role) === 'admin')

const curPw = ref('')
const newPw = ref('')
const confirmPw = ref('')
const saving = ref(false)
const err = reactive({ cur: '', next: '', confirm: '' })
const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' | 'warning' })
function toast(msg: string, color: typeof snack.color = 'success') { snack.msg = msg; snack.color = color; snack.show = true }

async function changePw() {
  err.cur = ''; err.next = ''; err.confirm = ''
  if (!curPw.value) err.cur = 'Wajib'
  if (!newPw.value) err.next = 'Wajib diisi'
  else if (newPw.value.length < 6) err.next = 'Minimal 6 karakter'
  if (confirmPw.value !== newPw.value) err.confirm = 'Tidak cocok'
  if (err.cur || err.next || err.confirm) return
  saving.value = true
  try {
    await $fetch('/api/auth/change-password', { method: 'POST', body: { current_password: curPw.value, new_password: newPw.value } })
    toast('Password diperbarui')
    curPw.value = ''; newPw.value = ''; confirmPw.value = ''
  } catch (e: unknown) {
    toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error')
  } finally { saving.value = false }
}

const info = ref<{ user: { nama: string; email: string; role: string }; counts: Record<string, number>; dropbox: { ready: boolean; folder: string } } | null>(null)
const infoLoading = ref(false)
async function loadInfo() {
  infoLoading.value = true
  try { info.value = await $fetch('/api/sistem-info') }
  catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat info', 'error') }
  finally { infoLoading.value = false }
}
const syncing = ref(false)
const syncMsg = ref('')
const syncOk = ref(false)
async function syncDropbox() {
  syncing.value = true; syncMsg.value = ''
  try {
    const r = await $fetch<{ ok: boolean; path: string; size: number }>('/api/sync/dropbox', { method: 'POST' })
    syncOk.value = true; syncMsg.value = `Berhasil — ${r.path} (${r.size} bytes)`
    toast('Sinkronisasi Dropbox berhasil')
    await loadInfo()
  } catch (e: unknown) {
    syncOk.value = false; syncMsg.value = (e as { data?: { message?: string } })?.data?.message || String(e)
    toast(syncMsg.value, 'error')
  } finally { syncing.value = false }
}

onMounted(loadInfo)
</script>
