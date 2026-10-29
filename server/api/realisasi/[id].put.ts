import { query, execute } from '../../utils/db'
import { assertPeriodeOpen, kawasanIdOfJenis, assertKawasanAllowed } from '../../utils/lock'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'user') throw createError({ statusCode: 403, message: 'Hanya petugas input' })
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID tidak valid' })

  const existing = await query<{ status: string; tanggal: string; jenis_retribusi_id: number }>('SELECT status, tanggal, jenis_retribusi_id FROM realisasi WHERE id = ?', [id])
  if (!existing.length) throw createError({ statusCode: 404, message: 'Realisasi tidak ditemukan' })
  if (existing[0]!.status !== 'draft') throw createError({ statusCode: 409, message: 'Hanya draft yang bisa diedit' })
  const curKawasan = await kawasanIdOfJenis(Number(existing[0]!.jenis_retribusi_id))
  // Petugas hanya boleh mengubah data pada kawasan penugasannya.
  assertKawasanAllowed(session.user, curKawasan)
  if (curKawasan != null) await assertPeriodeOpen(String(existing[0]!.tanggal), curKawasan)

  const body = await readBody(event) as { jenis_retribusi_id?: number; tanggal?: string; jumlah?: number; kuantitas?: number; catatan?: string; batch_id?: number | null }
  const jenisId = body.jenis_retribusi_id != null ? Number(body.jenis_retribusi_id) : undefined
  const tanggal = body.tanggal != null ? String(body.tanggal).trim() : undefined
  const catatan = body.catatan != null ? String(body.catatan).trim() : undefined
  const batch_id = body.batch_id === undefined ? undefined : (body.batch_id == null ? null : Number(body.batch_id))
  const kuantitasInput = body.kuantitas == null ? null : Number(body.kuantitas)

  const effectiveJenisId = jenisId ?? Number(existing[0]!.jenis_retribusi_id)
  const jr = await query<{ id: number; tarif: number | null; mode_tarif: string }>(
    'SELECT id, tarif, mode_tarif FROM jenis_retribusi WHERE id = ?',
    [effectiveJenisId],
  )
  if (!jr.length) throw createError({ statusCode: 404, message: 'Jenis retribusi tidak ditemukan' })
  const hasChild = await query<{ n: number }>('SELECT COUNT(*) as n FROM jenis_retribusi WHERE parent_id = ?', [effectiveJenisId])
  if (Number(hasChild[0]?.n) > 0) throw createError({ statusCode: 400, message: 'Tidak bisa input pada baris kategori. Pilih sub-pos (contoh: a. Motor / b. Mobil).' })

  // Pindah jenis ke kawasan lain juga harus diizinkan untuk petugas.
  if (jenisId != null) {
    const newKawasan = await kawasanIdOfJenis(jenisId)
    assertKawasanAllowed(session.user, newKawasan)
    // Jika tanggal tidak berubah, cek periode kawasan target.
    if (newKawasan != null && newKawasan !== curKawasan) {
      await assertPeriodeOpen(String(existing[0]!.tanggal), newKawasan)
    }
  }

  // Hitung jumlah (Rupiah) + metadata sesuai mode tarif jenis.
  const mode = jr[0]!.mode_tarif === 'kuantitas' ? 'kuantitas' : 'langsung'
  const jenisTarif = jr[0]!.tarif == null ? null : Number(jr[0]!.tarif)
  let jumlah: number | undefined
  let kuantitas: number | null | undefined
  let tarif: number | null | undefined

  if (mode === 'kuantitas') {
    // Mode kuantitas: kuantitas wajib ada (dari body atau turunan jumlah lama).
    if (kuantitasInput != null) {
      if (jenisTarif == null || jenisTarif <= 0) throw createError({ statusCode: 400, message: 'Tarif belum diisi untuk jenis ini — lengkapi di Master Jenis Retribusi' })
      if (!Number.isFinite(kuantitasInput) || kuantitasInput < 0) throw createError({ statusCode: 400, message: 'Kuantitas harus >= 0' })
      kuantitas = Math.round(kuantitasInput)
      tarif = jenisTarif
      jumlah = Math.round(kuantitas * tarif)
    } else if (body.jumlah != null) {
      const j = Number(body.jumlah)
      if (!Number.isFinite(j) || j < 0) throw createError({ statusCode: 400, message: 'Jumlah harus >= 0' })
      jumlah = Math.round(j)
    }
  } else if (body.jumlah != null) {
    const j = Number(body.jumlah)
    if (!Number.isFinite(j) || j < 0) throw createError({ statusCode: 400, message: 'Jumlah harus >= 0' })
    jumlah = Math.round(j)
  }

  // Validasi batch_id jika disediakan (bukan null/undefined).
  if (batch_id != null && batch_id !== undefined) {
    const b = await query<{ id: number; kawasan_id: number; status: string }>('SELECT id, kawasan_id, status FROM laporan_batch WHERE id = ?', [batch_id])
    if (!b.length) throw createError({ statusCode: 404, message: 'Batch tidak ditemukan' })
    const targetKawasan = await kawasanIdOfJenis(effectiveJenisId)
    if (targetKawasan != null && Number(b[0]!.kawasan_id) !== targetKawasan) throw createError({ statusCode: 400, message: 'Batch tidak sesuai kawasan realisasi' })
    if (b[0]!.status !== 'draft') throw createError({ statusCode: 409, message: 'Batch sudah diajukan/diverifikasi, tidak bisa diubah' })
  }

  // Jika tanggal dipindah ke periode lain, pastikan periode tujuan tidak terkunci.
  if (tanggal != null && curKawasan != null) await assertPeriodeOpen(tanggal, curKawasan)

  const sets: string[] = []
  const params: unknown[] = []
  if (jenisId != null) { sets.push('jenis_retribusi_id = ?'); params.push(jenisId) }
  if (tanggal != null) { sets.push('tanggal = ?'); params.push(tanggal) }
  if (jumlah !== undefined) { sets.push('jumlah = ?'); params.push(jumlah) }
  if (kuantitas !== undefined) { sets.push('kuantitas = ?'); params.push(kuantitas) }
  if (tarif !== undefined) { sets.push('tarif = ?'); params.push(tarif) }
  if (catatan != null) { sets.push('catatan = ?'); params.push(catatan) }
  if (batch_id !== undefined) { sets.push('batch_id = ?'); params.push(batch_id) }
  if (!sets.length) throw createError({ statusCode: 400, message: 'Tidak ada field untuk diupdate' })
  sets.push("updated_at = datetime('now')")
  params.push(id)

  await execute(`UPDATE realisasi SET ${sets.join(', ')} WHERE id = ?`, params)
  return { ok: true }
})
