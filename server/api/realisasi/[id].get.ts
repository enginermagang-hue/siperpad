import { query } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID tidak valid' })
  const rows = await query(
    `SELECT r.id, r.jenis_retribusi_id, r.tanggal, r.jumlah, r.catatan, r.batch_id, r.status, r.created_by, r.created_at,
            jr.kode AS jenis_kode, jr.nama AS jenis_nama, k.kode AS kawasan_kode, k.nama AS kawasan_nama,
            COALESCE(t.nilai,0) AS target_nilai
     FROM realisasi r JOIN jenis_retribusi jr ON jr.id=r.jenis_retribusi_id
     JOIN kawasan k ON k.id=jr.kawasan_id
     LEFT JOIN target t ON t.jenis_retribusi_id=r.jenis_retribusi_id AND t.tahun=CAST(substr(r.tanggal,1,4) AS INTEGER)
     WHERE r.id=?`,
    [id],
  )
  if (!rows.length) throw createError({ statusCode: 404, message: 'Realisasi tidak ditemukan' })
  const r = rows[0] as Record<string, unknown>
  const target = Number(r.target_nilai) || 0
  const jumlah = Number(r.jumlah) || 0
  return { data: { ...r, capaian: target > 0 ? Math.round((jumlah / target) * 10000) / 100 : 0 } }
})
