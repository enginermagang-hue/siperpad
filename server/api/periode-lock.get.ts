import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const q = getQuery(event) as { tahun?: string; kawasan_id?: string }
  const tahun = q.tahun ? Number(q.tahun) : new Date().getFullYear()
  const kawasanId = q.kawasan_id ? Number(q.kawasan_id) : undefined

  const where: string[] = ['pl.tahun = ?']
  const params: unknown[] = [tahun]
  if (kawasanId) { where.push('pl.kawasan_id = ?'); params.push(kawasanId) }

  const data = await query(
    `SELECT pl.id, pl.tahun, pl.bulan, pl.kawasan_id, pl.locked_at,
            k.kode AS kawasan_kode, k.nama AS kawasan_nama,
            u.nama AS locked_by_nama
     FROM periode_lock pl
     JOIN kawasan k ON k.id = pl.kawasan_id
     LEFT JOIN users u ON u.id = pl.locked_by
     WHERE ${where.join(' AND ')}
     ORDER BY pl.bulan ASC, k.urutan ASC`,
    params,
  )
  return { data }
})
