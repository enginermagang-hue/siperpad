import { createClient, type Client } from '@libsql/client'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

let _client: Client | null = null

// Nitro bundles server code, so `import.meta.url` points at the bundle, not
// `server/utils/`. Resolve the migrations folder against the project root
// instead so the real SQL files are found at runtime.
function getMigrationsDir(): string {
  return join(process.cwd(), 'server', 'database', 'migrations')
}

export function getTursoClient(): Client {
  if (_client) return _client
  const config = useRuntimeConfig()
  const url = (config.tursoDatabaseUrl as string) || process.env.TURSO_DATABASE_URL || ''
  const authToken = (config.tursoAuthToken as string) || process.env.TURSO_AUTH_TOKEN || ''
  if (!url) throw new Error('TURSO_DATABASE_URL belum dikonfigurasi (.env)')
  _client = createClient({ url, authToken: authToken || undefined })
  return _client
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = getTursoClient()
  const result = await client.execute(sql, params)
  return result.rows as T[]
}

export async function execute(sql: string, params: unknown[] = []): Promise<{ rowsChanged: number }> {
  const client = getTursoClient()
  const result = await client.execute(sql, params)
  return { rowsChanged: result.rowsAffected ?? 0 }
}

export async function transaction(
  fn: (tx: {
    query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>
    execute: (sql: string, params?: unknown[]) => Promise<{ rowsChanged: number }>
  }) => Promise<void>
): Promise<void> {
  const client = getTursoClient()
  const batch: { sql: string; args?: unknown[] }[] = []
  const batchExecute = fn({
    query: (sql, params) => {
      batch.push({ sql, args: params })
      return Promise.resolve([])
    },
    execute: (sql, params) => {
      batch.push({ sql, args: params })
      return Promise.resolve({ rowsChanged: 0 })
    },
  })
  await batchExecute
  try {
    await client.batch(batch)
  } catch {
    // batch is all-or-nothing on libSQL remote; local also rolls back
    throw new Error('Transaction failed — semua perubahan telah dibatalkan')
  }
}

function readMigrationFile(filename: string): string {
  const filePath = join(getMigrationsDir(), filename)
  return readFileSync(filePath, 'utf8')
}

export function listMigrations(): string[] {
  const dir = getMigrationsDir()
  let files: string[]
  try {
    files = readdirSync(dir)
  } catch {
    throw new Error(`Direktori migrasi tidak ditemukan: ${dir}`)
  }
  return files
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))
}

export async function ensureMigrationsTable(): Promise<void> {
  await execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

export async function getExecutedMigrations(): Promise<Set<string>> {
  const rows = await query<{ filename: string }>('SELECT filename FROM _migrations')
  return new Set(rows.map((r) => r.filename))
}

export async function runMigrations(): Promise<{ ran: string[]; skipped: string[] }> {
  const client = getTursoClient()
  await ensureMigrationsTable()
  const executed = await getExecutedMigrations()
  const all = listMigrations()
  const ran: string[] = []
  const skipped: string[] = []

  for (const filename of all) {
    if (executed.has(filename)) {
      skipped.push(filename)
      continue
    }
    const sql = readMigrationFile(filename)
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    await client.batch(statements.map((s) => ({ sql: s })))

    await execute('INSERT INTO _migrations (filename) VALUES (?)', [filename])
    ran.push(filename)
  }

  return { ran, skipped }
}
