import { runMigrations } from '../utils/db'

// Jalankan migrasi saja (TANPA seed) — aman untuk database berisi data nyata.
// Seed terpisah di POST /api/migrate (destruktif: clear + reseed).
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'Tidak terautentikasi' })
  if (String(session.user.role) !== 'admin') throw createError({ statusCode: 403, message: 'Hanya admin' })

  try {
    const migrationResult = await runMigrations()
    return {
      ok: true,
      message: 'Migrasi selesai.',
      migrations: migrationResult,
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('Migrasi gagal:', message)
    throw createError({ statusCode: 500, statusMessage: 'Migrasi gagal', message: 'Migrasi gagal' })
  }
})
