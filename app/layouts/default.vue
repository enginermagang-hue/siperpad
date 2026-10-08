<template>
  <v-app>
    <v-navigation-drawer
      v-model="drawer"
      :permanent="mdAndUp"
      :temporary="!mdAndUp"
      :width="272"
      class="siperpad-drawer"
    >
      <!-- Branding -->
      <div class="d-flex align-center pa-3" style="gap: 10px; min-height: 72px">
        <v-img src="/ntt.png" width="44" height="44" max-width="44" class="flex-shrink-0" style="border-radius: 6px" />
        <div style="line-height: 1.15">
          <div class="text-caption font-weight-bold" style="font-size: 11px; letter-spacing: 0.02em; color: #fff">DINAS PARIWISATA DAN</div>
          <div class="text-caption font-weight-bold" style="font-size: 11px; letter-spacing: 0.02em; color: #fff">EKONOMI KREATIF</div>
          <div class="text-caption font-weight-bold" style="font-size: 11px; letter-spacing: 0.02em; color: #fff">PROVINSI NTT</div>
          <div class="text-caption" style="font-size: 10px; color: rgba(255,255,255,0.7)">PAD Lasiana & Kampung Seni</div>
        </div>
      </div>
      <v-divider style="opacity: 0.12; border-color: rgba(255,255,255,0.2)" />

      <v-list density="comfortable" nav class="pt-2 siperpad-nav">
        <!-- Dashboard -->
        <v-list-item
          prepend-icon="mdi-home-outline"
          title="Dashboard"
          to="/"
          :active="route.path === '/'"
          class="mb-1"
          active-class="siperpad-active"
        />

        <!-- Input Realisasi -->
        <v-list-group value="input">
          <template #activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-file-document-outline" title="Input Realisasi" />
          </template>
          <v-list-item title="Realisasi Mingguan" to="/entri-mingguan" :active="route.path.startsWith('/entri-mingguan')" class="siperpad-sub" />
          <v-list-item title="Riwayat Transaksi" to="/pad" :active="route.path === '/pad'" class="siperpad-sub" />
        </v-list-group>

        <!-- Data Master (Katalog) -->
        <v-list-group value="master">
          <template #activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-folder-outline" title="Data Master (Katalog)" />
          </template>
          <v-list-item title="Kawasan Wisata (Kampung Seni & Lasiana)" to="/kawasan-wisata" :active="route.path.startsWith('/kawasan-wisata')" class="siperpad-sub" />
          <v-list-item title="Kategori & Tarif Retribusi" to="/jenis-retribusi" :active="route.path.startsWith('/jenis-retribusi')" class="siperpad-sub" />
          <v-list-item title="Target Tahunan PAD" to="/master/target" :active="route.path.startsWith('/master/target')" class="siperpad-sub" />
        </v-list-group>

        <!-- Perbandingan & Analisis -->
        <v-list-group value="analisis">
          <template #activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-chart-line" title="Perbandingan & Analisis" />
          </template>
          <v-list-item title="Perbandingan Agt vs Sept 2026" to="/laporan?tab=banding" :active="route.path.startsWith('/laporan') && route.query.tab === 'banding'" class="siperpad-sub" />
          <v-list-item title="Tren & Capaian Bulanan" to="/laporan?tab=tren" :active="route.path.startsWith('/laporan') && route.query.tab === 'tren'" class="siperpad-sub" />
        </v-list-group>

        <!-- Rekap & Laporan -->
        <v-list-group value="rekap">
          <template #activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-file-chart-outline" title="Rekap & Laporan" />
          </template>
          <v-list-item title="Laporan Bulanan & Mingguan" to="/laporan" :active="route.path.startsWith('/laporan') && !route.query.tab" class="siperpad-sub" />
          <v-list-item title="Cetak & Ekspor (PDF/Excel)" to="/laporan?export=1" :active="route.path.startsWith('/laporan') && route.query.export === '1'" class="siperpad-sub" />
        </v-list-group>

        <!-- Pengaturan Sistem (gabung: Pengaturan + Pengguna + Verifikasi) -->
        <v-list-group value="pengaturan">
          <template #activator="{ props }">
            <v-list-item v-bind="props" prepend-icon="mdi-cog-outline" title="Pengaturan Sistem" />
          </template>
          <v-list-item title="Pengaturan" to="/settings" :active="route.path.startsWith('/settings')" class="siperpad-sub" />
          <v-list-item v-if="isAdmin" title="Pengguna" to="/pengguna" :active="route.path.startsWith('/pengguna')" class="siperpad-sub" />
          <v-list-item v-if="isAdmin || isVerifikator || isKepala" title="Verifikasi" to="/verifikasi" :active="route.path.startsWith('/verifikasi')" class="siperpad-sub" />
        </v-list-group>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar flat :elevation="0" :style="appBarStyle">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-spacer />

      <!-- Panel Notifikasi -->
      <v-menu v-model="notifMenu" :close-on-content-click="false" location="bottom end" offset="8">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon variant="text" size="small" class="mr-1">
            <v-badge v-if="notifPending" :content="String(notifPending)" color="error" offset-x="-2" offset-y="-2">
              <v-icon>mdi-bell-outline</v-icon>
            </v-badge>
            <v-icon v-else>mdi-bell-outline</v-icon>
          </v-btn>
        </template>
        <v-card min-width="320" max-width="380">
          <v-card-title class="d-flex align-center text-body-1 font-weight-bold py-3">
            Notifikasi
            <v-spacer />
            <v-btn icon="mdi-refresh" variant="text" size="x-small" :loading="notifLoading" @click="loadNotif(true)" />
          </v-card-title>
          <v-divider />
          <v-list density="comfortable" lines="two" class="py-1">
            <template v-if="notifItems.length">
              <v-list-item
                v-for="item in notifItems"
                :key="item.key"
                :prepend-icon="item.icon"
                :to="item.to"
                @click="notifMenu = false"
              >
                <v-list-item-title class="font-weight-medium">{{ item.title }}</v-list-item-title>
                <v-list-item-subtitle>{{ item.subtitle }}</v-list-item-subtitle>
                <template #append>
                  <v-chip size="x-small" :color="item.color" variant="flat">{{ item.count }}</v-chip>
                </template>
              </v-list-item>
            </template>
            <div v-else class="text-center text-caption py-6" :style="{ color: isDark ? '#94a3b8' : '#6b7280' }">
              {{ notifLoading ? 'Memuat…' : 'Tidak ada notifikasi' }}
            </div>
          </v-list>
        </v-card>
      </v-menu>

      <v-chip color="primary" size="small" label class="font-weight-bold mr-1">T.A. {{ tahun }}</v-chip>

      <!-- User Menu (paling kanan) -->
      <v-menu location="bottom end" offset="8">
        <template #activator="{ props }">
          <v-btn v-bind="props" variant="text" class="pa-1 user-menu-btn" style="text-transform: none; height: auto">
            <v-avatar size="32" color="grey-lighten-3" class="mr-1"><v-icon>mdi-account</v-icon></v-avatar>
            <div class="d-none d-sm-block text-left mr-1" style="line-height: 1.2">
              <div class="text-body-2 font-weight-medium" :style="{ color: isDark ? '#f1f5f9' : '#111827' }">{{ userName }}</div>
              <div class="text-caption" :style="{ color: isDark ? '#94a3b8' : '#6b7280' }">{{ roleLabel || '—' }}</div>
            </div>
            <v-icon size="small" class="d-none d-sm-flex">mdi-chevron-down</v-icon>
          </v-btn>
        </template>
        <v-card min-width="260">
          <div class="d-flex align-center pa-4">
            <v-avatar size="44" color="primary" class="mr-3"><v-icon color="white">mdi-account</v-icon></v-avatar>
            <div style="line-height: 1.25">
              <div class="text-body-2 font-weight-medium">{{ userName }}</div>
              <div class="text-caption" :style="{ color: isDark ? '#94a3b8' : '#6b7280' }">{{ roleLabel || '—' }}</div>
            </div>
          </div>
          <v-divider />
          <v-list density="comfortable" nav class="py-1">
            <v-list-item value="profil" prepend-icon="mdi-account-cog-outline" title="Profil / Pengaturan" to="/settings" />
            <v-list-item value="ganti-password" prepend-icon="mdi-lock-outline" title="Ganti Password" to="/settings#password" />
            <v-list-item
              value="theme"
              :prepend-icon="isDark ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent'"
              :title="isDark ? 'Mode Terang' : 'Mode Gelap'"
              @click="toggleDark"
            />
          </v-list>
          <v-divider />
          <v-list density="comfortable" nav class="py-1">
            <v-list-item value="logout" prepend-icon="mdi-logout" title="Keluar" base-color="error" @click="handleLogout" />
          </v-list>
        </v-card>
      </v-menu>
    </v-app-bar>

    <v-main :style="{ background: isDark ? 'rgb(var(--v-theme-background))' : '#f5f7fb' }">
      <v-container fluid class="py-6">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'

const route = useRoute()
const { mdAndUp } = useDisplay()
const drawer = ref(true)
const vuetify = useVuetify()
const { isDark } = useDarkMode()
const session = useUserSession()
const router = useRouter()

// shared tahun for T.A. chip — ikut tahun ref dashboard (useState)
const tahun = useState<number>('tahun', () => new Date().getFullYear())

const appBarStyle = computed(() =>
  isDark.value
    ? { background: 'rgb(var(--v-theme-surface))', borderBottom: '1px solid rgb(var(--v-theme-surface-variant))', color: '#f1f5f9' }
    : { background: '#fff', borderBottom: '1px solid #e5e7eb' }
)

const notifMenu = ref(false)
const { data: notifData, loading: notifLoading, pendingCount: notifPending, fetchNotifications } = useNotifications()

const notifItems = computed(() => {
  const d = notifData.value
  const items: { key: string; title: string; subtitle: string; icon: string; color: string; count: number; to: string }[] = []
  if (d.verifikasi.realisasi > 0) {
    items.push({
      key: 'realisasi', title: 'Realisasi menunggu verifikasi', subtitle: 'Entri realisasi berstatus diajukan',
      icon: 'mdi-file-check-outline', color: 'primary', count: d.verifikasi.realisasi, to: '/verifikasi',
    })
  }
  if (d.verifikasi.batch > 0) {
    items.push({
      key: 'batch', title: 'Laporan menunggu verifikasi', subtitle: 'Batch laporan berstatus diajukan',
      icon: 'mdi-file-clock-outline', color: 'primary', count: d.verifikasi.batch, to: '/verifikasi',
    })
  }
  if (d.anomali > 0) {
    items.push({
      key: 'anomali', title: 'Anomali target PAD', subtitle: `Target induk ≠ jumlah anak (T.A. ${d.tahun})`,
      icon: 'mdi-alert-outline', color: 'warning', count: d.anomali, to: '/master/target',
    })
  }
  if (d.temuan > 0) {
    items.push({
      key: 'temuan', title: 'Temuan belum selesai', subtitle: 'Catatan temuan berstatus terbuka',
      icon: 'mdi-clipboard-alert-outline', color: 'error', count: d.temuan, to: '/verifikasi',
    })
  }
  return items
})

function loadNotif(force = false) {
  return fetchNotifications(force)
}

watch(notifMenu, (open) => {
  if (open) loadNotif()
})

onMounted(() => loadNotif())

const isAdmin = computed(() => session.user.value?.role === 'admin')
const isVerifikator = computed(() => session.user.value?.role === 'verifikator')
const isKepala = computed(() => session.user.value?.role === 'kepala')
const userName = computed(() => session.user.value?.nama || 'Admin Utama')
const roleLabel = computed(() => {
  const r = session.user.value?.role
  if (r === 'admin') return 'Bendahara Penerimaan'
  if (r === 'verifikator') return 'Verifikator'
  if (r === 'kepala') return 'Kepala'
  return 'Bendahara Penerimaan'
})

watch(isDark, (val) => {
  vuetify.theme.global.name.value = val ? 'dark' : 'light'
})

function toggleDark() {
  isDark.value = !isDark.value
}

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

<style scoped>
.siperpad-drawer {
  background: #1a2332 !important;
  color: #cbd5e1;
}
.siperpad-drawer :deep(.v-list-item) {
  color: #cbd5e1;
}
.siperpad-drawer :deep(.v-list-item .v-icon) {
  color: #94a3b8;
}
.siperpad-drawer :deep(.v-list-item--active.siperpad-active) {
  background: #1976d2 !important;
  color: #fff !important;
}
.siperpad-drawer :deep(.v-list-item--active.siperpad-active .v-icon) {
  color: #fff !important;
}
.siperpad-sub {
  padding-left: 40px !important;
  font-size: 13px;
  opacity: 0.9;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  margin-left: 24px;
  border-radius: 0 6px 6px 0 !important;
}
.user-menu-btn :deep(.v-btn__content) {
  gap: 2px;
}
</style>
