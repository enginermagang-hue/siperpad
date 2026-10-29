import { execute, query } from '../../../../utils/db'
import { assertKawasanAllowed } from '../../../../utils/lock'


export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'user') throw createError({ statusCode: 403, message: 'Hanya operator kawasan yang dapat mengajukan batch' })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID tidak valid' })
  const rows = await query<{ status: string; kawasan_id: number }>('SELECT status, kawasan_id FROM laporan_batch WHERE id = ?', [id])
  if (!rows.length) throw createError({ statusCode: 404, message: 'Batch tidak ditemukan' })

  // Scope petugas kawasan ke kawasannya saja.
  assertKawasanAllowed(session.user, rows[0]!.kawasan_id)

  if (rows[0]!.status !== 'draft') throw createError({ statusCode: 409, message: 'Hanya draft yang bisa diajukan' })
  // Atomic status transition.
  const res = await execute("UPDATE laporan_batch SET status = 'diajukan', diajukan_oleh = ?, diajukan_at = datetime('now') WHERE id = ? AND status = 'draft'", [Number(session.user.id), id])
  if (res.rowsChanged === 0) throw createError({ statusCode: 409, message: 'Hanya draft yang bisa diajukan' })
  try { await execute('INSERT INTO audit_log (user_id, aksi, entitas, entitas_id, before, after) VALUES (?, ?, ?, ?, ?, ?)', [Number(session.user.id), 'BATCH_AJUKAN', 'laporan_batch', String(id), 'draft', 'diajukan']) } catch (e: unknown) { console.error('audit log gagal:', e instanceof Error ? e.message : String(e)) }
  return { ok: true }
})
