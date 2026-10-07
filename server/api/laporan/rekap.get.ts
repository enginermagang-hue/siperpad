import { getRekapPerJenis, getTimeseries, getTotals, getRealisasiKumulatif, getTopKontributor, getPerbandingan } from '../../utils/rekap'
import { monthStart, monthEnd, monthLabel } from '../../utils/periode'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })

  const q = getQuery(event) as { kawasan_id?: string; tahun?: string; scope?: string; bulan?: string }
  const tahun = Number(q.tahun) || new Date().getFullYear()
  const kawasanId = q.kawasan_id ? Number(q.kawasan_id) : undefined
  const bulan = q.bulan ? Number(q.bulan) : new Date().getMonth() + 1
  const scope = (q.scope as 'bulanan' | 'triwulan' | 'tahunan') || 'bulanan'
  if (!['bulanan', 'triwulan', 'tahunan'].includes(scope)) throw createError({ statusCode: 400, message: 'Scope harus bulanan/triwulan/tahunan' })

  const perJenis = await getRekapPerJenis({ kawasanId, tahun })
  const totals = await getTotals(perJenis)
  const timeseries = await getTimeseries({ kawasanId, tahun, scope })
  const kumulatif = await getRealisasiKumulatif({ kawasanId, tahun, bulan })

  // tren mingguan bulan terpilih
  const mStart = monthStart(tahun, bulan)
  const mEnd = monthEnd(tahun, bulan)
  const topKontributor = await getTopKontributor({ kawasanId, tahun, from: mStart, to: mEnd, limit: 8 })

  // perbandingan bulan ini vs bulan sebelumnya
  const prevBulan = bulan === 1 ? 12 : bulan - 1
  const prevTahun = bulan === 1 ? tahun - 1 : tahun
  const banding = await getPerbandingan({
    kawasanId,
    a: { from: monthStart(prevTahun, prevBulan), to: monthEnd(prevTahun, prevBulan), label: `${monthLabel(prevBulan)} ${prevTahun}` },
    b: { from: mStart, to: mEnd, label: `${monthLabel(bulan)} ${tahun}` },
  })

  return {
    perJenis,
    totals,
    timeseries,
    kumulatif,
    topKontributor,
    banding,
    meta: { tahun, bulan, bulanLabel: monthLabel(bulan), kawasanId: kawasanId ?? null, scope },
  }
})
