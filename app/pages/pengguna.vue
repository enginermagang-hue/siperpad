<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <UserCog class="shrink-0 size-9 text-primary" aria-hidden="true" />
        <h1 class="text-2xl font-medium text-foreground">Pengguna</h1>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium
               text-primary-foreground hover:bg-primary-hover focus:outline-hidden focus:bg-primary-focus"
        @click="openAdd"
      >
        <Plus class="shrink-0 size-4" aria-hidden="true" />
        Tambah Pengguna
      </button>
    </div>

    <div class="mb-4 rounded-lg border border-card-line bg-card p-4">
      <div class="relative max-w-[360px]">
        <Search
          class="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground-1"
          aria-hidden="true"
        />
        <input
          v-model="q"
          type="text"
          placeholder="Cari nama / NIP / email..."
          class="w-full rounded-lg border border-layer-line bg-layer py-2 ps-8 pe-3 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
      </div>
    </div>

    <div class="rounded-lg border border-card-line bg-card">
      <div class="flex justify-end px-4 pt-3">
        <ViewModeToggle v-model="mode" />
      </div>

      <!-- Mode tabel -->
      <div v-if="mode === 'table'" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-table-line text-sm">
          <thead>
            <tr class="text-start text-xs uppercase tracking-wide text-muted-foreground-1">
              <th class="px-3 py-2.5 text-start font-medium">Nama</th>
              <th class="px-3 py-2.5 text-start font-medium">NIP</th>
              <th class="px-3 py-2.5 text-start font-medium">Email</th>
              <th class="px-3 py-2.5 text-start font-medium">Role</th>
              <th class="px-3 py-2.5 text-start font-medium">Kawasan</th>
              <th class="px-3 py-2.5 text-start font-medium">Status</th>
              <th class="w-[140px] px-3 py-2.5 text-start font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-table-line">
            <tr v-if="loading">
              <td colspan="7" class="py-6 text-center text-muted-foreground-1">Memuat...</td>
            </tr>
            <tr v-else-if="!filtered.length">
              <td colspan="7" class="py-6 text-center text-muted-foreground-1">Belum ada data</td>
            </tr>
            <tr v-for="r in paginated" v-else :key="r.id" class="hover:bg-layer-hover">
              <td class="px-3 py-2.5 font-medium text-foreground">{{ r.nama }}</td>
              <td class="px-3 py-2.5 text-foreground">{{ r.nip || '-' }}</td>
              <td class="px-3 py-2.5 text-foreground">{{ r.email }}</td>
              <td class="px-3 py-2.5">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="roleChip(r.role)">
                  {{ r.role }}
                </span>
              </td>
              <td class="px-3 py-2.5 text-foreground">
                <span v-if="r.kawasan_nama" class="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs text-surface-foreground">
                  {{ r.kawasan_kode }} - {{ r.kawasan_nama }}
                </span>
                <span v-else class="text-xs text-muted-foreground-1">Semua</span>
              </td>
              <td class="px-3 py-2.5">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="aktifChip(r.aktif)">
                  {{ r.aktif ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td class="px-3 py-2.5">
                <div class="flex items-center gap-0.5">
                  <button
                    type="button"
                    class="rounded-md p-1.5 text-muted-foreground-1 hover:bg-layer-hover focus:outline-hidden
                           disabled:opacity-40 disabled:pointer-events-none"
                    :disabled="r.id === selfId"
                    aria-label="Edit"
                    @click="openEdit(r)"
                  >
                    <Pencil class="shrink-0 size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    class="rounded-md p-1.5 text-red-600 hover:bg-layer-hover focus:outline-hidden
                           disabled:opacity-40 disabled:pointer-events-none dark:text-red-400"
                    :disabled="r.id === selfId"
                    aria-label="Nonaktifkan"
                    @click="confirmDelete(r)"
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
      <div v-else-if="mode === 'list'" class="p-3">
        <div v-if="loading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
        <div v-else-if="!filtered.length" class="py-6 text-center text-muted-foreground-1">Belum ada data</div>
        <RecordCard
          v-for="r in paginated"
          v-else
          :key="r.id"
          :title="r.nama"
          :subtitle="r.email"
          :fields="[
            { label: 'NIP', value: r.nip || '-' },
            { label: 'Email', value: r.email },
            { label: 'Kawasan', value: r.kawasan_nama ? `${r.kawasan_kode} - ${r.kawasan_nama}` : 'Semua kawasan' },
          ]"
        >
          <template #badge>
            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="roleChip(r.role)">
              {{ r.role }}
            </span>
            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="aktifChip(r.aktif)">
              {{ r.aktif ? 'Aktif' : 'Nonaktif' }}
            </span>
          </template>
          <template #actions>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-layer-hover
                     focus:outline-hidden disabled:opacity-40 disabled:pointer-events-none"
              :disabled="r.id === selfId"
              @click="openEdit(r)"
            >
              <Pencil class="shrink-0 size-3.5" aria-hidden="true" /> Edit
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-layer-hover
                     focus:outline-hidden disabled:opacity-40 disabled:pointer-events-none dark:text-red-400"
              :disabled="r.id === selfId"
              @click="confirmDelete(r)"
            >
              <Trash2 class="shrink-0 size-3.5" aria-hidden="true" /> Nonaktifkan
            </button>
          </template>
        </RecordCard>
      </div>

      <!-- Mode compact -->
      <div v-else class="p-2">
        <div v-if="loading" class="py-6 text-center text-muted-foreground-1">Memuat...</div>
        <div v-else-if="!filtered.length" class="py-6 text-center text-muted-foreground-1">Belum ada data</div>
        <ul v-else class="divide-y divide-table-line">
          <li v-for="r in paginated" :key="r.id" class="flex items-center gap-2 py-2">
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm text-foreground">{{ r.nama }}</span>
              <span class="block truncate text-xs text-muted-foreground-1">{{ r.email }}</span>
            </span>
            <span class="shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium" :class="roleChip(r.role)">
              {{ r.role }}
            </span>
            <AppMenu
              :items="[
                { label: 'Edit', icon: Pencil, disabled: r.id === selfId, onClick: () => openEdit(r) },
                { label: 'Nonaktifkan', icon: Trash2, variant: 'danger', disabled: r.id === selfId, onClick: () => confirmDelete(r) },
              ]"
            />
          </li>
        </ul>
      </div>

      <hr v-if="total" class="border-card-divider" />
      <div v-if="total" class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div class="flex items-center gap-2 text-sm text-muted-foreground-1">
          <span>Menampilkan {{ from }}–{{ to }} dari {{ total }}</span>
          <div class="w-[90px]"><AppSelect v-model="perPage" :items="[5, 10, 25, 50]" :search="false" /></div>
          <span>per halaman</span>
        </div>
        <AppPagination v-model="currentPage" :length="pageCount" :total-visible="5" />
      </div>
    </div>

    <!-- Dialog tambah/edit -->
    <AppDialog
      v-model="dialog"
      :title="editing ? 'Edit Pengguna' : 'Tambah Pengguna'"
      :max-width="520"
      :icon="editing ? UserPen : UserPlus"
    >
      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Nama *</label>
        <input
          v-model="form.nama"
          type="text"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
        <p v-if="err.nama" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.nama }}</p>
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">NIP</label>
        <input
          v-model="form.nip"
          type="text"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Email *</label>
        <input
          v-model="form.email"
          type="email"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
        <p v-if="err.email" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.email }}</p>
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Role *</label>
        <AppSelect
          v-model="form.role"
          :items="roleOpts"
          :search="false"
          in-modal
        />
        <p v-if="err.role" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.role }}</p>
      </div>

      <div v-if="isPetugas" class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">Kawasan Penugasan</label>
        <AppSelect
          v-model="form.kawasan_id"
          :items="kawasanOpts"
          placeholder="Semua kawasan (bebas)"
          clearable
          in-modal
        />
        <p class="mt-1 text-xs text-muted-foreground-1">
          Petugas hanya dapat menginput &amp; mengajukan realisasi pada kawasan ini. Kosongkan bila petugas boleh mengakses semua kawasan.
        </p>
      </div>

      <div class="mb-2">
        <label class="mb-1.5 block text-sm font-medium text-foreground">
          {{ editing ? 'Password baru (kosongkan jika tidak ganti)' : 'Password *' }}
        </label>
        <input
          v-model="form.password"
          type="password"
          class="w-full rounded-lg border border-layer-line bg-layer px-3 py-2 text-sm text-layer-foreground
                 focus:border-primary-focus focus:ring-primary-focus"
        />
        <p v-if="err.password" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ err.password }}</p>
      </div>

      <label class="inline-flex cursor-pointer items-center gap-2">
        <span class="relative inline-block h-5 w-9">
          <input v-model="form.aktif" type="checkbox" class="peer sr-only" />
          <span class="absolute inset-0 rounded-full bg-line-4 transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary-focus"></span>
          <span class="absolute start-0.5 top-0.5 size-4 rounded-full bg-white transition-transform peer-checked:translate-x-4"></span>
        </span>
        <span class="text-sm text-foreground">Aktif</span>
      </label>

      <template #actions>
        <button
          type="button"
          class="rounded-lg px-3 py-2 text-sm text-foreground hover:bg-layer-hover focus:outline-hidden"
          @click="dialog = false"
        >
          Batal
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium
                 text-primary-foreground hover:bg-primary-hover focus:outline-hidden
                 disabled:opacity-50 disabled:pointer-events-none"
          :disabled="saving"
          @click="save"
        >
          <LoaderCircle v-if="saving" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
          Simpan
        </button>
      </template>
    </AppDialog>

    <!-- Dialog nonaktifkan -->
    <AppDialog v-model="delDialog" title="Nonaktifkan pengguna?" :max-width="420" :icon="UserX">
      Yakin nonaktifkan <b>{{ delTarget?.nama }}</b> ({{ delTarget?.email }})? Status jadi Nonaktif (soft delete).
      <template #actions>
        <button
          type="button"
          class="rounded-lg px-3 py-2 text-sm text-foreground hover:bg-layer-hover focus:outline-hidden"
          @click="delDialog = false"
        >
          Batal
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white
                 hover:bg-amber-700 focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none"
          :disabled="deleting"
          @click="doDelete"
        >
          <LoaderCircle v-if="deleting" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
          Nonaktifkan
        </button>
      </template>
    </AppDialog>

    <AppToast v-model="snack.show" :message="snack.msg" :color="snack.color" :timeout="3000" />
  </div>
</template>

<script setup lang="ts">
import { LoaderCircle, Pencil, Plus, Search, Trash2, UserCog, UserPen, UserPlus, UserX } from 'lucide-vue-next'

definePageMeta({ layout: 'default', middleware: 'auth' })
type Row = { id: number; nama: string; nip: string; email: string; role: string; kawasan_id: number | null; kawasan_kode: string | null; kawasan_nama: string | null; aktif: number; created_at: string }
type Kawasan = { id: number; kode: string; nama: string }

const { mode } = useViewMode('pengguna')

const session = useUserSession()
const selfId = computed(() => Number(session.user.value?.id || 0))

const roleOpts = [
  { label: 'user - Petugas Input', value: 'user' },
  { label: 'admin - Administrator', value: 'admin' },
  { label: 'kepala - Pimpinan (Kasubag Keuangan)', value: 'kepala' },
]

// Penugasan kawasan hanya relevan untuk role Petugas Input.
const kawasanList = ref<Kawasan[]>([])
const kawasanOpts = computed(() => kawasanList.value.map((k) => ({ label: `${k.kode} - ${k.nama}`, value: k.id })))
const isPetugas = computed(() => form.role === 'user')

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
const form = reactive({ nama: '', nip: '', email: '', role: 'user' as string, kawasan_id: null as number | null, password: '', aktif: true })
const err = reactive({ nama: '', email: '', role: '', password: '' })
const delDialog = ref(false)
const delTarget = ref<Row | null>(null)
const deleting = ref(false)
const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' | 'warning' })
function toast(msg: string, color: typeof snack.color = 'success') { snack.msg = msg; snack.color = color; snack.show = true }

function roleChip(r: string) {
  if (r === 'admin') return 'bg-primary/10 text-primary'
  if (r === 'kepala') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
  return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
}
function aktifChip(aktif: number) {
  return aktif
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
    : 'bg-surface text-surface-foreground'
}

async function load() {
  loading.value = true
  try { const r = await $fetch<{ data: Row[] }>('/api/users'); rows.value = r.data } catch (e: unknown) { toast((e as { data?: { message?: string } })?.data?.message || 'Gagal memuat', 'error') }
  finally { loading.value = false }
}
async function loadKawasan() {
  try { const r = await $fetch<{ data: Kawasan[] }>('/api/kawasan'); kawasanList.value = r.data } catch {}
}
function openAdd() {
  editing.value = null
  form.nama = ''; form.nip = ''; form.email = ''; form.role = 'user'; form.kawasan_id = null; form.password = ''; form.aktif = true
  err.nama = ''; err.email = ''; err.role = ''; err.password = ''
  dialog.value = true
}
function openEdit(r: Row) {
  editing.value = r
  form.nama = r.nama; form.nip = r.nip || ''; form.email = r.email; form.role = r.role; form.kawasan_id = r.kawasan_id ?? null; form.password = ''; form.aktif = !!r.aktif
  err.nama = ''; err.email = ''; err.role = ''; err.password = ''
  dialog.value = true
}
function confirmDelete(r: Row) { delTarget.value = r; delDialog.value = true }

async function save() {
  err.nama = ''; err.email = ''; err.role = ''; err.password = ''
  if (!form.nama.trim()) err.nama = 'Nama wajib'
  if (!form.email.trim()) err.email = 'Email wajib'
  if (!['user','admin','kepala'].includes(form.role)) err.role = 'Role tidak valid'
  if (!editing.value && (!form.password || form.password.length < 6)) err.password = 'Password minimal 6 karakter'
  if (editing.value && form.password && form.password.length < 6) err.password = 'Password minimal 6 karakter'
  if (err.nama || err.email || err.role || err.password) return
  saving.value = true
  try {
    const body: Record<string, unknown> = { nama: form.nama.trim(), nip: form.nip.trim(), email: form.email.trim(), role: form.role, aktif: form.aktif ? 1 : 0, kawasan_id: form.role === 'user' ? form.kawasan_id : null }
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

onMounted(async () => { await loadKawasan(); await load() })
</script>
