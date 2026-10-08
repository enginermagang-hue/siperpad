// Konfigurasi scrollbar bersama (OverlayScrollbars).
// Dipakai plugin (scroll dokumen), layout (scroll sidebar), dan auto-apply
// (area scroll internal Vuetify: dialog/menu/list/tabel).
// Warna --os-* didefinisikan di app/assets/css/main.css (tema kustom os-theme-siperpad).
import { OverlayScrollbars } from 'overlayscrollbars'
import type { PartialOptions } from 'overlayscrollbars'

export const SCROLLBAR_THEME = 'os-theme-siperpad'

export const scrollbarOptions: PartialOptions = {
  scrollbars: {
    autoHide: 'never',
    autoHideDelay: 600,
    theme: SCROLLBAR_THEME,
  },
}

// Elemen yang TIDAK boleh diinisialisasi OverlayScrollbars:
// - html/body: ditangani plugin utama (overlay untuk scroll dokumen).
// - elemen OS sendiri (punya atribut data-overlayscrollbars*).
// - elemen di DALAM viewport OS (mis. wrapper internal OverlayScrollbars),
//   agar tidak terjadi init berantai. CATATAN: jangan pakai closest('[data-overlayscrollbars]')
//   karena html sendiri adalah host OS, sehingga semua elemen akan ter-skip.
const SKIP_SELF_SELECTOR = 'html, body, .os-scrollbar'

/**
 * Inisialisasi OverlayScrollbars ke sebuah elemen scroll.
 * Mengembalikan instance bila berhasil, atau null bila elemen tidak layak.
 */
export function initScrollbarOn(el: HTMLElement): OverlayScrollbars | null {
  if (el.hasAttribute('data-overlayscrollbars') ||
      el.hasAttribute('data-overlayscrollbars-viewport') ||
      el.hasAttribute('data-overlayscrollbars-contents')) {
    return null
  }
  if (el.matches(SKIP_SELF_SELECTOR)) return null
  // skip bila berada di dalam viewport OS INTERNAL (bukan html/documentElement,
  // yang juga punya atribut viewport saat OS mengelola scroll dokumen).
  if (hasInternalOSAncestor(el)) return null
  // hanya untuk elemen yang benar-benar overflow secara vertikal/horizontal
  if (!isOverflowing(el)) return null
  try {
    return OverlayScrollbars(el, scrollbarOptions)
  } catch {
    return null
  }
}

/**
 * True bila elemen berada di dalam viewport OS internal (mis. wrapper dialog/menu
 * yang sudah dikelola OS) — bukan sekadar di bawah html yang menjadi host dokumen.
 */
function hasInternalOSAncestor(el: HTMLElement): boolean {
  let ancestor = el.parentElement
  while (ancestor && ancestor !== document.documentElement) {
    if (ancestor.classList.contains('os-scrollbar') ||
        ancestor.getAttribute('data-overlayscrollbars-viewport') != null) {
      return true
    }
    ancestor = ancestor.parentElement
  }
  return false
}

/** True bila node berada di dalam internal OS (viewport/scrollbar), bukan html. */
function isInsideInternalOS(el: Element | null): boolean {
  return el instanceof HTMLElement ? hasInternalOSAncestor(el) : false
}

function isOverflowing(el: HTMLElement): boolean {
  const cs = getComputedStyle(el)
  const canScrollY = cs.overflowY === 'auto' || cs.overflowY === 'scroll'
  const canScrollX = cs.overflowX === 'auto' || cs.overflowX === 'scroll'
  const overflowY = canScrollY && el.scrollHeight > el.clientHeight + 1
  const overflowX = canScrollX && el.scrollWidth > el.clientWidth + 1
  return overflowY || overflowX
}

/**
 * Pindai dokumen (atau subtree) dan terapkan OverlayScrollbars ke semua elemen
 * scroll yang meluap. Mengembalikan jumlah elemen yang baru diinisialisasi.
 */
export function applyScrollbarsToScrollableElements(root: ParentNode = document): number {
  let applied = 0
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    if (initScrollbarOn(el)) applied++
  })
  return applied
}

/**
 * Mulai pemantauan otomatis: terapkan sekarang, lalu tiap kali DOM berubah
 * (Vuetify menambahkan dialog/menu ke body) dan saat ukuran berubah.
 * Mengembalikan fungsi cleanup.
 */
export function startAutoScrollbars(): () => void {
  if (!import.meta.client || !document?.body) return () => {}

  const run = () => applyScrollbarsToScrollableElements(document)

  // terapkan awal (setelah render pertama)
  run()

  // debounce agar tidak memindai berulang-ulang saat banyak mutasi
  let scheduled = false
  const schedule = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      run()
    })
  }

  const observer = new MutationObserver((mutations) => {
    // abaikan mutasi yang berasal dari internal OS sendiri supaya tidak loop.
    // cukup cek viewport OS / elemen scrollbar, BUKAN html (host dokumen).
    for (const m of mutations) {
      const target = m.target as HTMLElement
      if (isInsideInternalOS(target)) continue
      if (m.addedNodes.length || m.removedNodes.length || m.type === 'attributes') {
        schedule()
        return
      }
    }
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
  })

  // re-apply saat ukuran viewport berubah (tabel/dialog bisa mulai meluap)
  let resizeScheduled = false
  const onResize = () => {
    if (resizeScheduled) return
    resizeScheduled = true
    setTimeout(() => { resizeScheduled = false; run() }, 200)
  }
  window.addEventListener('resize', onResize)

  return () => {
    observer.disconnect()
    window.removeEventListener('resize', onResize)
  }
}
