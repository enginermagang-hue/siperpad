import { query } from '../utils/db'
import { getTargetAnomali } from '../utils/rekap'

// Ringkasan notifikasi (aksi tertunda) untuk badge & panel di navbar.
// Semua angka dihitung dari data existing — tidak ada tabel notifikasi baru.
// Filter per role:
//  - verifikasi : admin, verifikator, kepala
//  - anomali    : admin, kepala
//  - temuan     : admin, verifikator
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })

  const role = String(session.user.role)
  const canVerify = ['admin', 'verifikator', 'kepala'].includes(role)
  const canAnomali = ['admin', 'kepala'].includes(role)
  const canTemuan = ['admin', 'verifikator'].includes(role)

  const tahun = Number(getQuery(event).tahun) || new Date().getFullYear()

  let realisasi = 0
  let batch = 0
  if (canVerify) {
    const [r] = await query<{ n: number }>("SELECT COUNT(*) AS n FROM realisasi WHERE status = 'diajukan'")
    const [b] = await query<{ n: number }>("SELECT COUNT(*) AS n FROM laporan_batch WHERE status = 'diajukan'")
    realisasi = Number(r?.n) || 0
    batch = Number(b?.n) || 0
  }

  let anomali = 0
  if (canAnomali) {
    try {
      const rows = await getTargetAnomali({ tahun })
      anomali = rows.length
    } catch {
      anomali = 0
    }
  }

  let temuan = 0
  if (canTemuan) {
    const [t] = await query<{ n: number }>("SELECT COUNT(*) AS n FROM catatan_temuan WHERE status = 'terbuka'")
    temuan = Number(t?.n) || 0
  }

  const total = realisasi + batch + anomali + temuan

  return {
    tahun,
    verifikasi: { realisasi, batch, total: realisasi + batch },
    anomali,
    temuan,
    total,
  }
})
