import { execute, query } from '../../utils/db'
import { assertPeriodeOpen, kawasanIdOfJenis } from '../../utils/lock'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID tidak valid' })
  const rows = await query<{ status: string; tanggal: string; jenis_retribusi_id: number }>('SELECT status, tanggal, jenis_retribusi_id FROM realisasi WHERE id = ?', [id])
  if (!rows.length) throw createError({ statusCode: 404, message: 'Realisasi tidak ditemukan' })
  if (rows[0]!.status !== 'draft') throw createError({ statusCode: 409, message: 'Hanya draft yang bisa dihapus' })
  const kawasanId = await kawasanIdOfJenis(Number(rows[0]!.jenis_retribusi_id))
  if (kawasanId != null) await assertPeriodeOpen(String(rows[0]!.tanggal), kawasanId)
  await execute('DELETE FROM realisasi WHERE id = ?', [id])
  return { ok: true }
})
