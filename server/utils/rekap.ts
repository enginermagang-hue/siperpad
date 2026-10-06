import { query } from './db'

export type RekapRow = {
  id: number
  kode: string
  nama: string
  level: number
  urutan: number
  kawasan_id: number
  kawasan_kode: string
  kawasan_nama: string
  target: number
  realisasi: number
  capaian: number // persen 0-100+
  selisih: number // realisasi - target
}

export type TimeseriesPoint = {
  label: string
  target: number
  realisasi: number
  capaian: number
}

export async function getRekapPerJenis(opts: { kawasanId?: number; tahun: number }): Promise<RekapRow[]> {
  const tahunStr = String(opts.tahun)
  const hasKawasan = !!opts.kawasanId
  const sql = `
    SELECT
      jr.id, jr.kode, jr.nama, jr.level, jr.urutan, jr.kawasan_id,
      k.kode AS kawasan_kode, k.nama AS kawasan_nama,
      COALESCE(t.nilai, 0) AS target,
      COALESCE(SUM(CASE WHEN r.status != 'ditolak' THEN r.jumlah ELSE 0 END), 0) AS realisasi
    FROM jenis_retribusi jr
    JOIN kawasan k ON k.id = jr.kawasan_id
    LEFT JOIN target t ON t.jenis_retribusi_id = jr.id AND t.tahun = ?
    LEFT JOIN realisasi r ON r.jenis_retribusi_id = jr.id
      AND substr(r.tanggal, 1, 4) = ?
      AND r.status != 'ditolak'
    ${hasKawasan ? 'WHERE jr.kawasan_id = ?' : ''}
    GROUP BY jr.id
    ORDER BY k.urutan ASC, jr.level ASC, jr.urutan ASC, jr.id ASC
  `
  const params: unknown[] = hasKawasan ? [opts.tahun, tahunStr, opts.kawasanId] : [opts.tahun, tahunStr]
  const rows = await query<Record<string, unknown>>(sql, params)
  return rows.map((r) => {
    const target = Number(r.target) || 0
    const realisasi = Number(r.realisasi) || 0
    const capaian = target > 0 ? Math.round((realisasi / target) * 10000) / 100 : 0
    return {
      id: Number(r.id),
      kode: String(r.kode || ''),
      nama: String(r.nama),
      level: Number(r.level),
      urutan: Number(r.urutan),
      kawasan_id: Number(r.kawasan_id),
      kawasan_kode: String(r.kawasan_kode),
      kawasan_nama: String(r.kawasan_nama),
      target,
      realisasi,
      capaian,
      selisih: realisasi - target,
    }
  })
}

export async function getTimeseries(opts: {
  kawasanId?: number
  tahun: number
  scope: 'bulanan' | 'triwulan' | 'tahunan'
}): Promise<TimeseriesPoint[]> {
  const tahun = opts.tahun
  const hasKawasan = !!opts.kawasanId

  if (opts.scope === 'tahunan') {
    // last 5 years including tahun
    const years = [tahun - 4, tahun - 3, tahun - 2, tahun - 1, tahun]
    const points: TimeseriesPoint[] = []
    for (const y of years) {
      const yStr = String(y)
      // target sum for year
      const tRows = await query<{ total: number }>(
        `SELECT COALESCE(SUM(t.nilai),0) AS total FROM target t JOIN jenis_retribusi jr ON jr.id = t.jenis_retribusi_id ${hasKawasan ? 'WHERE jr.kawasan_id = ? AND t.tahun = ?' : 'WHERE t.tahun = ?'}`,
        hasKawasan ? [opts.kawasanId!, y] : [y],
      )
      const target = Number(tRows[0]?.total) || 0
      const rRows = await query<{ total: number }>(
        `SELECT COALESCE(SUM(r.jumlah),0) AS total FROM realisasi r JOIN jenis_retribusi jr ON jr.id = r.jenis_retribusi_id WHERE substr(r.tanggal,1,4)=? AND r.status!='ditolak' ${hasKawasan ? 'AND jr.kawasan_id=?' : ''}`,
        hasKawasan ? [yStr, opts.kawasanId!] : [yStr],
      )
      const realisasi = Number(rRows[0]?.total) || 0
      const capaian = target > 0 ? Math.round((realisasi / target) * 10000) / 100 : 0
      points.push({ label: String(y), target, realisasi, capaian })
    }
    return points
  }

  // bulanan & triwulan: need annual target to distribute
  const totalTargetRows = await query<{ total: number }>(
    `SELECT COALESCE(SUM(t.nilai),0) AS total FROM target t JOIN jenis_retribusi jr ON jr.id = t.jenis_retribusi_id ${hasKawasan ? 'WHERE jr.kawasan_id=? AND t.tahun=?' : 'WHERE t.tahun=?'}`,
    hasKawasan ? [opts.kawasanId!, tahun] : [tahun],
  )
  const annualTarget = Number(totalTargetRows[0]?.total) || 0

  const tahunStr = String(tahun)
  // fetch monthly sums
  const monthlyRows = await query<{ bulan: string; total: number }>(
    `SELECT substr(r.tanggal,6,2) AS bulan, COALESCE(SUM(r.jumlah),0) AS total
     FROM realisasi r JOIN jenis_retribusi jr ON jr.id=r.jenis_retribusi_id
     WHERE substr(r.tanggal,1,4)=? AND r.status!='ditolak' ${hasKawasan ? 'AND jr.kawasan_id=?' : ''}
     GROUP BY bulan ORDER BY bulan`,
    hasKawasan ? [tahunStr, opts.kawasanId!] : [tahunStr],
  )
  const byMonth = new Map<string, number>()
  for (const row of monthlyRows) byMonth.set(String(row.bulan).padStart(2, '0'), Number(row.total) || 0)

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

  if (opts.scope === 'bulanan') {
    const monthlyTarget = annualTarget / 12
    return monthLabels.map((label, i) => {
      const mm = String(i + 1).padStart(2, '0')
      const realisasi = byMonth.get(mm) || 0
      const target = monthlyTarget
      const capaian = target > 0 ? Math.round((realisasi / target) * 10000) / 100 : 0
      return { label, target: Math.round(target), realisasi, capaian }
    })
  }

  // triwulan
  const qLabels = ['Q1', 'Q2', 'Q3', 'Q4']
  const qMap: Record<string, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
  for (let i = 1; i <= 12; i++) {
    const mm = String(i).padStart(2, '0')
    const v = byMonth.get(mm) || 0
    const q = i <= 3 ? 'Q1' : i <= 6 ? 'Q2' : i <= 9 ? 'Q3' : 'Q4'
    qMap[q] += v
  }
  const quarterlyTarget = annualTarget / 4
  return qLabels.map((label) => {
    const realisasi = qMap[label] || 0
    const target = quarterlyTarget
    const capaian = target > 0 ? Math.round((realisasi / target) * 10000) / 100 : 0
    return { label, target: Math.round(target), realisasi, capaian }
  })
}

export async function getTotals(perJenis: RekapRow[]) {
  const totalTarget = perJenis.reduce((s, r) => s + r.target, 0)
  const totalRealisasi = perJenis.reduce((s, r) => s + r.realisasi, 0)
  const capaian = totalTarget > 0 ? Math.round((totalRealisasi / totalTarget) * 10000) / 100 : 0
  return { totalTarget, totalRealisasi, capaian, selisih: totalRealisasi - totalTarget }
}
