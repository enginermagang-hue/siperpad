import { createClient } from '@libsql/client'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { scryptSync, randomBytes } from 'node:crypto'
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

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const key = scryptSync(password, salt, 64)
  return `${salt}$${key.toString('hex')}`
}

// Urutan drop anak → induk agar aman.
const TABLES = [
  'catatan_temuan',
  'periode_lock',
  'audit_log',
  'realisasi',
  'laporan_batch',
  'target',
  'jenis_retribusi',
  'kawasan',
  'users',
  '_migrations',
]

async function dropAll() {
  for (const table of TABLES) {
    await client.execute(`DROP TABLE IF EXISTS ${table}`)
  }
  return TABLES
}

async function runMigrations() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const migrationsDir = join(rootDir, 'server', 'database', 'migrations')
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()

  const ran = []
  for (const filename of files) {
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

  return ran
}

// Seed minimal: hanya users, kawasan, laporan_batch, audit_log.
// `jenis_retribusi` dan `target` DIBIARKAN KOSONG — diisi manual via UI.
async function seedMinimal() {
  const query = async (sql, params = []) => (await client.execute(sql, params)).rows
  const execute = async (sql, params = []) => client.execute(sql, params)

  const now = '2026-10-03T00:00:00'
  const tahun = 2026

  // Users
  const userDefs = [
    { nama: 'Petugas Input', nip: '199001012015011001', email: 'user@mail.com', role: 'user' },
    { nama: 'Admin Operator', nip: '198001012006041001', email: 'admin@mail.com', role: 'admin' },
    { nama: 'Kepala Dinas', nip: '198001012005011001', email: 'kepala@mail.com', role: 'kepala' },
  ]

  const userIds = []
  for (const u of userDefs) {
    const rows = await query(
      `INSERT INTO users (nama, nip, email, password_hash, role, aktif, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?) RETURNING id`,
      [u.nama, u.nip, u.email, hashPassword('123456'), u.role, now]
    )
    userIds.push(rows[0].id)
  }
  const [userId, adminUserId] = userIds

  // Kawasan
  const insertKawasan = async (kode, nama, urutan) => {
    const rows = await query('INSERT INTO kawasan (kode, nama, urutan) VALUES (?, ?, ?) RETURNING id', [kode, nama, urutan])
    return rows[0].id
  }

  const kawasanAId = await insertKawasan('A', 'Kampung Seni Flobamorata', 1)
  const kawasanBId = await insertKawasan('B', 'Pantai Lasiana', 2)

  // Laporan batch Agustus 2026
  const insertBatch = async (params) => {
    const rows = await query(
      `INSERT INTO laporan_batch
       (kawasan_id, periode_type, periode_start, periode_end, tahun, status, diajukan_oleh, diajukan_at, catatan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        params.kawasan_id, params.periode_type, params.periode_start, params.periode_end,
        params.tahun, params.status, params.diajukan_oleh, params.diajukan_at, params.catatan,
      ]
    )
    return rows[0].id
  }

  await insertBatch({
    kawasan_id: kawasanAId, periode_type: 'bulanan', periode_start: '2026-08-01',
    periode_end: '2026-08-31', tahun, status: 'disetujui', diajukan_oleh: userId,
    diajukan_at: '2026-08-31T17:00:00', catatan: 'Laporan realisasi Agustus 2026 — Kawasan Kampung Seni Flobamorata',
  })
  await insertBatch({
    kawasan_id: kawasanBId, periode_type: 'bulanan', periode_start: '2026-08-01',
    periode_end: '2026-08-31', tahun, status: 'disetujui', diajukan_oleh: userId,
    diajukan_at: '2026-08-31T17:00:00', catatan: 'Laporan realisasi Agustus 2026 — Kawasan Pantai Lasiana',
  })

  // Audit log
  await execute(
    `INSERT INTO audit_log (user_id, aksi, entitas, entitas_id, after)
     VALUES (?, ?, ?, ?, ?)`,
    [adminUserId, 'SEED', 'system', 'all', 'migrate:fresh — master data (users/kawasan) di-seed; jenis_retribusi & target kosong']
  )

  const counts = {}
  for (const t of ['users', 'kawasan', 'jenis_retribusi', 'target', 'realisasi', 'laporan_batch', 'audit_log']) {
    const rows = await query(`SELECT COUNT(*) as count FROM ${t}`)
    counts[t] = Number(rows[0].count)
  }

  return counts
}

async function main() {
  try {
    console.log('🗑️  Drop semua tabel...')
    const dropped = await dropAll()
    console.log('✅ Drop:', dropped.join(', '))

    console.log('🔄 Menjalankan migrasi dari awal...')
    const migrationResult = await runMigrations()
    console.log('✅ Migrasi:', migrationResult)

    console.log('🌱 Menjalankan seed minimal (jenis_retribusi & target kosong)...')
    const seedResult = await seedMinimal()
    console.log('✅ Seed:', seedResult)

    console.log('\n✅ Selesai!')
  } catch (e) {
    console.error('❌ Gagal:', e instanceof Error ? e.message : String(e))
    process.exit(1)
  } finally {
    await client.close()
  }
}

main()
