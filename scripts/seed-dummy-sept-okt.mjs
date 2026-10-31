import { createClient } from '@libsql/client'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const rootDir = join(__dirname, '..')

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
    // rely on real env
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

async function q(sql, params = []) {
  const r = await client.execute({ sql, args: params })
  return r.rows
}
async function exec(sql, params = []) {
  const r = await client.execute({ sql, args: params })
  return r.rowsAffected ?? 0
}

// Deterministic PRNG (mulberry32)
function makeRng(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = makeRng(20260910)

function pick(arr) {
  return arr[Math.floor(rng() * arr.length)]
}
function int(min, max) {
  return min + Math.floor(rng() * (max - min + 1))
}
function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate()
}

// --- main ---
async function main() {
  // 1. Clear existing Sep/Oct realisasi + locks + catatan (idempotent)
  await exec("DELETE FROM realisasi WHERE substr(tanggal,1,7) IN ('2026-09','2026-10')")
  await exec("DELETE FROM periode_lock WHERE tahun = 2026 AND bulan IN (9,10)")
  await exec("DELETE FROM catatan_temuan WHERE tahun = 2026 AND bulan IN (9,10)")

  // 2. Kawasan & petugas user mapping
  const kawasanRows = await q('SELECT id, kode, nama FROM kawasan WHERE aktif = 1 ORDER BY urutan')
  const kawasanById = new Map(kawasanRows.map((r) => [Number(r.id), r]))
  // petugas per kawasan
  const users = await q('SELECT id, role, kawasan_id, email FROM users WHERE aktif = 1')
  const petugasByKawasan = new Map()
  const adminUser = users.find((u) => String(u.role) === 'admin')
  for (const u of users) {
    if (String(u.role) === 'user' && u.kawasan_id != null) {
      petugasByKawasan.set(Number(u.kawasan_id), Number(u.id))
    }
  }

  // 3. Leaf jenis per kawasan
  async function leafJenis(kawasanId) {
    const rows = await q(
      `SELECT j.id, j.kode, j.nama, j.tarif, j.mode_tarif, j.satuan
       FROM jenis_retribusi j
       WHERE j.aktif = 1 AND j.kawasan_id = ?
         AND NOT EXISTS (SELECT 1 FROM jenis_retribusi c WHERE c.parent_id = j.id)
       ORDER BY j.urutan, j.id`,
      [kawasanId],
    )
    return rows
  }

  const months = [
    { y: 2026, m: 9, label: 'Sep' },
    { y: 2026, m: 10, label: 'Okt' },
  ]

  let totalInserted = 0
  const statusCount = { draft: 0, diajukan: 0, disetujui: 0 }

  for (const kw of kawasanRows) {
    const kawasanId = Number(kw.id)
    const petugasId = petugasByKawasan.get(kawasanId) ?? (adminUser ? Number(adminUser.id) : null)
    const jenisList = await leafJenis(kawasanId)

    for (const mo of months) {
      const dim = daysInMonth(mo.y, mo.m)
      const mm = String(mo.m).padStart(2, '0')

      for (const j of jenisList) {
        const jenisId = Number(j.id)
        const tarif = j.tarif == null ? null : Number(j.tarif)
        const mode = String(j.mode_tarif) === 'kuantitas' ? 'kuantitas' : 'langsung'
        if (mode === 'kuantitas' && (!tarif || tarif <= 0)) continue

        // 4-8 distinct dates
        const n = int(4, 8)
        const used = new Set()
        const dates = []
        while (dates.length < n) {
          const d = int(1, dim)
          const key = d
          if (used.has(key)) continue
          used.add(key)
          dates.push(`${mo.y}-${mm}-${String(d).padStart(2, '0')}`)
        }

        for (const tanggal of dates) {
          // status distribution
          const r = rng()
          const status = r < 0.7 ? 'disetujui' : r < 0.9 ? 'diajukan' : 'draft'

          let jumlah, kuantitas = null, tarifStore = null
          if (mode === 'kuantitas') {
            // qty range by jenis name
            const name = String(j.nama).toLowerCase()
            let qty
            if (name.includes('motor')) qty = int(5, 60)
            else if (name.includes('mobil')) qty = int(3, 40)
            else if (name.includes('atas roda')) qty = int(1, 15)
            else if (name.includes('dewasa')) qty = int(30, 250)
            else if (name.includes('anak')) qty = int(10, 120)
            else if (name.includes('mancanegara') || name.includes('wna')) qty = int(0, 8)
            else if (name.includes('panggung')) qty = int(1, 8)
            else if (name.includes('permanen')) qty = int(1, 6)
            else if (name.includes('aula')) qty = int(1, 4)
            else qty = int(1, 20)
            kuantitas = qty
            tarifStore = tarif
            jumlah = Math.round(qty * tarif)
          } else {
            // langsung: wajar per jenis
            const name = String(j.nama).toLowerCase()
            if (name.includes('food court') && name.includes('b1')) jumlah = int(1_000_000, 1_600_000)
            else if (name.includes('food court')) jumlah = int(800_000, 1_300_000)
            else if (name.includes('gasebo')) jumlah = int(400_000, 500_000)
            else if (name.includes('ekraf')) jumlah = int(500_000, 700_000)
            else if (name.includes('pelataran')) jumlah = int(150_000, 200_000)
            else if (name.includes('toilet')) jumlah = int(180_000, 200_000)
            else if (name.includes('mck')) jumlah = int(400_000, 500_000)
            else if (name.includes('kelapa')) jumlah = int(50_000, 60_000)
            else if (name.includes('tuak')) jumlah = int(80_000, 100_000)
            else if (name.includes('resto')) jumlah = int(75_000, 95_000)
            else if (name.includes('kios')) jumlah = int(8_000, 10_000)
            else if (name.includes('panjat')) jumlah = int(30_000, 50_000)
            else if (name.includes('labirin')) jumlah = int(10_000, 25_000)
            else jumlah = int(50_000, 200_000)
          }

          // created_by: petugas (sebagian disetujui oleh admin untuk variasi)
          let createdBy = petugasId
          if (status === 'disetujui' && rng() < 0.25 && adminUser) createdBy = Number(adminUser.id)

          const catatan = `Dummy ${mo.label} 2026 - ${j.kode}`

          await exec(
            `INSERT INTO realisasi (jenis_retribusi_id, tanggal, jumlah, kuantitas, tarif, catatan, status, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [jenisId, tanggal, jumlah, kuantitas, tarifStore, catatan, status, createdBy],
          )
          totalInserted++
          statusCount[status]++
        }
      }
    }
  }

  // 4. catatan_temuan contoh
  const catatanSamples = [
    { kawasan: 0, bulan: 9, isi: 'Pendapatan parkir meningkat pada akhir pekan.', status: 'terbuka', jenis: null },
    { kawasan: 0, bulan: 9, isi: 'Food Court B1 belum lunas sewa bulan September.', status: 'selesai', jenis: null },
    { kawasan: 0, bulan: 10, isi: 'Kenaikan kunjungan wisatawan mancanegara.', status: 'terbuka', jenis: null },
    { kawasan: 1, bulan: 9, isi: 'Aula Lasiana dipakai acara sekolah.', status: 'terbuka', jenis: null },
    { kawasan: 1, bulan: 9, isi: 'Lopo permanen perlu perbaikan atap.', status: 'selesai', jenis: null },
    { kawasan: 1, bulan: 10, isi: 'Resto belum setor retribusi Oktober.', status: 'terbuka', jenis: null },
  ]
  for (const c of catatanSamples) {
    const kw = kawasanRows[c.kawasan]
    if (!kw) continue
    const kawasanId = Number(kw.id)
    const periode = `2026-${String(c.bulan).padStart(2, '0')}-01`
    const petugasId = petugasByKawasan.get(kawasanId) ?? (adminUser ? Number(adminUser.id) : null)
    await exec(
      `INSERT INTO catatan_temuan (kawasan_id, jenis_retribusi_id, tahun, bulan, isi, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [kawasanId, c.jenis, 2026, c.bulan, c.isi, c.status, petugasId],
    )
  }

  console.log('=== Seed dummy Sep/Okt 2026 selesai ===')
  console.log('Total realisasi inserted:', totalInserted)
  console.log('Status:', statusCount)
  console.log('Kawasan:', kawasanRows.map((k) => `${k.kode}(${k.nama})`).join(', '))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
