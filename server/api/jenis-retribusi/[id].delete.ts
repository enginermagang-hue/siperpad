import { execute, query } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (session.user.role !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID tidak valid' })
  const existing = await query('SELECT id FROM jenis_retribusi WHERE id = ?', [id])
  if (!existing.length) throw createError({ statusCode: 404, message: 'Jenis retribusi tidak ditemukan' })
  // soft delete: nonaktifkan agar histori target/realisasi tetap terjaga
  await execute('UPDATE jenis_retribusi SET aktif = 0 WHERE id = ?', [id])
  return { ok: true }
})
