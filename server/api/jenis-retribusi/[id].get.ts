import { query } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID tidak valid' })
  const rows = await query('SELECT id, kawasan_id, parent_id, kode, nama, level, urutan, aktif FROM jenis_retribusi WHERE id = ?', [id])
  if (!rows.length) throw createError({ statusCode: 404, message: 'Jenis retribusi tidak ditemukan' })
  return { data: rows[0] }
})
