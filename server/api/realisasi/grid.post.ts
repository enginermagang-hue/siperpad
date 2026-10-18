import { query, execute } from '../../utils/db'
import { MINGGU_REP_DAY, pad2 } from '../../utils/periode'
import { assertPeriodeOpen, kawasanIdOfJenis, assertKawasanAllowed } from '../../utils/lock'

// Simpan satu sel grid mingguan. Upsert realisasi pada tanggal representatif
// (hari ke-1/8/15/22) untuk (jenis, bulan, tahun). Hanya draft yang bisa diubah.
//
// Mode input per jenis:
// - 'langsung'  : body.jumlah (Rp) dipakai apa adanya.
// - 'kuantitas' : body.kuantitas (unit) x tarif jenis -> jumlah = round(qty x tarif).
//   `jumlah` selalu disimpan sebagai Rupiah; `kuantitas` & `tarif` jadi metadata jejak.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'user') throw createError({ statusCode: 403, message: 'Hanya petugas input dapat input realisasi' })

  const body = await readBody(event) as { jenis_retribusi_id?: number; tahun?: number; bulan?: number; minggu?: number; jumlah?: number; kuantitas?: number; catatan?: string }
  const jenisId = Number(body.jenis_retribusi_id)
  const tahun = Number(body.tahun)
  const bulan = Number(body.bulan)
  const minggu = Number(body.minggu)
  const catatan = (body.catatan || '').trim()
  const kuantitasInput = body.kuantitas == null ? null : Number(body.kuantitas)

  if (!jenisId || !tahun || !bulan || !minggu) throw createError({ statusCode: 400, message: 'jenis, tahun, bulan, minggu wajib' })
  if (bulan < 1 || bulan > 12) throw createError({ statusCode: 400, message: 'bulan tidak valid' })
  if (![1, 2, 3, 4].includes(minggu)) throw createError({ statusCode: 400, message: 'minggu harus 1-4' })

  const jr = await query<{ id: number; aktif: number; tarif: number | null; mode_tarif: string }>(
    'SELECT id, aktif, tarif, mode_tarif FROM jenis_retribusi WHERE id = ?',
    [jenisId],
  )
  if (!jr.length) throw createError({ statusCode: 404, message: 'Jenis retribusi tidak ditemukan' })
  if (!jr[0]!.aktif) throw createError({ statusCode: 400, message: 'Jenis retribusi nonaktif' })
  const hasChild = await query<{ n: number }>('SELECT COUNT(*) AS n FROM jenis_retribusi WHERE parent_id = ?', [jenisId])
  if (Number(hasChild[0]?.n) > 0) throw createError({ statusCode: 400, message: 'Tidak bisa input pada baris kategori' })

  // Guard kawasan petugas DIEKSEKUSI LEBIH DAHULU (sebelum validasi tarif),
  // agar pelanggaran kawasan mendapat 403, bukan error validasi yang menyesatkan.
  const kawasanId = await kawasanIdOfJenis(jenisId)
  if (kawasanId == null) throw createError({ statusCode: 404, message: 'Kawasan tidak ditemukan' })
  assertKawasanAllowed(session.user, kawasanId)

  const mode = jr[0]!.mode_tarif === 'kuantitas' ? 'kuantitas' : 'langsung'
  const jenisTarif = jr[0]!.tarif == null ? null : Number(jr[0]!.tarif)

  // Hitung jumlah (Rupiah) + metadata kuantitas/tarif sesuai mode.
  let jumlah: number
  let kuantitas: number | null = null
  let tarif: number | null = null
  if (mode === 'kuantitas') {
    if (jenisTarif == null || jenisTarif <= 0) throw createError({ statusCode: 400, message: 'Tarif belum diisi untuk jenis ini — lengkapi di Master Jenis Retribusi' })
    if (kuantitasInput == null || !Number.isFinite(kuantitasInput) || kuantitasInput < 0) throw createError({ statusCode: 400, message: 'Kuantitas harus >= 0' })
    kuantitas = Math.round(kuantitasInput)
    tarif = jenisTarif
    jumlah = Math.round(kuantitas * tarif)
  } else {
    const jumlahInput = Number(body.jumlah)
    if (!Number.isFinite(jumlahInput) || jumlahInput < 0) throw createError({ statusCode: 400, message: 'Jumlah harus >= 0' })
    jumlah = Math.round(jumlahInput)
  }

  const tanggal = `${tahun}-${pad2(bulan)}-${pad2(MINGGU_REP_DAY[minggu as 1 | 2 | 3 | 4])}`
  await assertPeriodeOpen(tanggal, kawasanId)

  const existing = await query<{ id: number; status: string }>(
    'SELECT id, status FROM realisasi WHERE jenis_retribusi_id = ? AND tanggal = ?',
    [jenisId, tanggal],
  )
  const userId = Number(session.user.id)

  if (existing.length) {
    if (existing[0]!.status !== 'draft') throw createError({ statusCode: 409, message: 'Realisasi minggu ini sudah diajukan/disetujui, tidak bisa diubah' })
    await execute(
      "UPDATE realisasi SET jumlah = ?, kuantitas = ?, tarif = ?, catatan = ?, updated_at = datetime('now') WHERE id = ?",
      [jumlah, kuantitas, tarif, catatan, existing[0]!.id],
    )
    return { ok: true, id: existing[0]!.id, action: 'updated', jumlah, kuantitas, tarif }
  }
  const rows = await query<{ id: number }>(
    `INSERT INTO realisasi (jenis_retribusi_id, tanggal, jumlah, kuantitas, tarif, catatan, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?) RETURNING id`,
    [jenisId, tanggal, jumlah, kuantitas, tarif, catatan, userId],
  )
  return { ok: true, id: rows[0]!.id, action: 'created', jumlah, kuantitas, tarif }
})
