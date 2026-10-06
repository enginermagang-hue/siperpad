import { scryptSync, randomBytes } from 'node:crypto'
import { getTursoClient } from '../utils/db'

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const key = scryptSync(password, salt, 64)
  return `${salt}$${key.toString('hex')}`
}

export type SeedContext = {
  query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>
  execute: (sql: string, params?: unknown[]) => Promise<{ rowsChanged: number }>
}

async function insertKawasan(
  ctx: SeedContext,
  params: { kode: string; nama: string; urutan: number }
): Promise<number> {
  const rows = await ctx.query<{ id: number }>(
    'INSERT INTO kawasan (kode, nama, urutan) VALUES (?, ?, ?) RETURNING id',
    [params.kode, params.nama, params.urutan]
  )
  return rows[0]!.id
}

async function insertJenis(
  ctx: SeedContext,
  params: {
    kawasan_id: number
    parent_id: number | null
    kode: string
    nama: string
    level: number
    urutan: number
  }
): Promise<number> {
  const rows = await ctx.query<{ id: number }>(
    `INSERT INTO jenis_retribusi (kawasan_id, parent_id, kode, nama, level, urutan)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
    [params.kawasan_id, params.parent_id, params.kode, params.nama, params.level, params.urutan]
  )
  return rows[0]!.id
}

async function insertTarget(ctx: SeedContext, jenis_retribusi_id: number, tahun: number, nilai: number): Promise<void> {
  await ctx.execute(
    'INSERT OR REPLACE INTO target (jenis_retribusi_id, tahun, nilai) VALUES (?, ?, ?)',
    [jenis_retribusi_id, tahun, nilai]
  )
}

async function insertBatch(ctx: SeedContext, params: {
  kawasan_id: number
  periode_type: string
  periode_start: string
  periode_end: string
  tahun: number
  status: string
  diajukan_oleh: number
  diajukan_at: string
  catatan: string
}): Promise<number> {
  const rows = await ctx.query<{ id: number }>(
    `INSERT INTO laporan_batch
     (kawasan_id, periode_type, periode_start, periode_end, tahun, status, diajukan_oleh, diajukan_at, catatan)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [
      params.kawasan_id,
      params.periode_type,
      params.periode_start,
      params.periode_end,
      params.tahun,
      params.status,
      params.diajukan_oleh,
      params.diajukan_at,
      params.catatan,
    ]
  )
  return rows[0]!.id
}

async function clearMasterData(ctx: SeedContext): Promise<void> {
  await ctx.execute('DELETE FROM audit_log')
  await ctx.execute('DELETE FROM realisasi')
  await ctx.execute('DELETE FROM laporan_batch')
  await ctx.execute('DELETE FROM target')
  await ctx.execute('DELETE FROM jenis_retribusi')
  await ctx.execute('DELETE FROM kawasan')
  await ctx.execute('DELETE FROM users')
}

export async function seedAll(): Promise<{ kawasan: number; jenis: number; target: number; users: number }> {
  const client = getTursoClient()
  const ctx: SeedContext = {
    query: (sql, params) => client.execute(sql, params as any).then((r) => r.rows as any),
    execute: (sql, params) => client.execute(sql, params as any).then((r) => ({ rowsChanged: r.rowsAffected ?? 0 })),
  }

  await clearMasterData(ctx)

  const now = '2026-10-03T00:00:00'
  const tahun = 2026

  const userDefs = [
    { nama: 'Admin Operator', nip: '198001012006041001', email: 'admin@mail.com', role: 'admin' },
    { nama: 'Verifikator', nip: '198502152010012001', email: 'verif@mail.com', role: 'verifikator' },
    { nama: 'Kepala Dinas', nip: '198001012005011001', email: 'kepala@mail.com', role: 'kepala' },
  ] as const

  const userIds: number[] = []
  for (const u of userDefs) {
    const rows = await ctx.query<{ id: number }>(
      `INSERT INTO users (nama, nip, email, password_hash, role, aktif, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?) RETURNING id`,
      [u.nama, u.nip, u.email, hashPassword('123456'), u.role, now]
    )
    userIds.push(rows[0]!.id)
  }
  const [adminUserId, verifUserId, kepalaUserId] = userIds

  const kawasanAId = await insertKawasan(ctx, { kode: 'A', nama: 'Kampung Seni Flobamorata', urutan: 1 })
  const kawasanBId = await insertKawasan(ctx, { kode: 'B', nama: 'Pantai Lasiana', urutan: 2 })

  // ---- Kampung Seni (A) ----
  const A = {
    a1: await insertJenis(ctx, { kawasan_id: kawasanAId, parent_id: null, kode: 'A.1', nama: 'Retribusi Tempat Khusus Parkir diluar Badan Jalan', level: 1, urutan: 1 }),
    a1a: await insertJenis(ctx, { kawasan_id: kawasanAId, parent_id: null, kode: 'A.1.a', nama: 'Kendaraan Roda Dua / Motor', level: 2, urutan: 1 }),
    a1b: await insertJenis(ctx, { kawasan_id: kawasanAId, parent_id: null, kode: 'A.1.b', nama: 'Kendaraan Roda Empat / Mobil', level: 2, urutan: 2 }),
    a1c: await insertJenis(ctx, { kawasan_id: kawasanAId, parent_id: null, kode: 'A.1.c', nama: 'Kendaraan diatas Roda Empat', level: 2, urutan: 3 }),
    a2: await insertJenis(ctx, { kawasan_id: kawasanAId, parent_id: null, kode: 'A.2', nama: 'Retribusi Penyediaan Tempat Usaha (Pertokoan dan Tempat Kegiatan Usaha Lainnya)', level: 1, urutan: 2 }),
    a2food: await insertJenis(ctx, { kawasan_id: kawasanAId, parent_id: null, kode: 'A.2.1', nama: 'Sewa Tempat Usaha Kampung Seni Flobamorata', level: 2, urutan: 1 }),
    a2foodb1: await insertJenis(ctx, { kawasan_id: kawasanAId, parent_id: null, kode: 'A.2.1.a', nama: 'Food Court - Nomor B1', level: 3, urutan: 1 }),
    a2foodb2b3b4: await insertJenis(ctx, { kawasan_id: kawasanAId, parent_id: null, kode: 'A.2.1.b', nama: 'Food Court - Nomor B2, B3, B4', level: 3, urutan: 2 }),
    a2foodb5b6b7: await insertJenis(ctx, { kawasan_id: kawasanAId, parent_id: null, kode: 'A.2.1.c', nama: 'Food Court - Nomor B5, B6, B7', level: 3, urutan: 3 }),
    a2gasebo: await insertJenis(ctx, { kawasan_id: kawasanAId, parent_id: null, kode: 'A.2.2', nama: 'Gasebo', level: 2, urutan: 2 }),
    a2ekraf: await insertJenis(ctx, { kawasan_id: kawasanAId, parent_id: null, kode: 'A.2.3', nama: 'Rumah Ekraf (A1, A2)', level: 2, urutan: 3 }),
    a2pelataran: await insertJenis(ctx, { kawasan_id: kawasanAId, parent_id: null, kode: 'A.2.4', nama: 'Sewa Pelataran Kampung Seni Flobamorata', level: 2, urutan: 4 }),
    a2toilet: await insertJenis(ctx, { kawasan_id: kawasanAId, parent_id: null, kode: 'A.2.5', nama: 'Sewa Toilet Pos Jaga Kampung Seni Flobamorata', level: 2, urutan: 5 }),
  }

  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a1, A.a1a])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a1, A.a1b])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a1, A.a1c])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a2, A.a2food])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a2food, A.a2foodb1])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a2food, A.a2foodb2b3b4])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a2food, A.a2foodb5b6b7])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a2, A.a2gasebo])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a2, A.a2ekraf])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a2, A.a2pelataran])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [A.a2, A.a2toilet])

  // ---- Pantai Lasiana (B) ----
  const B = {
    b1: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.1', nama: 'Retribusi Tempat Khusus Parkir diluar Badan Jalan', level: 1, urutan: 1 }),
    b1a: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.1.a', nama: 'Kendaraan Roda Dua / Motor', level: 2, urutan: 1 }),
    b1b: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.1.b', nama: 'Kendaraan Roda Empat / Mobil', level: 2, urutan: 2 }),
    b1c: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.1.c', nama: 'Kendaraan diatas Roda Empat', level: 2, urutan: 3 }),
    b2: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.2', nama: 'Retribusi Pelayanan Tempat Rekreasi, Pariwisata dan Olahraga', level: 1, urutan: 2 }),
    b2rekreasi: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.2.1', nama: 'Tempat Rekreasi Pantai Lasiana', level: 2, urutan: 1 }),
    b2rekreasimasuk: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.2.1.a', nama: 'Masuk Kawasan Lasiana', level: 3, urutan: 1 }),
    b2rekreasimasukdewasa: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.2.1.a.1', nama: 'Dewasa', level: 4, urutan: 1 }),
    b2rekreasimasukanak: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.2.1.a.2', nama: 'Anak', level: 4, urutan: 2 }),
    b2rekreasimasukwna: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.2.1.a.3', nama: 'Wisatawan Mancanegara', level: 4, urutan: 3 }),
    b2panjattebing: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.2.1.b', nama: 'Panjat Tebing', level: 3, urutan: 2 }),
    b2labirin: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.2.1.c', nama: 'Labirin', level: 3, urutan: 3 }),
    b2mck: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.2.1.d', nama: 'Sewa MCK', level: 3, urutan: 4 }),
    b2lopopanggung: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.2.1.e', nama: 'Sewa Lopo Panggung', level: 3, urutan: 5 }),
    b2lopopermanen: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.2.1.f', nama: 'Sewa Lopo Permanen', level: 3, urutan: 6 }),
    b2aula: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.2.2', nama: 'Sewa Aula / Gedung di Lasiana', level: 2, urutan: 2 }),
    b2kelapa: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.2.3', nama: 'Sewa Pohon Kelapa di Lasiana', level: 2, urutan: 3 }),
    b2tuak: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.2.4', nama: 'Sewa Pohon Tuak di Lasiana', level: 2, urutan: 4 }),
    b2resto: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.2.5', nama: 'Sewa Resto', level: 2, urutan: 5 }),
    b2kios: await insertJenis(ctx, { kawasan_id: kawasanBId, parent_id: null, kode: 'B.2.6', nama: 'Sewa Kios Lapak', level: 2, urutan: 6 }),
  }

  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b1, B.b1a])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b1, B.b1b])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b1, B.b1c])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2, B.b2rekreasi])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2rekreasi, B.b2rekreasimasuk])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2rekreasimasuk, B.b2rekreasimasukdewasa])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2rekreasimasuk, B.b2rekreasimasukanak])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2rekreasimasuk, B.b2rekreasimasukwna])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2rekreasi, B.b2panjattebing])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2rekreasi, B.b2labirin])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2rekreasi, B.b2mck])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2rekreasi, B.b2lopopanggung])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2rekreasi, B.b2lopopermanen])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2, B.b2aula])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2, B.b2kelapa])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2, B.b2tuak])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2, B.b2resto])
  await ctx.execute('UPDATE jenis_retribusi SET parent_id = ? WHERE id = ?', [B.b2, B.b2kios])

  // ---- Target 2026 ----
  // Catatan: Anomali data Excel — target A.2 tertulis 49.780.000,
  // sedangkan jumlah rincian A.2.1+A.2.2+A.2.3 = 63.460.000 (selisih 13.680.000).
  // Nilai di bawah adalah nilai tertulis di Excel (menunggu konfirmasi Bendahara Penerimaan).
  const targets: { id: number; nilai: number }[] = [
    { id: A.a1a, nilai: 1_500_000 },
    { id: A.a1b, nilai: 2_500_000 },
    { id: A.a1c, nilai: 750_000 },
    { id: A.a2foodb1, nilai: 19_000_000 },
    { id: A.a2foodb2b3b4, nilai: 15_200_000 },
    { id: A.a2foodb5b6b7, nilai: 11_400_000 },
    { id: A.a2gasebo, nilai: 5_700_000 },
    { id: A.a2ekraf, nilai: 7_980_000 },
    { id: A.a2pelataran, nilai: 1_900_000 },
    { id: A.a2toilet, nilai: 2_280_000 },
    { id: B.b1a, nilai: 35_000_000 },
    { id: B.b1b, nilai: 63_354_000 },
    { id: B.b1c, nilai: 5_000_000 },
    { id: B.b2rekreasimasukdewasa, nilai: 213_342_000 },
    { id: B.b2rekreasimasukanak, nilai: 65_000_000 },
    { id: B.b2rekreasimasukwna, nilai: 0 },
    { id: B.b2panjattebing, nilai: 500_000 },
    { id: B.b2labirin, nilai: 0 },
    { id: B.b2mck, nilai: 5_874_000 },
    { id: B.b2lopopanggung, nilai: 1_000_000 },
    { id: B.b2lopopermanen, nilai: 600_000 },
    { id: B.b2aula, nilai: 53_000_000 },
    { id: B.b2kelapa, nilai: 600_000 },
    { id: B.b2tuak, nilai: 1_000_000 },
    { id: B.b2resto, nilai: 0 },
    { id: B.b2kios, nilai: 0 },
  ]

  for (const t of targets) {
    await insertTarget(ctx, t.id, tahun, t.nilai)
  }

  // ---- Laporan Batch Agustus 2026 ----
  await insertBatch(ctx, {
    kawasan_id: kawasanAId,
    periode_type: 'bulanan',
    periode_start: '2026-08-01',
    periode_end: '2026-08-31',
    tahun,
    status: 'disetujui',
    diajukan_oleh: adminUserId,
    diajukan_at: '2026-08-31T17:00:00',
    catatan: 'Laporan realisasi Agustus 2026 — Kawasan Kampung Seni Flobamorata',
  })
  await insertBatch(ctx, {
    kawasan_id: kawasanBId,
    periode_type: 'bulanan',
    periode_start: '2026-08-01',
    periode_end: '2026-08-31',
    tahun,
    status: 'disetujui',
    diajukan_oleh: adminUserId,
    diajukan_at: '2026-08-31T17:00:00',
    catatan: 'Laporan realisasi Agustus 2026 — Kawasan Pantai Lasiana',
  })

  // ---- Audit log ----
  await ctx.execute(
    `INSERT INTO audit_log (user_id, aksi, entitas, entitas_id, after)
     VALUES (?, ?, ?, ?, ?)`,
    [adminUserId, 'SEED', 'system', 'all', 'Master data + target 2026 di-seed dari Rekap Laporan PAD Excel']
  )

  const kawasanCount = (await ctx.query<{ count: number }>('SELECT COUNT(*) as count FROM kawasan'))[0]!.count
  const jenisCount = (await ctx.query<{ count: number }>('SELECT COUNT(*) as count FROM jenis_retribusi'))[0]!.count
  const targetCount = (await ctx.query<{ count: number }>('SELECT COUNT(*) as count FROM target'))[0]!.count
  const usersCount = (await ctx.query<{ count: number }>('SELECT COUNT(*) as count FROM users'))[0]!.count

  return { kawasan: kawasanCount, jenis: jenisCount, target: targetCount, users: usersCount }
}
