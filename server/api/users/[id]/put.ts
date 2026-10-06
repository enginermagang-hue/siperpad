import { execute, query } from '../../../utils/db'
import { scryptSync, randomBytes } from 'node:crypto'
function hashPassword(pw: string) { const s = randomBytes(16).toString('hex'); return `${s}$${scryptSync(pw, s, 64).toString('hex')}` }

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID tidak valid' })
  if (id === Number(session.user.id)) throw createError({ statusCode: 400, message: 'Tidak bisa ubah akun sendiri via endpoint ini' })
  const ex = await query('SELECT id FROM users WHERE id = ?', [id])
  if (!ex.length) throw createError({ statusCode: 404, message: 'User tidak ditemukan' })
  const b = await readBody(event) as { nama?: string; nip?: string; email?: string; password?: string; role?: string; aktif?: number }
  const sets: string[] = []
  const params: unknown[] = []
  if (b.nama != null) { const v = String(b.nama).trim(); if (!v) throw createError({ statusCode: 400, message: 'Nama wajib' }); sets.push('nama = ?'); params.push(v) }
  if (b.nip !== undefined) { sets.push('nip = ?'); params.push(String(b.nip).trim()) }
  if (b.email != null) { const v = String(b.email).trim().toLowerCase(); if (!v) throw createError({ statusCode: 400, message: 'Email wajib' }); sets.push('email = ?'); params.push(v) }
  if (b.role != null) { const v = String(b.role).trim(); if (!['admin','verifikator','kepala'].includes(v)) throw createError({ statusCode: 400, message: 'Role tidak valid' }); sets.push('role = ?'); params.push(v) }
  if (b.aktif !== undefined) { sets.push('aktif = ?'); params.push(Number(b.aktif) ? 1 : 0) }
  if (b.password) { if (String(b.password).length < 6) throw createError({ statusCode: 400, message: 'Password minimal 6 karakter' }); sets.push('password_hash = ?'); params.push(hashPassword(String(b.password))) }
  if (!sets.length) throw createError({ statusCode: 400, message: 'Tidak ada field untuk diupdate' })
  sets.push("updated_at = datetime('now')")
  params.push(id)
  try { await execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params); return { ok: true } }
  catch (e: unknown) { const m = e instanceof Error ? e.message : String(e); if (m.includes('UNIQUE')) throw createError({ statusCode: 409, message: 'Email sudah dipakai' }); throw createError({ statusCode: 500, message: m }) }
})
