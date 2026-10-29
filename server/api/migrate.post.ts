import { runMigrations } from '../utils/db'
import { seedAll } from '../database/seed'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })

  try {
    const migrationResult = await runMigrations()
    const seedResult = await seedAll()

    return {
      ok: true,
      message: 'Migrasi + seed selesai.',
      migrations: migrationResult,
      seed: seedResult,
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('Migrasi/seed gagal:', message)
    throw createError({ statusCode: 500, statusMessage: 'Migrasi/seed gagal', message: 'Migrasi/seed gagal' })
  }
})
