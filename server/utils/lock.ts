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
