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

async function runMigrations() {
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
    const statements = sql.split(';').map((s) => s.trim()).filter((s) => s.length > 0)
    await client.batch(statements.map((s) => ({ sql: s })))
    await client.execute('INSERT INTO _migrations (filename) VALUES (?)', [filename])
    ran.push(filename)
  }

  return { ran, skipped }
}

async function seedAll() {
  const query = async (sql, params = []) => (await client.execute(sql, params)).rows
  const execute = async (sql, params = []) => client.execute(sql, params)

  // Clear existing data
  await execute('DELETE FROM audit_log')
  await execute('DELETE FROM realisasi')
  await execute('DELETE FROM laporan_batch')
  await execute('DELETE FROM target')
  await execute('DELETE FROM jenis_retribusi')
  await execute('DELETE FROM kawasan')
  await execute('DELETE FROM users')

  const now = '2026-10-03T00:00:00'
  const tahun = 2026

  // Users
  const userDefs = [
    { nama: 'Admin Operator', nip: '198001012006041001', email: 'admin@mail.com', role: 'admin' },
    { nama: 'Verifikator', nip: '198502152010012001', email: 'verif@mail.com', role: 'verifikator' },
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
  const [adminUserId] = userIds

  // Kawasan
  const insertKawasan = async (kode, nama, urutan) => {
    const rows = await query('INSERT INTO kawasan (kode, nama, urutan) VALUES (?, ?, ?) RETURNING id', [kode, nama, urutan])
    return rows[0].id
  }

  const kawasanAId = await insertKawasan('A', 'Kampung Seni Flobamorata', 1)
  const kawasanBId = await insertKawasan('B', 'Pantai Lasiana', 2)

  // Jenis Retribusi (tree-structured from Excel)
  const insertJenis = async (kawasan_id, parent_id, kode, nama, level, urutan) => {
    const rows = await query(
      `INSERT INTO jenis_retribusi (kawasan_id, parent_id, kode, nama, level, urutan)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      [kawasan_id, parent_id, kode, nama, level, urutan]
    )
    return rows[0].id
  }

  const A = {
    a1: await insertJenis(kawasanAId, null, 'A.1', 'Retribusi Tempat Khusus Parkir diluar Badan Jalan', 1, 1),
    a1a: await insertJenis(kawasanAId, null, 'A.1.a', 'Kendaraan Roda Dua / Motor', 2, 1),
    a1b: await insertJenis(kawasanAId, null, 'A.1.b', 'Kendaraan Roda Empat / Mobil', 2, 2),
    a1c: await insertJenis(kawasanAId, null, 'A.1.c', 'Kendaraan diatas Roda Empat', 2, 3),
    a2: await insertJenis(kawasanAId, null, 'A.2', 'Retribusi Penyediaan Tempat Usaha (Pertokoan dan Tempat Kegiatan Usaha Lainnya)', 1, 2),
    a2food: await insertJenis(kawasanAId, null, 'A.2.1', 'Sewa Tempat Usaha Kampung Seni Flobamorata', 2, 1),
    a2foodb1: await insertJenis(kawasanAId, null, 'A.2.1.a', 'Food Court - Nomor B1', 3, 1),
    a2foodb2b3b4: await insertJenis(kawasanAId, null, 'A.2.1.b', 'Food Court - Nomor B2, B3, B4', 3, 2),
    a2foodb5b6b7: await insertJenis(kawasanAId, null, 'A.2.1.c', 'Food Court - Nomor B5, B6, B7', 3, 3),
    a2gasebo: await insertJenis(kawasanAId, null, 'A.2.2', 'Gasebo', 2, 2),
    a2ekraf: await insertJenis(kawasanAId, null, 'A.2.3', 'Rumah Ekraf (A1, A2)', 2, 3),
    a2pelataran: await insertJenis(kawasanAId, null, 'A.2.4', 'Sewa Pelataran Kampung Seni Flobamorata', 2, 4),
    a2toilet: await insertJenis(kawasanAId, null, 'A.2.5', 'Sewa Toilet Pos Jaga Kampung Seni Flobamorata', 2, 5),
  }

  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a1, A.a1a])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a1, A.a1b])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a1, A.a1c])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a2, A.a2food])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a2food, A.a2foodb1])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a2food, A.a2foodb2b3b4])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a2food, A.a2foodb5b6b7])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a2, A.a2gasebo])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a2, A.a2ekraf])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a2, A.a2pelataran])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a2, A.a2toilet])

  const B = {
    b1: await insertJenis(kawasanBId, null, 'B.1', 'Retribusi Tempat Khusus Parkir diluar Badan Jalan', 1, 1),
    b1a: await insertJenis(kawasanBId, null, 'B.1.a', 'Kendaraan Roda Dua / Motor', 2, 1),
    b1b: await insertJenis(kawasanBId, null, 'B.1.b', 'Kendaraan Roda Empat / Mobil', 2, 2),
    b1c: await insertJenis(kawasanBId, null, 'B.1.c', 'Kendaraan diatas Roda Empat', 2, 3),
    b2: await insertJenis(kawasanBId, null, 'B.2', 'Retribusi Pelayanan Tempat Rekreasi, Pariwisata dan Olahraga', 1, 2),
    b2rekreasi: await insertJenis(kawasanBId, null, 'B.2.1', 'Tempat Rekreasi Pantai Lasiana', 2, 1),
    b2rekreasimasuk: await insertJenis(kawasanBId, null, 'B.2.1.a', 'Masuk Kawasan Lasiana', 3, 1),
    b2rekreasimasukdewasa: await insertJenis(kawasanBId, null, 'B.2.1.a.1', 'Dewasa', 4, 1),
    b2rekreasimasukanak: await insertJenis(kawasanBId, null, 'B.2.1.a.2', 'Anak', 4, 2),
    b2rekreasimasukwna: await insertJenis(kawasanBId, null, 'B.2.1.a.3', 'Wisatawan Mancanegara', 4, 3),
    b2panjattebing: await insertJenis(kawasanBId, null, 'B.2.1.b', 'Panjat Tebing', 3, 2),
    b2labirin: await insertJenis(kawasanBId, null, 'B.2.1.c', 'Labirin', 3, 3),
    b2mck: await insertJenis(kawasanBId, null, 'B.2.1.d', 'Sewa MCK', 3, 4),
    b2lopopanggung: await insertJenis(kawasanBId, null, 'B.2.1.e', 'Sewa Lopo Panggung', 3, 5),
    b2lopopermanen: await insertJenis(kawasanBId, null, 'B.2.1.f', 'Sewa Lopo Permanen', 3, 6),
    b2aula: await insertJenis(kawasanBId, null, 'B.2.2', 'Sewa Aula / Gedung di Lasiana', 2, 2),
    b2kelapa: await insertJenis(kawasanBId, null, 'B.2.3', 'Sewa Pohon Kelapa di Lasiana', 2, 3),
    b2tuak: await insertJenis(kawasanBId, null, 'B.2.4', 'Sewa Pohon Tuak di Lasiana', 2, 4),
    b2resto: await insertJenis(kawasanBId, null, 'B.2.5', 'Sewa Resto', 2, 5),
    b2kios: await insertJenis(kawasanBId, null, 'B.2.6', 'Sewa Kios Lapak', 2, 6),
  }

  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b1, B.b1a])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b1, B.b1b])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b1, B.b1c])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2, B.b2rekreasi])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2rekreasi, B.b2rekreasimasuk])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2rekreasimasuk, B.b2rekreasimasukdewasa])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2rekreasimasuk, B.b2rekreasimasukanak])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2rekreasimasuk, B.b2rekreasimasukwna])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2rekreasi, B.b2panjattebing])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2rekreasi, B.b2labirin])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2rekreasi, B.b2mck])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2rekreasi, B.b2lopopanggung])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2rekreasi, B.b2lopopermanen])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2, B.b2aula])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2, B.b2kelapa])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2, B.b2tuak])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2, B.b2resto])
  await execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2, B.b2kios])

  // Targets 2026 (values from Excel — A.2 anomaly noted)
  const targets = [
    { id: A.a1a, nilai: 1500000 },
    { id: A.a1b, nilai: 2500000 },
    { id: A.a1c, nilai: 750000 },
    { id: A.a2foodb1, nilai: 19000000 },
    { id: A.a2foodb2b3b4, nilai: 15200000 },
    { id: A.a2foodb5b6b7, nilai: 11400000 },
    { id: A.a2gasebo, nilai: 5700000 },
    { id: A.a2ekraf, nilai: 7980000 },
    { id: A.a2pelataran, nilai: 1900000 },
    { id: A.a2toilet, nilai: 2280000 },
    { id: B.b1a, nilai: 35000000 },
    { id: B.b1b, nilai: 63354000 },
    { id: B.b1c, nilai: 5000000 },
    { id: B.b2rekreasimasukdewasa, nilai: 213342000 },
    { id: B.b2rekreasimasukanak, nilai: 65000000 },
    { id: B.b2rekreasimasukwna, nilai: 0 },
    { id: B.b2panjattebing, nilai: 500000 },
    { id: B.b2labirin, nilai: 0 },
    { id: B.b2mck, nilai: 5874000 },
    { id: B.b2lopopanggung, nilai: 1000000 },
    { id: B.b2lopopermanen, nilai: 600000 },
    { id: B.b2aula, nilai: 53000000 },
    { id: B.b2kelapa, nilai: 600000 },
    { id: B.b2tuak, nilai: 1000000 },
    { id: B.b2resto, nilai: 0 },
    { id: B.b2kios, nilai: 0 },
  ]

  for (const t of targets) {
    await execute('INSERT OR REPLACE INTO target (jenis_retribusi_id, tahun, nilai) VALUES (?, ?, ?)', [t.id, tahun, t.nilai])
  }

  // Laporan Batch Agustus 2026
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
    periode_end: '2026-08-31', tahun, status: 'disetujui', diajukan_oleh: adminUserId,
    diajukan_at: '2026-08-31T17:00:00', catatan: 'Laporan realisasi Agustus 2026 — Kawasan Kampung Seni Flobamorata',
  })
  await insertBatch({
    kawasan_id: kawasanBId, periode_type: 'bulanan', periode_start: '2026-08-01',
    periode_end: '2026-08-31', tahun, status: 'disetujui', diajukan_oleh: adminUserId,
    diajukan_at: '2026-08-31T17:00:00', catatan: 'Laporan realisasi Agustus 2026 — Kawasan Pantai Lasiana',
  })

  // Audit log
  await execute(
    `INSERT INTO audit_log (user_id, aksi, entitas, entitas_id, after)
     VALUES (?, ?, ?, ?, ?)`,
    [adminUserId, 'SEED', 'system', 'all', 'Master data + target 2026 di-seed dari Rekap Laporan PAD Excel']
  )

  const kawasanCount = (await query('SELECT COUNT(*) as count FROM kawasan'))[0].count
  const jenisCount = (await query('SELECT COUNT(*) as count FROM jenis_retribusi'))[0].count
  const targetCount = (await query('SELECT COUNT(*) as count FROM target'))[0].count
  const usersCount = (await query('SELECT COUNT(*) as count FROM users'))[0].count

  return { kawasan: Number(kawasanCount), jenis: Number(jenisCount), target: Number(targetCount), users: Number(usersCount) }
}

async function main() {
  try {
    console.log('🔄 Menjalankan migrasi...')
    const migrationResult = await runMigrations()
    console.log('✅ Migrasi:', migrationResult)

    console.log('🌱 Menjalankan seed...')
    const seedResult = await seedAll()
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
