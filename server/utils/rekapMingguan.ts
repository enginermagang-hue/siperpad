import { query } from './db'
import { APPROVED_STATUS, monthLabel } from './periode'

export type RekapMingguanRow = {
  jenis_id: number | null // null = synthetic kawasan header or TOTAL
  kawasan_id: number | null
  kawasan_kode: string
  kawasan_nama: string
  kode: string // No column display (A/B or 1/2 or blank)
  nama: string // hierarchy name with indent trimmed; excel will add pad
  level: number // 0=kawasan, 1..4 = jenis hierarchy, 99=TOTAL
  urutan: number
  target: number
  sBelum: number // realisasi s/d bulan lalu
  m1: number
  m2: number
  m3: number
  m4: number
  totalMingguan: number
  sBulanIni: number
  capaian: number // 0..1 ratio (for excel percent format)
  isKawasan: boolean
  isTotal: boolean
}

export async function getRekapMingguan(opts: {
  kawasanId?: number
  tahun: number
  bulan: number // 1-12
}): Promise<{
  rows: RekapMingguanRow[]
  kawasanList: { id: number; kode: string; nama: string; urutan: number }[]
  ringkasan1: { kawasan_kode: string; kawasan_nama: string; target: number; realisasi: number }[]
  ringkasan2: { minggu: string; byKawasan: Record<string, number> }[]
  bulanLabel: string
  tahun: number
  bulan: number
}> {
  const tahun = opts.tahun
  const bulan = Math.min(12, Math.max(1, opts.bulan))
  const tahunStr = String(tahun)
  const bulanPadded = String(bulan).padStart(2, '0')
  const monthStart = `${tahunStr}-${bulanPadded}-01`
  // next month start (for < comparison)
  let nextYear = tahun
  let nextMonth = bulan + 1
  if (nextMonth > 12) { nextMonth = 1; nextYear++ }
  const nextMonthStart = `${String(nextYear)}-${String(nextMonth).padStart(2, '0')}-01`

  // kawasan list
  const kawasanRows = await query<{ id: number; kode: string; nama: string; urutan: number }>(
    opts.kawasanId ? 'SELECT id, kode, nama, urutan FROM kawasan WHERE id = ? AND aktif=1 ORDER BY urutan' : 'SELECT id, kode, nama, urutan FROM kawasan WHERE aktif=1 ORDER BY urutan',
    opts.kawasanId ? [opts.kawasanId] : []
  )
  const kawasanList = kawasanRows.map((k) => ({ id: Number(k.id), kode: String(k.kode), nama: String(k.nama), urutan: Number(k.urutan) }))
  const kawasanIds = kawasanList.map((k) => k.id)
  if (kawasanIds.length === 0) {
    return { rows: [], kawasanList, ringkasan1: [], ringkasan2: [], bulanLabel: monthLabel(bulan), tahun, bulan }
  }

  // jenis list
  const placeholders = kawasanIds.map(() => '?').join(',')
  const jenisRows = await query<{
    id: number; kawasan_id: number; parent_id: number | null; kode: string; nama: string; level: number; urutan: number
  }>(
    `SELECT id, kawasan_id, parent_id, kode, nama, level, urutan FROM jenis_retribusi
     WHERE kawasan_id IN (${placeholders}) AND aktif=1
     ORDER BY kawasan_id ASC, level ASC, urutan ASC, id ASC`,
    kawasanIds
  )

  // target map (tahun)
  const targetRows = await query<{ jenis_retribusi_id: number; nilai: number }>(
    `SELECT jenis_retribusi_id, nilai FROM target WHERE tahun = ? AND jenis_retribusi_id IN (SELECT id FROM jenis_retribusi WHERE kawasan_id IN (${placeholders}))`,
    [tahun, ...kawasanIds]
  )
  const targetMap = new Map<number, number>()
  for (const r of targetRows) targetMap.set(Number(r.jenis_retribusi_id), Number(r.nilai) || 0)

  // realisasi aggregations: per jenis_id, bucketed
  // sBelum: tanggal < monthStart AND substr(tanggal,1,4)=tahunStr  AND status!='ditolak'
  // m1..m4: tanggal >= monthStart AND tanggal < nextMonthStart
  // We use CAST(substr(tanggal,9,2) AS INTEGER) for day
  const realisasiRows = await query<{
    jenis_retribusi_id: number
    sBelum: number
    m1: number
    m2: number
    m3: number
    m4: number
  }>(
    `SELECT r.jenis_retribusi_id,
       COALESCE(SUM(CASE WHEN r.tanggal < ? THEN r.jumlah ELSE 0 END),0) AS sBelum,
       COALESCE(SUM(CASE WHEN r.tanggal >= ? AND r.tanggal < ? AND CAST(substr(r.tanggal,9,2) AS INTEGER) BETWEEN 1 AND 7  THEN r.jumlah ELSE 0 END),0) AS m1,
       COALESCE(SUM(CASE WHEN r.tanggal >= ? AND r.tanggal < ? AND CAST(substr(r.tanggal,9,2) AS INTEGER) BETWEEN 8 AND 14 THEN r.jumlah ELSE 0 END),0) AS m2,
       COALESCE(SUM(CASE WHEN r.tanggal >= ? AND r.tanggal < ? AND CAST(substr(r.tanggal,9,2) AS INTEGER) BETWEEN 15 AND 21 THEN r.jumlah ELSE 0 END),0) AS m3,
       COALESCE(SUM(CASE WHEN r.tanggal >= ? AND r.tanggal < ? AND CAST(substr(r.tanggal,9,2) AS INTEGER) >= 22 THEN r.jumlah ELSE 0 END),0) AS m4
     FROM realisasi r
     WHERE substr(r.tanggal,1,4)=? AND r.status=? AND r.jenis_retribusi_id IN (SELECT id FROM jenis_retribusi WHERE kawasan_id IN (${placeholders}))
     GROUP BY r.jenis_retribusi_id`,
    [monthStart, monthStart, nextMonthStart, monthStart, nextMonthStart, monthStart, nextMonthStart, monthStart, nextMonthStart, tahunStr, APPROVED_STATUS, ...kawasanIds]
  )
  const rbMap = new Map<number, { sBelum: number; m1: number; m2: number; m3: number; m4: number }>()
  for (const r of realisasiRows) {
    rbMap.set(Number(r.jenis_retribusi_id), {
      sBelum: Number(r.sBelum) || 0,
      m1: Number(r.m1) || 0,
      m2: Number(r.m2) || 0,
      m3: Number(r.m3) || 0,
      m4: Number(r.m4) || 0,
    })
  }

  // Build tree: id -> node with children
  type JNode = { id: number; kawasan_id: number; parent_id: number | null; kode: string; nama: string; level: number; urutan: number; children: JNode[] }
  const byId = new Map<number, JNode>()
  for (const j of jenisRows) {
    byId.set(Number(j.id), { id: Number(j.id), kawasan_id: Number(j.kawasan_id), parent_id: j.parent_id != null ? Number(j.parent_id) : null, kode: String(j.kode || ''), nama: String(j.nama), level: Number(j.level), urutan: Number(j.urutan), children: [] })
  }
  const roots: JNode[] = []
  for (const n of byId.values()) {
    if (n.parent_id != null && byId.has(n.parent_id)) byId.get(n.parent_id)!.children.push(n)
    else roots.push(n)
  }
  // sort children deterministically
  function sortTree(nodes: JNode[]) {
    nodes.sort((a, b) => a.level - b.level || a.urutan - b.urutan || a.id - b.id)
    for (const n of nodes) sortTree(n.children)
  }
  sortTree(roots)

  // aggregate bottom-up — Model A: induk = SUM anak (nilai langsung induk diabaikan jika punya anak)
  type Agg = { target: number; sBelum: number; m1: number; m2: number; m3: number; m4: number }
  const aggMap = new Map<number, Agg>()
  function computeAgg(n: JNode): Agg {
    if (n.children.length === 0) {
      const leaf: Agg = {
        target: targetMap.get(n.id) || 0,
        sBelum: rbMap.get(n.id)?.sBelum || 0,
        m1: rbMap.get(n.id)?.m1 || 0,
        m2: rbMap.get(n.id)?.m2 || 0,
        m3: rbMap.get(n.id)?.m3 || 0,
        m4: rbMap.get(n.id)?.m4 || 0,
      }
      aggMap.set(n.id, leaf)
      return leaf
    }
    let sum: Agg = { target: 0, sBelum: 0, m1: 0, m2: 0, m3: 0, m4: 0 }
    for (const c of n.children) {
      const ca = computeAgg(c)
      sum.target += ca.target
      sum.sBelum += ca.sBelum
      sum.m1 += ca.m1
      sum.m2 += ca.m2
      sum.m3 += ca.m3
      sum.m4 += ca.m4
    }
    aggMap.set(n.id, sum)
    return sum
  }
  for (const r of roots) computeAgg(r)

  // DFS to emit rows in referensi order grouped by kawasan
  const rows: RekapMingguanRow[] = []
  // group roots by kawasan
  const rootsByKawasan = new Map<number, JNode[]>()
  for (const r of roots) {
    const arr = rootsByKawasan.get(r.kawasan_id) || []
    arr.push(r)
    rootsByKawasan.set(r.kawasan_id, arr)
  }

  for (const kw of kawasanList) {
    const kwRoots = rootsByKawasan.get(kw.id) || []
    // kawasan header agg = sum of its roots
    let kwAgg: Agg = { target: 0, sBelum: 0, m1: 0, m2: 0, m3: 0, m4: 0 }
    for (const r of kwRoots) {
      const a = aggMap.get(r.id)!
      kwAgg.target += a.target; kwAgg.sBelum += a.sBelum; kwAgg.m1 += a.m1; kwAgg.m2 += a.m2; kwAgg.m3 += a.m3; kwAgg.m4 += a.m4
    }
    const totalMingguan = kwAgg.m1 + kwAgg.m2 + kwAgg.m3 + kwAgg.m4
    const sBulanIni = kwAgg.sBelum + totalMingguan
    rows.push({
      jenis_id: null, kawasan_id: kw.id, kawasan_kode: kw.kode, kawasan_nama: kw.nama,
      kode: kw.kode, nama: kw.id === kawasanList[0]!.id ? `Kawasan Wisata ${kw.nama}` : `Kawasan Wisata ${kw.nama}`,
      // first kawasan name matches referensi; second uses same template
      level: 0, urutan: kw.urutan, target: kwAgg.target, sBelum: kwAgg.sBelum, m1: kwAgg.m1, m2: kwAgg.m2, m3: kwAgg.m3, m4: kwAgg.m4,
      totalMingguan, sBulanIni, capaian: kwAgg.target > 0 ? sBulanIni / kwAgg.target : 0,
      isKawasan: true, isTotal: false,
    })
    // if single kawasan export, kawasan name already filtered; reuse nama asli
    // emit descendants depth-first
    function emit(n: JNode) {
      const a = aggMap.get(n.id)!
      const tot = a.m1 + a.m2 + a.m3 + a.m4
      const sBi = a.sBelum + tot
      // No column: only level 1 shows number (urutan), deeper blank, like referensi
      const kodeDisplay = n.level === 1 ? String(n.urutan) : ''
      rows.push({
        jenis_id: n.id, kawasan_id: n.kawasan_id, kawasan_kode: kw.kode, kawasan_nama: kw.nama,
        kode: kodeDisplay, nama: n.nama, level: n.level, urutan: n.urutan,
        target: a.target, sBelum: a.sBelum, m1: a.m1, m2: a.m2, m3: a.m3, m4: a.m4,
        totalMingguan: tot, sBulanIni: sBi, capaian: a.target > 0 ? sBi / a.target : 0,
        isKawasan: false, isTotal: false,
      })
      const sorted = [...n.children].sort((x, y) => x.urutan - y.urutan || x.id - y.id)
      for (const c of sorted) emit(c)
    }
    for (const r of kwRoots) emit(r)
  }

  // grand TOTAL
  let gTarget = 0, gSBelum = 0, gM1 = 0, gM2 = 0, gM3 = 0, gM4 = 0
  for (const kw of kawasanList) {
    const kwRow = rows.find((r) => r.isKawasan && r.kawasan_id === kw.id)!
    gTarget += kwRow.target; gSBelum += kwRow.sBelum; gM1 += kwRow.m1; gM2 += kwRow.m2; gM3 += kwRow.m3; gM4 += kwRow.m4
  }
  const gTot = gM1 + gM2 + gM3 + gM4
  const gSBi = gSBelum + gTot
  rows.push({
    jenis_id: null, kawasan_id: null, kawasan_kode: '', kawasan_nama: '',
    kode: '', nama: 'TOTAL', level: 99, urutan: 999, target: gTarget, sBelum: gSBelum, m1: gM1, m2: gM2, m3: gM3, m4: gM4,
    totalMingguan: gTot, sBulanIni: gSBi, capaian: gTarget > 0 ? gSBi / gTarget : 0,
    isKawasan: false, isTotal: true,
  })

  // ringkasan 1: per kawasan
  const ringkasan1 = kawasanList.map((kw) => {
    const kwRow = rows.find((r) => r.isKawasan && r.kawasan_id === kw.id)!
    return { kawasan_kode: kw.kode, kawasan_nama: kw.nama, target: kwRow.target, realisasi: kwRow.sBulanIni }
  })
  // include TOTAL agregat ringkasan1 implicit di excel builder

  // ringkasan 2: mingguan per kawasan
  const ringkasan2: { minggu: string; byKawasan: Record<string, number> }[] = []
  const labels = ['Minggu I', 'Minggu II', 'Minggu III', 'Minggu IV'] as const
  for (let i = 0; i < 4; i++) {
    const by: Record<string, number> = {}
    for (const kw of kawasanList) {
      const kwRow = rows.find((r) => r.isKawasan && r.kawasan_id === kw.id)!
      by[kw.kode] = [kwRow.m1, kwRow.m2, kwRow.m3, kwRow.m4][i]!
    }
    ringkasan2.push({ minggu: labels[i]!, byKawasan: by })
  }

  return { rows, kawasanList, ringkasan1, ringkasan2, bulanLabel: monthLabel(bulan), tahun, bulan }
}
