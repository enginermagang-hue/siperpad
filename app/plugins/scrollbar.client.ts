// Custom scrollbar (OverlayScrollbars) — client-only.
// CSS bawaan package wajib di-import; warna di-override lewat var --os-* di main.css
// agar otomatis mengikuti tema Preline (dark/light).
import 'overlayscrollbars/overlayscrollbars.css'
import { OverlayScrollbars } from 'overlayscrollbars'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import { bodyScrollbarOptions } from '~/utils/scrollbar'

export default defineNuxtPlugin((nuxtApp) => {
  // daftarkan komponen global agar bisa dipakai tanpa import per-file
  nuxtApp.vueApp.component('OverlayScrollbarsComponent', OverlayScrollbarsComponent)

  if (!import.meta.client || !document?.body) return

  // OverlayScrollbars dipasang TERARAH, bukan auto-apply ke semua elemen:
  //  - di sini: <body> (scroll dokumen)
  //  - app/layouts/default.vue: container scroll sidebar
  // Body dialog memakai scrollbar CSS native (lihat .siperpad-dialog-scroll),
  // karena viewport OS selalu `overflow-y: scroll` sehingga memotong dropdown
  // AppSelect yang `position:absolute` di dalam wrapper (dropdownScope 'parent').
  OverlayScrollbars(document.body, bodyScrollbarOptions)
})
