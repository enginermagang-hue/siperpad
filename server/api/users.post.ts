import { query } from '../utils/db'
import { scryptSync, randomBytes } from 'node:crypto'

function hashPassword(pw: string) { const s = randomBytes(16).toString('hex'); return `${s}$${scryptSync(pw, s, 64).toString('hex')}` }

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })
  const b = await readBody(event) as { nama?: string; nip?: string; email?: string; password?: string; role?: string; aktif?: number }
  const nama = String(b.nama || '').trim()
  const nip = String(b.nip || '').trim()
  const email = String(b.email || '').trim().toLowerCase()
  const pw = String(b.password || '')
  const role = String(b.role || '').trim()
  const aktif = b.aktif != null ? (Number(b.aktif) ? 1 : 0) : 1
  if (!nama || !email || !pw) throw createError({ statusCode: 400, message: 'Nama, email, password wajib' })
  if (!['admin','verifikator','kepala'].includes(role)) throw createError({ statusCode: 400, message: 'Role harus admin/verifikator/kepala' })
  if (pw.length < 6) throw createError({ statusCode: 400, message: 'Password minimal 6 karakter' })
  try {
    const rows = await query<{ id: number }>('INSERT INTO users (nama, nip, email, password_hash, role, aktif) VALUES (?, ?, ?, ?, ?, ?) RETURNING id', [nama, nip, email, hashPassword(pw), role, aktif])
    return { ok: true, id: rows[0]!.id }
  } catch (e: unknown) {
    const m = e instanceof Error ? e.message : String(e)
    if (m.includes('UNIQUE') || m.includes('unique')) throw createError({ statusCode: 409, message: 'Email sudah dipakai' })
    throw createError({ statusCode: 500, message: m })
  }
})
