import { runMigrations } from '../utils/db'

// Jalankan migrasi saja (TANPA seed) — aman untuk database berisi data nyata.
// Seed terpisah di POST /api/migrate (destruktif: clear + reseed).
export default defineEventHandler(async () => {
  try {
    const migrationResult = await runMigrations()
    return {
      ok: true,
      message: 'Migrasi selesai.',
      migrations: migrationResult,
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    throw createError({ statusCode: 500, statusMessage: 'Migrasi gagal', message })
  }
})
