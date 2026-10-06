import { execute, query } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const role = String(session.user.role)
  if (!['verifikator', 'kepala', 'admin'].includes(role)) throw createError({ statusCode: 403, message: 'Hanya verifikator/kepala' })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID tidak valid' })
  const body = await readBody(event) as { aksi?: string; catatan?: string }
  const aksi = String(body.aksi || '').trim() // disetujui | ditolak
  if (!['disetujui', 'ditolak'].includes(aksi)) throw createError({ statusCode: 400, message: 'Aksi harus disetujui atau ditolak' })

  const rows = await query<{ status: string }>('SELECT status FROM realisasi WHERE id = ?', [id])
  if (!rows.length) throw createError({ statusCode: 404, message: 'Realisasi tidak ditemukan' })
  if (rows[0]!.status !== 'diajukan') throw createError({ statusCode: 409, message: 'Hanya yang diajukan bisa diverifikasi' })

  const before = rows[0]!.status
  await execute("UPDATE realisasi SET status = ?, updated_at = datetime('now') WHERE id = ?", [aksi, id])
  try {
    await execute('INSERT INTO audit_log (user_id, aksi, entitas, entitas_id, before, after) VALUES (?, ?, ?, ?, ?, ?)', [Number(session.user.id), aksi === 'disetujui' ? 'VERIFIKASI_SETUJU' : 'VERIFIKASI_TOLAK', 'realisasi', String(id), before, aksi])
  } catch {}
  return { ok: true }
})
