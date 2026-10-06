import { execute, query } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID tidak valid' })
  if (id === Number(session.user.id)) throw createError({ statusCode: 400, message: 'Tidak bisa hapus akun sendiri' })
  const rows = await query('SELECT id FROM users WHERE id = ?', [id])
  if (!rows.length) throw createError({ statusCode: 404, message: 'User tidak ditemukan' })
  await execute('UPDATE users SET aktif = 0, updated_at = datetime(\'now\') WHERE id = ?', [id])
  return { ok: true }
})
