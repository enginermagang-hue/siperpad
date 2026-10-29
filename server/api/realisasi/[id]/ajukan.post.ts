import { execute, query } from '../../../utils/db'
import { assertKawasanAllowed, kawasanIdOfJenis } from '../../../utils/lock'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'user') throw createError({ statusCode: 403, message: 'Hanya petugas input' })
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID tidak valid' })
  const rows = await query<{ status: string; jenis_retribusi_id: number }>('SELECT status, jenis_retribusi_id FROM realisasi WHERE id = ?', [id])
  if (!rows.length) throw createError({ statusCode: 404, message: 'Realisasi tidak ditemukan' })
  if (rows[0]!.status !== 'draft') throw createError({ statusCode: 409, message: 'Hanya draft yang bisa diajukan' })
  // Petugas hanya boleh mengajukan data pada kawasan penugasannya.
  assertKawasanAllowed(session.user, await kawasanIdOfJenis(Number(rows[0]!.jenis_retribusi_id)))

  // Atomic status transition: only update if still draft.
  const res = await execute("UPDATE realisasi SET status = 'diajukan', updated_at = datetime('now') WHERE id = ? AND status = 'draft'", [id])
  if (res.rowsChanged === 0) throw createError({ statusCode: 409, message: 'Hanya draft yang bisa diajukan' })
  return { ok: true }
})
