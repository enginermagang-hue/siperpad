<template>
  <v-app>
    <v-navigation-drawer
      v-model="drawer"
      :permanent="mdAndUp"
      :temporary="!mdAndUp"
      app
      flat
    >
      <v-list-item prepend-icon="mdi-alpha" title="SiPerPAD" subtitle="Admin Panel" />
      <v-divider />
      <v-list density="comfortable" nav>
        <v-list-item
          prepend-icon="mdi-view-dashboard"
          title="Dashboard"
          to="/"
          :active="route.path === '/'"
        />
        <v-list-item
          v-if="isAdmin"
          prepend-icon="mdi-account-group"
          title="Data PAD"
          to="/pad"
          :active="route.path.startsWith('/pad')"
        />
        <v-list-item
          v-if="isAdmin"
          prepend-icon="mdi-table-large"
          title="Entri Mingguan"
          to="/entri-mingguan"
          :active="route.path.startsWith('/entri-mingguan')"
        />
        <v-list-item
          v-if="isVerifikator || isKepala || isAdmin"
          prepend-icon="mdi-check-decagram"
          title="Verifikasi"
          to="/verifikasi"
          :active="route.path.startsWith('/verifikasi')"
        />
        <template v-if="isAdmin">
          <v-divider class="my-2" />
          <div class="text-caption text-medium-emphasis px-4 pt-1 pb-1" style="letter-spacing: 0.08em">MASTER DATA</div>
          <v-list-item
            prepend-icon="mdi-map-marker-multiple"
            title="Kawasan Wisata"
            to="/kawasan-wisata"
            :active="route.path.startsWith('/kawasan-wisata')"
          />
          <v-list-item
            prepend-icon="mdi-format-list-bulleted"
            title="Jenis Retribusi"
            to="/jenis-retribusi"
            :active="route.path.startsWith('/jenis-retribusi')"
          />
          <v-list-item
            prepend-icon="mdi-bullseye-arrow"
            title="Target Tahunan"
            to="/master/target"
            :active="route.path.startsWith('/master/target')"
          />
        </template>
        <v-divider class="my-2" />
        <v-list-item
          prepend-icon="mdi-chart-bar"
          title="Laporan"
          to="/laporan"
          :active="route.path.startsWith('/laporan')"
        />
        <v-list-item
          v-if="isAdmin"
          prepend-icon="mdi-account-cog"
          title="Pengguna"
          to="/pengguna"
          :active="route.path.startsWith('/pengguna')"
        />
        <v-divider class="my-2" />
        <v-list-item
          prepend-icon="mdi-cog-outline"
          title="Pengaturan"
          to="/settings"
          :active="route.path.startsWith('/settings')"
        />
      </v-list>

      <template #append>
        <v-divider />
        <div class="pa-3 d-flex align-center">
          <v-avatar color="primary" size="36" class="mr-3"><v-icon color="white">mdi-account</v-icon></v-avatar>
          <div>
            <div class="text-body-2 font-weight-medium">{{ userName }}</div>
            <div class="text-caption text-medium-emphasis">{{ roleLabel }}</div>
          </div>
        </div>
        <v-list-item
          prepend-icon="mdi-logout"
          title="Keluar"
          value="logout"
          @click="handleLogout"
        />
      </template>
    </v-navigation-drawer>

    <v-app-bar color="primary" elevated app>
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-app-bar-title>SiPerPAD</v-app-bar-title>
      <v-spacer />
      <v-chip size="small" variant="tonal" class="mr-2">{{ roleLabel }}</v-chip>
      <v-btn :icon="isDark ? 'mdi-white-balance-sunny' : 'mdi-moon-waning-crescent'" variant="text" @click="toggleDark" />
    </v-app-bar>

    <v-main>
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

const isAdmin = computed(() => session.user.value?.role === 'admin')
const isVerifikator = computed(() => session.user.value?.role === 'verifikator')
const isKepala = computed(() => session.user.value?.role === 'kepala')
const userName = computed(() => session.user.value?.nama || 'User')
const roleLabel = computed(() => {
  const r = session.user.value?.role
  return r === 'admin' ? 'Admin' : r === 'verifikator' ? 'Verifikator' : r === 'kepala' ? 'Kepala' : ''
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
