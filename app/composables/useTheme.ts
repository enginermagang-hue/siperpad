/**
 * Dark mode berbasis class `dark` di <html>.
 *
 * Disimpan di cookie (bukan localStorage) agar SSR bisa merender class yang
 * benar sejak HTML pertama — menghilangkan flash terang->gelap yang terjadi
 * pada implementasi localStorage sebelumnya.
 */
export const useTheme = () => {
  const isDark = useCookie<boolean>('siperpad-theme', {
    default: () => false,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  // Sinkronkan class di <html> secara reaktif (SSR + client).
  useHead({
    htmlAttrs: {
      class: computed(() => (isDark.value ? 'dark' : '')),
    },
  })

  function toggle() {
    isDark.value = !isDark.value
  }

  return { isDark, toggle }
}
