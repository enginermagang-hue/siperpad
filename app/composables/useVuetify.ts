import { vuetify } from '../plugins/vuetify'

export function useVuetify() {
  return vuetify
}

// Shared reactive dark-mode switch. Persisted to localStorage (client-only).
export const useDarkMode = () => {
  const isDark = useState('isDark', () => false)

  // Persisting to localStorage keeps the toggle across reloads (client-only)
  if (process.client) {
    const saved = localStorage.getItem('siperpad-theme')
    if (saved === 'dark' || saved === 'light') {
      isDark.value = saved === 'dark'
    }
    watch(isDark, (val) => {
      localStorage.setItem('siperpad-theme', val ? 'dark' : 'light')
    })
  }

  return { isDark }
}

export const vuetifyInstance = vuetify
