import { getPerbandingan } from '../../utils/rekap'
import { monthStart, monthEnd, monthLabel } from '../../utils/periode'

// Perbandingan dua rentang periode. Dua mode:
// 1) Preset bulan: ?tahun&bulan_a&bulan_b → banding bulan penuh A vs B.
// 2) Rentang bebas: ?a_from&a_to&b_from&b_to&a_label&b_label
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })

  const q = getQuery(event) as {
    kawasan_id?: string; tahun?: string
    bulan_a?: string; bulan_b?: string
    a_from?: string; a_to?: string; b_from?: string; b_to?: string
    a_label?: string; b_label?: string
  }
  const tahun = Number(q.tahun) || new Date().getFullYear()
  const kawasanId = q.kawasan_id ? Number(q.kawasan_id) : undefined

  let a: { from: string; to: string; label: string }
  let b: { from: string; to: string; label: string }

  if (q.bulan_a && q.bulan_b) {
    const ba = Number(q.bulan_a)
    const bb = Number(q.bulan_b)
    a = { from: monthStart(tahun, ba), to: monthEnd(tahun, ba), label: `${monthLabel(ba)} ${tahun}` }
    b = { from: monthStart(tahun, bb), to: monthEnd(tahun, bb), label: `${monthLabel(bb)} ${tahun}` }
  } else if (q.a_from && q.a_to && q.b_from && q.b_to) {
    a = { from: q.a_from, to: q.a_to, label: q.a_label || `${q.a_from} s/d ${q.a_to}` }
    b = { from: q.b_from, to: q.b_to, label: q.b_label || `${q.b_from} s/d ${q.b_to}` }
  } else {
    throw createError({ statusCode: 400, message: 'Sertakan bulan_a & bulan_b, atau a_from/a_to/b_from/b_to' })
  }

  const result = await getPerbandingan({ kawasanId, a, b })
  return { ...result, a, b, meta: { tahun, kawasanId: kawasanId ?? null } }
})
