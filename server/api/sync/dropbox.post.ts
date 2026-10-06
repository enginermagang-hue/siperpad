// ponytail: upload is JSON dump to Dropbox — full DB dump or xlsx export later
import { getDropboxClient } from '../../utils/dropbox'
import { query } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })

  // build a small JSON snapshot — realisasi + target
  const payload = {
    exportedAt: new Date().toISOString(),
    exportedBy: session.user.email,
    kawasan: await query('SELECT * FROM kawasan ORDER BY urutan ASC'),
    jenis_retribusi: await query('SELECT * FROM jenis_retribusi ORDER BY kawasan_id, level, urutan'),
    target: await query('SELECT * FROM target ORDER BY tahun, jenis_retribusi_id'),
    realisasi: await query('SELECT * FROM realisasi ORDER BY tanggal DESC LIMIT 1000'),
    laporan_batch: await query('SELECT * FROM laporan_batch ORDER BY tahun DESC LIMIT 100'),
  }
  const json = JSON.stringify(payload, null, 2)
  const filename = `siperpad-backup-${new Date().toISOString().slice(0, 10)}.json`

  try {
    const { dbx, folder } = getDropboxClient()
    const path = `${folder}/${filename}`
    // @ts-expect-error Dropbox SDK types vary by version
    await dbx.filesUpload({ path, contents: json, mode: 'overwrite', autorename: false })
    return { ok: true, path, size: json.length }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    // surface Dropbox error but succeed local export as fallback
    throw createError({ statusCode: 500, message: `Dropbox upload gagal: ${msg}` })
  }
})
