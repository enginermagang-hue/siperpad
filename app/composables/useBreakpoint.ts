/**
 * Breakpoint helper — pengganti `useDisplay()` dari Vuetify.
 *
 * `mdAndUp` mengikuti breakpoint `md` Tailwind (768px), bukan `md` Vuetify
 * (960px). Nilai awal di SSR memakai asumsi desktop agar tabel tampil penuh;
 * setelah mount nilainya dikoreksi dari `matchMedia` sebelum paint pertama.
 */
const MD_MIN_WIDTH = 768

export const useBreakpoint = () => {
  const mdAndUp = useState<boolean>('bp-md-and-up', () => true)

  if (import.meta.client) {
    const mql = window.matchMedia(`(min-width: ${MD_MIN_WIDTH}px)`)
    // Sinkronkan segera (hindari kedip satu frame dengan nilai SSR).
    mdAndUp.value = mql.matches

    const onChange = (e: MediaQueryListEvent) => {
      mdAndUp.value = e.matches
    }

    onMounted(() => mql.addEventListener('change', onChange))
    onBeforeUnmount(() => mql.removeEventListener('change', onChange))
  }

  return { mdAndUp }
}
