import { getRekapPerJenis, getTimeseries, getTotals, getRealisasiKumulatif, getTopKontributor, getPerbandingan } from '../../utils/rekap'
import { monthStart, monthEnd, monthLabel } from '../../utils/periode'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })

  const q = getQuery(event) as { kawasan_id?: string; tahun?: string; scope?: string; bulan?: string; from?: string; to?: string }
  const tahun = Number(q.tahun) || new Date().getFullYear()
  const bulan = q.bulan ? Number(q.bulan) : new Date().getMonth() + 1
  // Bulan efektif untuk agregasi mingguan: jika rentang tanggal diberikan,
  // gunakan bulan dari `from` agar konsisten dengan data rekap yang tampil.
  const bulanEfektif = q.from ? Number(String(q.from).slice(5, 7)) || bulan : bulan
  const scope = (q.scope as 'bulanan' | 'triwulan' | 'tahunan') || 'bulanan'
  const from = q.from || undefined
  const to = q.to || undefined
  if (!['bulanan', 'triwulan', 'tahunan'].includes(scope)) throw createError({ statusCode: 400, message: 'Scope harus bulanan/triwulan/tahunan' })

  // Scope petugas kawasan wisata ke kawasannya saja.
  let kawasanId: number | undefined = q.kawasan_id ? Number(q.kawasan_id) : undefined
  const scoped = session.user.kawasan_id
  if (scoped != null) {
    kawasanId = scoped
  }

  // Rekap per jenis dihitung kumulatif s/d bulan terpilih, agar kolom
  // "Capaian" sejajar dengan laporan Excel (Realisasi s/d Bulan Ini).
  const perJenis = await getRekapPerJenis({ kawasanId, tahun, sampaiBulan: from && to ? undefined : bulan, from, to })
  const totals = await getTotals(perJenis)
  const timeseries = await getTimeseries({ kawasanId, tahun, scope })
  const kumulatif = await getRealisasiKumulatif({ kawasanId, tahun, bulan })

  // tren mingguan bulan terpilih (approved only, teragregasi)
  const mStart = monthStart(tahun, bulanEfektif)
  const mEnd = monthEnd(tahun, bulanEfektif)
  const bulanPadded = String(bulanEfektif).padStart(2, '0')
  const hasKawasan = !!kawasanId
  // Filter tanggal: jika rentang diberikan, batasi ke rentang tersebut; selain itu ke bulan efektif.
  const dateFilter = from && to ? 'AND r.tanggal >= ? AND r.tanggal <= ?' : 'AND substr(r.tanggal, 1, 4) = ? AND substr(r.tanggal, 6, 2) = ?'
  const dateParams = from && to ? [from, to] : [String(tahun), bulanPadded]
  const weekRows = await query<{ w: number; total: number }>(
    `SELECT CASE WHEN CAST(substr(r.tanggal,9,2) AS INTEGER) BETWEEN 1 AND 7 THEN 1
                WHEN CAST(substr(r.tanggal,9,2) AS INTEGER) BETWEEN 8 AND 14 THEN 2
                WHEN CAST(substr(r.tanggal,9,2) AS INTEGER) BETWEEN 15 AND 21 THEN 3
                ELSE 4 END AS w,
           COALESCE(SUM(r.jumlah), 0) AS total
     FROM realisasi r
     JOIN jenis_retribusi jr ON jr.id = r.jenis_retribusi_id
     WHERE r.status = ? ${dateFilter}
     ${hasKawasan ? 'AND jr.kawasan_id = ?' : ''}
     GROUP BY w`,
    hasKawasan ? [APPROVED_STATUS, ...dateParams, kawasanId!] : [APPROVED_STATUS, ...dateParams],
  )
  const weekMap = new Map<number, number>()
  for (const r of weekRows) {
    const key = Number(r.w)
    weekMap.set(key, (weekMap.get(key) || 0) + (Number(r.total) || 0))
  }
  const mingguan = [1, 2, 3, 4].map((w) => ({
    minggu: w,
    label: ['Minggu I', 'Minggu II', 'Minggu III', 'Minggu IV'][w - 1]!,
    nilai: weekMap.has(w) ? (weekMap.get(w) as number) : 0,
  }))
  const topKontributor = await getTopKontributor({ kawasanId, tahun, from: mStart, to: mEnd, limit: 8 })

  // perbandingan bulan ini vs bulan sebelumnya
  const prevBulan = bulan === 1 ? 12 : bulan - 1
  const prevTahun = bulan === 1 ? tahun - 1 : tahun
  const banding = await getPerbandingan({
    kawasanId,
    a: { from: monthStart(prevTahun, prevBulan), to: monthEnd(prevTahun, prevBulan), label: `${monthLabel(prevBulan)} ${prevTahun}` },
    b: { from: mStart, to: mEnd, label: `${monthLabel(bulan)} ${tahun}` },
  })

  return {
    perJenis,
    totals,
    timeseries,
    kumulatif,
    mingguan,
    topKontributor,
    banding,
    meta: { tahun, bulan, bulanLabel: monthLabel(bulan), kawasanId: kawasanId ?? null, scope },
  }
})
