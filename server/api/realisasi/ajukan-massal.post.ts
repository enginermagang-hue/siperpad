import { query, execute } from '../../utils/db'
import { monthStart, nextMonthStart, MINGGU_REP_DAY, pad2 } from '../../utils/periode'
import { isPeriodeLocked } from '../../utils/lock'

// Ajukan realisasi draft pada (kawasan, tahun, bulan) sekaligus.
// Bila `minggu` (1-4) dikirim, hanya minggu tersebut yang diajukan.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })

  const body = await readBody(event) as { kawasan_id?: number; tahun?: number; bulan?: number; minggu?: number }
  const kawasanId = Number(body.kawasan_id)
  const tahun = Number(body.tahun)
  const bulan = Number(body.bulan)
  const minggu = body.minggu == null ? null : Number(body.minggu)
  if (!kawasanId || !tahun || !bulan) throw createError({ statusCode: 400, message: 'kawasan_id, tahun, bulan wajib' })
  if (minggu != null && ![1, 2, 3, 4].includes(minggu)) throw createError({ statusCode: 400, message: 'minggu harus 1-4' })
  if (await isPeriodeLocked(tahun, bulan, kawasanId)) throw createError({ statusCode: 409, message: 'Periode sudah dikunci' })

  const mStart = monthStart(tahun, bulan)
  const nStart = nextMonthStart(tahun, bulan)

  // Filter per minggu memakai tanggal representatif (hari ke-1/8/15/22).
  let rangeStart = mStart
  let rangeEnd = nStart
  if (minggu != null) {
    const day = pad2(MINGGU_REP_DAY[minggu as 1 | 2 | 3 | 4])
    const tgl = `${tahun}-${pad2(bulan)}-${day}`
    rangeStart = tgl
    rangeEnd = `${tahun}-${pad2(bulan)}-${pad2(Number(day) + 1)}`
  }

  const drafts = await query<{ id: number }>(
    `SELECT r.id FROM realisasi r JOIN jenis_retribusi jr ON jr.id = r.jenis_retribusi_id
     WHERE jr.kawasan_id = ? AND r.tanggal >= ? AND r.tanggal < ? AND r.status = 'draft'`,
    [kawasanId, rangeStart, rangeEnd],
  )
  if (!drafts.length) return { ok: true, count: 0 }
  await execute(
    `UPDATE realisasi SET status = 'diajukan', updated_at = datetime('now')
     WHERE id IN (${drafts.map(() => '?').join(',')})`,
    drafts.map((d) => d.id),
  )
  try {
    await execute('INSERT INTO audit_log (user_id, aksi, entitas, entitas_id, after) VALUES (?, ?, ?, ?, ?)',
      [Number(session.user.id), 'AJUKAN_MASSAL', 'realisasi', `${tahun}-${bulan}-${kawasanId}`, minggu != null ? `Ajukan ${drafts.length} realisasi Minggu ${minggu}` : `Ajukan ${drafts.length} realisasi`])
  } catch {}
  return { ok: true, count: drafts.length }
})
