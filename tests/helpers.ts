import type { APIRequestContext, Page } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

/** Kredensial seed (server/database/seed.ts) — password sama untuk semua. */
export const USERS = {
  admin: { email: 'admin@mail.com', password: '123456', role: 'admin' },
  petugasLasiana: { email: 'petugas.lasiana@mail.com', password: '123456', role: 'user' },
  petugasKampungSeni: { email: 'petugas.kampungseni@mail.com', password: '123456', role: 'user' },
  kepala: { email: 'kepala@mail.com', password: '123456', role: 'kepala' },
} as const;

export type SeedUser = keyof typeof USERS;

export type Me = { id: number; role: string; kawasan_id: number | null };

export type Kawasan = { id: number; kode: string; nama: string };

export type Jenis = {
  id: number;
  kode: string;
  nama: string;
  kawasan_id: number;
  has_child: number;
  tarif: number | null;
  mode_tarif: string;
  satuan: string;
};

/**
 * Login via API pada request context yang sama — cookie sesi tersimpan di
 * context tersebut, jadi request berikutnya terautentikasi.
 */
export async function apiLogin(request: APIRequestContext, who: SeedUser): Promise<Me> {
  const { email, password } = USERS[who];
  const res = await request.post(`${BASE_URL}/api/auth/login`, {
    data: { email, password },
  });
  if (!res.ok()) throw new Error(`login ${email} gagal: ${res.status()} ${await res.text()}`);
  const me = await request.get(`${BASE_URL}/api/auth/me`);
  if (!me.ok()) throw new Error(`verifikasi sesi ${email} gagal: ${me.status()}`);
  return ((await me.json()) as { user: Me }).user;
}

/**
 * Login via API lalu suntik cookie sesi ke page — halaman ter-auth tanpa
 * melalui form login UI (dipakai test guard & alur halaman).
 */
export async function authPage(page: Page, request: APIRequestContext, who: SeedUser): Promise<Me> {
  const me = await apiLogin(request, who);
  const storage = await request.storageState();
  await page.context().addCookies(
    storage.cookies.map((c) => ({ name: c.name, value: c.value, url: BASE_URL })),
  );
  return me;
}

/**
 * Login via form UI (dipakai test login page itu sendiri).
 * Tahan terhadap klik pra-hidrasi: submit native me-reload halaman tanpa
 * memanggil handler Vue — dalam kasus itu ulangi isi + klik (maks 3x).
 */
export async function loginViaUI(page: Page, who: SeedUser) {
  const { email, password } = USERS[who];
  await page.goto('/login');
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.locator('#login-email').fill(email);
    await page.locator('#login-password').fill(password);
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    const ok = await page
      .waitForURL((u) => u.pathname === '/', { timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    if (ok) return;
    const alertShown = await page.getByRole('alert').count();
    if (alertShown) return;
  }
  throw new Error(`login UI ${email} gagal setelah 3 percobaan`);
}

/** Isi form login + klik Masuk sekali (untuk test pesan error). */
export async function attemptLoginUI(page: Page, email: string, password: string) {
  await page.goto('/login');
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.locator('#login-email').fill(email);
    await page.locator('#login-password').fill(password);
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    const alertShown = await page
      .getByRole('alert')
      .waitFor({ timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (alertShown) return;
  }
  throw new Error('alert error login tidak muncul setelah 3 percobaan');
}

export async function kawasanByKode(request: APIRequestContext, kode: string): Promise<Kawasan> {
  const res = await request.get(`${BASE_URL}/api/kawasan`);
  if (!res.ok()) throw new Error(`GET kawasan gagal: ${res.status()}`);
  const list = ((await res.json()) as { data: Kawasan[] }).data;
  const kw = list.find((k) => k.kode === kode);
  if (!kw) throw new Error(`kawasan kode ${kode} tidak ditemukan`);
  return kw;
}

/**
 * Pos daun (tanpa anak) untuk input realisasi — filter per kawasan & mode.
 * NOTE: endpoint menerapkan scope petugas (sessionKawasanId), jadi untuk
 * kawasan DI LUAR penugasan harus dipanggil dengan sesi admin/kepala.
 */
export async function leafJenis(
  request: APIRequestContext,
  opts: { kawasanKode: string; mode?: 'langsung' | 'kuantitas' },
): Promise<Jenis> {
  const kw = await kawasanByKode(request, opts.kawasanKode);
  const res = await request.get(`${BASE_URL}/api/jenis-retribusi`, {
    params: { kawasan_id: String(kw.id) },
  });
  if (!res.ok()) throw new Error(`GET jenis gagal: ${res.status()}`);
  const list = ((await res.json()) as { data: Jenis[] }).data.filter((j) => !j.has_child);
  const hit = opts.mode ? list.find((j) => j.mode_tarif === opts.mode) : list[0];
  if (!hit) throw new Error(`tidak ada pos daun mode=${opts.mode ?? 'any'} di kawasan ${opts.kawasanKode}`);
  return hit;
}

/**
 * Tanggal deterministik per offset (hari lalu) — jauh dari periode operasional
 * (tidak terkunci). `salt` acak per run supaya worker/browser paralel tidak
 * memakai tanggal yang sama (UNIQUE jenis+tanggal).
 */
export function fixedTanggal(offsetDays: number, salt = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays - salt);
  return d.toISOString().slice(0, 10);
}

/** Scope unik per run: tag data uji + generator tanggal T(offset). */
export function makeRun(prefix: string): { tag: string; salt: number; T: (off: number) => string } {
  const worker = Number(process.env.TEST_WORKER_INDEX || 0);
  const salt = worker * 7919 + Math.floor(Math.random() * 7000);
  const tag = `E2E-${prefix}-${Date.now().toString(36)}-${salt}`;
  return { tag, salt, T: (off: number) => fixedTanggal(off, salt) };
}

export function tahunOf(tanggal: string): number {
  return Number(tanggal.slice(0, 4));
}

export function bulanOf(tanggal: string): number {
  return Number(tanggal.slice(5, 7));
}

// ---------------------------------------------------------------------------
// Cleanup langsung ke Turso (hapus sisa data uji by tag).
// API tidak menyediakan hapus untuk baris non-draft, jadi teardown memakai
// koneksi DB read dari .env — hanya baris bertag E2E yang disentuh.
// ---------------------------------------------------------------------------

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  const p = join(process.cwd(), '.env');
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (m) out[m[1]!] = m[2]!.replace(/^["']|["']$/g, '');
  }
  return out;
}

export async function dbDeleteTestRows(tag: string) {
  const env = loadEnv();
  const url = process.env.TURSO_DATABASE_URL || env.TURSO_DATABASE_URL || '';
  if (!url) return;
  const authToken = process.env.TURSO_AUTH_TOKEN || env.TURSO_AUTH_TOKEN || undefined;
  const { createClient } = await import('@libsql/client');
  const client = createClient({ url, authToken });
  const like = `%${tag}%`;
  try {
    const ids = await client.execute('SELECT id FROM realisasi WHERE catatan LIKE ?', [like]);
    for (const row of ids.rows) {
      const id = String((row as Record<string, unknown>).id);
      await client.execute('DELETE FROM audit_log WHERE entitas = ? AND entitas_id = ?', ['realisasi', id]);
    }
    await client.execute('DELETE FROM realisasi WHERE catatan LIKE ?', [like]);
    await client.execute('DELETE FROM catatan_temuan WHERE isi LIKE ?', [like]);
    await client.execute('DELETE FROM users WHERE email LIKE ?', [`%${tag.toLowerCase()}%`]);
    await client.execute('DELETE FROM audit_log WHERE after LIKE ?', [like]);
  } finally {
    client.close();
  }
}
