import { execute, query } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID tidak valid' })
  const body = await readBody(event) as { isi?: string; status?: string }
  const sets: string[] = []
  const params: unknown[] = []
  if (body.isi != null) { sets.push('isi = ?'); params.push(String(body.isi).trim()) }
  if (body.status != null) {
    if (!['terbuka', 'selesai'].includes(String(body.status))) throw createError({ statusCode: 400, message: 'Status tidak valid' })
    sets.push('status = ?'); params.push(String(body.status))
  }
  if (!sets.length) throw createError({ statusCode: 400, message: 'Tidak ada field untuk diupdate' })
  const exists = await query('SELECT id FROM catatan_temuan WHERE id = ?', [id])
  if (!exists.length) throw createError({ statusCode: 404, message: 'Catatan tidak ditemukan' })
  params.push(id)
  await execute(`UPDATE catatan_temuan SET ${sets.join(', ')} WHERE id = ?`, params)
  return { ok: true }
})
