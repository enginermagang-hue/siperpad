import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })

  const q = getQuery(event) as { kawasan_id?: string; jenis_retribusi_id?: string; status?: string; from?: string; to?: string }
  const kawasanId = q.kawasan_id ? Number(q.kawasan_id) : undefined
  const jenisId = q.jenis_retribusi_id ? Number(q.jenis_retribusi_id) : undefined
  const status = q.status?.trim() || undefined
  const from = q.from?.trim() || undefined
  const to = q.to?.trim() || undefined

  const where: string[] = []
  const params: unknown[] = []

  if (kawasanId) { where.push('jr.kawasan_id = ?'); params.push(kawasanId) }
  if (jenisId) { where.push('r.jenis_retribusi_id = ?'); params.push(jenisId) }
  if (status) { where.push('r.status = ?'); params.push(status) }
  if (from) { where.push('r.tanggal >= ?'); params.push(from) }
  if (to) { where.push('r.tanggal <= ?'); params.push(to) }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const sql = `
    SELECT r.id, r.jenis_retribusi_id, r.tanggal, r.jumlah, r.catatan, r.batch_id, r.status, r.created_by, r.created_at,
           jr.kode AS jenis_kode, jr.nama AS jenis_nama, jr.level AS jenis_level,
           k.id AS kawasan_id, k.kode AS kawasan_kode, k.nama AS kawasan_nama,
           COALESCE(t.nilai, 0) AS target_nilai
    FROM realisasi r
    JOIN jenis_retribusi jr ON jr.id = r.jenis_retribusi_id
    JOIN kawasan k ON k.id = jr.kawasan_id
    LEFT JOIN target t ON t.jenis_retribusi_id = r.jenis_retribusi_id AND t.tahun = CAST(substr(r.tanggal,1,4) AS INTEGER)
    ${whereSql}
    ORDER BY r.tanggal DESC, r.id DESC
    LIMIT 500
  `
  const rows = await query(sql, params)
  const data = rows.map((r) => {
    const target = Number((r as Record<string, unknown>).target_nilai) || 0
    const jumlah = Number((r as Record<string, unknown>).jumlah) || 0
    const capaian = target > 0 ? Math.round((jumlah / target) * 10000) / 100 : 0
    return { ...r, capaian }
  })
  return { data }
})
