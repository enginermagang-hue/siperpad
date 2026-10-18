export type Kawasan = { id: number; kode: string; nama: string }
export type Jenis = { id: number; kode: string; nama: string; kawasan_id: number }

// State & helper bersama untuk halaman-halaman Verifikasi.
export function useVerifikasiMaster() {
  const session = useUserSession()
  const role = computed(() => String(session.user.value?.role || ''))
  const isAdmin = computed(() => role.value === 'admin')
  const isUser = computed(() => role.value === 'user')
  const canVerif = computed(() => ['admin', 'kepala'].includes(role.value))

  const kawasan = ref<Kawasan[]>([])
  const jenisList = ref<Jenis[]>([])
  const kawasanOpts = computed(() => kawasan.value.map((k) => ({ label: k.kode + ' — ' + k.nama, value: k.id })))

  const snack = reactive({ show: false, msg: '', color: 'success' as 'success' | 'error' | 'warning' })
  function toast(msg: string, color: typeof snack.color = 'success') { snack.msg = msg; snack.color = color; snack.show = true }

  const { formatRupiah: fmt } = useCurrency()

  const bulanOpts = [
    { label: 'Januari', value: 1 }, { label: 'Februari', value: 2 }, { label: 'Maret', value: 3 }, { label: 'April', value: 4 },
    { label: 'Mei', value: 5 }, { label: 'Juni', value: 6 }, { label: 'Juli', value: 7 }, { label: 'Agustus', value: 8 },
    { label: 'September', value: 9 }, { label: 'Oktober', value: 10 }, { label: 'November', value: 11 }, { label: 'Desember', value: 12 },
  ]
  function bulanLabel(b: number) { return bulanOpts.find((x) => x.value === Number(b))?.label || String(b) }

  async function loadMaster() {
    try { const r = await $fetch<{ data: Kawasan[] }>('/api/kawasan'); kawasan.value = r.data } catch {}
    try { const r = await $fetch<{ data: Jenis[] }>('/api/jenis-retribusi'); jenisList.value = r.data } catch {}
  }

  return { role, isAdmin, isUser, canVerif, kawasan, jenisList, kawasanOpts, snack, toast, fmt, bulanOpts, bulanLabel, loadMaster }
}
