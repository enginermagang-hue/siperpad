import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const rows = await query('SELECT id, kode, nama, urutan, aktif FROM kawasan ORDER BY urutan ASC, id ASC')
  return { data: rows }
})
