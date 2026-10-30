// Notifikasi navbar: ringkasan aksi tertunda dari endpoint /api/notifikasi.
// Dimuat lazy (saat panel dibuka) dan dipakai bersama via useState.
export interface NotifSummary {
  tahun: number
  verifikasi: { realisasi: number; total: number }
  anomali: number
  temuan: number
  total: number
}

export const useNotifications = () => {
  const data = useState<NotifSummary>('notif-summary', () => ({
    tahun: new Date().getFullYear(),
    verifikasi: { realisasi: 0, total: 0 },
    anomali: 0,
    temuan: 0,
    total: 0,
  }))
  const loading = useState<boolean>('notif-loading', () => false)
  const loaded = useState<boolean>('notif-loaded', () => false)
  // State tampilan: "bersihkan" hanya menyembunyikan notifikasi saat ini,
  // tidak mengubah data sumber. Memuat ulang / reload akan menampilkan lagi.
  const cleared = useState<boolean>('notif-cleared', () => false)
  // Track in-flight request promise to avoid race conditions.
  const inFlight = useState<Promise<void> | null>('notif-inflight', () => null)

  const pendingCount = computed(() => (cleared.value ? 0 : data.value.total))

  async function fetchNotifications(force = false) {
    if (inFlight.value) {
      await inFlight.value
      if (!force) return
    }
    if (loaded.value && !force) return
    loading.value = true
    const p = (async () => {
      try {
        data.value = await $fetch<NotifSummary>('/api/notifikasi')
        loaded.value = true
        cleared.value = false
      } catch {
        // biarkan nilai terakhir bila gagal — notifikasi bukan critical path
      } finally {
        loading.value = false
        inFlight.value = null
      }
    })()
    inFlight.value = p
    await p
  }

  function clearNotifications() {
    cleared.value = true
    loaded.value = true
  }

  return { data, loading, loaded, cleared, pendingCount, fetchNotifications, clearNotifications }
}
