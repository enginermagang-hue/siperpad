import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  apiLogin,
  authPage,
  dbDeleteTestRows,
  leafJenis,
  kawasanByKode,
  makeRun,
  tahunOf,
} from './helpers';

test.describe.serial('Target tahunan, pengguna & catatan', () => {
  const run = makeRun('MASTER');
  const TAG = run.tag;
  const T = run.T;
  let targetTahun: number;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const req = ctx.request;
    await apiLogin(req, 'admin');
    targetTahun = tahunOf(T(800)) - 5;
    await ctx.close();
  });

  test.afterAll(async () => {
    await dbDeleteTestRows(TAG);
    const { createClient } = await import('@libsql/client');
    const { readFileSync, existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    let url = process.env.TURSO_DATABASE_URL || '';
    let token = process.env.TURSO_AUTH_TOKEN || undefined;
    if ((!url || !token) && existsSync(join(process.cwd(), '.env'))) {
      for (const line of readFileSync(join(process.cwd(), '.env'), 'utf8').split('\n')) {
        const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
        if (m) {
          if (m[1] === 'TURSO_DATABASE_URL' && !url) url = m[2]!.replace(/^["']|["']$/g, '');
          if (m[1] === 'TURSO_AUTH_TOKEN' && !token) token = m[2]!.replace(/^["']|["']$/g, '');
        }
      }
    }
    if (url) {
      const client = createClient({ url, authToken: token });
      try {
        await client.execute('DELETE FROM target WHERE tahun = ?', [targetTahun]);
      } finally {
        client.close();
      }
    }
  });

  test('admin CRUD target tahun uji (upsert → list → delete)', async ({ request }) => {
    await apiLogin(request, 'admin');
    const jenis = await leafJenis(request, { kawasanKode: 'B', mode: 'langsung' });
    const up = await request.post(`${BASE_URL}/api/target`, {
      data: { jenis_retribusi_id: jenis.id, tahun: targetTahun, nilai: 123456789 },
    });
    expect(up.status(), await up.text()).toBe(200);
    const { id } = (await up.json()) as { id: number };

    const lookup = await request.get(`${BASE_URL}/api/target`, {
      params: { jenis_retribusi_id: String(jenis.id), tahun: String(targetTahun) },
    });
    expect((((await lookup.json()) as { nilai: number }).nilai)).toBe(123456789);

    const list = await request.get(`${BASE_URL}/api/target`, { params: { tahun: String(targetTahun) } });
    expect((((await list.json()) as { data: unknown[] }).data.length)).toBeGreaterThan(0);

    const del = await request.delete(`${BASE_URL}/api/target/${id}`);
    expect(del.status()).toBe(200);
  });

  test('anomali target terdeteksi (A.2 induk tertulis vs sum anak)', async ({ request }) => {
    await apiLogin(request, 'admin');
    const res = await request.get(`${BASE_URL}/api/target/anomali`, { params: { tahun: '2026' } });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { data: { kode: string }[] };
    expect(body.data.some((a) => a.kode === 'A.2')).toBe(true);
  });

  test('admin CRUD pengguna (tambah → nonaktifkan)', async ({ request }) => {
    await apiLogin(request, 'admin');
    const kawasan = await kawasanByKode(request, 'B');
    const stamp = Date.now().toString(36);
    const tagMail = `${TAG.toLowerCase()}-${stamp}@mail.com`.replace(/[^a-z0-9@.\-_]/g, '');
    const created = await request.post(`${BASE_URL}/api/users`, {
      data: { nama: `${TAG} User`, nip: '000', email: tagMail, password: '123456', role: 'user', kawasan_id: kawasan.id, aktif: 1 },
    });
    expect(created.status(), await created.text()).toBe(200);
    const createdBody = (await created.json()) as { id?: number; user?: { id: number }; data?: { id: number } };
    const newId = createdBody.id ?? createdBody.user?.id ?? createdBody.data?.id;
    expect(newId).toBeGreaterThan(0);

    const loginTry = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: tagMail, password: '123456' },
    });
    expect(loginTry.ok()).toBeTruthy();
    await request.post(`${BASE_URL}/api/auth/logout`);
    await apiLogin(request, 'admin');

    const del = await request.delete(`${BASE_URL}/api/users/${newId}`);
    expect(del.status()).toBe(200);
    const relogin = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: tagMail, password: '123456' },
    });
    expect(relogin.status()).toBe(403);
  });

  test('admin tidak bisa hapus akun sendiri (400)', async ({ request }) => {
    const me = await apiLogin(request, 'admin');
    const res = await request.delete(`${BASE_URL}/api/users/${me.id}`);
    expect(res.status()).toBe(400);
  });

  test('catatan temuan: buat → ubah status → hapus', async ({ request }) => {
    await apiLogin(request, 'admin');
    const kawasan = await kawasanByKode(request, 'B');
    const isi = `${TAG} catatan temuan`;
    const tanggal = T(801);
    const created = await request.post(`${BASE_URL}/api/catatan`, {
      data: { tahun: tahunOf(tanggal), bulan: 6, kawasan_id: kawasan.id, isi },
    });
    expect(created.status(), await created.text()).toBe(200);
    const { id } = (await created.json()) as { id: number };

    const put = await request.put(`${BASE_URL}/api/catatan/${id}`, {
      data: { status: 'selesai' },
    });
    expect(put.status()).toBe(200);

    const list = await request.get(`${BASE_URL}/api/catatan`, { params: { status: 'selesai' } });
    const rows = ((await list.json()) as { data: { id: number }[] }).data;
    expect(rows.some((r) => r.id === id)).toBe(true);

    const del = await request.delete(`${BASE_URL}/api/catatan/${id}`);
    expect(del.status()).toBe(200);
  });

  test('halaman /master/target, /pengguna, /verifikasi/catatan tampil (UI)', async ({ page, request }) => {
    await authPage(page, request, 'admin');
    await page.goto('/master/target');
    await expect(page.getByRole('heading', { name: 'Target Tahunan' })).toBeVisible({ timeout: 15000 });
    await page.goto('/pengguna');
    await expect(page.getByRole('heading', { name: 'Pengguna' })).toBeVisible({ timeout: 15000 });
    await page.goto('/verifikasi/catatan');
    await expect(page.getByRole('heading', { name: 'Catatan Temuan' })).toBeVisible({ timeout: 15000 });
  });

  test('halaman /settings tampil + info sistem (UI)', async ({ page, request }) => {
    await authPage(page, request, 'admin');
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Pengaturan' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Ganti Password' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Info Sistem' })).toBeVisible();
  });
});
