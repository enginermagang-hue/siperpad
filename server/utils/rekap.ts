import { query } from './db'
import { APPROVED_STATUS, monthStart, nextMonthStart, persen } from './periode'

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
  targetInduk: number | null // nilai induk tertulis (untuk anomali)
  hasChild: boolean
  children: { id: number; nama: string }[]
  leafIds: number[]
}

export type TimeseriesPoint = {
  label: string
  target: number
  realisasi: number
  capaian: number
}

type JenisNode = {
  id: number
  kawasan_id: number
  parent_id: number | null
  kode: string
  nama: string
  level: number
  urutan: number
  targetDirect: number
  targetInduk: number | null
  realisasi: number
  children: JenisNode[]
}

// Ambil semua jenis + target + realisasi (disetujui) untuk tahun, lalu rollup
// bottom-up: nilai induk = SUM anak (Model A). Nilai target langsung pada induk
// tetap disimpan sebagai `targetInduk` untuk deteksi anomali.
async function buildTree(opts: { kawasanId?: number; tahun: number; sampaiBulan?: number; from?: string; to?: string }): Promise<{ roots: JenisNode[]; kawasan: { id: number; kode: string; nama: string; urutan: number }[] }> {
  const hasKawasan = !!opts.kawasanId
  const kawasan = await query<{ id: number; kode: string; nama: string; urutan: number }>(
    hasKawasan
      ? 'SELECT id, kode, nama, urutan FROM kawasan WHERE aktif = 1 AND id = ? ORDER BY urutan'
      : 'SELECT id, kode, nama, urutan FROM kawasan WHERE aktif = 1 ORDER BY urutan',
    hasKawasan ? [opts.kawasanId!] : [],
  )

  const jenisRows = await query<{
    id: number; kawasan_id: number; parent_id: number | null; kode: string; nama: string; level: number; urutan: number; tarif: number | null
  }>(
    hasKawasan
      ? 'SELECT id, kawasan_id, parent_id, kode, nama, level, urutan, tarif FROM jenis_retribusi WHERE aktif = 1 AND kawasan_id = ? ORDER BY level, urutan, id'
      : 'SELECT id, kawasan_id, parent_id, kode, nama, level, urutan, tarif FROM jenis_retribusi WHERE aktif = 1 ORDER BY level, urutan, id',
    hasKawasan ? [opts.kawasanId!] : [],
  )

  const targetRows = await query<{ jenis_retribusi_id: number; nilai: number; nilai_induk: number | null }>(
    'SELECT jenis_retribusi_id, nilai, nilai_induk FROM target WHERE tahun = ?',
    [opts.tahun],
  )
  const targetMap = new Map<number, { nilai: number; nilaiInduk: number | null }>()
  for (const r of targetRows) targetMap.set(Number(r.jenis_retribusi_id), { nilai: Number(r.nilai) || 0, nilaiInduk: r.nilai_induk == null ? null : Number(r.nilai_induk) })

  // Bila `sampaiBulan` diisi, realisasi dibatasi s/d akhir bulan tersebut
  // (kumulatif) agar kolom "% Capai" sejajar dengan laporan Excel referensi
  // (Realisasi s/d Bulan Ini = Realisasi s/d Bulan Lalu + Total Mingguan).
  const useRange = !!(opts.from && opts.to)
  const realRows = useRange
    ? await query<{ jenis_retribusi_id: number; total: number }>(
        `SELECT r.jenis_retribusi_id, COALESCE(SUM(r.jumlah), 0) AS total
         FROM realisasi r
         WHERE r.status = ? AND r.tanggal >= ? AND r.tanggal <= ?
         GROUP BY r.jenis_retribusi_id`,
        [APPROVED_STATUS, opts.from!, opts.to!],
      )
    : opts.sampaiBulan
      ? await query<{ jenis_retribusi_id: number; total: number }>(
          `SELECT r.jenis_retribusi_id, COALESCE(SUM(r.jumlah), 0) AS total
           FROM realisasi r
           WHERE r.status = ? AND substr(r.tanggal, 1, 4) = ? AND substr(r.tanggal, 6, 2) <= ?
           GROUP BY r.jenis_retribusi_id`,
          [APPROVED_STATUS, String(opts.tahun), String(opts.sampaiBulan).padStart(2, '0')],
        )
      : await query<{ jenis_retribusi_id: number; total: number }>(
          `SELECT r.jenis_retribusi_id, COALESCE(SUM(r.jumlah), 0) AS total
           FROM realisasi r
           WHERE r.status = ? AND substr(r.tanggal, 1, 4) = ?
           GROUP BY r.jenis_retribusi_id`,
          [APPROVED_STATUS, String(opts.tahun)],
        )
  const realMap = new Map<number, number>()
  for (const r of realRows) realMap.set(Number(r.jenis_retribusi_id), Number(r.total) || 0)

  const byId = new Map<number, JenisNode>()
  for (const j of jenisRows) {
    const t = targetMap.get(Number(j.id))
    byId.set(Number(j.id), {
      id: Number(j.id),
      kawasan_id: Number(j.kawasan_id),
      parent_id: j.parent_id == null ? null : Number(j.parent_id),
      kode: String(j.kode || ''),
      nama: String(j.nama),
      level: Number(j.level),
      urutan: Number(j.urutan),
      targetDirect: t?.nilai || 0,
      targetInduk: t?.nilaiInduk ?? null,
      realisasi: realMap.get(Number(j.id)) || 0,
      children: [],
    })
  }
  const roots: JenisNode[] = []
  for (const n of byId.values()) {
    if (n.parent_id != null && byId.has(n.parent_id)) byId.get(n.parent_id)!.children.push(n)
    else roots.push(n)
  }
  return { roots, kawasan }
}

function sortTree(nodes: JenisNode[]) {
  nodes.sort((a, b) => a.level - b.level || a.urutan - b.urutan || a.id - b.id)
  for (const n of nodes) sortTree(n.children)
}

// DFS emit dengan agregasi bottom-up. Nilai induk = SUM anak.
export async function getRekapPerJenis(opts: { kawasanId?: number; tahun: number; sampaiBulan?: number; from?: string; to?: string }): Promise<RekapRow[]> {
  const { roots, kawasan } = await buildTree(opts)
  const kawasanById = new Map(kawasan.map((k) => [k.id, k]))
  sortTree(roots)

  type Agg = { target: number; realisasi: number }
  const agg = new Map<number, Agg>()
  function compute(n: JenisNode): Agg {
    if (n.children.length === 0) {
      const leaf = { target: n.targetDirect, realisasi: n.realisasi }
      agg.set(n.id, leaf)
      return leaf
    }
    const sum = { target: 0, realisasi: 0 }
    for (const c of n.children) {
      const a = compute(c)
      sum.target += a.target
      sum.realisasi += a.realisasi
    }
    agg.set(n.id, sum)
    return sum
  }
  for (const r of roots) compute(r)

  const kawasanOrder = new Map(kawasan.map((k) => [k.id, k.urutan]))
  roots.sort((a, b) => (kawasanOrder.get(a.kawasan_id) ?? 0) - (kawasanOrder.get(b.kawasan_id) ?? 0) || a.urutan - b.urutan || a.id - b.id)

  const out: RekapRow[] = []
  function leafIdsOf(n: JenisNode): number[] {
    if (n.children.length === 0) return [n.id]
    return n.children.flatMap(leafIdsOf)
  }
  function emit(n: JenisNode) {
    const a = agg.get(n.id)!
    const k = kawasanById.get(n.kawasan_id)!
    out.push({
      id: n.id,
      kode: n.kode,
      nama: n.nama,
      level: n.level,
      urutan: n.urutan,
      kawasan_id: n.kawasan_id,
      kawasan_kode: k.kode,
      kawasan_nama: k.nama,
      target: a.target,
      realisasi: a.realisasi,
      capaian: persen(a.realisasi, a.target),
      selisih: a.realisasi - a.target,
      targetInduk: n.children.length > 0 ? n.targetInduk : null,
      hasChild: n.children.length > 0,
      children: n.children.map((c) => ({ id: c.id, nama: c.nama })),
      leafIds: leafIdsOf(n),
    })
    const sorted = [...n.children].sort((x, y) => x.urutan - y.urutan || x.id - y.id)
    for (const c of sorted) emit(c)
  }
  for (const r of roots) emit(r)
  return out
}

export async function getTimeseries(opts: {
  kawasanId?: number
  tahun: number
  scope: 'bulanan' | 'triwulan' | 'tahunan'
}): Promise<TimeseriesPoint[]> {
  const tahun = opts.tahun
  const hasKawasan = !!opts.kawasanId

  if (opts.scope === 'tahunan') {
    const years = [tahun - 4, tahun - 3, tahun - 2, tahun - 1, tahun]
    const points: TimeseriesPoint[] = []
    for (const y of years) {
      const tRows = await query<{ total: number }>(
        `SELECT COALESCE(SUM(t.nilai), 0) AS total FROM target t JOIN jenis_retribusi jr ON jr.id = t.jenis_retribusi_id
         WHERE jr.aktif = 1 ${hasKawasan ? 'AND jr.kawasan_id = ? AND' : 'AND'} t.tahun = ?`,
        hasKawasan ? [opts.kawasanId!, y] : [y],
      )
      const target = Number(tRows[0]?.total) || 0
      const rRows = await query<{ total: number }>(
        `SELECT COALESCE(SUM(r.jumlah), 0) AS total FROM realisasi r JOIN jenis_retribusi jr ON jr.id = r.jenis_retribusi_id
         WHERE r.status = ? AND substr(r.tanggal, 1, 4) = ? ${hasKawasan ? 'AND jr.kawasan_id = ?' : ''}`,
        hasKawasan ? [APPROVED_STATUS, String(y), opts.kawasanId!] : [APPROVED_STATUS, String(y)],
      )
      const realisasi = Number(rRows[0]?.total) || 0
      points.push({ label: String(y), target, realisasi, capaian: persen(realisasi, target) })
    }
    return points
  }

  const totalTargetRows = await query<{ total: number }>(
    `SELECT COALESCE(SUM(t.nilai), 0) AS total FROM target t JOIN jenis_retribusi jr ON jr.id = t.jenis_retribusi_id
     WHERE jr.aktif = 1 ${hasKawasan ? 'AND jr.kawasan_id = ? AND' : 'AND'} t.tahun = ?`,
    hasKawasan ? [opts.kawasanId!, tahun] : [tahun],
  )
  const annualTarget = Number(totalTargetRows[0]?.total) || 0

  const monthlyRows = await query<{ bulan: string; total: number }>(
    `SELECT substr(r.tanggal, 6, 2) AS bulan, COALESCE(SUM(r.jumlah), 0) AS total
     FROM realisasi r JOIN jenis_retribusi jr ON jr.id = r.jenis_retribusi_id
     WHERE r.status = ? AND substr(r.tanggal, 1, 4) = ? ${hasKawasan ? 'AND jr.kawasan_id = ?' : ''}
     GROUP BY bulan ORDER BY bulan`,
    hasKawasan ? [APPROVED_STATUS, String(tahun), opts.kawasanId!] : [APPROVED_STATUS, String(tahun)],
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
      return { label, target: Math.round(target), realisasi, capaian: persen(realisasi, target) }
    })
  }

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
    return { label, target: Math.round(quarterlyTarget), realisasi, capaian: persen(realisasi, quarterlyTarget) }
  })
}

// Deteksi anomali target: nilai induk tertulis (nilai_induk) vs jumlah anak (Model A).
export async function getTargetAnomali(opts: { kawasanId?: number; tahun: number }): Promise<{ jenis_id: number; kode: string; nama: string; level: number; nilai_induk: number; jumlah_anak: number; selisih: number }[]> {
  const rows = await getRekapPerJenis(opts)
  return rows
    .filter((r) => r.hasChild && r.targetInduk != null && r.targetInduk - r.target !== 0)
    .map((r) => ({
      jenis_id: r.id,
      kode: r.kode,
      nama: r.nama,
      level: r.level,
      nilai_induk: Number(r.targetInduk),
      jumlah_anak: r.target,
      selisih: Number(r.targetInduk) - r.target,
    }))
}

export async function getTotals(perJenis: RekapRow[]) {
  // Hanya hitung baris root (level 1) agar tidak menggandakan anak.
  const roots = perJenis.filter((r) => r.level === 1)
  const pool = roots.length ? roots : perJenis
  const totalTarget = pool.reduce((s, r) => s + r.target, 0)
  const totalRealisasi = pool.reduce((s, r) => s + r.realisasi, 0)
  return {
    totalTarget,
    totalRealisasi,
    capaian: persen(totalRealisasi, totalTarget),
    selisih: totalRealisasi - totalTarget,
  }
}

// Ringkasan periode (bulan) per kawasan: realisasi kumulatif s/d bulan ini.
export async function getRealisasiKumulatif(opts: { kawasanId?: number; tahun: number; bulan: number }): Promise<{ kumulatif: number; bulanIni: number; sBelum: number }> {
  const mStart = monthStart(opts.tahun, opts.bulan)
  const nStart = nextMonthStart(opts.tahun, opts.bulan)
  const hasKawasan = !!opts.kawasanId
  const rows = await query<{ sBelum: number; bulanIni: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN r.tanggal < ? THEN r.jumlah ELSE 0 END), 0) AS sBelum,
       COALESCE(SUM(CASE WHEN r.tanggal >= ? AND r.tanggal < ? THEN r.jumlah ELSE 0 END), 0) AS bulanIni
     FROM realisasi r JOIN jenis_retribusi jr ON jr.id = r.jenis_retribusi_id
     WHERE r.status = ? AND substr(r.tanggal, 1, 4) = ? ${hasKawasan ? 'AND jr.kawasan_id = ?' : ''}`,
    hasKawasan
      ? [mStart, mStart, nStart, APPROVED_STATUS, String(opts.tahun), opts.kawasanId!]
      : [mStart, mStart, nStart, APPROVED_STATUS, String(opts.tahun)],
  )
  const sBelum = Number(rows[0]?.sBelum) || 0
  const bulanIni = Number(rows[0]?.bulanIni) || 0
  return { sBelum, bulanIni, kumulatif: sBelum + bulanIni }
}

// Top kontributor: pos penerimaan (leaf) terbesar pada rentang periode.
export async function getTopKontributor(opts: { kawasanId?: number; tahun: number; from?: string; to?: string; limit?: number }): Promise<{ jenis_id: number; kode: string; nama: string; kawasan_kode: string; kawasan_nama: string; nilai: number; persen: number }[]> {
  const hasKawasan = !!opts.kawasanId
  const where: string[] = ['r.status = ?', 'substr(r.tanggal, 1, 4) = ?', 'jr.aktif = 1']
  const params: unknown[] = [APPROVED_STATUS, String(opts.tahun)]
  if (opts.from) { where.push('r.tanggal >= ?'); params.push(opts.from) }
  if (opts.to) { where.push('r.tanggal <= ?'); params.push(opts.to) }
  if (hasKawasan) { where.push('jr.kawasan_id = ?'); params.push(opts.kawasanId!) }
  const rows = await query<{ jenis_id: number; kode: string; nama: string; kawasan_kode: string; kawasan_nama: string; nilai: number }>(
    `SELECT jr.id AS jenis_id, jr.kode, jr.nama, k.kode AS kawasan_kode, k.nama AS kawasan_nama,
            COALESCE(SUM(r.jumlah), 0) AS nilai
     FROM realisasi r
     JOIN jenis_retribusi jr ON jr.id = r.jenis_retribusi_id
     JOIN kawasan k ON k.id = jr.kawasan_id
     WHERE ${where.join(' AND ')}
     GROUP BY jr.id
     HAVING nilai > 0
     ORDER BY nilai DESC
     LIMIT ?`,
    [...params, opts.limit ?? 8],
  )
  const total = rows.reduce((s, r) => s + (Number(r.nilai) || 0), 0)
  return rows.map((r) => ({
    jenis_id: Number(r.jenis_id),
    kode: String(r.kode || ''),
    nama: String(r.nama),
    kawasan_kode: String(r.kawasan_kode),
    kawasan_nama: String(r.kawasan_nama),
    nilai: Number(r.nilai) || 0,
    persen: persen(Number(r.nilai) || 0, total),
  }))
}

// Perbandingan dua rentang periode.
// Nilai per baris di-rollup bottom-up (induk = SUM anak), konsisten dengan
// rekap & ekspor — sehingga baris level 1 tidak lagi 0 saat realisasi hanya
// tersimpan pada pos daun.
export async function getPerbandingan(opts: {
  kawasanId?: number
  a: { from: string; to: string; label: string }
  b: { from: string; to: string; label: string }
}): Promise<{
  perJenis: { jenis_id: number; kode: string; nama: string; level: number; urutan: number; kawasan_id: number; kawasan_kode: string; kawasan_nama: string; has_child: boolean; a: number; b: number; selisih: number; persen: number }[]
  total: { a: number; b: number; selisih: number; persen: number }
}> {
  const hasKawasan = !!opts.kawasanId
  const kwFilter = hasKawasan ? 'AND jr.kawasan_id = ?' : ''
  const sumRange = async (from: string, to: string) => {
    const rows = await query<{ jenis_retribusi_id: number; total: number }>(
      `SELECT r.jenis_retribusi_id, COALESCE(SUM(r.jumlah), 0) AS total
       FROM realisasi r JOIN jenis_retribusi jr ON jr.id = r.jenis_retribusi_id
       WHERE r.status = ? AND r.tanggal >= ? AND r.tanggal <= ? ${kwFilter}
       GROUP BY r.jenis_retribusi_id`,
      hasKawasan ? [APPROVED_STATUS, from, to, opts.kawasanId!] : [APPROVED_STATUS, from, to],
    )
    return new Map(rows.map((r) => [Number(r.jenis_retribusi_id), Number(r.total) || 0]))
  }
  const [aMap, bMap] = await Promise.all([sumRange(opts.a.from, opts.a.to), sumRange(opts.b.from, opts.b.to)])

  const jenisRows = await query<{ id: number; kawasan_id: number; parent_id: number | null; kode: string; nama: string; level: number; urutan: number; kawasan_kode: string; kawasan_nama: string }>(
    `SELECT jr.id, jr.kawasan_id, jr.parent_id, jr.kode, jr.nama, jr.level, jr.urutan, k.kode AS kawasan_kode, k.nama AS kawasan_nama
     FROM jenis_retribusi jr JOIN kawasan k ON k.id = jr.kawasan_id
     WHERE jr.aktif = 1 ${hasKawasan ? 'AND jr.kawasan_id = ?' : ''}
     ORDER BY k.urutan, jr.level, jr.urutan, jr.id`,
    hasKawasan ? [opts.kawasanId!] : [],
  )

  // Bangun pohon lalu rollup bottom-up.
  type Node = {
    id: number
    kawasan_id: number
    parent_id: number | null
    kode: string
    nama: string
    level: number
    urutan: number
    kawasan_kode: string
    kawasan_nama: string
    directA: number
    directB: number
    a: number
    b: number
    children: Node[]
  }
  const byId = new Map<number, Node>()
  for (const j of jenisRows) {
    byId.set(Number(j.id), {
      id: Number(j.id),
      kawasan_id: Number(j.kawasan_id),
      parent_id: j.parent_id == null ? null : Number(j.parent_id),
      kode: String(j.kode || ''),
      nama: String(j.nama),
      level: Number(j.level),
      urutan: Number(j.urutan),
      kawasan_kode: String(j.kawasan_kode),
      kawasan_nama: String(j.kawasan_nama),
      directA: aMap.get(Number(j.id)) || 0,
      directB: bMap.get(Number(j.id)) || 0,
      a: 0,
      b: 0,
      children: [],
    })
  }
  const roots: Node[] = []
  for (const n of byId.values()) {
    if (n.parent_id != null && byId.has(n.parent_id)) byId.get(n.parent_id)!.children.push(n)
    else roots.push(n)
  }
  function compute(n: Node): void {
    if (n.children.length === 0) {
      n.a = n.directA
      n.b = n.directB
      return
    }
    let a = 0
    let b = 0
    for (const c of n.children) {
      compute(c)
      a += c.a
      b += c.b
    }
    n.a = a
    n.b = b
  }
  for (const r of roots) compute(r)

  // Emit DFS sesuai urutan referensi (kawasan → level → urutan → id).
  const kawasanOrder = new Map<number, number>()
  for (const j of jenisRows) if (!kawasanOrder.has(Number(j.kawasan_id))) kawasanOrder.set(Number(j.kawasan_id), kawasanOrder.size)
  roots.sort((x, y) => (kawasanOrder.get(x.kawasan_id) ?? 0) - (kawasanOrder.get(y.kawasan_id) ?? 0) || x.urutan - y.urutan || x.id - y.id)

  const perJenis: {
    jenis_id: number; kode: string; nama: string; level: number; urutan: number; kawasan_id: number
    kawasan_kode: string; kawasan_nama: string; has_child: boolean; a: number; b: number; selisih: number; persen: number
  }[] = []
  function emit(n: Node): void {
    perJenis.push({
      jenis_id: n.id,
      kode: n.kode,
      nama: n.nama,
      level: n.level,
      urutan: n.urutan,
      kawasan_id: n.kawasan_id,
      kawasan_kode: n.kawasan_kode,
      kawasan_nama: n.kawasan_nama,
      has_child: n.children.length > 0,
      a: n.a,
      b: n.b,
      selisih: n.b - n.a,
      persen: n.a > 0 ? Math.round(((n.b - n.a) / n.a) * 10000) / 100 : (n.b > 0 ? 100 : 0),
    })
    const sorted = [...n.children].sort((x, y) => x.urutan - y.urutan || x.id - y.id)
    for (const c of sorted) emit(c)
  }
  for (const r of roots) emit(r)

  // Total = jumlah akar (level 1) agar tidak double-count.
  const totalA = roots.reduce((s, n) => s + n.a, 0)
  const totalB = roots.reduce((s, n) => s + n.b, 0)
  return {
    perJenis,
    total: { a: totalA, b: totalB, selisih: totalB - totalA, persen: totalA > 0 ? Math.round(((totalB - totalA) / totalA) * 10000) / 100 : (totalB > 0 ? 100 : 0) },
  }
}
