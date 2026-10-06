import { query } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })
  const body = await readBody(event) as { kawasan_id?: number; periode_type?: string; periode_start?: string; periode_end?: string; tahun?: number; catatan?: string }
  const kawasan_id = Number(body.kawasan_id)
  const periode_type = String(body.periode_type || 'bulanan').trim()
  const periode_start = String(body.periode_start || '').trim()
  const periode_end = String(body.periode_end || '').trim()
  const tahun = Number(body.tahun)
  const catatan = String(body.catatan || '').trim()
  if (!kawasan_id) throw createError({ statusCode: 400, message: 'Kawasan wajib' })
  if (!['mingguan','bulanan','semester','tahunan'].includes(periode_type)) throw createError({ statusCode: 400, message: 'periode_type tidak valid' })
  if (!periode_start || !periode_end) throw createError({ statusCode: 400, message: 'periode_start/end wajib' })
  if (!tahun) throw createError({ statusCode: 400, message: 'tahun wajib' })
  const k = await query('SELECT id FROM kawasan WHERE id = ?', [kawasan_id])
  if (!k.length) throw createError({ statusCode: 404, message: 'Kawasan tidak ditemukan' })
  const rows = await query<{ id: number }>('INSERT INTO laporan_batch (kawasan_id, periode_type, periode_start, periode_end, tahun, status, catatan) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id', [kawasan_id, periode_type, periode_start, periode_end, tahun, 'draft', catatan])
  return { ok: true, id: rows[0]!.id }
})
