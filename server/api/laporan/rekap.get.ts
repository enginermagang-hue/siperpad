import { getRekapPerJenis, getTimeseries, getTotals } from '../../utils/rekap'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })

  const q = getQuery(event) as { kawasan_id?: string; tahun?: string; scope?: string }
  const tahun = Number(q.tahun) || new Date().getFullYear()
  const kawasanId = q.kawasan_id ? Number(q.kawasan_id) : undefined
  const scope = (q.scope as 'bulanan' | 'triwulan' | 'tahunan') || 'bulanan'
  if (!['bulanan', 'triwulan', 'tahunan'].includes(scope)) throw createError({ statusCode: 400, message: 'Scope harus bulanan/triwulan/tahunan' })

  const perJenis = await getRekapPerJenis({ kawasanId, tahun })
  const totals = await getTotals(perJenis)
  const timeseries = await getTimeseries({ kawasanId, tahun, scope })

  return { perJenis, totals, timeseries, meta: { tahun, kawasanId: kawasanId ?? null, scope } }
})
