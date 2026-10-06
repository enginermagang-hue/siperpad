import { execute, query } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID tidak valid' })
  const rows = await query<{ status: string }>('SELECT status FROM laporan_batch WHERE id = ?', [id])
  if (!rows.length) throw createError({ statusCode: 404, message: 'Batch tidak ditemukan' })
  if (rows[0]!.status !== 'draft') throw createError({ statusCode: 409, message: 'Hanya draft yang bisa diajukan' })
  await execute("UPDATE laporan_batch SET status = 'diajukan', diajukan_oleh = ?, diajukan_at = datetime('now') WHERE id = ?", [Number(session.user.id), id])
  try { await execute('INSERT INTO audit_log (user_id, aksi, entitas, entitas_id, before, after) VALUES (?, ?, ?, ?, ?, ?)', [Number(session.user.id), 'BATCH_AJUKAN', 'laporan_batch', String(id), 'draft', 'diajukan']) } catch {}
  return { ok: true }
})
