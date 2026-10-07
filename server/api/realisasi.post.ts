import { query } from '../utils/db'
import { assertPeriodeOpen, kawasanIdOfJenis } from '../utils/lock'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin dapat input realisasi' })

  const body = await readBody(event) as { jenis_retribusi_id?: number; tanggal?: string; jumlah?: number; catatan?: string; batch_id?: number | null }
  const jenisId = Number(body.jenis_retribusi_id)
  const tanggal = (body.tanggal || '').trim()
  const jumlah = Number(body.jumlah)
  const catatan = (body.catatan || '').trim()
  const batch_id = body.batch_id != null ? Number(body.batch_id) : null

  if (!jenisId) throw createError({ statusCode: 400, message: 'Jenis retribusi wajib dipilih' })
  if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw createError({ statusCode: 400, message: 'Tanggal wajib format YYYY-MM-DD' })
  if (!Number.isFinite(jumlah) || jumlah < 0) throw createError({ statusCode: 400, message: 'Jumlah harus >= 0' })

  const jr = await query<{ id: number; aktif: number }>('SELECT id, aktif FROM jenis_retribusi WHERE id = ?', [jenisId])
  if (!jr.length) throw createError({ statusCode: 404, message: 'Jenis retribusi tidak ditemukan' })
  if (!jr[0]!.aktif) throw createError({ statusCode: 400, message: 'Jenis retribusi nonaktif' })
  // Model A: baris kategori (punya anak) tidak bisa diinput — pilih pos daun
  const hasChild = await query<{ n: number }>('SELECT COUNT(*) as n FROM jenis_retribusi WHERE parent_id = ?', [jenisId])
  if (Number(hasChild[0]?.n) > 0) throw createError({ statusCode: 400, message: 'Tidak bisa input pada baris kategori. Pilih sub-pos (contoh: a. Motor / b. Mobil).' })

  const kawasanId = await kawasanIdOfJenis(jenisId)
  if (kawasanId != null) await assertPeriodeOpen(tanggal, kawasanId)

  if (batch_id != null) {
    const b = await query('SELECT id FROM laporan_batch WHERE id = ?', [batch_id])
    if (!b.length) throw createError({ statusCode: 404, message: 'Batch tidak ditemukan' })
  }

  const created_by = Number(session.user.id)
  const rows = await query<{ id: number }>(
    `INSERT INTO realisasi (jenis_retribusi_id, tanggal, jumlah, catatan, batch_id, status, created_by)
     VALUES (?, ?, ?, ?, ?, 'draft', ?) RETURNING id`,
    [jenisId, tanggal, Math.round(jumlah), catatan, batch_id, created_by],
  )
  return { ok: true, id: rows[0]!.id }
})
