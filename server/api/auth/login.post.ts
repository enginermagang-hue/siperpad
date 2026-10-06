import { getTursoClient } from '../../utils/db'
import { scryptSync } from 'node:crypto'

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, keyHex] = stored.split('$')
  if (!saltHex || !keyHex) return false
  const key = scryptSync(password, saltHex, 64)
  return key.toString('hex') === keyHex
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body as { email?: string; password?: string }

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'Email dan password wajib diisi' })
  }

  const client = getTursoClient()
  const rows = await client.execute(
    'SELECT id, nama, nip, email, password_hash, role, aktif FROM users WHERE email = ?',
    [email]
  )

  const user = rows.rows[0] as Record<string, unknown> | undefined
  if (!user) {
    throw createError({ statusCode: 401, message: 'Email atau password salah' })
  }

  if (!verifyPassword(password, String(user.password_hash))) {
    throw createError({ statusCode: 401, message: 'Email atau password salah' })
  }

  if (!user.aktif || Number(user.aktif) === 0) {
    throw createError({ statusCode: 403, message: 'Akun Anda dinonaktifkan' })
  }

  await setUserSession(event, {
    user: {
      id: Number(user.id),
      nama: String(user.nama),
      nip: String(user.nip ?? ''),
      email: String(user.email),
      role: String(user.role),
    },
  })

  return { ok: true, user: { id: Number(user.id), nama: String(user.nama), email: String(user.email), role: String(user.role) } }
})
