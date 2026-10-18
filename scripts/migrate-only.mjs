import { createClient } from '@libsql/client'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const rootDir = join(__dirname, '..')

// Simple .env loader (no dotenv dependency in this project)
function loadEnv() {
  const envPath = join(rootDir, '.env')
  try {
    const content = readFileSync(envPath, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...rest] = trimmed.split('=')
      if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
    }
  } catch {
    // .env not found — rely on real environment variables
  }
}
loadEnv()

const url = process.env.TURSO_DATABASE_URL || ''
const authToken = process.env.TURSO_AUTH_TOKEN || ''
if (!url) {
  console.error('TURSO_DATABASE_URL belum dikonfigurasi (.env)')
  process.exit(1)
}

const client = createClient({ url, authToken: authToken || undefined })

// Jalankan HANYA migrasi yang belum dieksekusi — tanpa seed.
// Berbeda dengan `npm run migrate` / POST /api/migrate yang selalu menghapus
// data lalu seed ulang (lihat seedAll -> clearMasterData).
async function runMigrations() {
  // FK enforcement aktif di libSQL/Turso dan PRAGMA di dalam batch tidak
  // berlaku; matikan di level koneksi agar rebuild tabel users bisa DROP.
  await client.execute('PRAGMA foreign_keys=OFF')

  await client.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const executed = await client.execute('SELECT filename FROM _migrations')
  const executedSet = new Set(executed.rows.map((r) => r.filename))

  const migrationsDir = join(rootDir, 'server', 'database', 'migrations')
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()

  const ran = []
  const skipped = []

  for (const filename of files) {
    if (executedSet.has(filename)) {
      skipped.push(filename)
      continue
    }

    const sql = readFileSync(join(migrationsDir, filename), 'utf8')
    const cleaned = sql
      .split('\n')
      .map((line) => {
        const i = line.indexOf('--')
        return i >= 0 ? line.slice(0, i) : line
      })
      .join('\n')
    const statements = cleaned.split(';').map((s) => s.trim()).filter((s) => s.length > 0)
    await client.batch(statements.map((s) => ({ sql: s })))
    await client.execute('INSERT INTO _migrations (filename) VALUES (?)', [filename])
    ran.push(filename)
  }

  return { ran, skipped }
}

async function main() {
  try {
    console.log('🔄 Menjalankan migrasi (tanpa seed)...')
    const result = await runMigrations()
    console.log('✅ Migrasi selesai')
    if (result.ran.length) console.log('   dijalankan:', result.ran.join(', '))
    if (result.skipped.length) console.log('   dilewati  :', result.skipped.join(', '))
    console.log('\nℹ️  Data tidak dihapus/di-seed. Seed penuh (menghapus data): npm run migrate')
  } catch (e) {
    console.error('❌ Gagal:', e instanceof Error ? e.message : String(e))
    process.exit(1)
  } finally {
    await client.close()
  }
}

main()
