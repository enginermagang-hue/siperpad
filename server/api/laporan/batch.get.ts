import { query } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const q = getQuery(event) as { kawasan_id?: string; tahun?: string; status?: string }
  const where: string[] = []
  const params: unknown[] = []
  if (q.kawasan_id) { where.push('b.kawasan_id = ?'); params.push(Number(q.kawasan_id)) }
  if (q.tahun) { where.push('b.tahun = ?'); params.push(Number(q.tahun)) }
  if (q.status) { where.push('b.status = ?'); params.push(q.status.trim()) }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const sql = `
    SELECT b.*, k.kode AS kawasan_kode, k.nama AS kawasan_nama,
           u1.nama AS diajukan_nama, u2.nama AS verified_nama
    FROM laporan_batch b
    JOIN kawasan k ON k.id = b.kawasan_id
    LEFT JOIN users u1 ON u1.id = b.diajukan_oleh
    LEFT JOIN users u2 ON u2.id = b.verified_by
    ${whereSql}
    ORDER BY b.tahun DESC, b.periode_start DESC, b.id DESC
  `
  const data = await query(sql, params)
  return { data }
})
