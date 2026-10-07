import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const q = getQuery(event) as { kawasan_id?: string }
  const kawasanId = Number(q.kawasan_id)
  const hasFilter = Number.isFinite(kawasanId) && kawasanId > 0
  const sql = hasFilter
    ? `SELECT jr.id, jr.kawasan_id, jr.parent_id, jr.kode, jr.nama, jr.level, jr.urutan, jr.aktif, jr.tarif,
              k.nama AS kawasan_nama, k.kode AS kawasan_kode,
              CASE WHEN EXISTS (SELECT 1 FROM jenis_retribusi c WHERE c.parent_id = jr.id) THEN 1 ELSE 0 END AS has_child
       FROM jenis_retribusi jr JOIN kawasan k ON k.id = jr.kawasan_id
       WHERE jr.kawasan_id = ? ORDER BY k.urutan ASC, jr.level ASC, jr.urutan ASC, jr.id ASC`
    : `SELECT jr.id, jr.kawasan_id, jr.parent_id, jr.kode, jr.nama, jr.level, jr.urutan, jr.aktif, jr.tarif,
              k.nama AS kawasan_nama, k.kode AS kawasan_kode,
              CASE WHEN EXISTS (SELECT 1 FROM jenis_retribusi c WHERE c.parent_id = jr.id) THEN 1 ELSE 0 END AS has_child
       FROM jenis_retribusi jr JOIN kawasan k ON k.id = jr.kawasan_id
       ORDER BY k.urutan ASC, jr.level ASC, jr.urutan ASC, jr.id ASC`
  const rows = hasFilter ? await query(sql, [kawasanId]) : await query(sql)
  return { data: rows }
})
