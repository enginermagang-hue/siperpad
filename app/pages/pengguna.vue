<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div class="d-flex align-center">
        <v-icon size="36" color="primary" class="mr-3">mdi-account-cog</v-icon>
        <h1 class="text-h4 font-weight-medium">Pengguna</h1>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openAdd">Tambah Pengguna</v-btn>
    </div>

    <v-card flat elevation="0" class="mb-4">
      <v-card-text class="pb-0">
        <v-text-field v-model="q" density="compact" variant="outlined" placeholder="Cari nama / NIP / email..." prepend-inner-icon="mdi-magnify" hide-details clearable style="max-width: 360px" class="mb-4" />
      </v-card-text>
    </v-card>

    <v-card flat elevation="0">
      <v-table density="default">
        <thead><tr><th>Nama</th><th>NIP</th><th>Email</th><th>Role</th><th>Status</th><th style="width: 140px">Aksi</th></tr></thead>
        <tbody>
          <tr v-if="loading"><td colspan="6" class="text-center py-6">Memuat...</td></tr>
          <tr v-else-if="!filtered.length"><td colspan="6" class="text-center py-6 text-medium-emphasis">Belum ada data</td></tr>
          <tr v-for="r in paginated" :key="r.id">
            <td class="font-weight-medium">{{ r.nama }}</td>
            <td>{{ r.nip || '-' }}</td>
            <td>{{ r.email }}</td>
            <td><v-chip size="small" :color="roleColor(r.role)" variant="tonal">{{ r.role }}</v-chip></td>
            <td><v-chip :color="r.aktif ? 'success' : 'grey'" size="small">{{ r.aktif ? 'Aktif' : 'Nonaktif' }}</v-chip></td>
            <td>
              <v-btn icon="mdi-pencil" variant="text" size="small" :disabled="r.id === selfId" @click="openEdit(r)" />
              <v-btn icon="mdi-delete" variant="text" size="small" color="error" :disabled="r.id === selfId" @click="confirmDelete(r)" />
            </td>
          </tr>
        </tbody>
      </v-table>
      <v-divider v-if="total" />
      <div v-if="total" class="d-flex align-center justify-space-between flex-wrap ga-3 px-4 py-3">
        <div class="d-flex align-center ga-2 text-body-2 text-medium-emphasis">
          <span>Menampilkan {{ from }}–{{ to }} dari {{ total }}</span>
          <v-select v-model="perPage" :items="[5, 10, 25, 50]" density="compact" variant="outlined" hide-details style="max-width: 90px" />
          <span>per halaman</span>
        </div>
        <v-pagination v-if="pageCount > 1" v-model="currentPage" :length="pageCount" :total-visible="5" density="compact" />
      </div>
    </v-card>

    <v-dialog v-model="dialog" max-width="520" persistent>
      <v-card elevation="2" :border="false">
        <v-card-title class="text-h6">{{ editing ? 'Edit Pengguna' : 'Tambah Pengguna' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.nama" label="Nama *" variant="outlined" density="compact" :error-messages="err.nama" class="mb-2" />
          <v-text-field v-model="form.nip" label="NIP" variant="outlined" density="compact" hide-details class="mb-2" />
          <v-text-field v-model="form.email" label="Email *" variant="outlined" density="compact" :error-messages="err.email" class="mb-2" />
          <v-select v-model="form.role" :items="['admin','verifikator','kepala']" label="Role *" variant="outlined" density="compact" :error-messages="err.role" class="mb-2" />
          <v-text-field v-model="form.password" :label="editing ? 'Password baru (kosongkan jika tidak ganti)' : 'Password *'" type="password" variant="outlined" density="compact" :error-messages="err.password" class="mb-2" />
          <v-switch v-model="form.aktif" label="Aktif" color="primary" hide-details />
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="dialog = false">Batal</v-btn><v-btn color="primary" :loading="saving" @click="save">Simpan</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="delDialog" max-width="420" persistent>
      <v-card elevation="2" :border="false">
        <v-card-title class="text-h6">Nonaktifkan pengguna?</v-card-title>
        <v-card-text>Yakin nonaktifkan <b>{{ delTarget?.nama }}</b> ({{ delTarget?.email }})? Status jadi Nonaktif (soft delete).</v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="delDialog = false">Batal</v-btn><v-btn color="warning" :loading="deleting" @click="doDelete">Nonaktifkan</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.show" :color="snack.color" timeout="3000">{{ snack.msg }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })
type Row = { id: number; nama: string; nip: string; email: string; role: string; aktif: number; created_at: string }

const session = useUserSession()
const selfId = computed(() => Number(session.user.value?.id || 0))

const rows = ref<Row[]>([])
const loading = ref(false)
const q = ref('')
const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return rows.value
  return rows.value.filter((r) => r.nama.toLowerCase().includes(s) || (r.nip || '').toLowerCase().includes(s) || r.email.toLowerCase().includes(s) || r.role.toLowerCase().includes(s))
})
const currentPage = ref(1)
const perPage = ref(10)
const total = computed(() => filtered.value.length)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const from = computed(() => total.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1)
const to = computed(() => Math.min(currentPage.value * perPage.value, total.value))
const paginated = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  return filtered.value.slice(start, start + perPage.value)
})
watch([q], () => { currentPage.value = 1 })
watch(perPage, () => { currentPage.value = 1 })
watch(pageCount, (pc) => { if (currentPage.value > pc) currentPage.value = pc })

const dialog = ref(false)
const editing = ref<Row | null>(null)
const saving = ref(false)
const form = reactive({ nama: '', nip: '', email: '', role: 'admin' as string, password: '', aktif: true })
const err = reactive({ nama: '', email: '', role: '', password: '' })
const delDialog = ref(false)
const delTarget = ref<Row | null>(null)
const deleting = ref(false)
const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' | 'warning' })
function toast(msg: string, color: typeof snack.color = 'success') { snack.msg = msg; snack.color = color; snack.show = true }
function roleColor(r: string) { if (r === 'admin') return 'primary'; if (r === 'verifikator') return 'warning'; return 'success' }

async function load() {
  loading.value = true
  try { const r = await $fetch<{ data: Row[] }>('/api/users'); rows.value = r.data } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat', 'error') }
  finally { loading.value = false }
}
function openAdd() {
  editing.value = null
  form.nama = ''; form.nip = ''; form.email = ''; form.role = 'admin'; form.password = ''; form.aktif = true
  err.nama = ''; err.email = ''; err.role = ''; err.password = ''
  dialog.value = true
}
function openEdit(r: Row) {
  editing.value = r
  form.nama = r.nama; form.nip = r.nip || ''; form.email = r.email; form.role = r.role; form.password = ''; form.aktif = !!r.aktif
  err.nama = ''; err.email = ''; err.role = ''; err.password = ''
  dialog.value = true
}
function confirmDelete(r: Row) { delTarget.value = r; delDialog.value = true }

async function save() {
  err.nama = ''; err.email = ''; err.role = ''; err.password = ''
  if (!form.nama.trim()) err.nama = 'Nama wajib'
  if (!form.email.trim()) err.email = 'Email wajib'
  if (!['admin','verifikator','kepala'].includes(form.role)) err.role = 'Role tidak valid'
  if (!editing.value && (!form.password || form.password.length < 6)) err.password = 'Password minimal 6 karakter'
  if (editing.value && form.password && form.password.length < 6) err.password = 'Password minimal 6 karakter'
  if (err.nama || err.email || err.role || err.password) return
  saving.value = true
  try {
    const body: Record<string, unknown> = { nama: form.nama.trim(), nip: form.nip.trim(), email: form.email.trim(), role: form.role, aktif: form.aktif ? 1 : 0 }
    if (form.password) body.password = form.password
    if (editing.value) {
      await $fetch(`/api/users/${editing.value.id}`, { method: 'PUT', body })
      toast('Pengguna diperbarui')
    } else {
      if (!form.password) throw new Error('Password wajib')
      body.password = form.password
      await $fetch('/api/users', { method: 'POST', body })
      toast('Pengguna ditambahkan')
    }
    dialog.value = false
    await load()
  } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error') }
  finally { saving.value = false }
}
async function doDelete() {
  if (!delTarget.value) return
  deleting.value = true
  try { await $fetch(`/api/users/${delTarget.value.id}`, { method: 'DELETE' }); toast('Pengguna dinonaktifkan', 'warning'); delDialog.value = false; await load() } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || String(e), 'error') }
  finally { deleting.value = false }
}

onMounted(load)
</script>
