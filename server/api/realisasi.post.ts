import { query } from '../utils/db'
import { assertPeriodeOpen, kawasanIdOfJenis, assertKawasanAllowed } from '../utils/lock'

// Input realisasi satuan (Data PAD / harian). Mendukung dua mode per jenis:
// - 'langsung'  : body.jumlah (Rp) dipakai apa adanya.
// - 'kuantitas' : body.kuantitas (unit) x tarif jenis -> jumlah = round(qty x tarif).
// `jumlah` selalu disimpan sebagai Rupiah; `kuantitas` & `tarif` jadi jejak historis.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'user') throw createError({ statusCode: 403, message: 'Hanya petugas input dapat input realisasi' })

  const body = await readBody(event) as {
    jenis_retribusi_id?: number
    tanggal?: string
    jumlah?: number
    kuantitas?: number
    catatan?: string
    batch_id?: number | null
  }
  const jenisId = Number(body.jenis_retribusi_id)
  const tanggal = (body.tanggal || '').trim()
  const catatan = (body.catatan || '').trim()
  const batch_id = body.batch_id != null ? Number(body.batch_id) : null
  const kuantitasInput = body.kuantitas == null ? null : Number(body.kuantitas)

  if (!jenisId) throw createError({ statusCode: 400, message: 'Jenis retribusi wajib dipilih' })
  if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw createError({ statusCode: 400, message: 'Tanggal wajib format YYYY-MM-DD' })

  const jr = await query<{ id: number; aktif: number; tarif: number | null; mode_tarif: string }>(
    'SELECT id, aktif, tarif, mode_tarif FROM jenis_retribusi WHERE id = ?',
    [jenisId],
  )
  if (!jr.length) throw createError({ statusCode: 404, message: 'Jenis retribusi tidak ditemukan' })
  if (!jr[0]!.aktif) throw createError({ statusCode: 400, message: 'Jenis retribusi nonaktif' })
  // Model A: baris kategori (punya anak) tidak bisa diinput — pilih pos daun
  const hasChild = await query<{ n: number }>('SELECT COUNT(*) as n FROM jenis_retribusi WHERE parent_id = ?', [jenisId])
  if (Number(hasChild[0]?.n) > 0) throw createError({ statusCode: 400, message: 'Tidak bisa input pada baris kategori. Pilih sub-pos (contoh: a. Motor / b. Mobil).' })

  // Guard kawasan petugas DIEKSEKUSI LEBIH DAHULU (sebelum validasi tarif),
  // agar pelanggaran kawasan mendapat 403, bukan error validasi yang menyesatkan.
  const kawasanId = await kawasanIdOfJenis(jenisId)
  assertKawasanAllowed(session.user, kawasanId)

  // Hitung jumlah (Rupiah) + metadata sesuai mode tarif jenis.
  const mode = jr[0]!.mode_tarif === 'kuantitas' ? 'kuantitas' : 'langsung'
  const jenisTarif = jr[0]!.tarif == null ? null : Number(jr[0]!.tarif)
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

  if (kawasanId != null) await assertPeriodeOpen(tanggal, kawasanId)

  if (batch_id != null) {
    const b = await query<{ id: number; kawasan_id: number; status: string }>('SELECT id, kawasan_id, status FROM laporan_batch WHERE id = ?', [batch_id])
    if (!b.length) throw createError({ statusCode: 404, message: 'Batch tidak ditemukan' })
    if (kawasanId != null && Number(b[0]!.kawasan_id) !== kawasanId) throw createError({ statusCode: 400, message: 'Batch tidak sesuai kawasan realisasi' })
    if (b[0]!.status !== 'draft') throw createError({ statusCode: 409, message: 'Batch sudah diajukan/diverifikasi, tidak bisa ditambah realisasi' })
  }

  const created_by = Number(session.user.id)
  const rows = await query<{ id: number }>(
    `INSERT INTO realisasi (jenis_retribusi_id, tanggal, jumlah, kuantitas, tarif, catatan, batch_id, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?) RETURNING id`,
    [jenisId, tanggal, jumlah, kuantitas, tarif, catatan, batch_id, created_by],
  )
  return { ok: true, id: rows[0]!.id, jumlah, kuantitas, tarif }
})
