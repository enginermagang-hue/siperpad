import { setPejabat } from '../../utils/pejabat'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin yang dapat mengubah' })
  const body = await readBody(event)
  try {
    const cfg = await setPejabat(body)
    return { ok: true, pejabat: cfg }
  } catch (e: unknown) {
    throw createError({ statusCode: 400, message: (e as { message?: string })?.message || 'Gagal menyimpan' })
  }
})