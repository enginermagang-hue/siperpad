<template>
  <div>
    <div class="mb-6 flex items-center gap-3">
      <Settings class="shrink-0 size-9 text-primary" aria-hidden="true" />
      <h1 class="text-2xl font-medium text-foreground">Pengaturan</h1>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <div class="col-span-12 md:col-span-6">
        <div class="mb-4 rounded-lg border border-card-line bg-card">
          <div class="border-b border-card-divider px-4 py-3">
            <h2 class="text-base font-medium text-foreground">Ganti Password</h2>
          </div>
          <div class="p-4">
            <div class="mb-2">
              <label class="mb-1.5 block text-sm font-medium text-foreground">Password lama *</label>
              <input
                v-model="curPw"
                type="password"
                class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                       focus:border-primary-focus focus:ring-primary-focus"
              />
              <p v-if="err.cur" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.cur }}</p>
            </div>
            <div class="mb-2">
              <label class="mb-1.5 block text-sm font-medium text-foreground">Password baru *</label>
              <input
                v-model="newPw"
                type="password"
                class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                       focus:border-primary-focus focus:ring-primary-focus"
              />
              <p class="mt-1 text-xs text-muted-foreground-1">Minimal 6 karakter</p>
              <p v-if="err.next" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.next }}</p>
            </div>
            <div class="mb-2">
              <label class="mb-1.5 block text-sm font-medium text-foreground">Konfirmasi password baru *</label>
              <input
                v-model="confirmPw"
                type="password"
                class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                       focus:border-primary-focus focus:ring-primary-focus"
              />
              <p v-if="err.confirm" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.confirm }}</p>
            </div>
          </div>
          <div class="flex justify-end border-t border-card-divider px-4 py-3">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium
                     text-primary-foreground hover:bg-primary-hover focus:outline-hidden focus:bg-primary-focus
                     disabled:opacity-50 disabled:pointer-events-none"
              :disabled="saving"
              @click="changePw"
            >
              <LoaderCircle v-if="saving" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
              Simpan Password
            </button>
          </div>
        </div>
      </div>

      <div class="col-span-12 md:col-span-6">
        <div class="mb-4 rounded-lg border border-card-line bg-card">
          <div class="border-b border-card-divider px-4 py-3">
            <h2 class="text-base font-medium text-foreground">Info Sistem</h2>
          </div>
          <div class="p-4">
            <div v-if="infoLoading" class="py-4 text-muted-foreground-1">Memuat...</div>
            <template v-else-if="info">
              <div class="mb-1 text-sm text-foreground">
                Login sebagai <b>{{ info.user.nama }}</b> ({{ info.user.email }}) —
                <span class="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs text-surface-foreground">
                  {{ info.user.role }}
                </span>
              </div>

              <hr class="my-3 border-line-1" />

              <div class="mb-2 text-sm font-bold text-foreground">Data</div>
              <div class="mb-3 flex flex-wrap gap-2">
                <span
                  v-for="c in counts"
                  :key="c.label"
                  class="inline-flex items-center rounded-full border border-layer-line px-2 py-0.5 text-xs text-layer-foreground"
                >
                  {{ c.label }}: {{ c.value }}
                </span>
              </div>

              <div class="mb-2 text-sm text-foreground">
                <b>Dropbox</b>
                <span
                  class="ms-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="info.dropbox.ready
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'"
                >
                  {{ info.dropbox.ready ? 'Terkonfigurasi' : 'Belum dikonfigurasi' }}
                </span>
              </div>
              <div class="mb-3 text-xs text-muted-foreground-1">Folder: {{ info.dropbox.folder }}</div>

              <button
                v-if="isAdmin"
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium
                       text-primary hover:bg-primary/20 focus:outline-hidden
                       disabled:opacity-50 disabled:pointer-events-none"
                :disabled="syncing || !info.dropbox.ready"
                @click="syncDropbox"
              >
                <LoaderCircle v-if="syncing" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
                <CloudUpload v-else class="shrink-0 size-4" aria-hidden="true" />
                Sinkron ke Dropbox
              </button>

              <div
                v-if="syncMsg"
                class="mt-2 text-xs"
                :class="syncOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
              >
                {{ syncMsg }}
              </div>
            </template>
            <div v-else class="text-muted-foreground-1">Gagal memuat info sistem</div>
          </div>
        </div>

        <div class="rounded-lg border border-card-line bg-card p-4 text-xs text-muted-foreground-1">
          <div class="mb-1"><b class="text-foreground">SiPerPAD</b> — Rekap PAD Lasiana &amp; Kampung Seni</div>
          <div>Dokumen SOP: <code class="rounded bg-surface px-1 py-0.5">docs/SOP_SIPERPAD.md</code></div>
        </div>
      </div>
    </div>

    <AppToast v-model="snack.show" :message="snack.msg" :color="snack.color" :timeout="3000" />
  </div>
</template>

<script setup lang="ts">
import { CloudUpload, LoaderCircle, Settings } from 'lucide-vue-next'

definePageMeta({ layout: 'default', middleware: 'auth' })
const session = useUserSession()
const isAdmin = computed(() => String(session.user.value?.role || '') === 'admin')

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

const counts = computed(() => {
  const c = info.value?.counts || {}
  return [
    { label: 'Users', value: c.users ?? 0 },
    { label: 'Kawasan', value: c.kawasan ?? 0 },
    { label: 'Jenis', value: c.jenis ?? 0 },
    { label: 'Target', value: c.target ?? 0 },
    { label: 'Realisasi', value: c.realisasi ?? 0 },
    { label: 'Batch', value: c.batch ?? 0 },
    { label: 'Audit', value: c.audit ?? 0 },
  ]
})

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
