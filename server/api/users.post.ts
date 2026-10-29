import { query } from '../utils/db'
import { scryptSync, randomBytes } from 'node:crypto'

function hashPassword(pw: string) { const s = randomBytes(16).toString('hex'); return `${s}$${scryptSync(pw, s, 64).toString('hex')}` }

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })
  const b = await readBody(event) as { nama?: string; nip?: string; email?: string; password?: string; role?: string; aktif?: number; kawasan_id?: number | null }
  const nama = String(b.nama || '').trim()
  const nip = String(b.nip || '').trim()
  const email = String(b.email || '').trim().toLowerCase()
  const pw = String(b.password || '')
  const role = String(b.role || '').trim()
  const aktif = b.aktif != null ? (Number(b.aktif) ? 1 : 0) : 1
  // kawasan_id hanya bermakna untuk role 'user' (petugas per kawasan).
  const kawasanId = b.kawasan_id == null || b.kawasan_id === '' ? null : Number(b.kawasan_id)
  if (!nama || !email || !pw) throw createError({ statusCode: 400, message: 'Nama, email, password wajib' })
  if (!['user','admin','kepala'].includes(role)) throw createError({ statusCode: 400, message: 'Role harus user/admin/kepala' })
  if (kawasanId != null && (!Number.isFinite(kawasanId) || kawasanId <= 0)) throw createError({ statusCode: 400, message: 'kawasan_id tidak valid' })
  if (kawasanId != null && role !== 'user') throw createError({ statusCode: 400, message: 'Penugasan kawasan hanya untuk role Petugas Input' })
  if (pw.length < 6) throw createError({ statusCode: 400, message: 'Password minimal 6 karakter' })
  if (kawasanId != null) {
    const kw = await query('SELECT id FROM kawasan WHERE id = ?', [kawasanId])
    if (!kw.length) throw createError({ statusCode: 400, message: 'Kawasan tidak ditemukan' })
  }
  try {
    const rows = await query<{ id: number }>(
      'INSERT INTO users (nama, nip, email, password_hash, role, kawasan_id, aktif) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
      [nama, nip, email, hashPassword(pw), role, role === 'user' ? kawasanId : null, aktif],
    )
    return { ok: true, id: rows[0]!.id }
  } catch (e: unknown) {
    const m = e instanceof Error ? e.message : String(e)
    console.error('users.post gagal:', m)
    if (m.includes('UNIQUE') || m.includes('unique')) throw createError({ statusCode: 409, message: 'Email sudah dipakai' })
    throw createError({ statusCode: 500, message: 'Gagal menyimpan pengguna' })
  }
})
