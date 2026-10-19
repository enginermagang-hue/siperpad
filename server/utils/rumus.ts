// server/utils/rumus.ts — sumber kebenaran rumus PAD (referensi/rumus.md)
// Dipakai server/utils/rekap.ts, rekapMingguan.ts, periode.ts, export.get.ts
// Excel asli: IF(C8=0,"",I8/C8) → blank bila target nol. Kita kembalikan `null` agar Excel kosong & UI tampil "-".

// rumus.md:2 — Realisasi Kumulatif = Realisasi Bulan lalu + Realisasi Bulan berjalan
export function kumulatif(sBelum: number, bulanIni: number): number {
  return (Number(sBelum) || 0) + (Number(bulanIni) || 0)
}

// rumus.md:3,9 — Persentase Capaian Target = Realisasi Kumulatif / Target * 100%
// Guard: IF(target==0, "", capaian) → return null bila target 0
export function capaianPersen(realisasi: number, target: number): number | null {
  if (!target) return null
  return Math.round((realisasi / target) * 10000) / 100
}

// Rasio 0..1 untuk kolom Excel % (format 0.00%). null bila target 0 agar sel kosong.
export function capaianRasio(realisasi: number, target: number): number | null {
  if (!target) return null
  return realisasi / target
}

// rumus.md:5 — Selisih = Penerimaan bulan skrg - bulan lalu  (alias B - A)
export function selisih(nilaiB: number, nilaiA: number): number {
  return (Number(nilaiB) || 0) - (Number(nilaiA) || 0)
}

// rumus.md:6 — Persentase Perubahan = (B - A) / A * 100%
// Guard Excel IF(A=0,"",...): bila A==0 → null bila B juga 0, else 100 (naik dari nol) agar tetap informatif.
// Dipakai getPerbandingan.
export function persenPerubahan(nilaiB: number, nilaiA: number): number | null {
  const a = Number(nilaiA) || 0
  const b = Number(nilaiB) || 0
  if (a === 0) return b === 0 ? null : 100
  return Math.round(((b - a) / a) * 10000) / 100
}

// Helper ringkas: presentasi "-" bila null, else "xx.xx%"
export function formatCapaian(v: number | null): string {
  return v == null ? '-' : `${v}%`
}
