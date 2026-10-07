import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const q = getQuery(event) as { tahun?: string; bulan?: string; kawasan_id?: string; status?: string }
  const where: string[] = []
  const params: unknown[] = []
  if (q.tahun) { where.push('ct.tahun = ?'); params.push(Number(q.tahun)) }
  if (q.bulan) { where.push('ct.bulan = ?'); params.push(Number(q.bulan)) }
  if (q.kawasan_id) { where.push('ct.kawasan_id = ?'); params.push(Number(q.kawasan_id)) }
  if (q.status) { where.push('ct.status = ?'); params.push(String(q.status)) }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const data = await query(
    `SELECT ct.*, k.kode AS kawasan_kode, k.nama AS kawasan_nama, jr.kode AS jenis_kode, jr.nama AS jenis_nama, u.nama AS created_by_nama
     FROM catatan_temuan ct
     JOIN kawasan k ON k.id = ct.kawasan_id
     LEFT JOIN jenis_retribusi jr ON jr.id = ct.jenis_retribusi_id
     LEFT JOIN users u ON u.id = ct.created_by
     ${whereSql}
     ORDER BY ct.tahun DESC, ct.bulan DESC, ct.id DESC
     LIMIT 200`,
    params,
  )
  return { data }
})
