import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })
  const rows = await query(
    `SELECT u.id, u.nama, u.nip, u.email, u.role, u.kawasan_id, u.aktif, u.created_at,
            k.kode AS kawasan_kode, k.nama AS kawasan_nama
     FROM users u LEFT JOIN kawasan k ON k.id = u.kawasan_id
     ORDER BY u.id ASC`,
  )
  return { data: rows }
})
