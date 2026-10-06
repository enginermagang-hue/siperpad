import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  const counts = await Promise.all([
    query<{ c: number }>('SELECT COUNT(*) as c FROM users').then((r) => Number(r[0]?.c || 0)),
    query<{ c: number }>('SELECT COUNT(*) as c FROM kawasan').then((r) => Number(r[0]?.c || 0)),
    query<{ c: number }>('SELECT COUNT(*) as c FROM jenis_retribusi').then((r) => Number(r[0]?.c || 0)),
    query<{ c: number }>('SELECT COUNT(*) as c FROM target').then((r) => Number(r[0]?.c || 0)),
    query<{ c: number }>('SELECT COUNT(*) as c FROM realisasi').then((r) => Number(r[0]?.c || 0)),
    query<{ c: number }>('SELECT COUNT(*) as c FROM laporan_batch').then((r) => Number(r[0]?.c || 0)),
    query<{ c: number }>('SELECT COUNT(*) as c FROM audit_log').then((r) => Number(r[0]?.c || 0)),
  ])
  const [users, kawasan, jenis, target, realisasi, batch, audit] = counts
  const config = useRuntimeConfig()
  const dropboxReady = !!(config.dropboxAppKey && config.dropboxAppSecret)
  return {
    user: { id: Number(session.user.id), nama: String(session.user.nama), email: String(session.user.email), role: String(session.user.role) },
    counts: { users, kawasan, jenis, target, realisasi, batch, audit },
    dropbox: { ready: dropboxReady, folder: String((config.dropboxFolder as string) || '/siperpad') },
  }
})
