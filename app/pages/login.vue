<template>
  <v-app>
    <v-main>
      <v-container fluid class="fill-height d-flex align-center justify-center" style="background: #F5F5F5">
        <v-card flat elevation="0" class="pa-8" style="width: 100%; max-width: 420px">
          <div class="text-center mb-6">
            <v-icon size="48" color="primary">mdi-alpha</v-icon>
            <h1 class="text-h5 font-weight-medium mt-2">SiPerPAD</h1>
            <p class="text-body-2 text-medium-emphasis mt-1">Sistem Perhitungan dan Rekapitulasi PAD</p>
          </div>

          <v-alert v-if="error" type="error" density="compact" class="mb-4">{{ error }}</v-alert>

          <v-form @submit.prevent="handleLogin">
            <v-text-field
              v-model="email"
              label="Email"
              type="email"
              prepend-inner-icon="mdi-email-outline"
              variant="outlined"
              density="comfortable"
              :disabled="loading"
              autocomplete="email"
              class="mb-2"
            />
            <v-text-field
              v-model="password"
              label="Password"
              :type="showPassword ? 'text' : 'password'"
              prepend-inner-icon="mdi-lock-outline"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPassword = !showPassword"
              variant="outlined"
              density="comfortable"
              :disabled="loading"
              autocomplete="current-password"
              class="mb-4"
            />
            <v-btn
              type="submit"
              color="primary"
              block
              size="large"
              :loading="loading"
            >
              Masuk
            </v-btn>
          </v-form>

          <div class="text-center mt-6">
            <p class="text-caption text-medium-emphasis">
              Demo: admin@mail.com / verif@mail.com / kepala@mail.com<br>
              Password: <strong>123456</strong>
            </p>
          </div>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
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
  }
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
