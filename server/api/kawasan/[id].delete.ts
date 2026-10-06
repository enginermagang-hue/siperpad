import { query, execute } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (session.user.role !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID tidak valid' })
  const existing = await query('SELECT id FROM kawasan WHERE id = ?', [id])
  if (!existing.length) throw createError({ statusCode: 404, message: 'Kawasan tidak ditemukan' })
  // cegah hapus jika masih dipakai jenis_retribusi / laporan_batch
  const used = await query('SELECT id FROM jenis_retribusi WHERE kawasan_id = ? LIMIT 1', [id])
  if (used.length) throw createError({ statusCode: 409, message: 'Kawasan masih dipakai jenis retribusi — nonaktifkan saja' })
  await execute('DELETE FROM kawasan WHERE id = ?', [id])
  return { ok: true }
})
