import { query, execute } from '../../utils/db'
import { scryptSync, randomBytes } from 'node:crypto'

function verifyPassword(pw: string, stored: string): boolean {
  const [saltHex, keyHex] = stored.split('$')
  if (!saltHex || !keyHex) return false
  return scryptSync(pw, saltHex, 64).toString('hex') === keyHex
}
function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}$${scryptSync(pw, salt, 64).toString('hex')}`
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const body = await readBody(event) as { current_password?: string; new_password?: string }
  const cur = String(body.current_password || '')
  const next = String(body.new_password || '')
  if (!cur || !next) throw createError({ statusCode: 400, message: 'Password lama dan baru wajib' })
  if (next.length < 6) throw createError({ statusCode: 400, message: 'Password baru minimal 6 karakter' })
  const rows = await query<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', [Number(session.user.id)])
  if (!rows.length) throw createError({ statusCode: 404, message: 'User tidak ditemukan' })
  if (!verifyPassword(cur, String(rows[0]!.password_hash))) throw createError({ statusCode: 401, message: 'Password lama salah' })
  await execute('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?', [hashPassword(next), Number(session.user.id)])
  return { ok: true }
})
