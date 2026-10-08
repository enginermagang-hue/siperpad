// Notifikasi navbar: ringkasan aksi tertunda dari endpoint /api/notifikasi.
// Dimuat lazy (saat panel dibuka) dan dipakai bersama via useState.
export interface NotifSummary {
  tahun: number
  verifikasi: { realisasi: number; batch: number; total: number }
  anomali: number
  temuan: number
  total: number
}

export const useNotifications = () => {
  const data = useState<NotifSummary>('notif-summary', () => ({
    tahun: new Date().getFullYear(),
    verifikasi: { realisasi: 0, batch: 0, total: 0 },
    anomali: 0,
    temuan: 0,
    total: 0,
  }))
  const loading = useState<boolean>('notif-loading', () => false)
  const loaded = useState<boolean>('notif-loaded', () => false)

  const pendingCount = computed(() => data.value.total)

  async function fetchNotifications(force = false) {
    if (loading.value) return
    if (loaded.value && !force) return
    loading.value = true
    try {
      data.value = await $fetch<NotifSummary>('/api/notifikasi')
      loaded.value = true
    } catch {
      // biarkan nilai terakhir bila gagal — notifikasi bukan critical path
    } finally {
      loading.value = false
    }
  }

  return { data, loading, loaded, pendingCount, fetchNotifications }
}
