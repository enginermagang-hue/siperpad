// Custom scrollbar (OverlayScrollbars) — client-only.
// CSS bawaan package wajib di-import; warna di-override lewat var --os-* di main.css
// agar otomatis mengikuti tema Vuetify (dark/light).
import 'overlayscrollbars/overlayscrollbars.css'
import { OverlayScrollbars } from 'overlayscrollbars'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import { scrollbarOptions, startAutoScrollbars } from '~/utils/scrollbar'

export default defineNuxtPlugin((nuxtApp) => {
  // daftarkan komponen global agar bisa dipakai tanpa import per-file
  nuxtApp.vueApp.component('OverlayScrollbarsComponent', OverlayScrollbarsComponent)

  if (!import.meta.client || !document?.body) return

  // 1) scroll dokumen utama (body)
  OverlayScrollbars(document.body, scrollbarOptions)

  // 2) auto-apply ke area scroll internal Vuetify (dialog/menu/list/tabel)
  //    hanya elemen yang benar-benar meluap yang diinisialisasi.
  const stopAuto = startAutoScrollbars()
  window.addEventListener('beforeunload', () => stopAuto())
})
