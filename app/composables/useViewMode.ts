import { useDisplay } from 'vuetify'

export type ViewMode = 'table' | 'list' | 'compact'

/**
 * Mengelola mode tampilan sebuah tabel: 'table' | 'list' | 'compact'.
 *
 * - Default dihitung dari breakpoint: desktop (>=960px) => 'table', mobile => 'list'.
 * - Pilihan manual user disimpan di cookie (SSR-safe, tanpa flicker/hydration mismatch).
 * - Selama user belum pernah memilih manual, default ikut berubah saat breakpoint berubah.
 *
 * @param key kunci unik per tabel/halaman, mis. 'pad' atau 'verifikasi-realisasi'
 */
export function useViewMode(key: string) {
  const { mdAndUp } = useDisplay()

  // useCookie bersifat SSR-safe. default() => null artinya "belum dipilih manual".
  const stored = useCookie<ViewMode | null>(`vm_${key}`, {
    default: () => null,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  const mode = ref<ViewMode>(stored.value ?? (mdAndUp.value ? 'table' : 'list'))

  // Ikuti breakpoint HANYA bila user belum memilih manual.
  watch(mdAndUp, (up) => {
    if (!stored.value) mode.value = up ? 'table' : 'list'
  })

  // Simpan pilihan user (termasuk saat otomatis, agar konsisten setelah navigasi).
  watch(mode, (m) => {
    stored.value = m
  })

  return { mode, mdAndUp }
}
