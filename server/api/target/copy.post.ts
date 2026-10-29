import { query, execute } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })

  const body = await readBody(event) as { fromTahun?: number; toTahun?: number }
  const fromTahun = Number(body.fromTahun)
  const toTahun = Number(body.toTahun)

  if (!fromTahun || !toTahun) throw createError({ statusCode: 400, message: 'fromTahun dan toTahun wajib' })
  if (fromTahun === toTahun) throw createError({ statusCode: 400, message: 'Tahun sumber dan tujuan tidak boleh sama' })
  if (fromTahun < 2000 || fromTahun > 2100 || toTahun < 2000 || toTahun > 2100) throw createError({ statusCode: 400, message: 'Tahun tidak valid (2000-2100)' })

  const source = await query<{ jenis_retribusi_id: number; nilai: number; nilai_induk: number | null }>(
    'SELECT jenis_retribusi_id, nilai, nilai_induk FROM target WHERE tahun = ?',
    [fromTahun],
  )
  if (!source.length) throw createError({ statusCode: 404, message: `Tidak ada target tahun ${fromTahun}` })

  const existing = await query<{ jenis_retribusi_id: number }>(
    'SELECT jenis_retribusi_id FROM target WHERE tahun = ?',
    [toTahun],
  )
  const existingSet = new Set(existing.map((r) => r.jenis_retribusi_id))
  const toInsert = source.filter((r) => !existingSet.has(r.jenis_retribusi_id))
  const skipped = source.length - toInsert.length

  let copied = 0
  for (const r of toInsert) {
    const res = await execute(
      'INSERT OR IGNORE INTO target (jenis_retribusi_id, tahun, nilai, nilai_induk) VALUES (?, ?, ?, ?)',
      [r.jenis_retribusi_id, toTahun, r.nilai, r.nilai_induk],
    )
    if (res.rowsChanged > 0) copied++
  }

  // Audit
  try {
    await execute(
      'INSERT INTO audit_log (user_id, aksi, entitas, entitas_id, after) VALUES (?, ?, ?, ?, ?)',
      [Number((session.user as { id: number }).id), 'COPY', 'target', `${fromTahun}->${toTahun}`, `Salin target ${fromTahun} -> ${toTahun}: ${copied} disalin, ${skipped} dilewati`],
    )
  } catch (e: unknown) { console.error('audit log gagal:', e instanceof Error ? e.message : String(e)) }

  return { ok: true, fromTahun, toTahun, total_source: source.length, copied, skipped }
})
