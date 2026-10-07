import { query, execute } from '../../utils/db'
import { monthStart, nextMonthStart } from '../../utils/periode'
import { isPeriodeLocked } from '../../utils/lock'

// Ajukan semua realisasi draft pada (kawasan, tahun, bulan) sekaligus.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })

  const body = await readBody(event) as { kawasan_id?: number; tahun?: number; bulan?: number }
  const kawasanId = Number(body.kawasan_id)
  const tahun = Number(body.tahun)
  const bulan = Number(body.bulan)
  if (!kawasanId || !tahun || !bulan) throw createError({ statusCode: 400, message: 'kawasan_id, tahun, bulan wajib' })
  if (await isPeriodeLocked(tahun, bulan, kawasanId)) throw createError({ statusCode: 409, message: 'Periode sudah dikunci' })

  const mStart = monthStart(tahun, bulan)
  const nStart = nextMonthStart(tahun, bulan)
  const drafts = await query<{ id: number }>(
    `SELECT r.id FROM realisasi r JOIN jenis_retribusi jr ON jr.id = r.jenis_retribusi_id
     WHERE jr.kawasan_id = ? AND r.tanggal >= ? AND r.tanggal < ? AND r.status = 'draft'`,
    [kawasanId, mStart, nStart],
  )
  if (!drafts.length) return { ok: true, count: 0 }
  await execute(
    `UPDATE realisasi SET status = 'diajukan', updated_at = datetime('now')
     WHERE id IN (${drafts.map(() => '?').join(',')})`,
    drafts.map((d) => d.id),
  )
  try {
    await execute('INSERT INTO audit_log (user_id, aksi, entitas, entitas_id, after) VALUES (?, ?, ?, ?, ?)',
      [Number(session.user.id), 'AJUKAN_MASSAL', 'realisasi', `${tahun}-${bulan}-${kawasanId}`, `Ajukan ${drafts.length} realisasi`])
  } catch {}
  return { ok: true, count: drafts.length }
})
