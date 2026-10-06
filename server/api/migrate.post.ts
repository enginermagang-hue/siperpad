import { runMigrations } from '../utils/db'
import { seedAll } from '../database/seed'

export default defineEventHandler(async () => {
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
    throw createError({ statusCode: 500, statusMessage: 'Migrasi/seed gagal', message })
  }
})
