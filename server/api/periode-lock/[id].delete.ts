import { execute, query } from '../../utils/db'

// Buka kunci periode. Admin only.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin dapat membuka periode' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID tidak valid' })
  const rows = await query<{ tahun: number; bulan: number; kawasan_id: number }>('SELECT tahun, bulan, kawasan_id FROM periode_lock WHERE id = ?', [id])
  if (!rows.length) throw createError({ statusCode: 404, message: 'Kunci periode tidak ditemukan' })
  const r = rows[0]!
  await execute('DELETE FROM periode_lock WHERE id = ?', [id])
  try {
    await execute('INSERT INTO audit_log (user_id, aksi, entitas, entitas_id, after) VALUES (?, ?, ?, ?, ?)',
      [Number(session.user.id), 'BUKA_PERIODE', 'periode_lock', String(id), `Buka kunci periode ${r.bulan}/${r.tahun} kawasan ${r.kawasan_id}`])
  } catch {}
  return { ok: true }
})
