import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })
  const body = await readBody(event) as { jenis_retribusi_id?: number; tahun?: number; nilai?: number }
  const jenisId = Number(body.jenis_retribusi_id)
  const tahun = Number(body.tahun)
  const nilai = Number(body.nilai)
  if (!jenisId || !tahun) throw createError({ statusCode: 400, message: 'jenis_retribusi_id dan tahun wajib' })
  if (!Number.isFinite(nilai) || nilai < 0) throw createError({ statusCode: 400, message: 'Nilai harus >= 0' })
  const jr = await query('SELECT id FROM jenis_retribusi WHERE id = ?', [jenisId])
  if (!jr.length) throw createError({ statusCode: 404, message: 'Jenis retribusi tidak ditemukan' })
  const rows = await query<{ id: number }>('INSERT INTO target (jenis_retribusi_id, tahun, nilai) VALUES (?, ?, ?) ON CONFLICT(jenis_retribusi_id, tahun) DO UPDATE SET nilai = excluded.nilai RETURNING id', [jenisId, tahun, Math.round(nilai)])
  return { ok: true, id: rows[0]!.id }
})
