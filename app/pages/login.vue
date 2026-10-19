<template>
  <div class="min-h-screen grid md:grid-cols-2 bg-background-1">
    <!-- Panel kiri — branding (gelap navy, konsisten dengan sidebar) -->
    <aside
      class="relative hidden md:flex flex-col justify-between overflow-hidden bg-[#1a2332] text-white p-10 lg:p-14"
    >
      <!-- Slideshow background -->
      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <div class="absolute inset-0 overflow-hidden">
          <div
            class="flex h-full transition-transform duration-700 ease-in-out will-change-transform"
            :style="{ transform: `translateX(-${currentSlide * 100}%)` }"
          >
            <div v-for="src in slides" :key="src" class="relative h-full w-full shrink-0">
              <img :src="src" alt="" class="absolute inset-0 h-full w-full object-cover" />
            </div>
          </div>
        </div>
        <!-- Overlay for readability -->
        <div class="absolute inset-0 bg-gradient-to-b from-[#1a2332]/60 via-[#1a2332]/50 to-[#1a2332]/75" />
        <div
          class="absolute inset-0 opacity-[0.06]"
          style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 28px 28px;"
        />
      </div>

      <div class="relative z-10 flex items-center gap-3">
        <img src="/ntt.png" width="52" height="52" alt="Logo Provinsi Nusa Tenggara Timur" class="shrink-0 rounded-md" />
        <div class="leading-tight flex-1 min-w-0">
          <div class="text-2xl font-bold tracking-wide text-white/90">DINAS PARIWISATA DAN EKONOMI KREATIF</div>
          <div class="text-2xl font-bold tracking-wide text-white/90">PROVINSI NUSA TENGGARA TIMUR</div>
        </div>
      </div>

      <div class="relative z-10 max-w-md">
        <span class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
          <span class="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          Sistem Informasi Retribusi Daerah
        </span>
        <h2 class="mt-5 text-3xl lg:text-4xl font-semibold leading-tight tracking-tight">SiPerPAD</h2>
        <p class="mt-2 text-sm text-white/70">Sistem Perhitungan dan Rekapitulasi PAD</p>
        <p class="mt-6 text-base leading-relaxed text-white/80">
          Perhitungan, rekapitulasi, dan monitoring retribusi PAD kawasan wisata
          <strong class="text-white">Pantai Lasiana</strong> &amp;
          <strong class="text-white">Kampung Seni Flobamorata</strong> — otomatis, terintegrasi, dan real-time.
        </p>
        <ul class="mt-8 space-y-2.5 text-sm text-white/75">
          <li class="flex items-center gap-2.5">
            <CheckCircle2 class="shrink-0 size-4 text-primary" aria-hidden="true" />
            Perhitungan capaian PAD otomatis vs target tahunan
          </li>
          <li class="flex items-center gap-2.5">
            <CheckCircle2 class="shrink-0 size-4 text-primary" aria-hidden="true" />
            Rekap &amp; laporan bulanan/tahunan siap ekspor
          </li>
          <li class="flex items-center gap-2.5">
            <CheckCircle2 class="shrink-0 size-4 text-primary" aria-hidden="true" />
            Dashboard monitoring real-time untuk pimpinan
          </li>
        </ul>
      </div>

      <div class="relative z-10 text-xs text-white/50">
        © {{ new Date().getFullYear() }} Dinas Pariwisata dan Ekonomi Kreatif Provinsi NTT
      </div>
    </aside>

    <!-- Panel kanan — form login -->
    <main class="relative flex items-center justify-center p-6 sm:p-10">
      <button
        type="button"
        class="absolute top-4 end-4 inline-flex items-center justify-center size-9 rounded-lg
               text-muted-foreground-1 hover:bg-layer-hover focus:outline-hidden focus:bg-layer-focus"
        :aria-label="isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'"
        @click="toggleTheme"
      >
        <component :is="isDark ? Sun : Moon" class="shrink-0 size-5" aria-hidden="true" />
      </button>

      <div class="w-full max-w-[400px]">
        <div class="md:hidden text-center mb-8">
          <img src="/ntt.png" width="56" height="56" alt="Logo Provinsi Nusa Tenggara Timur" class="mx-auto mb-3 size-14 object-contain" />
          <div class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground-1">
            Dinas Pariwisata dan Ekonomi Kreatif<br />Provinsi Nusa Tenggara Timur
          </div>
          <h1 class="text-2xl font-semibold text-foreground mt-2">SiPerPAD</h1>
          <p class="text-sm text-muted-foreground-1 mt-1">Sistem Perhitungan dan Rekapitulasi PAD</p>
        </div>

        <div class="hidden md:block mb-8">
          <h1 class="text-2xl font-semibold tracking-tight text-foreground">Selamat datang kembali</h1>
          <p class="text-sm text-muted-foreground-1 mt-1">Masuk dengan akun Anda untuk melanjutkan.</p>
        </div>

        <div
          v-if="error"
          role="alert"
          class="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm
                 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200"
        >
          <CircleAlert class="shrink-0 size-4 mt-0.5" aria-hidden="true" />
          <span>{{ error }}</span>
        </div>

        <form novalidate @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label for="login-email" class="block mb-1.5 text-sm font-medium text-foreground">Email</label>
            <div class="relative">
              <Mail class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground-1" aria-hidden="true" />
              <input
                id="login-email"
                v-model="email"
                type="email"
                autocomplete="email"
                :disabled="loading"
                placeholder="nama@instansi.go.id"
                class="w-full rounded-xl border border-layer-line bg-layer py-2.5 ps-10 pe-3 text-sm text-layer-foreground
                       placeholder:text-muted-foreground-1/70
                       focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden
                       disabled:opacity-50 disabled:pointer-events-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label for="login-password" class="block mb-1.5 text-sm font-medium text-foreground">Password</label>
            <div class="relative">
              <Lock class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground-1" aria-hidden="true" />
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                :disabled="loading"
                placeholder="••••••••"
                class="w-full rounded-xl border border-layer-line bg-layer py-2.5 ps-10 pe-11 text-sm text-layer-foreground
                       placeholder:text-muted-foreground-1/70
                       focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden
                       disabled:opacity-50 disabled:pointer-events-none transition-colors"
              />
              <button
                type="button"
                class="absolute end-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground-1
                       hover:bg-layer-hover focus:outline-hidden focus:bg-layer-focus"
                :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <component :is="showPassword ? EyeOff : Eye" class="shrink-0 size-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm
                   font-medium text-primary-foreground shadow-sm
                   hover:bg-primary-hover focus:outline-hidden focus:ring-2 focus:ring-primary/30
                   disabled:opacity-50 disabled:pointer-events-none transition-colors"
            :disabled="loading"
          >
            <LoaderCircle v-if="loading" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
            {{ loading ? 'Memproses…' : 'Masuk' }}
          </button>
        </form>

        <p class="mt-8 text-center text-xs text-muted-foreground-1">
          Butuh bantuan? Hubungi administrator sistem.
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle2, CircleAlert, Eye, EyeOff, LoaderCircle, Lock, Mail, Moon, Sun } from 'lucide-vue-next'

definePageMeta({ layout: false })

const router = useRouter()
const session = useUserSession()
const { isDark, toggle: toggleTheme } = useTheme()
const showPassword = ref(false)
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const slides = [
  '/log-slide-01.jpeg',
  '/log-slide-02.jpg',
  '/log-slide-03.jpg',
  '/log-slide-04.webp',
  '/log-slide-05.jpeg',
]
const currentSlide = ref(0)
let slideTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion) return
  slideTimer = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % slides.length
  }, 5000)
})

onUnmounted(() => {
  if (slideTimer) clearInterval(slideTimer)
})

watch(
  () => session.loggedIn.value,
  (loggedIn) => {
    if (loggedIn) router.push('/')
  },
)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value.trim(), password: password.value },
    })
    await session.fetch()
    await router.push('/')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    error.value = err?.data?.message || (e instanceof Error ? e.message : 'Login gagal')
  } finally {
    loading.value = false
  }
}
</script>
