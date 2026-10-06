import { execute, query } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const role = String(session.user.role)
  if (!['verifikator', 'kepala', 'admin'].includes(role)) throw createError({ statusCode: 403, message: 'Hanya verifikator/kepala' })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID tidak valid' })
  const body = await readBody(event) as { aksi?: string }
  const aksi = String(body.aksi || '').trim()
  if (!['disetujui', 'ditolak'].includes(aksi)) throw createError({ statusCode: 400, message: 'Aksi harus disetujui/ditolak' })
  const rows = await query<{ status: string }>('SELECT status FROM laporan_batch WHERE id = ?', [id])
  if (!rows.length) throw createError({ statusCode: 404, message: 'Batch tidak ditemukan' })
  if (rows[0]!.status !== 'diajukan') throw createError({ statusCode: 409, message: 'Hanya diajukan yang bisa diverifikasi' })
  const before = rows[0]!.status
  await execute('UPDATE laporan_batch SET status = ?, verified_by = ?, verified_at = datetime(\'now\') WHERE id = ?', [aksi, Number(session.user.id), id])
  try { await execute('INSERT INTO audit_log (user_id, aksi, entitas, entitas_id, before, after) VALUES (?, ?, ?, ?, ?, ?)', [Number(session.user.id), aksi === 'disetujui' ? 'BATCH_SETUJU' : 'BATCH_TOLAK', 'laporan_batch', String(id), before, aksi]) } catch {}
  return { ok: true }
})
