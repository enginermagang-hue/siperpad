import { query } from './db'

// Cek apakah (tahun, bulan, kawasan) sedang terkunci.
export async function isPeriodeLocked(tahun: number, bulan: number, kawasanId: number): Promise<boolean> {
  const rows = await query<{ id: number }>(
    'SELECT id FROM periode_lock WHERE tahun = ? AND bulan = ? AND kawasan_id = ? LIMIT 1',
    [tahun, bulan, kawasanId],
  )
  return rows.length > 0
}

// Ambil kawasan_id dari sebuah jenis_retribusi (null bila tidak ada).
export async function kawasanIdOfJenis(jenisId: number): Promise<number | null> {
  const rows = await query<{ kawasan_id: number }>('SELECT kawasan_id FROM jenis_retribusi WHERE id = ?', [jenisId])
  return rows.length ? Number(rows[0]!.kawasan_id) : null
}

// Guard: lempar 409 bila periode (dari tanggal + kawasan) terkunci.
export async function assertPeriodeOpen(tanggal: string, kawasanId: number): Promise<void> {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tanggal)
  if (!m) return
  const tahun = Number(m[1])
  const bulan = Number(m[2])
  if (await isPeriodeLocked(tahun, bulan, kawasanId)) {
    throw createError({ statusCode: 409, message: `Periode ${bulan}/${tahun} sudah dikunci dan tidak dapat diubah` })
  }
}

// ---------------------------------------------------------------------------
// Cakupan kawasan per pengguna (petugas penginput dipisah per kawasan).
// users.kawasan_id NULL = akses semua kawasan (admin/kepala).
// ---------------------------------------------------------------------------

type SessionUser = { id?: number | string; role?: string; kawasan_id?: number | null } | undefined

// Ambil kawasan_id penugasan dari sesi (null = semua kawasan).
export function sessionKawasanId(user: SessionUser): number | null {
  if (!user) return null
  if (String(user.role || '') !== 'user') return null
  const v = user.kawasan_id
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

// Guard: petugas dengan penugasan kawasan tidak boleh menyentuh kawasan lain.
export function assertKawasanAllowed(user: SessionUser, kawasanId: number | null): void {
  const scoped = sessionKawasanId(user)
  if (scoped == null) return
  if (kawasanId == null || Number(kawasanId) !== scoped) {
    throw createError({ statusCode: 403, message: 'Anda hanya dapat menginput data untuk kawasan penugasan Anda' })
  }
}

// Guard berbasis jenis retribusi (resolve kawasan dari jenis).
export async function assertJenisAllowed(user: SessionUser, jenisId: number): Promise<void> {
  const scoped = sessionKawasanId(user)
  if (scoped == null) return
  const kawasanId = await kawasanIdOfJenis(jenisId)
  assertKawasanAllowed(user, kawasanId)
}
