// https://nuxt.com/docs/api/configuration/nuxt-config
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Inter via @nuxt/fonts
  modules: [
    '@nuxt/fonts',
    'nuxt-auth-utils',
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        // @ts-expect-error vite-plugin-vuetify types
        config.plugins.push(vuetify({ autoImport: true }))
      })
    },
  ],

  fonts: {
    families: [{ name: 'Inter', provider: 'google' }],
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

  build: {
    transpile: ['vuetify'],
  },

  nitro: {
    externals: {
      external: ['xlsx', 'pdfkit'],
    },
  },

  vite: {
    ssr: {
      external: ['xlsx', 'pdfkit'],
      noExternal: ['vuetify'],
    },
    vue: {
      template: {
        transformAssetUrls,
      },
    },
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
