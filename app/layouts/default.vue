<template>
  <div class="min-h-screen bg-background-1 text-foreground">
    <!-- Sidebar -->
    <!--
      Lebar sidebar dijaga berpasangan dengan padding konten di bawah:
      w-[272px] <-> ps-[272px] (terbuka) dan w-[72px] <-> ps-[72px] (mini rail).
      Varian desktop memakai prefix `md:` (CSS media query), bukan JavaScript,
      supaya SSR dan client merender markup yang sama (tanpa hydration mismatch).
    -->
    <aside
      class="fixed inset-y-0 start-0 z-40 flex flex-col overflow-hidden bg-[#1a2332] text-slate-300
             transition-[width,transform] duration-200 ease-out md:translate-x-0
             md:border-e md:border-white/15"
      :class="[
        drawer ? 'translate-x-0' : '-translate-x-full',
        collapsed ? 'w-[272px] md:w-[72px]' : 'w-[272px]',
      ]"
    >
      <!-- Branding -->
      <!-- Tinggi 72px harus sama dengan <header> (h-[72px]) agar garis pemisah
           sidebar dan navbar sejajar. Border bawah menggantikan <hr> supaya
           ikut terhitung dalam box-sizing: border-box. -->
      <div
        class="flex items-center min-h-[72px] border-b border-white/20"
        :class="isRail ? 'gap-2.5 px-3 md:justify-center md:px-0' : 'gap-2.5 px-3'"
      >
        <img src="/ntt.png" width="44" height="44" alt="Logo NTT" class="shrink-0 rounded-md" />
        <div v-if="!isRail" class="leading-tight">
          <div class="text-[11px] font-bold tracking-wide text-white whitespace-nowrap">DINAS PARIWISATA DAN</div>
          <div class="text-[11px] font-bold tracking-wide text-white whitespace-nowrap">EKONOMI KREATIF</div>
          <div class="text-[11px] font-bold tracking-wide text-white whitespace-nowrap">PROVINSI NTT</div>
          <div class="text-[10px] text-white/70 whitespace-nowrap">PAD Lasiana &amp; Kampung Seni</div>
        </div>
      </div>

      <!--
        Container scroll sidebar (OverlayScrollbars, lihat mountScrollbar di
        script). Stylesheet OS memaksa `display:flex` pada host-nya, jadi
        container ini sudah `flex flex-col` agar item sidebar tetap bertumpuk
        vertikal. `overflow-x-hidden` mencegah track horizontal muncul di mode
        rail 72px.
      -->
      <div
        ref="sidebarScrollEl"
        class="flex-1 flex flex-col overflow-y-auto overflow-x-hidden py-2"
      >
        <nav aria-label="Menu utama">
        <!-- Dashboard -->
        <NuxtLink
          to="/"
          title="Dashboard"
          aria-label="Dashboard"
          class="flex items-center gap-3 px-3 py-2.5 mx-2 mb-1 rounded-lg text-sm
                 hover:bg-white/10 focus:outline-hidden"
          :class="[
            collapsed ? 'md:justify-center md:px-0' : '',
            isActive('/', true) ? 'bg-primary text-white font-medium' : '',
          ]"
        >
          <House class="shrink-0 size-[18px]" aria-hidden="true" />
          <span v-if="!isRail" class="whitespace-nowrap">Dashboard</span>
        </NuxtLink>

        <!-- Data PAD (admin/kepala) / Input Realisasi (user) -->
        <div class="mb-1">
          <button
            type="button"
            :title="isUser ? 'Input Realisasi' : 'Data PAD'"
            :aria-label="isUser ? 'Input Realisasi' : 'Data PAD'"
            class="w-[calc(100%-1rem)] flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm text-start
                   hover:bg-white/10 focus:outline-hidden"
            :class="collapsed ? 'md:justify-center md:px-0' : ''"
            :aria-expanded="openGroups.input"
            @click="toggleGroup('input')"
          >
            <FileText class="shrink-0 size-[18px]" aria-hidden="true" />
            <span v-if="!isRail" class="flex-1 whitespace-nowrap">{{ isUser ? 'Input Realisasi' : 'Data PAD' }}</span>
            <ChevronDown
              v-if="!isRail"
              class="shrink-0 size-4 transition-transform"
              :class="openGroups.input ? 'rotate-180' : ''"
              aria-hidden="true"
            />
          </button>
          <div v-if="!isRail && openGroups.input" class="mt-0.5">
            <NuxtLink
              to="/entri-mingguan"
              class="block py-2 ps-10 pe-3 me-2 ms-6 mb-0.5 rounded-e-md border-s border-white/15 text-[13px]
                     opacity-90 hover:bg-white/10 focus:outline-hidden"
              :class="isActive('/entri-mingguan') ? 'bg-primary/90 text-white' : ''"
            >
              Entri Mingguan
            </NuxtLink>
            <NuxtLink
              to="/pad"
              class="block py-2 ps-10 pe-3 me-2 ms-6 mb-0.5 rounded-e-md border-s border-white/15 text-[13px]
                     opacity-90 hover:bg-white/10 focus:outline-hidden"
              :class="isActive('/pad') ? 'bg-primary/90 text-white' : ''"
            >
              Riwayat Transaksi
            </NuxtLink>
          </div>
        </div>

        <!-- Verifikasi (admin) — pimpinan hanya monitoring, tanpa verifikasi -->
        <div v-if="isAdmin" class="mb-1">
          <button
            type="button"
            title="Verifikasi"
            aria-label="Verifikasi"
            class="w-[calc(100%-1rem)] flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm text-start
                   hover:bg-white/10 focus:outline-hidden"
            :class="collapsed ? 'md:justify-center md:px-0' : ''"
            :aria-expanded="openGroups.verifikasi"
            @click="toggleGroup('verifikasi')"
          >
            <ClipboardCheck class="shrink-0 size-[18px]" aria-hidden="true" />
            <span v-if="!isRail" class="flex-1 whitespace-nowrap">Verifikasi</span>
            <ChevronDown
              v-if="!isRail"
              class="shrink-0 size-4 transition-transform"
              :class="openGroups.verifikasi ? 'rotate-180' : ''"
              aria-hidden="true"
            />
          </button>
          <div v-if="!isRail && openGroups.verifikasi" class="mt-0.5">
            <NuxtLink
              v-for="l in verifikasiLinks"
              :key="l.to"
              :to="l.to"
              class="block py-2 ps-10 pe-3 me-2 ms-6 mb-0.5 rounded-e-md border-s border-white/15 text-[13px]
                     opacity-90 hover:bg-white/10 focus:outline-hidden"
              :class="isActive(l.to, l.to === '/verifikasi') ? 'bg-primary/90 text-white' : ''"
            >
              {{ l.label }}
            </NuxtLink>
          </div>
        </div>

        <!-- Pengajuan Batch (user) -->
        <NuxtLink
          v-if="isUser"
          to="/verifikasi/batch"
          title="Pengajuan Batch"
          aria-label="Pengajuan Batch"
          class="flex items-center gap-3 px-3 py-2.5 mx-2 mb-1 rounded-lg text-sm
                 hover:bg-white/10 focus:outline-hidden"
          :class="[
            collapsed ? 'md:justify-center md:px-0' : '',
            isActive('/verifikasi/batch') ? 'bg-primary text-white font-medium' : '',
          ]"
        >
          <Send class="shrink-0 size-[18px]" aria-hidden="true" />
          <span v-if="!isRail" class="whitespace-nowrap">Pengajuan Batch</span>
        </NuxtLink>

        <!-- Data Master (admin) -->
        <div v-if="isAdmin" class="mb-1">
          <button
            type="button"
            title="Data Master (Katalog)"
            aria-label="Data Master (Katalog)"
            class="w-[calc(100%-1rem)] flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm text-start
                   hover:bg-white/10 focus:outline-hidden"
            :class="collapsed ? 'md:justify-center md:px-0' : ''"
            :aria-expanded="openGroups.master"
            @click="toggleGroup('master')"
          >
            <Folder class="shrink-0 size-[18px]" aria-hidden="true" />
            <span v-if="!isRail" class="flex-1 whitespace-nowrap">Data Master (Katalog)</span>
            <ChevronDown
              v-if="!isRail"
              class="shrink-0 size-4 transition-transform"
              :class="openGroups.master ? 'rotate-180' : ''"
              aria-hidden="true"
            />
          </button>
          <div v-if="!isRail && openGroups.master" class="mt-0.5">
            <NuxtLink
              v-for="l in masterLinks"
              :key="l.to"
              :to="l.to"
              class="block py-2 ps-10 pe-3 me-2 ms-6 mb-0.5 rounded-e-md border-s border-white/15 text-[13px]
                     opacity-90 hover:bg-white/10 focus:outline-hidden"
              :class="isActive(l.to) ? 'bg-primary/90 text-white' : ''"
            >
              {{ l.label }}
            </NuxtLink>
          </div>
        </div>

        <!-- Rekap & Laporan -->
        <NuxtLink
          to="/laporan"
          title="Rekap & Laporan"
          aria-label="Rekap & Laporan"
          class="flex items-center gap-3 px-3 py-2.5 mx-2 mb-1 rounded-lg text-sm
                 hover:bg-white/10 focus:outline-hidden"
          :class="[
            collapsed ? 'md:justify-center md:px-0' : '',
            isActive('/laporan') ? 'bg-primary text-white font-medium' : '',
          ]"
        >
          <FileChartColumn class="shrink-0 size-[18px]" aria-hidden="true" />
          <span v-if="!isRail" class="whitespace-nowrap">Rekap &amp; Laporan</span>
        </NuxtLink>

        <!-- Pengaturan Sistem -->
        <div>
          <button
            type="button"
            title="Pengaturan Sistem"
            aria-label="Pengaturan Sistem"
            class="w-[calc(100%-1rem)] flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm text-start
                   hover:bg-white/10 focus:outline-hidden"
            :class="collapsed ? 'md:justify-center md:px-0' : ''"
            :aria-expanded="openGroups.pengaturan"
            @click="toggleGroup('pengaturan')"
          >
            <Settings class="shrink-0 size-[18px]" aria-hidden="true" />
            <span v-if="!isRail" class="flex-1 whitespace-nowrap">Pengaturan Sistem</span>
            <ChevronDown
              v-if="!isRail"
              class="shrink-0 size-4 transition-transform"
              :class="openGroups.pengaturan ? 'rotate-180' : ''"
              aria-hidden="true"
            />
          </button>
          <div v-if="!isRail && openGroups.pengaturan" class="mt-0.5">
            <NuxtLink
              to="/settings"
              class="block py-2 ps-10 pe-3 me-2 ms-6 mb-0.5 rounded-e-md border-s border-white/15 text-[13px]
                     opacity-90 hover:bg-white/10 focus:outline-hidden"
              :class="isActive('/settings') ? 'bg-primary/90 text-white' : ''"
            >
              Pengaturan
            </NuxtLink>
            <NuxtLink
              v-if="isAdmin"
              to="/pengguna"
              class="block py-2 ps-10 pe-3 me-2 ms-6 mb-0.5 rounded-e-md border-s border-white/15 text-[13px]
                     opacity-90 hover:bg-white/10 focus:outline-hidden"
              :class="isActive('/pengguna') ? 'bg-primary/90 text-white' : ''"
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
      v-if="ready && !mdAndUp && drawer"
      class="fixed inset-0 z-30 bg-neutral-900/50"
      aria-hidden="true"
      @click="drawer = false"
    />

    <!-- Konten -->
    <!-- Padding kiri mengikuti lebar sidebar; memakai varian `md:` agar tidak
         bergantung pada JavaScript saat hydration. -->
    <div
      class="transition-[padding] duration-200"
      :class="collapsed ? 'md:ps-[72px]' : 'md:ps-[272px]'"
    >
      <header
        class="sticky top-0 z-20 flex items-center gap-2 h-[72px] px-4 bg-navbar border-b border-navbar-line"
      >
        <!-- Mobile: buka/tutup drawer (overlay) -->
        <button
          type="button"
          class="md:hidden p-2 rounded-lg text-foreground hover:bg-layer-hover focus:outline-hidden focus:bg-layer-focus"
          aria-label="Buka/tutup menu"
          :aria-expanded="drawer"
          @click="drawer = !drawer"
        >
          <Menu class="shrink-0 size-5" aria-hidden="true" />
        </button>

        <!-- Desktop: perkecil/perluas sidebar (mini rail) -->
        <button
          type="button"
          class="hidden md:inline-flex p-2 rounded-lg text-foreground hover:bg-layer-hover focus:outline-hidden focus:bg-layer-focus"
          :aria-label="collapsed ? 'Perluas menu' : 'Perkecil menu'"
          :aria-expanded="!collapsed"
          @click="collapsed = !collapsed"
        >
          <PanelLeftOpen v-if="collapsed" class="shrink-0 size-5" aria-hidden="true" />
          <PanelLeftClose v-else class="shrink-0 size-5" aria-hidden="true" />
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

      <main class="min-h-[calc(100vh-4.5rem)]">
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
  PanelLeftClose,
  PanelLeftOpen,
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
import type { OverlayScrollbars } from 'overlayscrollbars'
import { mountScrollbar } from '~/utils/scrollbar'

const route = useRoute()
const { mdAndUp } = useBreakpoint()
const { isDark, toggle: toggleDark } = useTheme()
const session = useUserSession()
const router = useRouter()

/**
 * Apakah `href` adalah rute yang sedang aktif.
 *
 * `exact: true` untuk rute yang SEKALIGUS menjadi prefix rute lain — kasusnya
 * `/verifikasi`, yang juga induk dari `/verifikasi/audit`, `/verifikasi/batch`,
 * dst. Tanpa `exact`, item "Realisasi Diajukan" tetap menyala di semua sub-route.
 *
 * Pencocokan non-exact memakai segmen utuh (`href + '/'`), bukan awalan string
 * mentah, supaya `/pad` tidak ikut menyala untuk rute seperti `/pad-history`.
 */
function isActive(href: string, exact = false) {
  const p = route.path
  if (p === href) return true
  if (exact) return false
  return p.startsWith(href + '/')
}

// Mobile: drawer overlay (di bawah breakpoint md).
const drawer = ref(false)

// Desktop: mini rail (ikon saja). Disimpan di cookie agar SSR merender lebar
// yang benar sejak HTML pertama (tanpa flash), mengikuti pola useTheme().
const collapsed = useCookie<boolean>('siperpad-sidebar', {
  default: () => false,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})

// `ready` hanya dipakai untuk ikon/label tombol hamburger: SSR tidak tahu
// lebar viewport sehingga render pertama memakai asumsi desktop. Tata letak
// sendiri memakai kelas `md:` (CSS) agar bebas hydration mismatch.
const ready = ref(false)
onMounted(() => {
  ready.value = true
})

const isRail = computed(() => ready.value && mdAndUp.value && collapsed.value)

// Custom scrollbar untuk daftar menu sidebar (OverlayScrollbars).
// Dipasang eksplisit di sini, bukan lewat auto-apply global: isi sidebar hanya
// NuxtLink/button sehingga tidak ada node Preline ber-position:absolute yang
// bisa terpotong oleh viewport OS.
const sidebarScrollEl = ref<HTMLDivElement | null>(null)
let sidebarOS: OverlayScrollbars | null = null

onMounted(async () => {
  await nextTick()
  sidebarOS = mountScrollbar(sidebarScrollEl.value)
})

onBeforeUnmount(() => {
  sidebarOS?.destroy()
  sidebarOS = null
})

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
  // Saat mini rail, submenu tidak muat — lebarkan sidebar lalu buka grup.
  if (isRail.value) {
    collapsed.value = false
    openGroups[key] = true
    return
  }
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
const userName = computed(() => String(session.user.value?.nama || 'Pengguna'))
const roleLabel = computed(() => {
  const r = String(session.user.value?.role || '')
  if (r === 'user') return 'Petugas Input'
  if (r === 'admin') return 'Administrator'
  if (r === 'kepala') return 'Pimpinan'
  return ''
})

// Tutup drawer otomatis setelah navigasi di mobile.
watch(
  () => route.fullPath,
  () => {
    if (!mdAndUp.value) drawer.value = false
  },
)

// Auto-buka grup sidebar yang memuat rute aktif.
// Tanpa ini, membuka /verifikasi/audit langsung (reload / klik notifikasi)
// menampilkan grup Verifikasi tertutup sehingga item aktif tak terlihat.
// Hanya membuka grup terkait — grup lain yang sengaja dibuka user dibiarkan.
const GROUP_BY_PREFIX: [string, string][] = [
  ['/entri-mingguan', 'input'],
  ['/pad', 'input'],
  ['/verifikasi', 'verifikasi'],
  ['/kawasan-wisata', 'master'],
  ['/jenis-retribusi', 'master'],
  ['/master', 'master'],
  ['/settings', 'pengaturan'],
  ['/pengguna', 'pengaturan'],
]

function syncOpenGroup() {
  const p = route.path
  for (const [prefix, group] of GROUP_BY_PREFIX) {
    if (p === prefix || p.startsWith(prefix + '/')) {
      openGroups[group] = true
      return
    }
  }
}

syncOpenGroup()
watch(() => route.path, syncOpenGroup)

// Masuk breakpoint mobile: reset drawer & rail agar sidebar tidak tertinggal
// dalam keadaan menyempit/terbuka sebagian.
watch(mdAndUp, (up) => {
  if (!up) {
    drawer.value = false
    collapsed.value = false
  }
})

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
