import { execute, query } from '../../utils/db'
import { sessionKawasanId } from '../../utils/lock'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID tidak valid' })

  // Fetch catatan untuk cek ownership & kawasan.
  const existing = await query<{ created_by: number; kawasan_id: number }>('SELECT created_by, kawasan_id FROM catatan_temuan WHERE id = ?', [id])
  if (!existing.length) throw createError({ statusCode: 404, message: 'Catatan tidak ditemukan' })

  const role = String(session.user.role)
  const isOwner = Number(existing[0]!.created_by) === Number(session.user.id)
  const isAdminOrKepala = ['admin', 'kepala'].includes(role)
  if (!isOwner && !isAdminOrKepala) throw createError({ statusCode: 403, message: 'Anda tidak berhak mengedit catatan ini' })

  // Scope petugas kawasan.
  const scoped = sessionKawasanId(session.user)
  if (scoped != null && Number(existing[0]!.kawasan_id) !== scoped) {
    throw createError({ statusCode: 403, message: 'Anda hanya dapat mengedit catatan kawasan penugasan Anda' })
  }

  const body = await readBody(event) as { isi?: string; status?: string }
  const sets: string[] = []
  const params: unknown[] = []
  if (body.isi != null) { sets.push('isi = ?'); params.push(String(body.isi).trim()) }
  if (body.status != null) {
    if (!['terbuka', 'selesai'].includes(String(body.status))) throw createError({ statusCode: 400, message: 'Status tidak valid' })
    sets.push('status = ?'); params.push(String(body.status))
  }
  if (!sets.length) throw createError({ statusCode: 400, message: 'Tidak ada field untuk diupdate' })
  params.push(id)
  await execute(`UPDATE catatan_temuan SET ${sets.join(', ')} WHERE id = ?`, params)
  return { ok: true }
})
