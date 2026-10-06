import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const q = getQuery(event) as { entitas?: string; entitas_id?: string; aksi?: string; limit?: string }
  const where: string[] = []
  const params: unknown[] = []
  if (q.entitas) { where.push('a.entitas = ?'); params.push(q.entitas.trim()) }
  if (q.entitas_id) { where.push('a.entitas_id = ?'); params.push(q.entitas_id.trim()) }
  if (q.aksi) { where.push('a.aksi = ?'); params.push(q.aksi.trim()) }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 200)
  const sql = `
    SELECT a.*, u.nama AS user_nama, u.email AS user_email
    FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
    ${whereSql}
    ORDER BY a.at DESC, a.id DESC LIMIT ?
  `
  params.push(limit)
  const data = await query(sql, params)
  return { data }
})
