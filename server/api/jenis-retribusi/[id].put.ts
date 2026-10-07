import { query, execute } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (session.user.role !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID tidak valid' })

  const body = await readBody(event) as { kawasan_id?: number; parent_id?: number | null; kode?: string; nama?: string; urutan?: number; aktif?: number; tarif?: number | null }
  const kode = (body.kode || '').trim()
  const nama = (body.nama || '').trim()
  if (!nama) throw createError({ statusCode: 400, message: 'Nama wajib diisi' })
  const tarif = body.tarif != null && Number.isFinite(Number(body.tarif)) && Number(body.tarif) >= 0 ? Math.round(Number(body.tarif)) : null

  const existing = await query<{ kawasan_id: number; level: number }>('SELECT kawasan_id, level FROM jenis_retribusi WHERE id = ?', [id])
  if (!existing.length) throw createError({ statusCode: 404, message: 'Jenis retribusi tidak ditemukan' })
  const kawasan_id = Number(body.kawasan_id ?? existing[0]!.kawasan_id)

  const parent_id = body.parent_id === undefined ? undefined : (body.parent_id == null ? null : Number(body.parent_id))
  let level: number | undefined
  if (parent_id !== undefined) {
    if (parent_id === id) throw createError({ statusCode: 400, message: 'Parent tidak boleh diri sendiri' })
    if (parent_id != null) {
      const parent = await query<{ level: number; kawasan_id: number }>('SELECT level, kawasan_id FROM jenis_retribusi WHERE id = ?', [parent_id])
      if (!parent.length) throw createError({ statusCode: 404, message: 'Parent tidak ditemukan' })
      if (Number(parent[0]!.kawasan_id) !== kawasan_id) throw createError({ statusCode: 400, message: 'Parent harus dalam kawasan yang sama' })
      level = Number(parent[0]!.level) + 1
    } else level = 1
  }

  const parentSql = parent_id !== undefined ? ', parent_id = ?' : ''
  const levelSql = level != null ? ', level = ?' : ''
  const p2: unknown[] = [kode, nama, Number(body.urutan ?? 0), body.aktif != null ? (Number(body.aktif) ? 1 : 0) : 1, tarif]
  if (level != null) p2.push(level)
  p2.push(kawasan_id)
  if (parent_id !== undefined) p2.push(parent_id)
  p2.push(id)

  try {
    await execute(`UPDATE jenis_retribusi SET kode = ?, nama = ?, urutan = ?, aktif = ?, tarif = ?${levelSql}, kawasan_id = ?${parentSql} WHERE id = ?`, p2)
    return { ok: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('UNIQUE') || msg.includes('unique')) throw createError({ statusCode: 409, message: 'Nama sudah ada di parent/kawasan yang sama' })
    throw createError({ statusCode: 500, message: msg })
  }
})
