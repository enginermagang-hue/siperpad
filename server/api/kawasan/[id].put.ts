import { query, execute } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (session.user.role !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID tidak valid' })

  const body = await readBody(event) as { kode?: string; nama?: string; urutan?: number; aktif?: number }
  const kode = (body.kode || '').trim()
  const nama = (body.nama || '').trim()
  if (!kode || !nama) throw createError({ statusCode: 400, message: 'Kode dan nama wajib diisi' })

  const existing = await query('SELECT id FROM kawasan WHERE id = ?', [id])
  if (!existing.length) throw createError({ statusCode: 404, message: 'Kawasan tidak ditemukan' })

  try {
    await execute('UPDATE kawasan SET kode = ?, nama = ?, urutan = ?, aktif = ? WHERE id = ?', [
      kode, nama, Number(body.urutan ?? 0), body.aktif != null ? (Number(body.aktif) ? 1 : 0) : 1, id,
    ])
    return { ok: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('UNIQUE') || msg.includes('unique')) throw createError({ statusCode: 409, message: 'Kode sudah digunakan' })
    throw createError({ statusCode: 500, message: msg })
  }
})
