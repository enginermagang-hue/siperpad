import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (session.user.role !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })

  const body = await readBody(event) as { kode?: string; nama?: string; urutan?: number; aktif?: number }
  const kode = (body.kode || '').trim()
  const nama = (body.nama || '').trim()
  const urutan = Number(body.urutan ?? 0)
  const aktif = body.aktif != null ? (Number(body.aktif) ? 1 : 0) : 1

  if (!kode || !nama) throw createError({ statusCode: 400, message: 'Kode dan nama wajib diisi' })

  try {
    const rows = await query<{ id: number }>(
      'INSERT INTO kawasan (kode, nama, urutan, aktif) VALUES (?, ?, ?, ?) RETURNING id',
      [kode, nama, urutan, aktif],
    )
    return { ok: true, id: rows[0]!.id }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('UNIQUE') || msg.includes('unique')) throw createError({ statusCode: 409, message: 'Kode sudah digunakan' })
    throw createError({ statusCode: 500, message: msg })
  }
})
