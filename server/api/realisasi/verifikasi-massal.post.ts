import { query, execute } from '../../utils/db'

// Verifikasi massal: setujui/tolak semua realisasi diajukan pada periode.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const role = String(session.user.role)
  if (!['verifikator', 'kepala', 'admin'].includes(role)) throw createError({ statusCode: 403, message: 'Hanya verifikator/kepala' })

  const body = await readBody(event) as { ids?: number[]; aksi?: string; catatan?: string }
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter((n) => n > 0) : []
  const aksi = String(body.aksi || '').trim()
  if (!ids.length) throw createError({ statusCode: 400, message: 'ids wajib' })
  if (!['disetujui', 'ditolak'].includes(aksi)) throw createError({ statusCode: 400, message: 'Aksi harus disetujui atau ditolak' })

  const placeholders = ids.map(() => '?').join(',')
  const eligible = await query<{ id: number }>(
    `SELECT id FROM realisasi WHERE id IN (${placeholders}) AND status = 'diajukan'`,
    ids,
  )
  if (!eligible.length) return { ok: true, count: 0 }
  const eligibleIds = eligible.map((r) => r.id)
  await execute(
    `UPDATE realisasi SET status = ?, updated_at = datetime('now') WHERE id IN (${eligibleIds.map(() => '?').join(',')})`,
    [aksi, ...eligibleIds],
  )
  try {
    await execute('INSERT INTO audit_log (user_id, aksi, entitas, entitas_id, before, after) VALUES (?, ?, ?, ?, ?, ?)',
      [Number(session.user.id), aksi === 'disetujui' ? 'VERIFIKASI_MASSAL_SETUJU' : 'VERIFIKASI_MASSAL_TOLAK', 'realisasi', eligibleIds.join(','), 'diajukan', aksi])
  } catch {}
  return { ok: true, count: eligibleIds.length }
})
