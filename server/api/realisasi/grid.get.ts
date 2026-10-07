import { query } from '../../utils/db'
import { APPROVED_STATUS, MINGGU_REP_DAY, monthStart, nextMonthStart, monthLabel } from '../../utils/periode'
import { isPeriodeLocked } from '../../utils/lock'

// Grid entri mingguan: daftar leaf per kawasan dengan nilai Minggu I-IV untuk
// bulan terpilih, realisasi s/d bulan lalu, target, dan status kunci.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })

  const q = getQuery(event) as { kawasan_id?: string; tahun?: string; bulan?: string }
  const tahun = Number(q.tahun) || new Date().getFullYear()
  const bulan = Number(q.bulan) || new Date().getMonth() + 1
  const kawasanId = Number(q.kawasan_id)
  if (!kawasanId) throw createError({ statusCode: 400, message: 'kawasan_id wajib' })
  if (bulan < 1 || bulan > 12) throw createError({ statusCode: 400, message: 'bulan tidak valid' })

  const mStart = monthStart(tahun, bulan)
  const nStart = nextMonthStart(tahun, bulan)

  const leaves = await query<{ id: number; kode: string; nama: string; level: number; urutan: number; parent_id: number | null; tarif: number | null }>(
    `SELECT jr.id, jr.kode, jr.nama, jr.level, jr.urutan, jr.parent_id, jr.tarif
     FROM jenis_retribusi jr
     WHERE jr.kawasan_id = ? AND jr.aktif = 1
       AND NOT EXISTS (SELECT 1 FROM jenis_retribusi c WHERE c.parent_id = jr.id)
     ORDER BY jr.level, jr.urutan, jr.id`,
    [kawasanId],
  )

  const targetRows = await query<{ jenis_retribusi_id: number; nilai: number }>(
    'SELECT jenis_retribusi_id, nilai FROM target WHERE tahun = ?',
    [tahun],
  )
  const targetMap = new Map(targetRows.map((t) => [Number(t.jenis_retribusi_id), Number(t.nilai) || 0]))

  // agregasi per leaf: sBelum + m1..m4 + status dominan
  const aggRows = await query<{ jenis_retribusi_id: number; sBelum: number; m1: number; m2: number; m3: number; m4: number }>(
    `SELECT r.jenis_retribusi_id,
       COALESCE(SUM(CASE WHEN r.tanggal < ? THEN r.jumlah ELSE 0 END), 0) AS sBelum,
       COALESCE(SUM(CASE WHEN r.tanggal >= ? AND r.tanggal < ? AND CAST(substr(r.tanggal,9,2) AS INTEGER) BETWEEN 1 AND 7 THEN r.jumlah ELSE 0 END), 0) AS m1,
       COALESCE(SUM(CASE WHEN r.tanggal >= ? AND r.tanggal < ? AND CAST(substr(r.tanggal,9,2) AS INTEGER) BETWEEN 8 AND 14 THEN r.jumlah ELSE 0 END), 0) AS m2,
       COALESCE(SUM(CASE WHEN r.tanggal >= ? AND r.tanggal < ? AND CAST(substr(r.tanggal,9,2) AS INTEGER) BETWEEN 15 AND 21 THEN r.jumlah ELSE 0 END), 0) AS m3,
       COALESCE(SUM(CASE WHEN r.tanggal >= ? AND r.tanggal < ? AND CAST(substr(r.tanggal,9,2) AS INTEGER) >= 22 THEN r.jumlah ELSE 0 END), 0) AS m4
     FROM realisasi r
     WHERE substr(r.tanggal,1,4) = ? AND r.status != 'ditolak' AND r.jenis_retribusi_id IN (SELECT id FROM jenis_retribusi WHERE kawasan_id = ?)
     GROUP BY r.jenis_retribusi_id`,
    [mStart, mStart, nStart, mStart, nStart, mStart, nStart, mStart, nStart, String(tahun), kawasanId],
  )
  const aggMap = new Map<number, { sBelum: number; m1: number; m2: number; m3: number; m4: number }>()
  for (const r of aggRows) {
    aggMap.set(Number(r.jenis_retribusi_id), {
      sBelum: Number(r.sBelum) || 0, m1: Number(r.m1) || 0, m2: Number(r.m2) || 0, m3: Number(r.m3) || 0, m4: Number(r.m4) || 0,
    })
  }

  // status per (jenis, minggu representatif) — untuk edit guard
  const statusRows = await query<{ jenis_retribusi_id: number; tanggal: string; id: number; status: string; catatan: string }>(
    `SELECT id, jenis_retribusi_id, tanggal, status, catatan FROM realisasi
     WHERE substr(tanggal,1,4) = ? AND tanggal >= ? AND tanggal < ? AND jenis_retribusi_id IN (SELECT id FROM jenis_retribusi WHERE kawasan_id = ?)`,
    [String(tahun), mStart, nStart, kawasanId],
  )
  const repByDay: Record<number, string> = { 1: '01', 2: '08', 3: '15', 4: '22' }
  const statusMap = new Map<string, { id: number; status: string; catatan: string }>()
  for (const s of statusRows) {
    const day = Number(String(s.tanggal).slice(8, 10))
    const bucket = day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : 4
    statusMap.set(`${s.jenis_retribusi_id}-${bucket}`, { id: Number(s.id), status: String(s.status), catatan: String(s.catatan || '') })
  }

  const locked = await isPeriodeLocked(tahun, bulan, kawasanId)

  const rows = leaves.map((l) => {
    const a = aggMap.get(Number(l.id)) || { sBelum: 0, m1: 0, m2: 0, m3: 0, m4: 0 }
    const minggu = [1, 2, 3, 4].map((b) => {
      const st = statusMap.get(`${l.id}-${b}`)
      return { minggu: b, nilai: [0, a.m1, a.m2, a.m3, a.m4][b]!, realisasi_id: st?.id ?? null, status: st?.status ?? null, catatan: st?.catatan ?? '' }
    })
    return {
      jenis_id: Number(l.id),
      kode: String(l.kode || ''),
      nama: String(l.nama),
      level: Number(l.level),
      tarif: l.tarif == null ? null : Number(l.tarif),
      target: targetMap.get(Number(l.id)) || 0,
      sBelum: a.sBelum,
      minggu,
      totalMingguan: a.m1 + a.m2 + a.m3 + a.m4,
    }
  })

  const kawasan = await query<{ id: number; kode: string; nama: string }>('SELECT id, kode, nama FROM kawasan WHERE id = ?', [kawasanId])

  return {
    data: rows,
    meta: { tahun, bulan, bulanLabel: monthLabel(bulan), kawasanId, kawasan: kawasan[0] ?? null, locked, repDays: MINGGU_REP_DAY, approvedStatus: APPROVED_STATUS },
  }
})
