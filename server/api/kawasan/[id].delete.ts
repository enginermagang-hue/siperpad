import { query, execute } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID tidak valid' })
  const existing = await query('SELECT id FROM kawasan WHERE id = ?', [id])
  if (!existing.length) throw createError({ statusCode: 404, message: 'Kawasan tidak ditemukan' })

  // Cegah hapus jika masih dipakai oleh berbagai entitas.
  const checks: { table: string; col: string; msg: string }[] = [
    { table: 'jenis_retribusi', col: 'kawasan_id', msg: 'jenis retribusi' },
    { table: 'laporan_batch', col: 'kawasan_id', msg: 'batch laporan' },
    { table: 'users', col: 'kawasan_id', msg: 'pengguna' },
    { table: 'periode_lock', col: 'kawasan_id', msg: 'kunci periode' },
    { table: 'catatan_temuan', col: 'kawasan_id', msg: 'catatan temuan' },
  ]
  for (const c of checks) {
    const used = await query(`SELECT id FROM ${c.table} WHERE ${c.col} = ? LIMIT 1`, [id])
    if (used.length) throw createError({ statusCode: 409, message: `Kawasan masih dipakai ${c.msg} — nonaktifkan saja` })
  }
  // Cek realisasi via jenis_retribusi.
  const realisasiUsed = await query(
    `SELECT r.id FROM realisasi r JOIN jenis_retribusi jr ON jr.id = r.jenis_retribusi_id WHERE jr.kawasan_id = ? LIMIT 1`,
    [id],
  )
  if (realisasiUsed.length) throw createError({ statusCode: 409, message: 'Kawasan masih dipakai realisasi — nonaktifkan saja' })

  await execute('DELETE FROM kawasan WHERE id = ?', [id])
  return { ok: true }
})
