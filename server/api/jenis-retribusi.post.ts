import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (session.user.role !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })

  const body = await readBody(event) as { kawasan_id?: number; parent_id?: number | null; kode?: string; kode_rekening?: string; nama?: string; level?: number; urutan?: number; aktif?: number; tarif?: number | null; mode_tarif?: string; satuan?: string }
  const kawasan_id = Number(body.kawasan_id)
  const parent_id = body.parent_id != null ? Number(body.parent_id) : null
  const kode = (body.kode || '').trim()
  const kode_rekening = (body.kode_rekening || '').trim()
  const nama = (body.nama || '').trim()
  const urutan = Number(body.urutan ?? 0)
  const aktif = body.aktif != null ? (Number(body.aktif) ? 1 : 0) : 1
  const mode_tarif = body.mode_tarif === 'kuantitas' ? 'kuantitas' : 'langsung'
  const satuan = (body.satuan || '').trim()
  const tarif = body.tarif != null && Number.isFinite(Number(body.tarif)) && Number(body.tarif) >= 0 ? Math.round(Number(body.tarif)) : null
  if (!kawasan_id) throw createError({ statusCode: 400, message: 'Kawasan wajib dipilih' })
  if (!nama) throw createError({ statusCode: 400, message: 'Nama wajib diisi' })
  if (mode_tarif === 'kuantitas' && (tarif == null || tarif <= 0)) throw createError({ statusCode: 400, message: 'Tarif wajib diisi untuk mode kuantitas' })

  const kawasan = await query('SELECT id FROM kawasan WHERE id = ?', [kawasan_id])
  if (!kawasan.length) throw createError({ statusCode: 404, message: 'Kawasan tidak ditemukan' })

  let level = Number(body.level ?? 1)
  if (parent_id != null) {
    const parent = await query<{ level: number; kawasan_id: number }>('SELECT level, kawasan_id FROM jenis_retribusi WHERE id = ?', [parent_id])
    if (!parent.length) throw createError({ statusCode: 404, message: 'Parent tidak ditemukan' })
    if (Number(parent[0]!.kawasan_id) !== kawasan_id) throw createError({ statusCode: 400, message: 'Parent harus dalam kawasan yang sama' })
    level = Number(parent[0]!.level) + 1
  } else if (level < 1) level = 1

  try {
    const rows = await query<{ id: number }>(
      'INSERT INTO jenis_retribusi (kawasan_id, parent_id, kode, kode_rekening, nama, level, urutan, aktif, tarif, mode_tarif, satuan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
      [kawasan_id, parent_id, kode, kode_rekening, nama, level, urutan, aktif, tarif, mode_tarif, satuan],
    )
    return { ok: true, id: rows[0]!.id }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('UNIQUE') || msg.includes('unique')) throw createError({ statusCode: 409, message: 'Nama sudah ada di parent/kawasan yang sama' })
    throw createError({ statusCode: 500, message: msg })
  }
})
