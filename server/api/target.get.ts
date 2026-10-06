import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const q = getQuery(event) as { jenis_retribusi_id?: string; tahun?: string; kawasan_id?: string }
  const jenisId = q.jenis_retribusi_id ? Number(q.jenis_retribusi_id) : 0
  const tahun = q.tahun ? Number(q.tahun) : 0
  const kawasanId = q.kawasan_id ? Number(q.kawasan_id) : 0

  // Single lookup — backward compat for pad.vue preview
  if (jenisId && tahun) {
    const rows = await query<{ nilai: number }>('SELECT nilai FROM target WHERE jenis_retribusi_id = ? AND tahun = ?', [jenisId, tahun])
    return { nilai: rows[0]?.nilai ?? 0 }
  }

  // List mode — used by master target page
  if (tahun) {
    const where: string[] = ['t.tahun = ?']
    const params: unknown[] = [tahun]
    if (kawasanId) { where.push('jr.kawasan_id = ?'); params.push(kawasanId) }
    const sql = `
      SELECT t.id, t.jenis_retribusi_id, t.tahun, t.nilai,
             jr.kode, jr.nama, jr.level, jr.kawasan_id,
             k.kode AS kawasan_kode, k.nama AS kawasan_nama
      FROM target t
      JOIN jenis_retribusi jr ON jr.id = t.jenis_retribusi_id
      JOIN kawasan k ON k.id = jr.kawasan_id
      WHERE ${where.join(' AND ')}
      ORDER BY k.urutan ASC, jr.level ASC, jr.urutan ASC
    `
    const data = await query(sql, params)
    return { data }
  }

  throw createError({ statusCode: 400, message: 'tahun wajib' })
})
