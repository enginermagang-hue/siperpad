import { test, expect } from '@playwright/test';
import { BASE_URL, apiLogin, authPage, kawasanByKode, makeRun } from './helpers';

test.describe.serial('Jenis Retribusi — CRUD & guard', () => {
  const run = makeRun('JR');
  const TAG = run.tag;
  const nama = `${TAG} Jenis Uji`;
  let kawasanId: number;
  let createdId = 0;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const req = ctx.request;
    await apiLogin(req, 'admin');
    kawasanId = (await kawasanByKode(req, 'B')).id;
    await ctx.close();
  });

  test.afterAll(async () => {
    // soft-delete rows created (aktif=0) — hapus permanen by nama tag
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
        await client.execute('DELETE FROM jenis_retribusi WHERE nama LIKE ?', [`%${TAG}%`]);
      } finally {
        client.close();
      }
    }
  });

  test('petugas dilarang create jenis (403)', async ({ request }) => {
    await apiLogin(request, 'petugasLasiana');
    const res = await request.post(`${BASE_URL}/api/jenis-retribusi`, {
      data: { kawasan_id: kawasanId, nama: `${TAG} x`, mode_tarif: 'langsung' },
    });
    expect(res.status()).toBe(403);
  });

  test('admin create jenis langsung → id', async ({ request }) => {
    await apiLogin(request, 'admin');
    const res = await request.post(`${BASE_URL}/api/jenis-retribusi`, {
      data: { kawasan_id: kawasanId, kode: 'E2E', nama, urutan: 999, aktif: 1, mode_tarif: 'langsung' },
    });
    expect(res.status(), await res.text()).toBe(200);
    createdId = ((await res.json()) as { id: number }).id;
    expect(createdId).toBeGreaterThan(0);
  });

  test('admin update jenis (nama + mode kuantitas butuh tarif)', async ({ request }) => {
    await apiLogin(request, 'admin');
    const ok = await request.put(`${BASE_URL}/api/jenis-retribusi/${createdId}`, {
      data: { kawasan_id: kawasanId, kode: 'E2E', nama: `${nama} Edit`, urutan: 1000, aktif: 1, mode_tarif: 'langsung' },
    });
    expect(ok.status(), await ok.text()).toBe(200);

    const bad = await request.put(`${BASE_URL}/api/jenis-retribusi/${createdId}`, {
      data: { kawasan_id: kawasanId, nama: `${nama} Edit`, mode_tarif: 'kuantitas', tarif: 0 },
    });
    expect(bad.status()).toBe(400);
  });

  test('admin soft-delete jenis (aktif=0)', async ({ request }) => {
    await apiLogin(request, 'admin');
    const res = await request.delete(`${BASE_URL}/api/jenis-retribusi/${createdId}`);
    expect(res.status(), await res.text()).toBe(200);
    const list = await request.get(`${BASE_URL}/api/jenis-retribusi`, { params: { kawasan_id: String(kawasanId) } });
    const row = ((await list.json()) as { data: { id: number; aktif: number }[] }).data.find((r) => r.id === createdId);
    expect(row?.aktif).toBe(0);
  });

  test('validasi: kawasan wajib & nama wajib', async ({ request }) => {
    await apiLogin(request, 'admin');
    const r1 = await request.post(`${BASE_URL}/api/jenis-retribusi`, {
      data: { nama: `${TAG} x`, mode_tarif: 'langsung' },
    });
    expect(r1.status()).toBe(400);
    const r2 = await request.post(`${BASE_URL}/api/jenis-retribusi`, {
      data: { kawasan_id: kawasanId, nama: '', mode_tarif: 'langsung' },
    });
    expect(r2.status()).toBe(400);
  });

  test('halaman /jenis-retribusi tampil untuk admin (UI)', async ({ page, request }) => {
    await authPage(page, request, 'admin');
    await page.goto('/jenis-retribusi');
    await expect(page.getByRole('heading', { name: 'Jenis Retribusi' })).toBeVisible({ timeout: 15000 });
  });
});