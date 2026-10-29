import { getRekapPerJenis, getTargetAnomali } from '../../utils/rekap'
import { getRekapMingguan } from '../../utils/rekapMingguan'
import { query } from '../../utils/db'
import { getPejabat } from '../../utils/pejabat'
import { sessionKawasanId } from '../../utils/lock'

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
    // Jenis Penerimaan dengan penomoran bersarang per level (indent + nomor).
    const cB = wsRow.getCell(2)
    let displayName = row.nama
    if (isKawasan) {
      displayName = row.nama
    } else if (isTotal) {
      displayName = 'TOTAL'
    } else {
      const pad = ' '.repeat(Math.max(0, (row.level - 1) * 3))
      const prefix = row.nomor ? `${row.nomor} ` : ''
      displayName = `${pad}${prefix}${row.nama}`
    }
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

  // === SHEET 2: PERBANDINGAN PERIODE (bulan lalu vs bulan berjalan) ===
  // Meniru sheet "Perbandingan Agt vs Sept" pada file Excel referensi:
  // kolom Bulan Berjalan A vs B + selisih (Rp & %), lalu realisasi kumulatif.
  await buildSheetPerbandingan(wb, { kawasanId: opts.kawasanId, tahun: opts.tahun, bulan: opts.bulan, kawasanList })

  const buf: Buffer = await wb.xlsx.writeBuffer()
  return { buf, kawasanList, dataEndRow }
}

// Bangun sheet "Perbandingan" (bulan lalu vs bulan berjalan) pada workbook.
async function buildSheetPerbandingan(
  wb: any,
  opts: { kawasanId?: number; tahun: number; bulan: number; kawasanList: { id: number; kode: string; nama: string }[] },
) {
  const { getPerbandingan, getRealisasiKumulatif } = await import('../../utils/rekap')
  const { monthStart, monthEnd, monthLabel } = await import('../../utils/periode')

  const prevBulan = opts.bulan === 1 ? 12 : opts.bulan - 1
  const prevTahun = opts.bulan === 1 ? opts.tahun - 1 : opts.tahun
  const labelA = `${monthLabel(prevBulan)} ${prevTahun}`
  const labelB = `${monthLabel(opts.bulan)} ${opts.tahun}`

  const { perJenis, total } = await getPerbandingan({
    kawasanId: opts.kawasanId,
    a: { from: monthStart(prevTahun, prevBulan), to: monthEnd(prevTahun, prevBulan), label: labelA },
    b: { from: monthStart(opts.tahun, opts.bulan), to: monthEnd(opts.tahun, opts.bulan), label: labelB },
  })

  // Kumulatif s/d masing-masing periode (untuk kolom "% Capai" ala referensi).
  const kumA = await getRealisasiKumulatif({ kawasanId: opts.kawasanId, tahun: prevTahun, bulan: prevBulan })
  const kumB = await getRealisasiKumulatif({ kawasanId: opts.kawasanId, tahun: opts.tahun, bulan: opts.bulan })

  const ws = wb.addWorksheet(`Perbandingan`, {
    properties: { tabColor: { argb: 'FF1F7A4D' } },
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true },
  })

  ws.columns = [
    { width: 12 }, // A Kode
    { width: 54 }, // B Jenis Penerimaan
    { width: 16 }, // C Bulan A
    { width: 16 }, // D Bulan B
    { width: 16 }, // E Selisih (Rp)
    { width: 11 }, // F Selisih (%)
  ]

  const titleFont = { name: 'Calibri', size: 12, bold: true, color: { argb: NAVY } }
  const titles = [
    'PERBANDINGAN REALISASI PENERIMAAN',
    'DINAS PARIWISATA DAN EKONOMI KREATIF PROVINSI NTT',
    'KAWASAN WISATA PANTAI LASIANA DAN KAMPUNG SENI FLOBAMORATA',
    `${labelA}  vs  ${labelB}`,
    '(dalam Rupiah)',
  ]
  titles.forEach((t, i) => {
    const row = ws.getRow(i + 1)
    const cell = row.getCell(1)
    cell.value = t
    ws.mergeCells(i + 1, 1, i + 1, 6)
    cell.font = titleFont
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  const headerRow = ws.getRow(7)
  headerRow.height = 28
  const headers = ['Kode', 'Jenis Penerimaan', labelA, labelB, 'Selisih (Rp)', 'Selisih (%)']
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    cell.alignment = { horizontal: i === 1 ? 'left' : 'center', vertical: 'middle', wrapText: true }
    cell.border = BORDER_ALL
  })

  const rupiahFmt = '#,##0;[Red]-#,##0'
  let r = 8
  for (const row of perJenis) {
    const excelRow = ws.getRow(r)
    excelRow.height = 15
    const indent = Math.max(0, (row.level - 1) * 2)
    const cells = [
      { v: row.kode || '', num: false },
      { v: ' '.repeat(indent) + row.nama, num: false },
      { v: row.a, num: true },
      { v: row.b, num: true },
      { v: row.selisih, num: true },
      { v: row.persen / 100, num: true },
    ]
    cells.forEach((c, i) => {
      const cell = excelRow.getCell(i + 1)
      cell.value = c.v
      cell.font = { name: 'Calibri', size: 11, bold: row.has_child, color: { argb: row.level === 1 ? NAVY : 'FF000000' } }
      cell.alignment = { horizontal: c.num ? 'right' : 'left', vertical: 'middle' }
      cell.border = BORDER_ALL
      if (c.num) cell.numFmt = i === 5 ? '0.00%' : rupiahFmt
    })
    r++
  }

  // Baris TOTAL
  const totalRow = ws.getRow(r)
  totalRow.height = 16
  const totalCells = [
    { v: 'TOTAL', num: false },
    { v: '', num: false },
    { v: total.a, num: true },
    { v: total.b, num: true },
    { v: total.selisih, num: true },
    { v: total.persen / 100, num: true },
  ]
  totalCells.forEach((c, i) => {
    const cell = totalRow.getCell(i + 1)
    cell.value = c.v
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: NAVY } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW } }
    cell.alignment = { horizontal: c.num ? 'right' : 'left', vertical: 'middle' }
    cell.border = BORDER_ALL
    if (c.num) cell.numFmt = i === 5 ? '0.00%' : rupiahFmt
  })
  r += 2

  // CATATAN perbandingan
  const noteRows = [
    `Realisasi kumulatif s/d ${labelA}: Rp${kumA.kumulatif.toLocaleString('id-ID')} | s/d ${labelB}: Rp${kumB.kumulatif.toLocaleString('id-ID')}.`,
    'Selisih = Bulan B - Bulan A. Nilai negatif berarti penerimaan bulan berjalan lebih rendah dari bulan pembanding.',
    'Angka resmi hanya realisasi berstatus DISETUJUI.',
  ]
  const nCell = ws.getRow(r).getCell(1)
  nCell.value = 'CATATAN'
  nCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: RED } }
  r++
  for (const note of noteRows) {
    const cell = ws.getRow(r).getCell(1)
    cell.value = note
    cell.font = { name: 'Calibri', size: 10, color: { argb: GRAY } }
    cell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' }
    ws.mergeCells(r, 1, r, 6)
    r++
  }

  ws.views = [{ state: 'frozen', ySplit: 7 }]
}

// === LAPORAN REALISASI PENERIMAAN (PDF) ===
// Layout mengikuti referensi/contoh laporan.pdf: landscape 14"x8.5" (1008 x 612 pt),
// kolom: Kode Rekening | JENIS PENERIMAAN | Volume/Satuan | Target 2026 |
//        s/d Bulan Lalu | Bulan Ini | S/D Bulan Ini | % | KETERANGAN
const PAGE_W = 1008
const PAGE_H = 612
const MARGIN = 20

// Blok tanda tangan: dimuat dinamis dari settings (admin dapat mengubah).
// Default disediakan oleh getPejabat() (server/utils/pejabat.ts).

type PdfRow = {
  kode: string
  nomor: string
  nama: string
  level: number
  isKawasan: boolean
  isTotal: boolean
  volume: string
  target: number
  sBelum: number
  bulanIni: number
  sBulanIni: number
  capaian: number // 0..1
  keterangan: string
}

async function buildPdfLaporan(opts: {
  rows: PdfRow[]
  bulanLabel: string
  tahun: number
  bulan: number
  tanggalAngka: number
  tanggalLabel: string
}): Promise<Buffer> {
  const PEJABAT = await getPejabat()
  const tempatTanggal = (tgl: number, bulanLabel: string, tahun: number) => `Kupang, ${tgl} ${bulanLabel} ${tahun}`
  // pdfkit ESM: import sebagai default.
  const PDFDocument = (await import('pdfkit')).default as unknown as new (o: unknown) => any
  // PAGE_W x PAGE_H adalah dimensi sebenarnya (1008 x 612 pt = landscape 14"x8.5").
  // pdfkit menukar width/height saat layout:landscape, maka pakai layout portrait.
  const doc = new PDFDocument({ size: [PAGE_W, PAGE_H], margin: MARGIN, layout: 'portrait' })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))))

  // Column widths (total 968 = PAGE_W - 2*MARGIN)
  const cols = [
    { key: 'kode', label: 'Kode Rekening', w: 74, align: 'left' as const },
    { key: 'nama', label: 'JENIS PENERIMAAN', w: 338, align: 'left' as const },
    { key: 'volume', label: 'Volume / Satuan', w: 56, align: 'center' as const },
    { key: 'target', label: 'TARGET PENERIMAAN 2026 ( Rp )', w: 98, align: 'right' as const },
    { key: 'sBelum', label: 'S / D BULAN LALU ( RP )', w: 92, align: 'right' as const },
    { key: 'bulanIni', label: 'BULAN INI ( Rp )', w: 84, align: 'right' as const },
    { key: 'sBulanIni', label: 'S/D BULAN INI ( Rp )', w: 92, align: 'right' as const },
    { key: 'capaian', label: '%', w: 54, align: 'right' as const },
    { key: 'ket', label: 'KETERANGAN', w: 80, align: 'left' as const },
  ]
  const tableLeft = MARGIN
  const tableW = cols.reduce((s, c) => s + c.w, 0)
  // Ukuran font (diperbesar agar mudah dibaca)
  const FONT_TITLE1 = 13
  const FONT_TITLE2 = 11
  const FONT_HEADER = 8
  const FONT_HEADER_SUB = 6.5
  const FONT_NUM = 7
  const FONT_BODY = 9.5
  const FONT_KET = 8.5
  const FONT_SIGN = 9.5
  // Geometri
  const HEADER_LABEL_H = 13 // baris label utama (1 baris)
  const HEADER_SUB_H = 10 // baris sub-label "( Rp )"
  const HEADER_TOP_H = HEADER_LABEL_H + HEADER_SUB_H
  const HEADER_NUM_H = 12 // tinggi baris nomor 1..9
  const HEADER_H = HEADER_TOP_H + HEADER_NUM_H
  const ROW_H = 21
  const FOOTER_H = 8
  const bottomLimit = PAGE_H - MARGIN - FOOTER_H

  const fmtRupiah = (n: number) => {
    if (!n) return '-'
    return n.toLocaleString('id-ID')
  }
  const fmtPersen = (ratio: number, target: number) => (target > 0 ? `${(ratio * 100).toFixed(2)}%` : '-')

  // Kecilkan ukuran font hingga teks muat 1 baris di lebar w (min 6pt).
  function fitFontSize(text: string, w: number, start = FONT_HEADER, min = 6): number {
    let size = start
    while (size > min) {
      doc.font('Helvetica-Bold').fontSize(size)
      if (doc.widthOfString(text) <= w - 4) return size
      size -= 0.25
    }
    return min
  }

  function drawTitle() {
    doc.font('Helvetica-Bold').fontSize(FONT_TITLE1).fillColor('#000000')
      .text('LAPORAN REALISASI PENERIMAAN', MARGIN, doc.y, { width: tableW, align: 'center' })
    doc.font('Helvetica-Bold').fontSize(FONT_TITLE2)
      .text('DINAS PARIWISATA DAN EKONOMI KREATIF PROVINSI NTT', MARGIN, doc.y, { width: tableW, align: 'center' })
    doc.font('Helvetica-Bold').fontSize(FONT_TITLE2)
      .text(`KEADAAN SAMPAI DENGAN ${opts.tanggalLabel}`, MARGIN, doc.y, { width: tableW, align: 'center' })
    doc.moveDown(0.4)
  }

  function drawHeader() {
    const yTop = doc.y
    // Row labels via explicit text per cell (auto-fit agar tidak tumpang tindih)
    const drawCellText = (x: number, y: number, w: number, h: number, text: string, o?: { size?: number; align?: 'left' | 'center' | 'right' }) => {
      const size = o?.size ?? FONT_HEADER
      doc.font('Helvetica-Bold').fontSize(size)
      doc.text(text, x + 2, y + (h - size) / 2, { width: w - 4, align: o?.align ?? 'left', lineBreak: false })
    }
    let x = tableLeft
    const fullH = HEADER_H
    const yLabel = yTop
    const ySub = yTop + HEADER_LABEL_H
    for (const c of cols) {
      doc.rect(x, yTop, c.w, fullH).strokeColor('#000000').lineWidth(0.5).stroke()
      // Label dua bagian (mis. "TARGET PENERIMAAN 2026 ( Rp )")
      const lines = c.label.split(' ( ')
      if (lines.length > 1) {
        const label = lines[0]!
        const sub = `( ${lines[1]}`
        drawCellText(x, yLabel, c.w, HEADER_LABEL_H, label, { size: fitFontSize(label, c.w), align: 'center' })
        drawCellText(x, ySub, c.w, HEADER_SUB_H, sub, { size: fitFontSize(sub, c.w, FONT_HEADER_SUB, 5.5), align: 'center' })
        doc.moveTo(x, ySub).lineTo(x + c.w, ySub).strokeColor('#000000').lineWidth(0.5).stroke()
      } else if (c.key === 'capaian') {
        drawCellText(x, yLabel, c.w, HEADER_LABEL_H, '%', { size: FONT_HEADER, align: 'center' })
        drawCellText(x, ySub, c.w, HEADER_SUB_H, '8=(7/4*100%)', { size: fitFontSize('8=(7/4*100%)', c.w, FONT_HEADER_SUB, 5.5), align: 'center' })
        doc.moveTo(x, ySub).lineTo(x + c.w, ySub).strokeColor('#000000').lineWidth(0.5).stroke()
      } else {
        drawCellText(x, yLabel, c.w, HEADER_TOP_H, c.label, { size: fitFontSize(c.label, c.w, FONT_HEADER, 6), align: 'center' })
      }
      x += c.w
    }
    // numbering row: 1..9
    const yNum = yTop + HEADER_TOP_H
    doc.rect(tableLeft, yNum, tableW, HEADER_NUM_H).strokeColor('#000000').lineWidth(0.5).stroke()
    x = tableLeft
    const nums = ['1', '2', '3', '4', '5', '6', '7 = ( 5 + 6 )', '8', '9']
    cols.forEach((c, i) => {
      if (i > 0) doc.moveTo(x, yNum).lineTo(x, yNum + HEADER_NUM_H).stroke()
      drawCellText(x, yNum, c.w, HEADER_NUM_H, nums[i]!, { size: fitFontSize(nums[i]!, c.w, FONT_NUM, 5.5), align: 'center' })
      x += c.w
    })
    doc.y = yNum + HEADER_NUM_H
    doc.x = tableLeft
  }

  function drawRow(row: { cells: string[]; bold?: boolean; align?: ('left' | 'center' | 'right')[]; height?: number }, reserveBottom = 0) {
    // Kolom yang boleh dibungkus ke beberapa baris (word-wrap).
    const WRAP_KEYS = new Set(['nama', 'ket'])
    const font = row.bold ? 'Helvetica-Bold' : 'Helvetica'

    // Hitung tinggi sel (multi-baris) per kolom.
    const cellHeights: number[] = cols.map((c, i) => {
      const txt = row.cells[i] ?? ''
      const size = c.key === 'ket' ? FONT_KET : FONT_BODY
      doc.font(font).fontSize(size)
      if (!txt) return size
      const h = WRAP_KEYS.has(c.key)
        ? doc.heightOfString(txt, { width: c.w - 6 })
        : size
      return h
    })
    const maxContentH = Math.max(...cellHeights)
    // Tinggi baris = maksimum konten + padding, minimal ROW_H.
    const h = row.height ?? Math.max(ROW_H, Math.ceil(maxContentH) + 8)

    if (doc.y + h + reserveBottom > bottomLimit) {
      doc.addPage()
      doc.y = MARGIN
      drawHeader()
    }
    const y = doc.y
    doc.rect(tableLeft, y, tableW, h).strokeColor('#000000').lineWidth(0.5).stroke()
    let x = tableLeft
    cols.forEach((c, i) => {
      if (i > 0) doc.moveTo(x, y).lineTo(x, y + h).stroke()
      const txt = row.cells[i] ?? ''
      const align = row.align?.[i] ?? c.align
      const size = c.key === 'ket' ? FONT_KET : FONT_BODY
      doc.font(font).fontSize(size)
      const textY = y + (h - cellHeights[i]!) / 2
      if (WRAP_KEYS.has(c.key)) {
        doc.text(txt, x + 3, textY, { width: c.w - 6, align, lineBreak: true })
      } else {
        doc.text(txt, x + 3, textY, { width: c.w - 6, align, lineBreak: false, ellipsis: true })
      }
      x += c.w
    })
    doc.y = y + h
    doc.x = tableLeft
  }

  function indentName(nama: string, level: number, nomor: string): string {
    if (level <= 0 || level >= 10) return nama
    const pad = ' '.repeat(Math.max(0, (level - 1) * 3))
    const prefix = nomor ? `${nomor} ` : ''
    return `${pad}${prefix}${nama}`
  }

  // ===== render =====
  doc.y = MARGIN
  drawTitle()
  drawHeader()

  for (let i = 0; i < opts.rows.length; i++) {
    const r = opts.rows[i]!
    const cells = [
      r.kode,
      indentName(r.nama, r.level, r.nomor),
      r.volume,
      fmtRupiah(r.target),
      fmtRupiah(r.sBelum),
      fmtRupiah(r.bulanIni),
      fmtRupiah(r.sBulanIni),
      fmtPersen(r.capaian, r.target),
      r.keterangan,
    ]
    const remaining = opts.rows.length - i
    drawRow({
      cells,
      bold: r.isKawasan || r.isTotal,
      align: ['left', 'left', 'center', 'right', 'right', 'right', 'right', 'right', 'left'],
    }, remaining <= 3 ? 178 : 0)
  }

  // ===== tanda tangan =====
  let y = doc.y + 18
  if (y + 160 > PAGE_H - MARGIN) {
    doc.addPage()
    y = MARGIN + 10
  }
  const colW = tableW / 2
  const leftX = tableLeft + 6
  const rightX = tableLeft + colW + 20
  doc.font('Helvetica').fontSize(FONT_SIGN).fillColor('#000000')
  // kiri
  let ly = y
  if (PEJABAT.kiri.pembuka) { doc.text(PEJABAT.kiri.pembuka, leftX, ly, { width: colW - 20 }) }
  ly += 14
  PEJABAT.kiri.jabatan.forEach((l) => { doc.text(l, leftX, ly, { width: colW - 20 }); ly += 12 })
  ly += 42 // ruang tanda tangan
  doc.font('Helvetica-Bold').fontSize(FONT_SIGN + 0.5).text(PEJABAT.kiri.nama, leftX, ly, { width: colW - 20 }); ly += 13
  if (PEJABAT.kiri.pangkat) { doc.font('Helvetica').fontSize(FONT_SIGN).text(PEJABAT.kiri.pangkat, leftX, ly, { width: colW - 20 }); ly += 12 }
  doc.font('Helvetica').fontSize(FONT_SIGN).text(PEJABAT.kiri.nip, leftX, ly, { width: colW - 20 })
  // kanan
  let ry = y
  doc.text(tempatTanggal(opts.tanggalAngka, opts.bulanLabel, opts.tahun), rightX, ry, { width: colW - 20 }); ry += 14
  if (PEJABAT.kanan.pembuka) { doc.text(PEJABAT.kanan.pembuka, rightX, ry, { width: colW - 20 }) }
  ry += 14
  PEJABAT.kanan.jabatan.forEach((l) => { doc.text(l, rightX, ry, { width: colW - 20 }); ry += 12 })
  const kananSpace = PEJABAT.kanan.jabatan.length ? 42 : 40
  ry += kananSpace
  doc.font('Helvetica-Bold').fontSize(FONT_SIGN + 0.5).text(PEJABAT.kanan.nama, rightX, ry, { width: colW - 20 }); ry += 13
  if (PEJABAT.kanan.pangkat) { doc.font('Helvetica').fontSize(FONT_SIGN).text(PEJABAT.kanan.pangkat, rightX, ry, { width: colW - 20 }); ry += 12 }
  doc.font('Helvetica').fontSize(FONT_SIGN).text(PEJABAT.kanan.nip, rightX, ry, { width: colW - 20 })

  doc.end()
  return done
}

async function buildPdfRows(opts: { kawasanId?: number; tahun: number; bulan: number }): Promise<{ rows: PdfRow[]; bulanLabel: string; tanggalAngka: number; tanggalLabel: string }> {
  const { rows: mingguanRows, bulanLabel } = await getRekapMingguan({ kawasanId: opts.kawasanId, tahun: opts.tahun, bulan: opts.bulan })

  // peta kode rekening & satuan per jenis_id
  const jenisRows = await query<{ id: number; kode_rekening: string | null; satuan: string | null }>(
    `SELECT id, kode_rekening, satuan FROM jenis_retribusi WHERE aktif = 1`
  )
  const kodeMap = new Map<number, string>()
  const satuanMap = new Map<number, string>()
  for (const j of jenisRows) {
    kodeMap.set(Number(j.id), String(j.kode_rekening || ''))
    satuanMap.set(Number(j.id), String(j.satuan || ''))
  }

  // catatan anomali target per jenis -> keterangan
  const ketMap = new Map<number, string>()
  try {
    const anomali = await getTargetAnomali({ kawasanId: opts.kawasanId, tahun: opts.tahun })
    for (const a of anomali) {
      ketMap.set(Number(a.jenis_id),
        `Anomali target: induk ≠ jumlah anak (selisih ${a.selisih.toLocaleString('id-ID')})`)
    }
  } catch { /* abaikan */ }

  const lastDay = new Date(opts.tahun, opts.bulan, 0).getDate()
  const tanggalLabel = `${lastDay} ${bulanLabel.toUpperCase()} ${opts.tahun}`

  const pdfRows: PdfRow[] = mingguanRows.map((r) => {
    const isKawasan = r.isKawasan
    const isTotal = r.isTotal
    let kodeRek = ''
    if (!isKawasan && !isTotal && r.jenis_id != null) kodeRek = kodeMap.get(Number(r.jenis_id)) || ''
    const volume = isKawasan || isTotal ? '' : (r.jenis_id != null && satuanMap.get(Number(r.jenis_id))) || '1 Tahun'
    return {
      kode: kodeRek,
      nomor: isKawasan || isTotal ? '' : r.nomor,
      nama: isKawasan ? `Kawasan Wisata ${r.kawasan_nama}` : r.nama,
      level: isKawasan || isTotal ? 0 : r.level,
      isKawasan,
      isTotal,
      volume,
      target: r.target,
      sBelum: r.sBelum,
      bulanIni: r.totalMingguan,
      sBulanIni: r.sBulanIni,
      capaian: r.capaian,
      keterangan: !isKawasan && !isTotal && r.jenis_id != null ? (ketMap.get(Number(r.jenis_id)) || '') : '',
    }
  })

  return { rows: pdfRows, bulanLabel, tanggalAngka: lastDay, tanggalLabel }
}

// Bangun laporan tahunan: rekap per bulan (12 baris) + total, per kawasan.
async function buildLaporanTahunan(opts: { kawasanId?: number; tahun: number; format: string }): Promise<Buffer | string> {
  const { getRealisasiKumulatif } = await import('../../utils/rekap')
  const { monthLabel } = await import('../../utils/periode')
  const { query } = await import('../../utils/db')
  const { APPROVED_STATUS } = await import('../../utils/periode')

  // Ambil kawasan (semua atau satu).
  const kawasanRows = await query<{ id: number; kode: string; nama: string }>(
    opts.kawasanId
      ? 'SELECT id, kode, nama FROM kawasan WHERE aktif = 1 AND id = ? ORDER BY urutan'
      : 'SELECT id, kode, nama FROM kawasan WHERE aktif = 1 ORDER BY urutan',
    opts.kawasanId ? [opts.kawasanId] : [],
  )

  // Realisasi per bulan per kawasan.
  const monthly = await query<{ kawasan_id: number; bulan: string; total: number }>(
    `SELECT jr.kawasan_id, substr(r.tanggal, 6, 2) AS bulan, COALESCE(SUM(r.jumlah), 0) AS total
     FROM realisasi r JOIN jenis_retribusi jr ON jr.id = r.jenis_retribusi_id
     WHERE r.status = ? AND substr(r.tanggal, 1, 4) = ?
     GROUP BY jr.kawasan_id, bulan`,
    [APPROVED_STATUS, String(opts.tahun)],
  )
  const byKawasanBulan = new Map<string, number>()
  for (const m of monthly) byKawasanBulan.set(`${m.kawasan_id}-${m.bulan}`, Number(m.total) || 0)

  // Target tahunan per kawasan.
  const targetRows = await query<{ kawasan_id: number; total: number }>(
    `SELECT jr.kawasan_id, COALESCE(SUM(t.nilai), 0) AS total
     FROM target t JOIN jenis_retribusi jr ON jr.id = t.jenis_retribusi_id
     WHERE t.tahun = ? AND jr.aktif = 1 AND NOT EXISTS (SELECT 1 FROM jenis_retribusi c WHERE c.parent_id = jr.id)
     GROUP BY jr.kawasan_id`,
    [opts.tahun],
  )
  const targetByKawasan = new Map<number, number>()
  for (const t of targetRows) targetByKawasan.set(Number(t.kawasan_id), Number(t.total) || 0)

  const rupiahFmt = '#,##0;[Red]-#,##0'
  const headers = ['Bulan', ...kawasanRows.map((k) => `${k.kode} - ${k.nama}`), 'TOTAL']
  const dataRows: (string | number)[][] = []
  const grandTotalByKawasan = new Array(kawasanRows.length).fill(0)
  let grandTotal = 0

  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0')
    const vals = kawasanRows.map((k, i) => {
      const v = byKawasanBulan.get(`${k.id}-${mm}`) || 0
      grandTotalByKawasan[i] += v
      return v
    })
    const rowTotal = vals.reduce((s, v) => s + v, 0)
    grandTotal += rowTotal
    dataRows.push([monthLabel(m), ...vals, rowTotal])
  }
  dataRows.push(['TOTAL', ...grandTotalByKawasan, grandTotal])

  // Baris target + capaian.
  const targetVals = kawasanRows.map((k) => targetByKawasan.get(k.id) || 0)
  const targetTotal = targetVals.reduce((s, v) => s + v, 0)
  dataRows.push(['TARGET', ...targetVals, targetTotal])
  const capaianVals = kawasanRows.map((k, i) => (targetVals[i]! > 0 ? grandTotalByKawasan[i] / targetVals[i]! : 0))
  const capaianTotal = targetTotal > 0 ? grandTotal / targetTotal : 0
  dataRows.push(['% CAPAI', ...capaianVals, capaianTotal])

  if (opts.format === 'csv') {
    const lines = [headers.join(',')]
    for (const row of dataRows) lines.push(row.map((v) => (typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : String(v))).join(','))
    return lines.join('\n')
  }

  // XLSX
  const ExcelJS: any = await import('exceljs').then((m: any) => m.default || m)
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SiperPAD'
  wb.created = new Date()
  const ws = wb.addWorksheet(`Tahunan ${opts.tahun}`, {
    properties: { tabColor: { argb: NAVY } },
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true },
  })

  ws.columns = [
    { width: 16 },
    ...kawasanRows.map(() => ({ width: 20 })),
    { width: 20 },
  ]

  const titles = [
    'LAPORAN REALISASI PENERIMAAN TAHUNAN',
    'DINAS PARIWISATA DAN EKONOMI KREATIF PROVINSI NTT',
    'KAWASAN WISATA PANTAI LASIANA DAN KAMPUNG SENI FLOBAMORATA',
    `TAHUN ${opts.tahun} (dalam Rupiah)`,
  ]
  titles.forEach((t, i) => {
    const cell = ws.getRow(i + 1).getCell(1)
    cell.value = t
    ws.mergeCells(i + 1, 1, i + 1, headers.length)
    cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: NAVY } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  const headerRow = ws.getRow(6)
  headerRow.height = 24
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle', wrapText: true }
    cell.border = BORDER_ALL
  })

  let r = 7
  for (const row of dataRows) {
    const excelRow = ws.getRow(r)
    excelRow.height = 15
    const isSummary = row[0] === 'TOTAL' || row[0] === 'TARGET' || row[0] === '% CAPAI'
    row.forEach((v, i) => {
      const cell = excelRow.getCell(i + 1)
      cell.value = v
      cell.font = { name: 'Calibri', size: 11, bold: isSummary }
      cell.alignment = { horizontal: i === 0 ? 'left' : 'right', vertical: 'middle' }
      cell.border = BORDER_ALL
      if (isSummary) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: row[0] === '% CAPAI' ? LIGHT_BLUE : YELLOW } }
      if (i > 0) cell.numFmt = row[0] === '% CAPAI' ? '0.00%' : rupiahFmt
    })
    r++
  }

  ws.views = [{ state: 'frozen', ySplit: 6 }]
  return await wb.xlsx.writeBuffer() as Buffer
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const role = String(session.user.role)
  if (!['admin', 'kepala'].includes(role)) throw createError({ statusCode: 403, message: 'Hanya admin/kepala dapat ekspor' })

  const q = getQuery(event) as { kawasan_id?: string; tahun?: string; bulan?: string; format?: string; periode?: string }
  const tahun = Number(q.tahun) || new Date().getFullYear()
  let bulan = q.bulan ? Number(q.bulan) : new Date().getMonth() + 1
  if (!Number.isFinite(bulan) || bulan < 1 || bulan > 12) bulan = new Date().getMonth() + 1
  let kawasanId = q.kawasan_id ? Number(q.kawasan_id) : undefined
  // Scope petugas kawasan ke kawasannya saja.
  const scoped = sessionKawasanId(session.user)
  if (scoped != null) kawasanId = scoped
  const format = (q.format || 'csv').toLowerCase()
  // periode = 'tahun' → laporan tahunan (12 bulan + total); default 'bulan'.
  const periode = (q.periode || 'bulan').toLowerCase()
  if (!['bulan', 'tahun'].includes(periode)) throw createError({ statusCode: 400, message: 'Periode harus bulan/tahun' })
  if (!['csv', 'xlsx', 'pdf'].includes(format)) throw createError({ statusCode: 400, message: 'Format harus csv/xlsx/pdf' })

  // Laporan tahunan (rekap 12 bulan + total) — hanya XLSX/CSV.
  if (periode === 'tahun') {
    const buf = await buildLaporanTahunan({ kawasanId, tahun, format })
    const kawasanSlug = kawasanId ? String(kawasanId) : 'Semua-Kawasan'
    const ext = format === 'csv' ? 'csv' : 'xlsx'
    const mime = format === 'csv' ? 'text/csv; charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    setHeader(event, 'Content-Type', mime)
    setHeader(event, 'Content-Disposition', `attachment; filename="laporan-tahunan-${kawasanSlug}-${tahun}.${ext}"`)
    return buf
  }

  // CSV keep flat rekap
  if (format === 'csv') {
    const perJenis = await getRekapPerJenis({ kawasanId, tahun, sampaiBulan: bulan })
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
    const csv = toCsv(flat)
    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(event, 'Content-Disposition', `attachment; filename="rekap-${tahun}-${kawasanLabel.replace(/[^A-Za-z0-9]+/g, '_')}.csv"`)
    return csv
  }

  // pdf — LAPORAN REALISASI PENERIMAAN (landscape 14"x8.5", struktur referensi)
  if (format === 'pdf') {
    try {
      const { rows, bulanLabel, tanggalAngka, tanggalLabel } = await buildPdfRows({ kawasanId, tahun, bulan })
      const pdfBuf = await buildPdfLaporan({ rows, bulanLabel, tahun, bulan, tanggalAngka, tanggalLabel })
      let kawasanSlug = 'Semua-Kawasan'
      if (kawasanId) {
        const r = await query<{ nama: string; kode: string }>('SELECT nama, kode FROM kawasan WHERE id = ?', [kawasanId])
        if (r.length) kawasanSlug = `${r[0]!.kode}-${r[0]!.nama.replace(/[^A-Za-z0-9]+/g, '_')}`
      }
      const bulanPadded = String(bulan).padStart(2, '0')
      setHeader(event, 'Content-Type', 'application/pdf')
      setHeader(event, 'Content-Disposition', `attachment; filename="laporan-realisasi-${kawasanSlug}-${tahun}-${bulanPadded}.pdf"`)
      return pdfBuf
    } catch (err) {
      console.error('PDF generation error:', err)
      throw createError({ statusCode: 500, message: `PDF generation failed: ${err instanceof Error ? err.message : String(err)}` })
    }
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
