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

  // Scroll dokumen utama (body) tetap memakai OverlayScrollbars.
  //
  // CATATAN: auto-apply ke seluruh elemen yang meluap (startAutoScrollbars)
  // SENGAJA TIDAK dipakai. OverlayScrollbars memaksa `display:flex` +
  // `position:relative` pada host-nya, sehingga merusak elemen yang dibuat
  // dinamis oleh Preline (mis. dropdown HSSelect yang butuh
  // `position:absolute`). Area scroll internal sudah memakai utility
  // `overflow-y-auto` bawaan Tailwind/Preline, jadi tidak perlu OS di sana.
  OverlayScrollbars(document.body, bodyScrollbarOptions)
})
