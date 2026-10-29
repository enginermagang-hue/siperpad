import { execute, query } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const role = String(session.user.role)
  if (role !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin (bendahara penerimaan) yang dapat memverifikasi batch' })
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID tidak valid' })
  const body = await readBody(event) as { aksi?: string }
  const aksi = String(body.aksi || '').trim()
  if (!['disetujui', 'ditolak'].includes(aksi)) throw createError({ statusCode: 400, message: 'Aksi harus disetujui/ditolak' })
  const rows = await query<{ status: string }>('SELECT status FROM laporan_batch WHERE id = ?', [id])
  if (!rows.length) throw createError({ statusCode: 404, message: 'Batch tidak ditemukan' })
  if (rows[0]!.status !== 'diajukan') throw createError({ statusCode: 409, message: 'Hanya diajukan yang bisa diverifikasi' })
  const before = rows[0]!.status
  // Atomic status transition.
  const res = await execute("UPDATE laporan_batch SET status = ?, verified_by = ?, verified_at = datetime('now') WHERE id = ? AND status = 'diajukan'", [aksi, Number(session.user.id), id])
  if (res.rowsChanged === 0) throw createError({ statusCode: 409, message: 'Hanya diajukan yang bisa diverifikasi' })
  try { await execute('INSERT INTO audit_log (user_id, aksi, entitas, entitas_id, before, after) VALUES (?, ?, ?, ?, ?, ?)', [Number(session.user.id), aksi === 'disetujui' ? 'BATCH_SETUJU' : 'BATCH_TOLAK', 'laporan_batch', String(id), before, aksi]) } catch (e: unknown) { console.error('audit log gagal:', e instanceof Error ? e.message : String(e)) }
  return { ok: true }
})
