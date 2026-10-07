import { createRequire } from 'node:module'
import { getRekapPerJenis, getTotals, getTargetAnomali } from '../../utils/rekap'
import { getRekapMingguan } from '../../utils/rekapMingguan'
import { query } from '../../utils/db'

const _require = createRequire(import.meta.url)

const NAVY = 'FF1F4E79'
const LIGHT_BLUE = 'FFD9E2F3'
const YELLOW = 'FFFFE699'
const WHITE = 'FFFFFFFF'
const RED = 'FFC00000'
const GRAY = 'FF404040'
const THIN_BORDER = { style: 'thin' as const, color: { argb: 'FFB0B0B0' } }
const BORDER_ALL = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER }

function toCsv(rows: { kode: string; nama: string; kawasan: string; target: number; realisasi: number; capaian: number; selisih: number }[]): string {
  const header = ['Kode', 'Jenis Retribusi', 'Kawasan', 'Target', 'Realisasi', 'Capaian %', 'Selisih']
  const lines = [header.join(',')]
  for (const r of rows) {
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`
    lines.push([esc(r.kode), esc(r.nama), esc(r.kawasan), String(r.target), String(r.realisasi), String(r.capaian), String(r.selisih)].join(','))
  }
  return lines.join('\n')
}

const MONTH_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

async function buildWorkbookMingguan(opts: { kawasanId?: number; tahun: number; bulan: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ExcelJS: any = await import('exceljs').then((m: any) => m.default || m)
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SiperPAD'
  wb.created = new Date()
  const ws = wb.addWorksheet(`${MONTH_NAMES[opts.bulan]} ${opts.tahun}`, {
    properties: { tabColor: { argb: NAVY } },
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true },
  })

  const { rows, kawasanList, bulanLabel } = await getRekapMingguan({ kawasanId: opts.kawasanId, tahun: opts.tahun, bulan: opts.bulan })

  // column widths like referensi
  ws.columns = [
    { width: 5 }, // A No
    { width: 54 }, // B Jenis Penerimaan
    { width: 15.5 }, // C Target
    { width: 15.5 }, // D s/d bulan lalu
    { width: 10 }, // E I
    { width: 10 }, // F II
    { width: 10 }, // G III
    { width: 10 }, // H IV
    { width: 15.5 }, // I Total Mingguan
    { width: 15.5 }, // J s/d Bulan Ini
    { width: 10 }, // K % Capai
  ]

  // helpers
  function styleCell(cell: any, o: { font?: any; fill?: any; alignment?: any; numFmt?: string; border?: any }) {
    if (o.font) cell.font = o.font
    if (o.fill) cell.fill = o.fill
    if (o.alignment) cell.alignment = o.alignment
    if (o.numFmt) cell.numFmt = o.numFmt
    if (o.border) cell.border = o.border
  }
  function headerCell(cell: any, value: any) {
    cell.value = value
    styleCell(cell, {
      font: { name: 'Calibri', size: 12, bold: true, color: { argb: WHITE } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: BORDER_ALL,
    })
  }

  // Title rows 1-5 merged A:K like referensi
  const titleFont = { name: 'Calibri', size: 12, bold: true, color: { argb: NAVY } }
  const titles = [
    'LAPORAN REALISASI PENERIMAAN MINGGUAN',
    'DINAS PARIWISATA DAN EKONOMI KREATIF PROVINSI NTT',
    'KHUSUS KAWASAN WISATA PANTAI LASIANA DAN KAMPUNG SENI FLOBAMORATA',
    `KEADAAN SAMPAI DENGAN ${bulanLabel.toUpperCase()} ${opts.tahun}`,
    '(dalam Rupiah)',
  ]
  titles.forEach((t, i) => {
    const row = ws.getRow(i + 1)
    row.height = i === 4 ? 12 : 17
    const cell = row.getCell(1)
    cell.value = t
    styleCell(cell, { font: i === 4 ? { name: 'Calibri', size: 11, color: { argb: 'FF000000' } } : titleFont, alignment: { horizontal: 'center', vertical: 'middle' } })
    ws.mergeCells(i + 1, 1, i + 1, 11)
  })

  // Header rows 6-7
  const hr6 = ws.getRow(6)
  hr6.height = 22
  const hr7 = ws.getRow(7)
  hr7.height = 22
  // Row 6
  headerCell(hr6.getCell(1), 'No')
  headerCell(hr6.getCell(2), 'Jenis Penerimaan')
  headerCell(hr6.getCell(3), 'Target Penerimaan 2026')
  headerCell(hr6.getCell(4), 'Realisasi s/d Bulan Lalu')
  // E6:H6 merged header Realisasi Mingguan
  const e6 = hr6.getCell(5)
  headerCell(e6, 'Realisasi Mingguan')
  // need to style F6 G6 H6 same fill for merge
  ;[6, 7, 8].forEach((c) => headerCell(hr6.getCell(c), ''))
  ws.mergeCells(6, 5, 6, 8)
  headerCell(hr6.getCell(9), 'Total Mingguan')
  headerCell(hr6.getCell(10), 'Realisasi s/d Bulan Ini')
  headerCell(hr6.getCell(11), '% Capai')
  // Row 7 sub-header for minggu
  headerCell(hr7.getCell(1), '')
  headerCell(hr7.getCell(2), '')
  headerCell(hr7.getCell(3), '')
  headerCell(hr7.getCell(4), '')
  headerCell(hr7.getCell(5), 'I')
  headerCell(hr7.getCell(6), 'II')
  headerCell(hr7.getCell(7), 'III')
  headerCell(hr7.getCell(8), 'IV')
  headerCell(hr7.getCell(9), '')
  headerCell(hr7.getCell(10), '')
  headerCell(hr7.getCell(11), '')
  // merge vertical headers like referensi: A6:A7 etc and I6:I7 J6:J7 K6:K7 B? others
  ws.mergeCells(6, 1, 7, 1)
  ws.mergeCells(6, 2, 7, 2)
  ws.mergeCells(6, 3, 7, 3)
  ws.mergeCells(6, 4, 7, 4)
  ws.mergeCells(6, 9, 7, 9)
  ws.mergeCells(6, 10, 7, 10)
  ws.mergeCells(6, 11, 7, 11)
  // re-apply header style after merge (exceljs keeps master cell)
  // number formats for rupiah and percent
  const rupiahFmt = '#,##0;-#,##0;"-"'
  const rupiahFmtAlt = '#,##0;-#,##0;"-"'

  // Data rows starting row 8
  let rIdx = 8
  const dataStartRow = rIdx
  for (const row of rows) {
    const wsRow = ws.getRow(rIdx)
    // height: taller for parent aggregate rows (like referensi 31.5)
    if (row.isKawasan || row.level === 1) wsRow.height = 13
    else wsRow.height = 13
    const isKawasan = row.isKawasan
    const isTotal = row.isTotal

    // No column
    const cA = wsRow.getCell(1)
    cA.value = row.kode || ''
    // Jenis Penerimaan with indent by level (4 spaces per level like referensi)
    const cB = wsRow.getCell(2)
    let displayName = row.nama
    if (isKawasan) {
      // kawasan header already full
    } else if (row.level === 1) {
      displayName = `    ${row.nama}`
    } else if (row.level === 2) {
      // parent's children at level 2: in referensi "        Sewa..." 8 spaces or "            1. Food Court"
      // use 8 spaces for level 2 simple, 12 for deeper? follow referensi indentation
      displayName = `        ${row.nama}`
    } else if (row.level === 3) {
      displayName = `            ${row.nama}`
      // for sub-items like "a. Nomor B1" has extra indent
      if (row.nama.startsWith('Food Court') || row.nama.includes('Nomor B')) displayName = `                ${row.nama}`
    } else if (row.level >= 4) {
      displayName = `                ${row.nama}`
      if (row.nama === 'Dewasa' || row.nama === 'Anak' || row.nama === 'Wisatawan Mancanegara') displayName = `                    - ${row.nama}`
    }
    if (isTotal) displayName = 'TOTAL'
    cB.value = displayName

    const cC = wsRow.getCell(3); cC.value = row.target
    const cD = wsRow.getCell(4); cD.value = row.sBelum
    const cE = wsRow.getCell(5); cE.value = row.m1
    const cF = wsRow.getCell(6); cF.value = row.m2
    const cG = wsRow.getCell(7); cG.value = row.m3
    const cH = wsRow.getCell(8); cH.value = row.m4
    const cI = wsRow.getCell(9); cI.value = row.totalMingguan
    const cJ = wsRow.getCell(10); cJ.value = row.sBulanIni
    const cK = wsRow.getCell(11); cK.value = row.target > 0 ? row.capaian : null

    // alignment and fonts
    const baseFont: any = { name: 'Calibri', size: 11 }
    if (isKawasan) baseFont.bold = true
    if (isTotal) baseFont.bold = true
    // B column left, others right/center
    styleCell(cA, { font: { ...baseFont, color: { argb: 'FF000000' } }, alignment: { horizontal: 'center', vertical: 'middle' }, border: BORDER_ALL, fill: isKawasan ? { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } } : isTotal ? { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW } } : undefined })
    styleCell(cB, { font: { ...baseFont, color: { argb: 'FF000000' } }, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true }, border: BORDER_ALL, fill: isKawasan ? { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } } : isTotal ? { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW } } : undefined })
    const rupiahCells = [cC, cD, cE, cF, cG, cH, cI, cJ]
    for (const cc of rupiahCells) {
      styleCell(cc, {
        font: { ...baseFont, color: { argb: 'FF000000' } },
        alignment: { horizontal: 'right', vertical: 'middle' },
        border: BORDER_ALL,
        numFmt: rupiahFmt,
        fill: isKawasan ? { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } } : isTotal ? { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW } } : undefined,
      })
    }
    styleCell(cK, {
      font: { ...baseFont, color: { argb: 'FF000000' } },
      alignment: { horizontal: 'right', vertical: 'middle' },
      border: BORDER_ALL,
      numFmt: '0.00%',
      fill: isKawasan ? { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } } : isTotal ? { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW } } : undefined,
    })

    rIdx++
  }
  const dataEndRow = rIdx - 1

  // Freeze panes at data start (like referensi freeze D47 etc; we freeze at C8 approx)
  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 7 }]

  // Print setup
  ws.pageSetup.printTitleRows = '6:7'

  // === RINGKASAN blocks + CATATAN ===
  // add 2 blank rows
  rIdx += 2

  // Helper to draw a small table with header styling
  function drawRingkasan(options: { title: string; headers: string[]; rows: any[][]; colWidths?: number[]; startCol?: number }) {
    const tRow = ws.getRow(rIdx)
    const tCell = tRow.getCell(options.startCol || 2)
    tCell.value = options.title
    styleCell(tCell, { font: { name: 'Calibri', size: 11, bold: true, color: { argb: NAVY } } })
    // merge title across headers width
    rIdx++
    const hRow = ws.getRow(rIdx)
    hRow.height = 16
    options.headers.forEach((h, i) => {
      const col = (options.startCol || 2) + i
      headerCell(hRow.getCell(col), h)
    })
    rIdx++
    for (const r of options.rows) {
      const row = ws.getRow(rIdx)
      row.height = 13
      r.forEach((val: any, i) => {
        const col = (options.startCol || 2) + i
        const cell = row.getCell(col)
        const isNumber = typeof val === 'number'
        cell.value = val
        styleCell(cell, {
          font: { name: 'Calibri', size: 11 },
          alignment: { horizontal: isNumber ? 'right' : 'left', vertical: 'middle' },
          border: BORDER_ALL,
          numFmt: isNumber ? rupiahFmtAlt : undefined,
        })
      })
      rIdx++
    }
    rIdx++ // gap after table
  }

  // RINGKASAN 1 - Target vs Realisasi per Kawasan
  {
    const totalTarget = rows.find((r) => r.isTotal)!.target
    const totalRealisasi = rows.find((r) => r.isTotal)!.sBulanIni
    const r1Rows: any[][] = kawasanList.map((kw) => {
      const kwRow = rows.find((r) => r.isKawasan && r.kawasan_id === kw.id)!
      return [kw.nama, kwRow.target, kwRow.sBulanIni]
    })
    r1Rows.push(['TOTAL', totalTarget, totalRealisasi])
    drawRingkasan({ title: `RINGKASAN 1 - Target vs Realisasi per Kawasan (s/d ${bulanLabel} ${opts.tahun})`, headers: ['Kawasan', 'Target 2026', `Realisasi s/d ${bulanLabel} ${opts.tahun}`], rows: r1Rows })
  }

  // RINGKASAN 2 - Realisasi Mingguan per Kawasan
  {
    const r2Rows: any[][] = [
      ['Minggu I', ...kawasanList.map((kw) => rows.find((r) => r.isKawasan && r.kawasan_id === kw.id)!.m1)],
      ['Minggu II', ...kawasanList.map((kw) => rows.find((r) => r.isKawasan && r.kawasan_id === kw.id)!.m2)],
      ['Minggu III', ...kawasanList.map((kw) => rows.find((r) => r.isKawasan && r.kawasan_id === kw.id)!.m3)],
      ['Minggu IV', ...kawasanList.map((kw) => rows.find((r) => r.isKawasan && r.kawasan_id === kw.id)!.m4)],
    ]
    const headers = ['Minggu', ...kawasanList.map((k) => k.nama)]
    drawRingkasan({ title: 'RINGKASAN 2 - Realisasi Mingguan per Kawasan', headers, rows: r2Rows })
  }

  // RINGKASAN 3 - Realisasi per Pos Penerimaan Utama (only when all kawasan)
  if (!opts.kawasanId || kawasanList.length > 1) {
    // find helpers
    const find = (pred: (r: (typeof rows)[number]) => boolean) => rows.find(pred)
    const foodCourt = find((r) => !r.isKawasan && !r.isTotal && r.nama.includes('Sewa Tempat Usaha Kampung Seni')) // level 2 parent
    const toilet = find((r) => r.nama.includes('Toilet Pos Jaga'))
    const parkirLasiana = find((r) => !r.isKawasan && r.kawasan_kode === 'B' && r.level === 1 && r.nama.includes('Parkir'))
    const masukLasiana = find((r) => r.nama === 'Masuk Kawasan Lasiana')
    const aula = find((r) => r.nama.includes('Sewa Aula'))
    const mck = find((r) => r.nama === 'Sewa MCK')
    const lopoPanggung = find((r) => r.nama === 'Sewa Lopo Panggung')
    const lopoPermanen = find((r) => r.nama === 'Sewa Lopo Permanen')
    const lasianaTotal = rows.find((r) => r.isKawasan && r.kawasan_kode === 'B')
    const sumKnownLasianaTarget = [parkirLasiana, masukLasiana, aula, mck].reduce((s, r) => s + (r?.target || 0), 0) + (lopoPanggung?.target || 0) + (lopoPermanen?.target || 0)
    const sumKnownLasianaRealisasi = [parkirLasiana, masukLasiana, aula, mck].reduce((s, r) => s + (r?.sBulanIni || 0), 0) + (lopoPanggung?.sBulanIni || 0) + (lopoPermanen?.sBulanIni || 0)
    const posLainTarget = (lasianaTotal?.target || 0) - sumKnownLasianaTarget
    const posLainRealisasi = (lasianaTotal?.sBulanIni || 0) - sumKnownLasianaRealisasi

    const r3Rows: any[][] = [
      ['Food Court (Kampung Seni)', foodCourt?.target || 0, foodCourt?.sBulanIni || 0],
      ['Sewa Toilet Pos Jaga (Kmp Seni)', toilet?.target || 0, toilet?.sBulanIni || 0],
      ['Retribusi Parkir (Lasiana)', parkirLasiana?.target || 0, parkirLasiana?.sBulanIni || 0],
      ['Masuk Kawasan Lasiana', masukLasiana?.target || 0, masukLasiana?.sBulanIni || 0],
      ['Sewa Aula / Gedung (Lasiana)', aula?.target || 0, aula?.sBulanIni || 0],
      ['Sewa MCK (Lasiana)', mck?.target || 0, mck?.sBulanIni || 0],
      ['Sewa Lopo Panggung + Permanen', (lopoPanggung?.target || 0) + (lopoPermanen?.target || 0), (lopoPanggung?.sBulanIni || 0) + (lopoPermanen?.sBulanIni || 0)],
      ['Pos lainnya (Lasiana)', posLainTarget, posLainRealisasi],
    ]
    drawRingkasan({ title: 'RINGKASAN 3 - Realisasi per Pos Penerimaan Utama', headers: ['Pos Penerimaan', 'Target 2026', `Realisasi s/d ${bulanLabel} ${opts.tahun}`], rows: r3Rows })
  } else {
    // Single kawasan: breakdown per level-1 groups
    const kw = kawasanList[0]!
    const level1Rows = rows.filter((r) => !r.isKawasan && !r.isTotal && r.kawasan_id === kw.id && r.level === 1)
    const r3Rows = level1Rows.map((r) => [r.nama, r.target, r.sBulanIni])
    drawRingkasan({ title: `RINGKASAN 3 - Realisasi per Pos (${kw.nama})`, headers: ['Pos Penerimaan', 'Target 2026', `Realisasi s/d ${bulanLabel} ${opts.tahun}`], rows: r3Rows })
  }

  // CATATAN
  rIdx++ // extra gap
  {
    const nRow = ws.getRow(rIdx)
    const nCell = nRow.getCell(2)
    nCell.value = 'CATATAN'
    styleCell(nCell, { font: { name: 'Calibri', size: 11, bold: true, color: { argb: RED } } })
    rIdx++
    const notes: string[] = [
      `Sumber: SiperPAD — Realisasi s/d ${bulanLabel} ${opts.tahun}. Minggu I: tgl 1–7, II: 8–14, III: 15–21, IV: 22–akhir bulan.`,
      'Total Mingguan = SUM(Minggu I:IV); Realisasi s/d Bulan Ini = Realisasi s/d Bulan Lalu + Total Mingguan (rumus hidup di Excel).',
    ]
    // Catatan anomali target: nilai induk tertulis vs jumlah anak (Model A).
    try {
      const anomali = await getTargetAnomali({ kawasanId: opts.kawasanId, tahun: opts.tahun })
      for (const a of anomali) {
        notes.push(`ANOMALI TARGET — ${a.kode} ${a.nama}: target induk tertulis Rp${a.nilai_induk.toLocaleString('id-ID')} ≠ jumlah rincian anak Rp${a.jumlah_anak.toLocaleString('id-ID')} (selisih Rp${a.selisih.toLocaleString('id-ID')}). Perlu konfirmasi Bendahara Penerimaan.`)
      }
    } catch { /* abaikan bila gagal */ }
    for (const note of notes) {
      const row = ws.getRow(rIdx)
      const cell = row.getCell(2)
      cell.value = note
      styleCell(cell, { font: { name: 'Calibri', size: 10, color: { argb: GRAY } }, alignment: { wrapText: true, vertical: 'top', horizontal: 'left' } })
      ws.mergeCells(rIdx, 2, rIdx, 11)
      row.height = 16
      rIdx++
    }
  }

  // Auto filter on header?
  // ws.autoFilter = { from: { row: 6, column: 1 }, to: { row: 7, column: 11 } }

  const buf: Buffer = await wb.xlsx.writeBuffer()
  return { buf, kawasanList, dataEndRow }
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const role = String(session.user.role)
  if (!['admin', 'kepala'].includes(role)) throw createError({ statusCode: 403, message: 'Hanya admin/kepala dapat ekspor' })

  const q = getQuery(event) as { kawasan_id?: string; tahun?: string; bulan?: string; format?: string }
  const tahun = Number(q.tahun) || new Date().getFullYear()
  let bulan = q.bulan ? Number(q.bulan) : new Date().getMonth() + 1
  if (!Number.isFinite(bulan) || bulan < 1 || bulan > 12) bulan = new Date().getMonth() + 1
  const kawasanId = q.kawasan_id ? Number(q.kawasan_id) : undefined
  const format = (q.format || 'csv').toLowerCase()
  if (!['csv', 'xlsx', 'pdf'].includes(format)) throw createError({ statusCode: 400, message: 'Format harus csv/xlsx/pdf' })

  // CSV / PDF keep flat rekap
  if (format === 'csv' || format === 'pdf') {
    const perJenis = await getRekapPerJenis({ kawasanId, tahun })
    const totals = await getTotals(perJenis)
    let kawasanLabel = 'Semua Kawasan'
    if (kawasanId) {
      const r = await query<{ nama: string; kode: string }>('SELECT nama, kode FROM kawasan WHERE id = ?', [kawasanId])
      if (r.length) kawasanLabel = `${r[0]!.kode} — ${r[0]!.nama}`
    }
    const flat = perJenis.map((r) => ({
      kode: r.kode || '-',
      nama: r.nama,
      kawasan: `${r.kawasan_kode} — ${r.kawasan_nama}`,
      target: r.target,
      realisasi: r.realisasi,
      capaian: r.capaian,
      selisih: r.selisih,
    }))
    if (format === 'csv') {
      const csv = toCsv(flat)
      setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
      setHeader(event, 'Content-Disposition', `attachment; filename="rekap-${tahun}-${kawasanLabel.replace(/[^A-Za-z0-9]+/g, '_')}.csv"`)
      return csv
    }
    // pdf — portrait A4 via pdfkit
    const PDFDocument = _require('pdfkit') as unknown as new (opts: unknown) => InstanceType<typeof import('pdfkit')>
    const doc = new PDFDocument({ size: 'A4', margin: 36, layout: 'portrait' })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))))
    doc.fontSize(14).text('Rekap Retribusi PAD', { align: 'center' })
    doc.fontSize(9).text(`${kawasanLabel} — Tahun ${tahun}`, { align: 'center' })
    doc.fontSize(7).text(`Tanggal cetak: ${new Date().toLocaleString('id-ID')}`, { align: 'center' })
    doc.moveDown(0.6)
    const cols = [
      { w: 48, label: 'Kode' },
      { w: 170, label: 'Jenis' },
      { w: 90, label: 'Kawasan' },
      { w: 60, label: 'Target', align: 'right' as const },
      { w: 60, label: 'Realisasi', align: 'right' as const },
      { w: 52, label: 'Capaian', align: 'right' as const },
      { w: 60, label: 'Selisih', align: 'right' as const },
    ]
    const tableLeft = 36
    const rowH = 12
    let y = (doc as unknown as { y: number }).y
    const fmt = (n: number) => n.toLocaleString('id-ID')
    function drawRow(vals: string[], bold = false, yPos: number) {
      let x = tableLeft
      doc.fontSize(6)
      if (bold) doc.font('Helvetica-Bold')
      else doc.font('Helvetica')
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i]!
        const v = vals[i] ?? ''
        const opts: Record<string, unknown> = { width: c.w, align: c.align || 'left', continued: false }
        doc.text(v, x + 2, yPos + 2, opts as never)
        doc.rect(x, yPos, c.w, rowH).strokeColor('#cccccc').stroke()
        x += c.w
      }
    }
    drawRow(cols.map((c) => c.label), true, y)
    y += rowH
    doc.font('Helvetica').fontSize(6)
    for (const r of flat) {
      if (y > 770) {
        doc.addPage()
        y = 36
        drawRow(cols.map((c) => c.label), true, y)
        y += rowH
      }
      drawRow([r.kode, r.nama.slice(0, 48), r.kawasan.slice(0, 22), fmt(r.target), fmt(r.realisasi), `${r.capaian}%`, fmt(r.selisih)], false, y)
      y += rowH
    }
    if (y > 730) {
      doc.addPage()
      y = 36
    }
    y += 6
    doc.font('Helvetica-Bold').fontSize(7).text(`TOTAL TARGET: ${fmt(totals.totalTarget)}`, tableLeft, y)
    y += 10
    doc.text(`TOTAL REALISASI: ${fmt(totals.totalRealisasi)}`, tableLeft, y)
    y += 10
    doc.text(`CAPAIAN: ${totals.capaian}%   SELISIH: ${fmt(totals.selisih)}`, tableLeft, y)
    doc.end()
    const pdfBuf = await done
    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(event, 'Content-Disposition', `attachment; filename="rekap-${tahun}.pdf"`)
    return pdfBuf
  }

  // xlsx — Laporan Mingguan berstruktur referensi via exceljs
  let kawasanLabelShort = 'Semua-Kawasan'
  if (kawasanId) {
    const r = await query<{ nama: string; kode: string }>('SELECT nama, kode FROM kawasan WHERE id = ?', [kawasanId])
    if (r.length) kawasanLabelShort = `${r[0]!.kode}-${r[0]!.nama.replace(/[^A-Za-z0-9]+/g, '_')}`
  }
  const bulanPadded = String(bulan).padStart(2, '0')
  const { buf } = await buildWorkbookMingguan({ kawasanId, tahun, bulan })
  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="laporan-mingguan-${kawasanLabelShort}-${tahun}-${bulanPadded}.xlsx"`)
  return buf
})
