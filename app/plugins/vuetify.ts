import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'

export const vuetify = createVuetify({
  ssr: true,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#1976D2',
          secondary: '#6465F2',
          accent: '#82B1FF',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107',
          background: '#F5F5F5',
          surface: '#FFFFFF',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#42A5F5',
          secondary: '#82B1FF',
          accent: '#82B1FF',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107',
          background: '#121212',
          surface: '#1E1E1E',
        },
      },
    },
  },
  defaults: {
    global: {
      fontFamily: 'Inter',
    },
    VBtn: {
      style: {
        textTransform: 'none',
      },
    },
    VTextField: { color: 'primary' },
    VTextarea: { color: 'primary' },
    VSelect: { color: 'primary' },
    VAutocomplete: { color: 'primary' },
    VCheckbox: { color: 'primary' },
    VRadio: { color: 'primary' },
    VRadioGroup: { color: 'primary' },
  },
})

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(vuetify)
})
