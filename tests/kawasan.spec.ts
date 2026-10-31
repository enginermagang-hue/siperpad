import { test, expect } from '@playwright/test';
import { BASE_URL, apiLogin, authPage, makeRun } from './helpers';

test.describe.serial('Kawasan Wisata — CRUD & guard', () => {
  const run = makeRun('KW');
  const TAG = run.tag;
  const kode = `E2E-${Date.now().toString(36).slice(-6).toUpperCase()}`;

  test.afterAll(async () => {
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
        await client.execute('DELETE FROM kawasan WHERE kode LIKE ?', [`E2E-%`]);
      } finally {
        client.close();
      }
    }
  });

  test('petugas dilarang create kawasan (403)', async ({ request }) => {
    await apiLogin(request, 'petugasLasiana');
    const res = await request.post(`${BASE_URL}/api/kawasan`, {
      data: { kode: `${kode}X`, nama: `${TAG} x`, urutan: 99, aktif: 1 },
    });
    expect(res.status()).toBe(403);
  });

  test('admin CRUD kawasan (create → get → update → delete)', async ({ request }) => {
    await apiLogin(request, 'admin');
    const created = await request.post(`${BASE_URL}/api/kawasan`, {
      data: { kode, nama: `${TAG} Kawasan`, urutan: 99, aktif: 1 },
    });
    expect(created.status(), await created.text()).toBe(200);
    const { id } = (await created.json()) as { id: number };
    expect(id).toBeGreaterThan(0);

    const got = await request.get(`${BASE_URL}/api/kawasan/${id}`);
    expect(got.status()).toBe(200);

    const upd = await request.put(`${BASE_URL}/api/kawasan/${id}`, {
      data: { kode, nama: `${TAG} Kawasan Edit`, urutan: 100, aktif: 0 },
    });
    expect(upd.status(), await upd.text()).toBe(200);

    const del = await request.delete(`${BASE_URL}/api/kawasan/${id}`);
    expect(del.status(), await del.text()).toBe(200);

    const gone = await request.get(`${BASE_URL}/api/kawasan/${id}`);
    expect(gone.status()).toBe(404);
  });

  test('kode duplikat ditolak (409)', async ({ request }) => {
    await apiLogin(request, 'admin');
    const k1 = `${kode}DUP`;
    const a = await request.post(`${BASE_URL}/api/kawasan`, {
      data: { kode: k1, nama: `${TAG} dup1`, urutan: 1, aktif: 1 },
    });
    expect(a.status()).toBe(200);
    const { id } = (await a.json()) as { id: number };
    const b = await request.post(`${BASE_URL}/api/kawasan`, {
      data: { kode: k1, nama: `${TAG} dup2`, urutan: 2, aktif: 1 },
    });
    expect(b.status()).toBe(409);
    await request.delete(`${BASE_URL}/api/kawasan/${id}`);
  });

  test('validasi: kode/nama kosong ditolak (400)', async ({ request }) => {
    await apiLogin(request, 'admin');
    const res = await request.post(`${BASE_URL}/api/kawasan`, {
      data: { kode: '', nama: '', urutan: 1, aktif: 1 },
    });
    expect(res.status()).toBe(400);
  });

  test('halaman /kawasan-wisata tampil untuk admin (UI)', async ({ page, request }) => {
    await authPage(page, request, 'admin');
    await page.goto('/kawasan-wisata');
    await expect(page.getByRole('heading', { name: 'Kawasan Wisata' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Tambah Kawasan' })).toBeVisible();
  });

  test('petugas tidak bisa buka /kawasan-wisata (redirect)', async ({ page, request }) => {
    await authPage(page, request, 'petugasLasiana');
    await page.goto('/kawasan-wisata');
    await expect(page).not.toHaveURL(/\/kawasan-wisata/);
  });
});