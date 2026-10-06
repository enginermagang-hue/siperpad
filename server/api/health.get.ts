import { getTursoClient } from '../utils/db'

export default defineEventHandler(async () => {
  try {
    const client = getTursoClient()
    const rs = await client.execute('SELECT 1 as ok')
    const row = rs.rows[0] as Record<string, unknown> | undefined
    return { status: 'ok', db: 'connected', probe: row ?? null }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    throw createError({ statusCode: 500, statusMessage: 'DB health check failed', message })
  }
})
