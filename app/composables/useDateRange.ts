// Helper rentang tanggal bersama untuk filter UI (client-side).
//
// Semua aritmetika memakai tanggal LOKAL (getFullYear/getMonth/getDate),
// BUKAN `toISOString()` — `toISOString()` mengonversi ke UTC sehingga
// midnight lokal di zona WIB+ jatuh ke hari sebelumnya dan preset
// "Bulan ini"/"Bulan lalu" bergeser sehari.

export type DateRangeValue = { from: string; to: string }

export type DatePresetKey =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | 'week'
  | 'month'
  | 'last-month'
  | 'year'

export const DATE_PRESETS: { key: DatePresetKey; label: string }[] = [
  { key: 'today', label: 'Hari ini' },
  { key: 'yesterday', label: 'Kemarin' },
  { key: '7d', label: '7 hari' },
  { key: '30d', label: '30 hari' },
  { key: 'week', label: 'Minggu ini' },
  { key: 'month', label: 'Bulan ini' },
  { key: 'last-month', label: 'Bulan lalu' },
  { key: 'year', label: 'Tahun ini' },
]

const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

/** Date -> 'YYYY-MM-DD' berdasarkan zona waktu lokal. */
export function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 'YYYY-MM-DD' -> Date lokal (midnight). Null bila format tidak valid. */
export function parseDateStr(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const parts = s.split('-')
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? dt : null
}

export function todayStr(): string {
  return toDateStr(new Date())
}

/** '2026-10-31' -> '31 Okt 2026'. */
export function fmtDisplay(s: string): string {
  if (!s) return ''
  const dt = parseDateStr(s)
  if (!dt) return s
  return `${dt.getDate()} ${BULAN_PENDEK[dt.getMonth()]} ${dt.getFullYear()}`
}

/** Label rentang: 'A – B', '≥ A', '≤ B', atau '' bila kosong. */
export function rangeLabel(v: DateRangeValue): string {
  if (v.from && v.to) return `${fmtDisplay(v.from)} – ${fmtDisplay(v.to)}`
  if (v.from) return `≥ ${fmtDisplay(v.from)}`
  if (v.to) return `≤ ${fmtDisplay(v.to)}`
  return ''
}

/** Jumlah hari inklusif (from..to); null bila belum lengkap. */
export function rangeDays(v: DateRangeValue): number | null {
  if (!v.from || !v.to) return null
  const a = parseDateStr(v.from)
  const b = parseDateStr(v.to)
  if (!a || !b) return null
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1
}

/** Rentang preset dalam tanggal lokal. `now` dapat di-inject agar deterministik. */
export function presetRange(key: DatePresetKey, now: Date = new Date()): DateRangeValue {
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  const t = toDateStr(now)
  switch (key) {
    case 'today':
      return { from: t, to: t }
    case 'yesterday': {
      const s = toDateStr(new Date(y, m, d - 1))
      return { from: s, to: s }
    }
    case '7d':
      return { from: toDateStr(new Date(y, m, d - 6)), to: t }
    case '30d':
      return { from: toDateStr(new Date(y, m, d - 29)), to: t }
    case 'week': {
      // Senin sebagai awal minggu.
      const off = (now.getDay() + 6) % 7
      return { from: toDateStr(new Date(y, m, d - off)), to: toDateStr(new Date(y, m, d - off + 6)) }
    }
    case 'month':
      return { from: toDateStr(new Date(y, m, 1)), to: toDateStr(new Date(y, m + 1, 0)) }
    case 'last-month':
      return { from: toDateStr(new Date(y, m - 1, 1)), to: toDateStr(new Date(y, m, 0)) }
    case 'year':
      return { from: toDateStr(new Date(y, 0, 1)), to: toDateStr(new Date(y, 11, 31)) }
  }
}

/** Key preset yang cocok dengan nilai saat ini (null = kustom/kosong). */
export function detectPreset(v: DateRangeValue): DatePresetKey | null {
  if (!v.from && !v.to) return null
  const now = new Date()
  for (const p of DATE_PRESETS) {
    const r = presetRange(p.key, now)
    if (r.from === v.from && r.to === v.to) return p.key
  }
  return null
}

/** Ubah `from`: bila melampaui `to`, `to` ikut dinaikkan (clamp). */
export function clampFrom(from: string, to: string): DateRangeValue {
  if (from && to && from > to) return { from, to: from }
  return { from, to }
}

/** Ubah `to`: bila di bawah `from`, `from` ikut diturunkan (clamp). */
export function clampTo(from: string, to: string): DateRangeValue {
  if (from && to && to < from) return { from: to, to }
  return { from, to }
}
