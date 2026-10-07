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

  // Model A: nilai resmi induk = SUM anak. Bila jenis ini punya anak, angka
  // yang diinput admin disimpan sebagai `nilai_induk` (terpisah) untuk
  // mendeteksi anomali; kolom `nilai` diset 0 agar rollup memakai SUM anak.
  const hasChild = await query<{ n: number }>('SELECT COUNT(*) AS n FROM jenis_retribusi WHERE parent_id = ?', [jenisId])
  const isParent = Number(hasChild[0]?.n) > 0

  const rows = await query<{ id: number }>(
    `INSERT INTO target (jenis_retribusi_id, tahun, nilai, nilai_induk)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(jenis_retribusi_id, tahun)
     DO UPDATE SET nilai = excluded.nilai, nilai_induk = excluded.nilai_induk
     RETURNING id`,
    [jenisId, tahun, isParent ? 0 : Math.round(nilai), isParent ? Math.round(nilai) : null],
  )
  return { ok: true, id: rows[0]!.id, isParent }
})
