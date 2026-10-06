import { query, execute } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID tidak valid' })

  const existing = await query<{ status: string }>('SELECT status FROM realisasi WHERE id = ?', [id])
  if (!existing.length) throw createError({ statusCode: 404, message: 'Realisasi tidak ditemukan' })
  if (existing[0]!.status !== 'draft') throw createError({ statusCode: 409, message: 'Hanya draft yang bisa diedit' })

  const body = await readBody(event) as { jenis_retribusi_id?: number; tanggal?: string; jumlah?: number; catatan?: string; batch_id?: number | null }
  const jenisId = body.jenis_retribusi_id != null ? Number(body.jenis_retribusi_id) : undefined
  const tanggal = body.tanggal != null ? String(body.tanggal).trim() : undefined
  const jumlah = body.jumlah != null ? Number(body.jumlah) : undefined
  const catatan = body.catatan != null ? String(body.catatan).trim() : undefined
  const batch_id = body.batch_id === undefined ? undefined : (body.batch_id == null ? null : Number(body.batch_id))

  if (jenisId != null) {
    const jr = await query('SELECT id FROM jenis_retribusi WHERE id = ?', [jenisId])
    if (!jr.length) throw createError({ statusCode: 404, message: 'Jenis retribusi tidak ditemukan' })
    const hasChild = await query<{ n: number }>('SELECT COUNT(*) as n FROM jenis_retribusi WHERE parent_id = ?', [jenisId])
    if (Number(hasChild[0]?.n) > 0) throw createError({ statusCode: 400, message: 'Tidak bisa input pada baris kategori. Pilih sub-pos (contoh: a. Motor / b. Mobil).' })
  }
  if (tanggal != null && !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw createError({ statusCode: 400, message: 'Tanggal harus YYYY-MM-DD' })
  if (jumlah != null && (!Number.isFinite(jumlah) || jumlah < 0)) throw createError({ statusCode: 400, message: 'Jumlah harus >= 0' })

  const sets: string[] = []
  const params: unknown[] = []
  if (jenisId != null) { sets.push('jenis_retribusi_id = ?'); params.push(jenisId) }
  if (tanggal != null) { sets.push('tanggal = ?'); params.push(tanggal) }
  if (jumlah != null) { sets.push('jumlah = ?'); params.push(Math.round(jumlah)) }
  if (catatan != null) { sets.push('catatan = ?'); params.push(catatan) }
  if (batch_id !== undefined) { sets.push('batch_id = ?'); params.push(batch_id) }
  if (!sets.length) throw createError({ statusCode: 400, message: 'Tidak ada field untuk diupdate' })
  sets.push("updated_at = datetime('now')")
  params.push(id)

  await execute(`UPDATE realisasi SET ${sets.join(', ')} WHERE id = ?`, params)
  return { ok: true }
})
