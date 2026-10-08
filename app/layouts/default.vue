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

      <template #append>
        <v-divider style="opacity: 0.12; border-color: rgba(255,255,255,0.2)" />
        <div class="pa-3 d-flex align-center">
          <v-avatar color="primary" size="36" class="mr-3"><v-icon color="white">mdi-account</v-icon></v-avatar>
          <div>
            <div class="text-body-2 font-weight-medium" style="color: #fff">{{ userName }}</div>
            <div class="text-caption" style="color: rgba(255,255,255,0.6)">{{ roleLabel }}</div>
          </div>
        </div>
        <v-list-item
          prepend-icon="mdi-logout"
          title="Keluar"
          value="logout"
          class="siperpad-logout"
          @click="handleLogout"
        />
      </template>
    </v-navigation-drawer>

    <v-app-bar flat :elevation="0" :style="appBarStyle">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-spacer />
      <div class="d-flex align-center" style="gap: 8px">
        <v-avatar size="32" color="grey-lighten-3" class="mr-1"><v-icon>mdi-account</v-icon></v-avatar>
        <div class="d-none d-sm-block mr-2" style="line-height: 1.2; text-align: right">
          <div class="text-body-2 font-weight-medium" :style="{ color: isDark ? '#f1f5f9' : '#111827' }">{{ userName }}</div>
          <div class="text-caption" :style="{ color: isDark ? '#94a3b8' : '#6b7280' }">({{ roleLabel || '—' }})</div>
        </div>
        <v-btn icon="mdi-bell-outline" variant="text" size="small">
          <v-badge v-if="notifCount" :content="String(notifCount)" color="error" offset-x="-2" offset-y="-2">
            <v-icon>mdi-bell-outline</v-icon>
          </v-badge>
          <v-icon v-else>mdi-bell-outline</v-icon>
        </v-btn>
        <v-btn icon="mdi-help-circle-outline" variant="text" size="small" to="/settings" />
        <v-chip color="primary" size="small" label class="font-weight-bold">T.A. {{ tahun }}</v-chip>
        <v-btn :icon="isDark ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent'" variant="text" size="small" @click="toggleDark" />
      </div>
    </v-app-bar>

    <v-main :style="{ background: isDark ? '#0f172a' : '#f5f7fb' }">
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
    ? { background: '#1e293b', borderBottom: '1px solid #334155', color: '#f1f5f9' }
    : { background: '#fff', borderBottom: '1px solid #e5e7eb' }
)

const notifCount = ref(2)

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
.siperpad-logout {
  color: #94a3b8;
}
</style>
