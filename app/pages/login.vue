<template>
  <div class="min-h-screen grid place-items-center bg-background-1 p-4">
    <div class="w-full max-w-[420px] rounded-xl border border-card-line bg-card p-8">
      <div class="text-center mb-6">
        <div class="inline-flex items-center justify-center size-12 rounded-xl bg-primary text-primary-foreground mb-2">
          <span class="text-lg font-bold tracking-tight">SP</span>
        </div>
        <h1 class="text-xl font-medium text-foreground mt-2">SiPerPAD</h1>
        <p class="text-sm text-muted-foreground-1 mt-1">Sistem Perhitungan dan Rekapitulasi PAD</p>
      </div>

      <div
        v-if="error"
        role="alert"
        class="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm
               text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200"
      >
        <CircleAlert class="shrink-0 size-4 mt-0.5" aria-hidden="true" />
        <span>{{ error }}</span>
      </div>

      <form novalidate @submit.prevent="handleLogin">
        <div class="mb-3">
          <label for="login-email" class="block mb-1.5 text-sm font-medium text-foreground">Email</label>
          <div class="relative">
            <Mail
              class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground-1"
              aria-hidden="true"
            />
            <input
              id="login-email"
              v-model="email"
              type="email"
              autocomplete="email"
              :disabled="loading"
              class="w-full rounded-lg border border-layer-line bg-layer py-2 ps-9 pe-3 text-sm text-layer-foreground
                     focus:border-primary-focus focus:ring-primary-focus
                     disabled:opacity-50 disabled:pointer-events-none"
            />
          </div>
        </div>

        <div class="mb-4">
          <label for="login-password" class="block mb-1.5 text-sm font-medium text-foreground">Password</label>
          <div class="relative">
            <Lock
              class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground-1"
              aria-hidden="true"
            />
            <input
              id="login-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              :disabled="loading"
              class="w-full rounded-lg border border-layer-line bg-layer py-2 ps-9 pe-10 text-sm text-layer-foreground
                     focus:border-primary-focus focus:ring-primary-focus
                     disabled:opacity-50 disabled:pointer-events-none"
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
          class="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm
                 font-medium text-primary-foreground hover:bg-primary-hover
                 focus:outline-hidden focus:bg-primary-focus
                 disabled:opacity-50 disabled:pointer-events-none"
          :disabled="loading"
        >
          <LoaderCircle v-if="loading" class="shrink-0 size-4 animate-spin" aria-hidden="true" />
          {{ loading ? 'Memproses…' : 'Masuk' }}
        </button>
      </form>

      <div class="text-center mt-6">
        <p class="text-xs text-muted-foreground-1 leading-relaxed">
          Demo akun — password <strong class="text-foreground">123456</strong><br />
          <strong class="text-foreground">user@mail.com</strong> (Petugas Input) ·
          <strong class="text-foreground">admin@mail.com</strong> (Administrator) ·
          <strong class="text-foreground">kepala@mail.com</strong> (Kepala)
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CircleAlert, Eye, EyeOff, LoaderCircle, Lock, Mail } from 'lucide-vue-next'

definePageMeta({ layout: false })

const router = useRouter()
const session = useUserSession()
const showPassword = ref(false)
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

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
    error.value = e instanceof Error ? e.message : 'Login gagal'
  } finally {
    loading.value = false
  }
}
</script>
