import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  apiLogin,
  authPage,
  dbDeleteTestRows,
  leafJenis,
  makeRun,
  tahunOf,
  bulanOf,
} from './helpers';

test.describe.serial('Laporan, rekap & export', () => {
  const run = makeRun('LAPOR');
  const TAG = run.tag;
  const T = run.T;
  let tahunUji: number;
  let bulanUji: number;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const req = ctx.request;
    await apiLogin(req, 'petugasLasiana');
    const jenis = await leafJenis(req, { kawasanKode: 'B', mode: 'langsung' });
    const tanggal = T(600);
    tahunUji = tahunOf(tanggal);
    bulanUji = bulanOf(tanggal);
    const created = await req.post(`${BASE_URL}/api/realisasi`, {
      data: { jenis_retribusi_id: jenis.id, tanggal, jumlah: 777000, catatan: `${TAG} rekap` },
    });
    if (!created.ok()) throw new Error(`setup realisasi: ${created.status()} ${await created.text()}`);
    const { id } = (await created.json()) as { id: number };
    await req.post(`${BASE_URL}/api/realisasi/${id}/ajukan`);
    await req.post(`${BASE_URL}/api/auth/logout`);
    await apiLogin(req, 'admin');
    const verif = await req.post(`${BASE_URL}/api/realisasi/${id}/verifikasi`, {
      data: { aksi: 'disetujui' },
    });
    if (!verif.ok()) throw new Error(`setup verifikasi: ${verif.status()} ${await verif.text()}`);
    await ctx.close();
  });

  test.afterAll(async () => {
    await dbDeleteTestRows(TAG);
  });

  test('rekap API mengembalikan struktur lengkap', async ({ request }) => {
    await apiLogin(request, 'admin');
    const res = await request.get(`${BASE_URL}/api/laporan/rekap`, {
      params: { tahun: String(tahunUji), bulan: String(bulanUji) },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      perJenis: unknown[];
      totals: { totalTarget: number; totalRealisasi: number };
      timeseries: unknown[];
      kumulatif: unknown;
      mingguan: unknown[];
      topKontributor: unknown[];
      banding: unknown;
    };
    expect(Array.isArray(body.perJenis)).toBe(true);
    expect(body.totals.totalRealisasi).toBeGreaterThan(0);
    expect(Array.isArray(body.timeseries)).toBe(true);
  });

  test('banding API membandingkan dua bulan', async ({ request }) => {
    await apiLogin(request, 'admin');
    const b = bulanUji === 12 ? 11 : bulanUji + 1;
    const res = await request.get(`${BASE_URL}/api/laporan/bandingkan`, {
      params: { tahun: String(tahunUji), bulan_a: String(bulanUji), bulan_b: String(b) },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { total: { a: number; b: number }; perJenis: unknown[] };
    expect(body.total).toBeTruthy();
    expect(Array.isArray(body.perJenis)).toBe(true);
  });

  test('export CSV admin berhasil (isi valid)', async ({ request }) => {
    await apiLogin(request, 'admin');
    const res = await request.get(`${BASE_URL}/api/laporan/export`, {
      params: { format: 'csv', tahun: String(tahunUji), bulan: String(bulanUji) },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/csv');
    const text = await res.text();
    expect(text.split('\n')[0]).toContain('Kode');
  });

  test('export XLSX admin berhasil (magic bytes zip)', async ({ request }) => {
    await apiLogin(request, 'admin');
    const res = await request.get(`${BASE_URL}/api/laporan/export`, {
      params: { format: 'xlsx', tahun: String(tahunUji), bulan: String(bulanUji) },
    });
    expect(res.status()).toBe(200);
    const buf = await res.body();
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });

  test('export PDF admin berhasil (header %PDF)', async ({ request }) => {
    await apiLogin(request, 'admin');
    const res = await request.get(`${BASE_URL}/api/laporan/export`, {
      params: { format: 'pdf', tahun: String(tahunUji), bulan: String(bulanUji) },
    });
    expect(res.status(), await res.text()).toBe(200);
    const text = await res.text();
    expect(text.startsWith('%PDF')).toBe(true);
  });

  test('petugas dilarang export (403)', async ({ request }) => {
    await apiLogin(request, 'petugasLasiana');
    const res = await request.get(`${BASE_URL}/api/laporan/export`, {
      params: { format: 'csv', tahun: String(tahunUji), bulan: String(bulanUji) },
    });
    expect(res.status()).toBe(403);
  });

  test('halaman /laporan tampil dengan tabel rekap (UI)', async ({ page, request }) => {
    await authPage(page, request, 'admin');
    await page.goto('/laporan');
    await expect(page.getByRole('heading', { name: 'Laporan Rekap PAD' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'CSV' })).toBeVisible();
  });

  test('halaman dashboard tampil dengan KPI (UI)', async ({ page, request }) => {
    await authPage(page, request, 'kepala');
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'DASHBOARD UTAMA' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Target Penerimaan/)).toBeVisible({ timeout: 15000 });
  });
});
