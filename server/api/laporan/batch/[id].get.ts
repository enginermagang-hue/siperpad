import { query } from '../../../utils/db'
import { sessionKawasanId } from '../../../utils/lock'
import { dayToBucket } from '../../../utils/periode'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID tidak valid' })

  const rows = await query(
    `SELECT b.*, k.kode AS kawasan_kode, k.nama AS kawasan_nama,
            u1.nama AS diajukan_nama, u1.email AS diajukan_email,
            u2.nama AS verified_nama, u2.email AS verified_email
     FROM laporan_batch b
     JOIN kawasan k ON k.id = b.kawasan_id
     LEFT JOIN users u1 ON u1.id = b.diajukan_oleh
     LEFT JOIN users u2 ON u2.id = b.verified_by
     WHERE b.id = ?`,
    [id],
  )
  if (!rows.length) throw createError({ statusCode: 404, message: 'Batch tidak ditemukan' })

  const batch = rows[0] as Record<string, unknown>

  // Petugas hanya boleh melihat batch kawasan penugasannya.
  const scoped = sessionKawasanId(session.user)
  if (scoped != null && Number(batch.kawasan_id) !== scoped) {
    throw createError({ statusCode: 403, message: 'Anda hanya dapat mengakses batch kawasan penugasan Anda' })
  }

  // Realisasi yang eksplisit ter-attach ke batch ini.
  const itemRows = await query(
    `SELECT r.id, r.jenis_retribusi_id, r.tanggal, r.jumlah, r.kuantitas, r.tarif, r.catatan,
            r.batch_id, r.status, r.created_by, r.created_at,
            jr.kode AS jenis_kode, jr.nama AS jenis_nama, jr.level AS jenis_level,
            k.id AS kawasan_id, k.kode AS kawasan_kode, k.nama AS kawasan_nama,
            COALESCE(t.nilai, 0) AS target_nilai
     FROM realisasi r
     JOIN jenis_retribusi jr ON jr.id = r.jenis_retribusi_id
     JOIN kawasan k ON k.id = jr.kawasan_id
     LEFT JOIN target t ON t.jenis_retribusi_id = r.jenis_retribusi_id
                        AND t.tahun = CAST(substr(r.tanggal, 1, 4) AS INTEGER)
     WHERE r.batch_id = ?
     ORDER BY r.tanggal ASC, r.id ASC`,
    [id],
  )

  const items = itemRows.map((r) => {
    const rr = r as Record<string, unknown>
    const target = Number(rr.target_nilai) || 0
    const jumlah = Number(rr.jumlah) || 0
    const capaian = target > 0 ? Math.round((jumlah / target) * 10000) / 100 : 0
    const day = Number(String(rr.tanggal).slice(8, 10)) || 0
    return { ...rr, capaian, minggu: dayToBucket(day) }
  })

  return { batch, items }
})
