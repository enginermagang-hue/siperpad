import { query } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID tidak valid' })
  const rows = await query('SELECT id, kode, nama, urutan, aktif FROM kawasan WHERE id = ?', [id])
  if (!rows.length) throw createError({ statusCode: 404, message: 'Kawasan tidak ditemukan' })
  return { data: rows[0] }
})
