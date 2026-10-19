import { query, execute } from './db'

export type PejabatBlock = {
  pembuka: string
  jabatan: string[]
  pangkat: string
  nama: string
  nip: string
}

export type PejabatConfig = {
  kiri: PejabatBlock
  kanan: PejabatBlock
}

export const DEFAULT_PEJABAT: PejabatConfig = {
  kiri: {
    pembuka: 'Mengetahui',
    jabatan: ['Kasubag Keuangan', 'Dinas Pariwisata dan Ekonomi Kreatif Provinsi NTT'],
    pangkat: '',
    nama: '......................................',
    nip: 'NIP ......................................',
  },
  kanan: {
    pembuka: 'Bendahara Penerimaan,',
    jabatan: [],
    pangkat: 'Penata Tingkat I (III/d)',
    nama: 'B. Agustin Da Costa, S.Sos',
    nip: 'NIP.198008302009012002',
  },
}

export function normalizeNip(nip: string): string {
  const t = String(nip || '').trim()
  if (!t) return t
  if (/^nip\b/i.test(t)) return t
  return `NIP ${t}`
}

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x ?? '').trim()).filter(Boolean)
  return String(v ?? '')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function normalizeBlock(input: unknown, fallback: PejabatBlock): PejabatBlock {
  const b = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const nama = String(b.nama ?? fallback.nama).trim() || fallback.nama
  const nipRaw = String(b.nip ?? fallback.nip).trim() || fallback.nip
  // pembuka boleh kosong: jika field dikirim (termasuk ''), simpan apa adanya.
  const pembuka = (b.pembuka === undefined)
    ? fallback.pembuka
    : String(b.pembuka).trim()
  return {
    pembuka,
    jabatan: toStringArray(b.jabatan ?? fallback.jabatan),
    pangkat: String(b.pangkat ?? fallback.pangkat).trim(),
    nama,
    nip: normalizeNip(nipRaw),
  }
}

export async function getPejabat(): Promise<PejabatConfig> {
  try {
    const rows = await query<{ value: string }>("SELECT value FROM settings WHERE key = ?", ['pejabat_laporan'])
    if (!rows.length) return DEFAULT_PEJABAT
    const parsed = JSON.parse(String(rows[0]!.value))
    return {
      kiri: normalizeBlock(parsed?.kiri, DEFAULT_PEJABAT.kiri),
      kanan: normalizeBlock(parsed?.kanan, DEFAULT_PEJABAT.kanan),
    }
  } catch {
    return DEFAULT_PEJABAT
  }
}

export async function setPejabat(input: unknown): Promise<PejabatConfig> {
  const cfg: PejabatConfig = {
    kiri: normalizeBlock((input as any)?.kiri, DEFAULT_PEJABAT.kiri),
    kanan: normalizeBlock((input as any)?.kanan, DEFAULT_PEJABAT.kanan),
  }
  if (!cfg.kiri.nama || !cfg.kiri.nip || !cfg.kanan.nama || !cfg.kanan.nip) {
    throw new Error('Nama dan NIP penanda tangan wajib diisi')
  }
  const value = JSON.stringify(cfg)
  await execute(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    ['pejabat_laporan', value]
  )
  return cfg
}