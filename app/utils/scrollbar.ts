// Konfigurasi scrollbar bersama (OverlayScrollbars).
// Dipakai plugin (scroll dokumen) dan layout (scroll sidebar).
// Warna --os-* didefinisikan di app/assets/css/main.css (tema kustom os-theme-siperpad).
//
// CATATAN: OverlayScrollbars SENGAJA tidak di-auto-apply ke seluruh dokumen.
// Stylesheet package memaksa `display:flex` + `position:relative` pada host dan
// `overflow-y:scroll` pada viewport-nya. Viewport yang selalu `overflow:scroll`
// menjadi clipping context permanen, sehingga dropdown Preline (HSSelect dengan
// `dropdownScope: 'parent'`, yaitu `position:absolute` di dalam wrapper) ikut
// terpotong walau konten dialog masih pendek. Karena itu OS hanya dipasang pada
// elemen yang sudah diketahui aman: <body> dan container scroll sidebar.
import { OverlayScrollbars } from 'overlayscrollbars'
import type { PartialOptions } from 'overlayscrollbars'

export const SCROLLBAR_THEME = 'os-theme-siperpad'

export const scrollbarOptions: PartialOptions = {
  scrollbars: {
    // `visibility: 'auto'` (default OS) -> scrollbar hanya tampil saat overflow.
    autoHide: 'never',
    autoHideDelay: 600,
    theme: SCROLLBAR_THEME,
  },
}

// Opsi khusus host dokumen (body): hanya scrollbar vertikal yang ditampilkan.
// Tanpa ini OverlayScrollbars tetap merender track horizontal setinggi 8px
// meski tidak ada overflow horizontal, sehingga muncul bar kosong di bawah.
export const bodyScrollbarOptions: PartialOptions = {
  ...scrollbarOptions,
  overflow: { x: 'hidden', y: 'scroll' },
}

// Opsi container scroll sidebar: vertikal saja, tanpa track horizontal
// (di mode rail lebar 72px hampir tidak pernah ada ruang untuk itu).
export const sidebarScrollbarOptions: PartialOptions = bodyScrollbarOptions

// Elemen struktur (nav, table, tr, td, thead, tbody, ul, ol, form, fieldset, dll)
// TIDAK boleh menjadi host OS: stylesheet OverlayScrollbars memaksa
// `[data-overlayscrollbars~=host] { display: flex }`, yang merusak layout
// elemen-elemen ini (mis. <nav> jadi horizontal, <tr> jadi flex).
const UNSAFE_HOST_SELECTOR =
  'nav, table, thead, tbody, tfoot, tr, td, th, ul, ol, dl, form, fieldset, select, option'

/**
 * Pasang OverlayScrollbars pada elemen yang SUDAH diketahui aman (dipanggil
 * eksplisit dari layout). Berbeda dengan auto-apply, tidak ada pemeriksaan
 * "sedang meluap?" karena elemen bisa belum overflow saat mount (sidebar
 * pendek, dialog baru dibuka) — OverlayScrollbars punya ResizeObserver sendiri
 * dan akan memunculkan scrollbar begitu overflow terjadi.
 */
export function mountScrollbar(
  el: HTMLElement | null | undefined,
  opts: PartialOptions = sidebarScrollbarOptions,
): OverlayScrollbars | null {
  if (!import.meta.client || !el) return null
  if (el.hasAttribute('data-overlayscrollbars')) return null
  if (el.matches(UNSAFE_HOST_SELECTOR)) return null
  try {
    return OverlayScrollbars(el, opts)
  } catch {
    return null
  }
}
