// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  // Fira Sans via @nuxt/fonts
  modules: ['@nuxt/fonts', 'nuxt-auth-utils'],

  fonts: {
    families: [{ name: 'Fira Sans', provider: 'google' }],
    defaults: {
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
    },
  },

  auth: {
    session: {
      password: process.env.NUXT_SESSION_PASSWORD || '',
    },
    hash: {
      scrypt: {
        N: 16384,
        r: 8,
        p: 1,
        maxMem: 32 * 16384 * 8 * 2,
      },
    },
  },

  nitro: {
    externals: {
      external: ['xlsx', 'pdfkit'],
    },
  },

  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ['xlsx', 'pdfkit'],
    },
  },

  routeRules: {
    '/': { middleware: ['auth'] },
  },

  runtimeConfig: {
    tursoDatabaseUrl: process.env.TURSO_DATABASE_URL || '',
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN || '',
    dropboxAppKey: process.env.DROPBOX_APP_KEY || '',
    dropboxAppSecret: process.env.DROPBOX_APP_SECRET || '',
    dropboxRefreshToken: process.env.DROPBOX_REFRESH_TOKEN || '',
    dropboxFolder: process.env.DROPBOX_FOLDER || '/siperpad',
    sessionPassword: process.env.NUXT_SESSION_PASSWORD || '',
  },
})
