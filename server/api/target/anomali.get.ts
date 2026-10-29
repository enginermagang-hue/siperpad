import { getTargetAnomali } from '../../utils/rekap'
import { sessionKawasanId } from '../../utils/lock'

// Deteksi anomali: target induk tertulis (nilai_induk) tidak sama dengan
// jumlah target anak (Model A). Contoh referensi: A.2 Gasebo + Rumah Ekraf.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const q = getQuery(event) as { tahun?: string; kawasan_id?: string }
  const tahun = Number(q.tahun) || new Date().getFullYear()
  let kawasanId = q.kawasan_id ? Number(q.kawasan_id) : undefined

  // Scope petugas kawasan ke kawasannya saja.
  const scoped = sessionKawasanId(session.user)
  if (scoped != null) kawasanId = scoped

  const data = await getTargetAnomali({ kawasanId, tahun })
  return { data, tahun, total: data.reduce((s, a) => s + Math.abs(a.selisih), 0) }
})
