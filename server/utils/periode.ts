// Aturan status resmi: hanya realisasi berstatus 'disetujui' yang dihitung
// di dashboard, laporan, dan ekspor.
export const APPROVED_STATUS = 'disetujui'

// SQL fragment untuk menyaring realisasi yang masuk hitungan resmi.
export const APPROVED_SQL = `r.status = '${APPROVED_STATUS}'`

export type MingguBucket = 1 | 2 | 3 | 4

// Bucket minggu: I = tgl 1-7, II = 8-14, III = 15-21, IV = 22-akhir bulan.
export function dayToBucket(day: number): MingguBucket {
  if (day <= 7) return 1
  if (day <= 14) return 2
  if (day <= 21) return 3
  return 4
}

// Tanggal representatif per minggu (untuk entri grid mingguan).
export const MINGGU_REP_DAY: Record<MingguBucket, number> = { 1: 1, 2: 8, 3: 15, 4: 22 }

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function monthStart(tahun: number, bulan: number): string {
  return `${tahun}-${pad2(bulan)}-01`
}

export function nextMonthStart(tahun: number, bulan: number): string {
  let y = tahun
  let m = bulan + 1
  if (m > 12) {
    m = 1
    y++
  }
  return `${y}-${pad2(m)}-01`
}

export function monthEnd(tahun: number, bulan: number): string {
  const last = new Date(tahun, bulan, 0).getDate()
  return `${tahun}-${pad2(bulan)}-${pad2(last)}`
}

export const MONTH_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export function monthLabel(bulan: number): string {
  return MONTH_NAMES[bulan] || String(bulan)
}

export function persen(part: number, total: number): number {
  if (!total) return 0
  return Math.round((part / total) * 10000) / 100
}
