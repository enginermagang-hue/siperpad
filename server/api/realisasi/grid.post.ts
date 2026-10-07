import { query, execute } from '../../utils/db'
import { MINGGU_REP_DAY, pad2 } from '../../utils/periode'
import { assertPeriodeOpen, kawasanIdOfJenis } from '../../utils/lock'

// Simpan satu sel grid mingguan. Upsert realisasi pada tanggal representatif
// (hari ke-1/8/15/22) untuk (jenis, bulan, tahun). Hanya draft yang bisa diubah.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin dapat input realisasi' })

  const body = await readBody(event) as { jenis_retribusi_id?: number; tahun?: number; bulan?: number; minggu?: number; jumlah?: number; catatan?: string }
  const jenisId = Number(body.jenis_retribusi_id)
  const tahun = Number(body.tahun)
  const bulan = Number(body.bulan)
  const minggu = Number(body.minggu)
  const jumlah = Number(body.jumlah)
  const catatan = (body.catatan || '').trim()

  if (!jenisId || !tahun || !bulan || !minggu) throw createError({ statusCode: 400, message: 'jenis, tahun, bulan, minggu wajib' })
  if (bulan < 1 || bulan > 12) throw createError({ statusCode: 400, message: 'bulan tidak valid' })
  if (![1, 2, 3, 4].includes(minggu)) throw createError({ statusCode: 400, message: 'minggu harus 1-4' })
  if (!Number.isFinite(jumlah) || jumlah < 0) throw createError({ statusCode: 400, message: 'Jumlah harus >= 0' })

  const jr = await query<{ id: number; aktif: number }>('SELECT id, aktif FROM jenis_retribusi WHERE id = ?', [jenisId])
  if (!jr.length) throw createError({ statusCode: 404, message: 'Jenis retribusi tidak ditemukan' })
  if (!jr[0]!.aktif) throw createError({ statusCode: 400, message: 'Jenis retribusi nonaktif' })
  const hasChild = await query<{ n: number }>('SELECT COUNT(*) AS n FROM jenis_retribusi WHERE parent_id = ?', [jenisId])
  if (Number(hasChild[0]?.n) > 0) throw createError({ statusCode: 400, message: 'Tidak bisa input pada baris kategori' })

  const kawasanId = await kawasanIdOfJenis(jenisId)
  if (kawasanId == null) throw createError({ statusCode: 404, message: 'Kawasan tidak ditemukan' })

  const tanggal = `${tahun}-${pad2(bulan)}-${pad2(MINGGU_REP_DAY[minggu as 1 | 2 | 3 | 4])}`
  await assertPeriodeOpen(tanggal, kawasanId)

  const existing = await query<{ id: number; status: string }>(
    'SELECT id, status FROM realisasi WHERE jenis_retribusi_id = ? AND tanggal = ?',
    [jenisId, tanggal],
  )
  const userId = Number(session.user.id)

  if (existing.length) {
    if (existing[0]!.status !== 'draft') throw createError({ statusCode: 409, message: 'Realisasi minggu ini sudah diajukan/disetujui, tidak bisa diubah' })
    await execute("UPDATE realisasi SET jumlah = ?, catatan = ?, updated_at = datetime('now') WHERE id = ?", [Math.round(jumlah), catatan, existing[0]!.id])
    return { ok: true, id: existing[0]!.id, action: 'updated' }
  }
  const rows = await query<{ id: number }>(
    `INSERT INTO realisasi (jenis_retribusi_id, tanggal, jumlah, catatan, status, created_by)
     VALUES (?, ?, ?, ?, 'draft', ?) RETURNING id`,
    [jenisId, tanggal, Math.round(jumlah), catatan, userId],
  )
  return { ok: true, id: rows[0]!.id, action: 'created' }
})
