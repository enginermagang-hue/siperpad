<template>
  <div class="min-h-screen bg-background-1 text-foreground">
    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 start-0 z-40 w-[272px] flex flex-col bg-[#1a2332] text-slate-300
             transition-transform duration-200 ease-out"
      :class="mdAndUp || drawer ? 'translate-x-0' : '-translate-x-full'"
    >
      <!-- Branding -->
      <div class="flex items-center gap-2.5 px-3 min-h-[72px]">
        <img src="/ntt.png" width="44" height="44" alt="Logo NTT" class="shrink-0 rounded-md" />
        <div class="leading-tight">
          <div class="text-[11px] font-bold tracking-wide text-white">DINAS PARIWISATA DAN</div>
          <div class="text-[11px] font-bold tracking-wide text-white">EKONOMI KREATIF</div>
          <div class="text-[11px] font-bold tracking-wide text-white">PROVINSI NTT</div>
          <div class="text-[10px] text-white/70">PAD Lasiana &amp; Kampung Seni</div>
        </div>
      </div>
      <hr class="border-white/20" />

      <!--
        Div ini adalah container scroll sidebar. OverlayScrollbars memaksa
        `display:flex` pada host-nya, jadi container ini sudah `flex flex-col`
        agar hasilnya tetap sesuai (item sidebar bertumpuk vertikal).
      -->
      <div class="flex-1 flex flex-col overflow-y-auto py-2">
        <nav aria-label="Menu utama">
        <!-- Dashboard -->
        <NuxtLink
          to="/"
          class="flex items-center gap-3 px-3 py-2.5 mx-2 mb-1 rounded-lg text-sm
                 hover:bg-white/10 focus:outline-hidden"
          :class="route.path === '/' ? 'bg-primary text-white font-medium' : ''"
        >
          <House class="shrink-0 size-[18px]" aria-hidden="true" />
          <span>Dashboard</span>
        </NuxtLink>

        <!-- Data PAD (admin/kepala) / Input Realisasi (user) -->
        <div class="mb-1">
          <button
            type="button"
            class="w-full flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm text-start
                   hover:bg-white/10 focus:outline-hidden"
            :aria-expanded="openGroups.input"
            @click="toggleGroup('input')"
          >
            <FileText class="shrink-0 size-[18px]" aria-hidden="true" />
            <span class="flex-1">{{ isUser ? 'Input Realisasi' : 'Data PAD' }}</span>
            <ChevronDown
              class="shrink-0 size-4 transition-transform"
              :class="openGroups.input ? 'rotate-180' : ''"
              aria-hidden="true"
            />
          </button>
          <div v-show="openGroups.input" class="mt-0.5">
            <NuxtLink
              to="/entri-mingguan"
              class="block py-2 ps-10 pe-3 me-2 ms-6 mb-0.5 rounded-e-md border-s border-white/15 text-[13px]
                     opacity-90 hover:bg-white/10 focus:outline-hidden"
              :class="route.path.startsWith('/entri-mingguan') ? 'bg-primary/90 text-white' : ''"
            >
              Entri Mingguan
            </NuxtLink>
            <NuxtLink
              to="/pad"
              class="block py-2 ps-10 pe-3 me-2 ms-6 mb-0.5 rounded-e-md border-s border-white/15 text-[13px]
                     opacity-90 hover:bg-white/10 focus:outline-hidden"
              :class="route.path === '/pad' ? 'bg-primary/90 text-white' : ''"
            >
              Riwayat Transaksi
            </NuxtLink>
          </div>
        </div>

        <!-- Verifikasi (admin/kepala) -->
        <div v-if="isAdmin || isKepala" class="mb-1">
          <button
            type="button"
            class="w-full flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm text-start
                   hover:bg-white/10 focus:outline-hidden"
            :aria-expanded="openGroups.verifikasi"
            @click="toggleGroup('verifikasi')"
          >
            <ClipboardCheck class="shrink-0 size-[18px]" aria-hidden="true" />
            <span class="flex-1">Verifikasi</span>
            <ChevronDown
              class="shrink-0 size-4 transition-transform"
              :class="openGroups.verifikasi ? 'rotate-180' : ''"
              aria-hidden="true"
            />
          </button>
          <div v-show="openGroups.verifikasi" class="mt-0.5">
            <NuxtLink
              v-for="l in verifikasiLinks"
              :key="l.to"
              :to="l.to"
              class="block py-2 ps-10 pe-3 me-2 ms-6 mb-0.5 rounded-e-md border-s border-white/15 text-[13px]
                     opacity-90 hover:bg-white/10 focus:outline-hidden"
              :class="route.path.startsWith(l.to) ? 'bg-primary/90 text-white' : ''"
            >
              {{ l.label }}
            </NuxtLink>
          </div>
        </div>

        <!-- Pengajuan Batch (user) -->
        <NuxtLink
          v-if="isUser"
          to="/verifikasi/batch"
          class="flex items-center gap-3 px-3 py-2.5 mx-2 mb-1 rounded-lg text-sm
                 hover:bg-white/10 focus:outline-hidden"
          :class="route.path.startsWith('/verifikasi/batch') ? 'bg-primary text-white font-medium' : ''"
        >
          <Send class="shrink-0 size-[18px]" aria-hidden="true" />
          <span>Pengajuan Batch</span>
        </NuxtLink>

        <!-- Data Master (admin) -->
        <div v-if="isAdmin" class="mb-1">
          <button
            type="button"
            class="w-full flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm text-start
                   hover:bg-white/10 focus:outline-hidden"
            :aria-expanded="openGroups.master"
            @click="toggleGroup('master')"
          >
            <Folder class="shrink-0 size-[18px]" aria-hidden="true" />
            <span class="flex-1">Data Master (Katalog)</span>
            <ChevronDown
              class="shrink-0 size-4 transition-transform"
              :class="openGroups.master ? 'rotate-180' : ''"
              aria-hidden="true"
            />
          </button>
          <div v-show="openGroups.master" class="mt-0.5">
            <NuxtLink
              v-for="l in masterLinks"
              :key="l.to"
              :to="l.to"
              class="block py-2 ps-10 pe-3 me-2 ms-6 mb-0.5 rounded-e-md border-s border-white/15 text-[13px]
                     opacity-90 hover:bg-white/10 focus:outline-hidden"
              :class="route.path.startsWith(l.to) ? 'bg-primary/90 text-white' : ''"
            >
              {{ l.label }}
            </NuxtLink>
          </div>
        </div>

        <!-- Rekap & Laporan -->
        <NuxtLink
          to="/laporan"
          class="flex items-center gap-3 px-3 py-2.5 mx-2 mb-1 rounded-lg text-sm
                 hover:bg-white/10 focus:outline-hidden"
          :class="route.path.startsWith('/laporan') ? 'bg-primary text-white font-medium' : ''"
        >
          <FileChartColumn class="shrink-0 size-[18px]" aria-hidden="true" />
          <span>Rekap &amp; Laporan</span>
        </NuxtLink>

        <!-- Pengaturan Sistem -->
        <div>
          <button
            type="button"
            class="w-full flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm text-start
                   hover:bg-white/10 focus:outline-hidden"
            :aria-expanded="openGroups.pengaturan"
            @click="toggleGroup('pengaturan')"
          >
            <Settings class="shrink-0 size-[18px]" aria-hidden="true" />
            <span class="flex-1">Pengaturan Sistem</span>
            <ChevronDown
              class="shrink-0 size-4 transition-transform"
              :class="openGroups.pengaturan ? 'rotate-180' : ''"
              aria-hidden="true"
            />
          </button>
          <div v-show="openGroups.pengaturan" class="mt-0.5">
            <NuxtLink
              to="/settings"
              class="block py-2 ps-10 pe-3 me-2 ms-6 mb-0.5 rounded-e-md border-s border-white/15 text-[13px]
                     opacity-90 hover:bg-white/10 focus:outline-hidden"
              :class="route.path.startsWith('/settings') ? 'bg-primary/90 text-white' : ''"
            >
              Pengaturan
            </NuxtLink>
            <NuxtLink
              v-if="isAdmin"
              to="/pengguna"
              class="block py-2 ps-10 pe-3 me-2 ms-6 mb-0.5 rounded-e-md border-s border-white/15 text-[13px]
                     opacity-90 hover:bg-white/10 focus:outline-hidden"
              :class="route.path.startsWith('/pengguna') ? 'bg-primary/90 text-white' : ''"
            >
              Pengguna
            </NuxtLink>
          </div>
        </div>
        </nav>
      </div>
    </aside>

    <!-- Overlay sidebar (mobile) -->
    <div
      v-if="!mdAndUp && drawer"
      class="fixed inset-0 z-30 bg-neutral-900/50"
      aria-hidden="true"
      @click="drawer = false"
    />

    <!-- Konten -->
    <div class="transition-[padding] duration-200" :class="mdAndUp ? 'ps-[272px]' : ''">
      <header
        class="sticky top-0 z-20 flex items-center gap-2 h-16 px-4 bg-navbar border-b border-navbar-line"
      >
        <button
          type="button"
          class="p-2 rounded-lg text-foreground hover:bg-layer-hover focus:outline-hidden focus:bg-layer-focus"
          aria-label="Buka/tutup menu"
          @click="drawer = !drawer"
        >
          <Menu class="shrink-0 size-5" aria-hidden="true" />
        </button>

        <div class="ms-auto flex items-center gap-1">
          <!-- Panel Notifikasi -->
          <AppMenu
            placement="bottom-end"
            auto-close="outside"
            aria-label="Notifikasi"
            toggle-class="relative p-2"
            menu-class="min-w-[320px] max-w-[380px]"
            @open="loadNotif()"
          >
            <template #toggle>
              <Bell class="shrink-0 size-5" aria-hidden="true" />
              <span
                v-if="notifPending"
                class="absolute -top-0.5 -end-0.5 inline-flex items-center justify-center min-w-4 h-4 px-1
                       rounded-full bg-red-600 text-white text-[10px] font-bold leading-none"
              >
                {{ notifPending }}
              </span>
            </template>

            <template #content>
              <div class="flex items-center px-3 py-2.5 border-b border-dropdown-divider">
                <span class="text-sm font-semibold text-foreground">Notifikasi</span>
                <button
                  type="button"
                  class="ms-auto p-1 rounded-md text-muted-foreground-1 hover:bg-dropdown-item-hover
                         focus:outline-hidden"
                  :disabled="notifLoading"
                  aria-label="Muat ulang notifikasi"
                  @click="loadNotif(true)"
                >
                  <RefreshCw class="shrink-0 size-3.5" :class="notifLoading ? 'animate-spin' : ''" aria-hidden="true" />
                </button>
              </div>

              <div v-if="notifItems.length" class="py-1">
                <NuxtLink
                  v-for="item in notifItems"
                  :key="item.key"
                  :to="item.to"
                  class="hs-dropdown-close flex items-start gap-2.5 px-3 py-2 rounded-lg
                         hover:bg-dropdown-item-hover focus:outline-hidden focus:bg-dropdown-item-focus"
                >
                  <component :is="item.icon" class="shrink-0 size-4 mt-0.5 text-muted-foreground-1" aria-hidden="true" />
                  <span class="flex-1 min-w-0">
                    <span class="block text-sm font-medium text-foreground">{{ item.title }}</span>
                    <span class="block text-xs text-muted-foreground-1">{{ item.subtitle }}</span>
                  </span>
                  <span
                    class="shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium"
                    :class="item.chipClass"
                  >
                    {{ item.count }}
                  </span>
                </NuxtLink>
              </div>
              <div v-else class="py-6 text-center text-xs text-muted-foreground-1">
                {{ notifLoading ? 'Memuat…' : 'Tidak ada notifikasi' }}
              </div>
            </template>
          </AppMenu>

          <!-- Chip tahun anggaran -->
          <span
            class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold
                   bg-primary/10 text-primary me-1"
          >
            T.A. {{ tahun }}
          </span>

          <!-- User Menu -->
          <AppMenu
            placement="bottom-end"
            aria-label="Menu pengguna"
            toggle-class="gap-2 p-1 rounded-lg"
            menu-class="min-w-[260px]"
          >
            <template #toggle>
              <span class="inline-flex items-center justify-center size-8 rounded-full bg-surface text-surface-foreground">
                <User class="shrink-0 size-4" aria-hidden="true" />
              </span>
              <span class="hidden sm:block text-start leading-tight">
                <span class="block text-sm font-medium text-foreground">{{ userName }}</span>
                <span class="block text-xs text-muted-foreground-1">{{ roleLabel || '—' }}</span>
              </span>
              <ChevronDown class="hidden sm:block shrink-0 size-4 text-muted-foreground-1" aria-hidden="true" />
            </template>

            <template #content>
              <div class="flex items-center gap-3 px-3 py-3 border-b border-dropdown-divider">
                <span class="inline-flex items-center justify-center size-11 rounded-full bg-primary text-primary-foreground">
                  <User class="shrink-0 size-5" aria-hidden="true" />
                </span>
                <span class="leading-tight min-w-0">
                  <span class="block text-sm font-medium text-foreground truncate">{{ userName }}</span>
                  <span class="block text-xs text-muted-foreground-1">{{ roleLabel || '—' }}</span>
                </span>
              </div>

              <div class="py-1">
                <NuxtLink
                  to="/settings"
                  class="hs-dropdown-close flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                         text-dropdown-item-foreground hover:bg-dropdown-item-hover focus:outline-hidden"
                >
                  <UserCog class="shrink-0 size-4" aria-hidden="true" />
                  Profil / Pengaturan
                </NuxtLink>
                <NuxtLink
                  to="/settings#password"
                  class="hs-dropdown-close flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                         text-dropdown-item-foreground hover:bg-dropdown-item-hover focus:outline-hidden"
                >
                  <Lock class="shrink-0 size-4" aria-hidden="true" />
                  Ganti Password
                </NuxtLink>
                <button
                  type="button"
                  class="hs-dropdown-close w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-start
                         text-dropdown-item-foreground hover:bg-dropdown-item-hover focus:outline-hidden"
                  @click="toggleDark"
                >
                  <component :is="isDark ? Sun : Moon" class="shrink-0 size-4" aria-hidden="true" />
                  {{ isDark ? 'Mode Terang' : 'Mode Gelap' }}
                </button>
              </div>

              <hr class="border-dropdown-divider" />

              <div class="py-1">
                <button
                  type="button"
                  class="hs-dropdown-close w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-start
                         text-red-600 dark:text-red-400 hover:bg-dropdown-item-hover focus:outline-hidden"
                  @click="handleLogout"
                >
                  <LogOut class="shrink-0 size-4" aria-hidden="true" />
                  Keluar
                </button>
              </div>
            </template>
          </AppMenu>
        </div>
      </header>

      <main class="min-h-[calc(100vh-4rem)]">
        <div class="p-6">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Bell,
  ChevronDown,
  ClipboardCheck,
  FileChartColumn,
  FileCheck,
  FileClock,
  FileText,
  Folder,
  House,
  Lock,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Send,
  Settings,
  Sun,
  TriangleAlert,
  User,
  UserCog,
  ClipboardList,
} from 'lucide-vue-next'

const route = useRoute()
const { mdAndUp } = useBreakpoint()
const { isDark, toggle: toggleDark } = useTheme()
const session = useUserSession()
const router = useRouter()

const drawer = ref(true)

// shared tahun for T.A. chip — ikut tahun ref dashboard (useState)
const tahun = useState<number>('tahun', () => new Date().getFullYear())

// Grup sidebar yang terbuka (state Vue menggantikan v-list-group).
const openGroups = reactive<Record<string, boolean>>({
  input: true,
  verifikasi: false,
  master: false,
  pengaturan: false,
})
function toggleGroup(key: string) {
  openGroups[key] = !openGroups[key]
}

const verifikasiLinks = computed(() => {
  const links = [
    { to: '/verifikasi', label: 'Realisasi Diajukan' },
    { to: '/verifikasi/batch', label: 'Batch Laporan' },
  ]
  if (isAdmin.value) {
    links.push({ to: '/verifikasi/periode', label: 'Kunci Periode' })
    links.push({ to: '/verifikasi/catatan', label: 'Catatan Temuan' })
  }
  links.push({ to: '/verifikasi/audit', label: 'Audit Trail' })
  return links
})

const masterLinks = [
  { to: '/kawasan-wisata', label: 'Kawasan Wisata (Kampung Seni & Lasiana)' },
  { to: '/jenis-retribusi', label: 'Kategori & Tarif Retribusi' },
  { to: '/master/target', label: 'Target Tahunan PAD' },
]

const { data: notifData, loading: notifLoading, pendingCount: notifPending, fetchNotifications } = useNotifications()

const notifItems = computed(() => {
  const d = notifData.value
  const items: {
    key: string
    title: string
    subtitle: string
    icon: unknown
    chipClass: string
    count: number
    to: string
  }[] = []
  if (d.verifikasi.realisasi > 0) {
    items.push({
      key: 'realisasi',
      title: 'Realisasi menunggu verifikasi',
      subtitle: 'Entri realisasi berstatus diajukan',
      icon: FileCheck,
      chipClass: 'bg-primary/10 text-primary',
      count: d.verifikasi.realisasi,
      to: '/verifikasi',
    })
  }
  if (d.verifikasi.batch > 0) {
    items.push({
      key: 'batch',
      title: 'Laporan menunggu verifikasi',
      subtitle: 'Batch laporan berstatus diajukan',
      icon: FileClock,
      chipClass: 'bg-primary/10 text-primary',
      count: d.verifikasi.batch,
      to: '/verifikasi/batch',
    })
  }
  if (d.anomali > 0) {
    items.push({
      key: 'anomali',
      title: 'Anomali target PAD',
      subtitle: `Target induk ≠ jumlah anak (T.A. ${d.tahun})`,
      icon: TriangleAlert,
      chipClass: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
      count: d.anomali,
      to: '/master/target',
    })
  }
  if (d.temuan > 0) {
    items.push({
      key: 'temuan',
      title: 'Temuan belum selesai',
      subtitle: 'Catatan temuan berstatus terbuka',
      icon: ClipboardList,
      chipClass: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
      count: d.temuan,
      to: '/verifikasi/catatan',
    })
  }
  return items
})

function loadNotif(force = false) {
  return fetchNotifications(force)
}

onMounted(() => loadNotif())

const isAdmin = computed(() => String(session.user.value?.role || '') === 'admin')
const isUser = computed(() => String(session.user.value?.role || '') === 'user')
const isKepala = computed(() => String(session.user.value?.role || '') === 'kepala')
const userName = computed(() => String(session.user.value?.nama || 'Pengguna'))
const roleLabel = computed(() => {
  const r = String(session.user.value?.role || '')
  if (r === 'user') return 'Petugas Input'
  if (r === 'admin') return 'Administrator'
  if (r === 'kepala') return 'Kepala'
  return ''
})

// Tutup drawer otomatis setelah navigasi di mobile.
watch(
  () => route.fullPath,
  () => {
    if (!mdAndUp.value) drawer.value = false
  },
)

async function handleLogout() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await session.clear()
    await router.push('/login')
  } catch {
    await router.push('/login')
  }
}
</script>
