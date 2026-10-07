import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const body = await readBody(event) as { tahun?: number; bulan?: number; kawasan_id?: number; jenis_retribusi_id?: number | null; isi?: string }
  const tahun = Number(body.tahun)
  const bulan = Number(body.bulan)
  const kawasanId = Number(body.kawasan_id)
  const jenisId = body.jenis_retribusi_id != null ? Number(body.jenis_retribusi_id) : null
  const isi = (body.isi || '').trim()
  if (!tahun || !bulan || !kawasanId) throw createError({ statusCode: 400, message: 'tahun, bulan, kawasan_id wajib' })
  if (!isi) throw createError({ statusCode: 400, message: 'Isi catatan wajib' })

  const rows = await query<{ id: number }>(
    `INSERT INTO catatan_temuan (tahun, bulan, kawasan_id, jenis_retribusi_id, isi, status, created_by)
     VALUES (?, ?, ?, ?, ?, 'terbuka', ?) RETURNING id`,
    [tahun, bulan, kawasanId, jenisId, isi, Number(session.user.id)],
  )
  return { ok: true, id: rows[0]!.id }
})
