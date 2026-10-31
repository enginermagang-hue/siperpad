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
  bulanOf,
} from './helpers';

test.describe.serial('Kunci periode & guard lock', () => {
  const run = makeRun('LOCK');
  const TAG = run.tag;
  const T = run.T;
  let kawasanId: number;
  let tahunUji: number;
  let bulanUji: number;
  let lockId = 0;
  let pendingId = 0;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const req = ctx.request;
    await apiLogin(req, 'petugasLasiana');
    kawasanId = (await kawasanByKode(req, 'B')).id;
    await ctx.close();
  });

  test.afterAll(async () => {
    await dbDeleteTestRows(TAG);
  });

  test('lock ditolak bila masih ada draft/diajukan (409)', async ({ request }) => {
    await apiLogin(request, 'petugasLasiana');
    const jenis = await leafJenis(request, { kawasanKode: 'B', mode: 'langsung' });
    const tanggal = T(700);
    tahunUji = tahunOf(tanggal);
    bulanUji = bulanOf(tanggal);
    kawasanId = (await kawasanByKode(request, 'B')).id;
    const created = await request.post(`${BASE_URL}/api/realisasi`, {
      data: { jenis_retribusi_id: jenis.id, tanggal, jumlah: 50000, catatan: `${TAG} pending` },
    });
    expect(created.status(), await created.text()).toBe(200);
    pendingId = ((await created.json()) as { id: number }).id;
    await request.post(`${BASE_URL}/api/realisasi/${pendingId}/ajukan`);
    await request.post(`${BASE_URL}/api/auth/logout`);

    await apiLogin(request, 'admin');
    const lock = await request.post(`${BASE_URL}/api/periode-lock`, {
      data: { tahun: tahunUji, bulan: bulanUji, kawasan_id: kawasanId },
    });
    expect(lock.status()).toBe(409);
  });

  test('lock berhasil setelah diverifikasi, input baru ditolak (409)', async ({ request }) => {
    await apiLogin(request, 'admin');
    const verif = await request.post(`${BASE_URL}/api/realisasi/${pendingId}/verifikasi`, {
      data: { aksi: 'disetujui' },
    });
    expect(verif.status(), await verif.text()).toBe(200);
    const lock = await request.post(`${BASE_URL}/api/periode-lock`, {
      data: { tahun: tahunUji, bulan: bulanUji, kawasan_id: kawasanId },
    });
    expect(lock.status(), await lock.text()).toBe(200);

    const list = await request.get(`${BASE_URL}/api/periode-lock`, { params: { tahun: String(tahunUji) } });
    const locks = ((await list.json()) as { data: { id: number; bulan: number; kawasan_id: number }[] }).data;
    lockId = locks.find((l) => l.bulan === bulanUji && l.kawasan_id === kawasanId)?.id ?? 0;
    expect(lockId).toBeGreaterThan(0);

    await request.post(`${BASE_URL}/api/auth/logout`);
    await apiLogin(request, 'petugasLasiana');
    const jenis = await leafJenis(request, { kawasanKode: 'B', mode: 'langsung' });
    const blocked = await request.post(`${BASE_URL}/api/realisasi`, {
      data: { jenis_retribusi_id: jenis.id, tanggal: `${tahunUji}-${String(bulanUji).padStart(2, '0')}-15`, jumlah: 1000, catatan: `${TAG} blocked` },
    });
    expect(blocked.status()).toBe(409);
  });

  test('buka kunci berhasil, input jalan lagi', async ({ request }) => {
    await apiLogin(request, 'admin');
    const un = await request.delete(`${BASE_URL}/api/periode-lock/${lockId}`);
    expect(un.status(), await un.text()).toBe(200);
    await request.post(`${BASE_URL}/api/auth/logout`);
    await apiLogin(request, 'petugasLasiana');
    const jenis = await leafJenis(request, { kawasanKode: 'B', mode: 'langsung' });
    const ok = await request.post(`${BASE_URL}/api/realisasi`, {
      data: { jenis_retribusi_id: jenis.id, tanggal: T(701), jumlah: 12000, catatan: `${TAG} after-unlock` },
    });
    expect(ok.status(), await ok.text()).toBe(200);
  });

  test('halaman /verifikasi/periode tampil untuk admin (UI)', async ({ page, request }) => {
    await authPage(page, request, 'admin');
    await page.goto('/verifikasi/periode');
    await expect(page.getByRole('heading', { name: 'Kunci Periode' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Kunci Periode' })).toBeVisible();
  });
});
