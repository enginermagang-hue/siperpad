import { query, execute } from '../utils/db'
import { APPROVED_STATUS } from '../utils/periode'

// Kunci periode (tahun, bulan, kawasan). Admin only.
// Syarat: tidak ada realisasi berstatus draft/diajukan pada periode tsb.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin dapat mengunci periode' })

  const body = await readBody(event) as { tahun?: number; bulan?: number; kawasan_id?: number }
  const tahun = Number(body.tahun)
  const bulan = Number(body.bulan)
  const kawasanId = Number(body.kawasan_id)
  if (!tahun || !bulan || bulan < 1 || bulan > 12 || !kawasanId) {
    throw createError({ statusCode: 400, message: 'tahun, bulan (1-12), dan kawasan_id wajib' })
  }

  const pending = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM realisasi r
     JOIN jenis_retribusi jr ON jr.id = r.jenis_retribusi_id
     WHERE jr.kawasan_id = ? AND substr(r.tanggal, 1, 4) = ? AND substr(r.tanggal, 6, 2) = ?
       AND r.status != ?`,
    [kawasanId, String(tahun), String(bulan).padStart(2, '0'), APPROVED_STATUS],
  )
  if (Number(pending[0]?.n) > 0) {
    throw createError({ statusCode: 409, message: 'Masih ada realisasi draft/diajukan pada periode ini. Verifikasi dahulu sebelum mengunci.' })
  }

  const userId = Number(session.user.id)
  await execute(
    `INSERT INTO periode_lock (tahun, bulan, kawasan_id, locked_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(tahun, bulan, kawasan_id) DO UPDATE SET locked_by = excluded.locked_by, locked_at = datetime('now')`,
    [tahun, bulan, kawasanId, userId],
  )
  try {
    await execute('INSERT INTO audit_log (user_id, aksi, entitas, entitas_id, after) VALUES (?, ?, ?, ?, ?)',
      [userId, 'KUNCI_PERIODE', 'periode_lock', `${tahun}-${bulan}-${kawasanId}`, `Kunci periode ${bulan}/${tahun} kawasan ${kawasanId}`])
  } catch {}
  return { ok: true }
})
