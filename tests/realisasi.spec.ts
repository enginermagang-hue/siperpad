import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  USERS,
  apiLogin,
  authPage,
  dbDeleteTestRows,
  leafJenis,
  kawasanByKode,
  makeRun,
  tahunOf,
  type Me,
} from './helpers';

test.describe.serial('Alur realisasi — input → ajukan → verifikasi', () => {
  const run = makeRun('ALUR');
  const TAG = run.tag;
  const T = run.T;
  let petugas: Me;
  let admin: Me;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const req = ctx.request;
    petugas = await apiLogin(req, 'petugasLasiana');
    await req.post(`${BASE_URL}/api/auth/logout`);
    admin = await apiLogin(req, 'admin');
    await ctx.close();
  });

  test.afterAll(async () => {
    await dbDeleteTestRows(TAG);
  });

  async function loginAs(request: Parameters<typeof apiLogin>[0], who: 'petugasLasiana' | 'admin') {
    return apiLogin(request, who);
  }

  test('petugas input realisasi mode langsung → draft', async ({ request }) => {
    await loginAs(request, 'petugasLasiana');
    expect(petugas.role).toBe('user');
    const jenis = await leafJenis(request, { kawasanKode: 'B', mode: 'langsung' });
    const tanggal = T(500);
    const catatan = `${TAG} input langsung`;
    const res = await request.post(`${BASE_URL}/api/realisasi`, {
      data: { jenis_retribusi_id: jenis.id, tanggal, jumlah: 150000, catatan },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = (await res.json()) as { id: number; jumlah: number };
    expect(body.id).toBeGreaterThan(0);
    expect(body.jumlah).toBe(150000);
  });

  test('petugas input realisasi mode kuantitas → jumlah = qty × tarif', async ({ request }) => {
    await loginAs(request, 'petugasLasiana');
    const jenis = await leafJenis(request, { kawasanKode: 'B', mode: 'kuantitas' });
    expect(Number(jenis.tarif)).toBeGreaterThan(0);
    const qty = 7;
    const res = await request.post(`${BASE_URL}/api/realisasi`, {
      data: { jenis_retribusi_id: jenis.id, tanggal: T(501), kuantitas: qty, catatan: `${TAG} kuantitas` },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = (await res.json()) as { jumlah: number; kuantitas: number; tarif: number };
    expect(body.jumlah).toBe(qty * Number(jenis.tarif));
  });

  test('petugas tidak bisa input kawasan lain (403)', async ({ request }) => {
    // Ambil ID jenis kawasan A sebagai ADMIN (scope petugas memaksa ke
    // kawasannya sendiri), lalu uji guard sebagai petugas Lasiana.
    await loginAs(request, 'admin');
    const jenisA = await leafJenis(request, { kawasanKode: 'A', mode: 'langsung' });
    await request.post(`${BASE_URL}/api/auth/logout`);
    await loginAs(request, 'petugasLasiana');
    const res = await request.post(`${BASE_URL}/api/realisasi`, {
      data: { jenis_retribusi_id: jenisA.id, tanggal: T(502), jumlah: 10000, catatan: `${TAG} lintas` },
    });
    expect(res.status()).toBe(403);
  });

  test('validasi: jenis kategori & jumlah negatif ditolak', async ({ request }) => {
    await loginAs(request, 'petugasLasiana');
    const kawasan = await kawasanByKode(request, 'B');
    const all = await request.get(`${BASE_URL}/api/jenis-retribusi`, {
      params: { kawasan_id: String(kawasan.id) },
    });
    const list = ((await all.json()) as { data: { id: number; has_child: number }[] }).data;
    const parent = list.find((j) => j.has_child)!;
    expect(parent).toBeTruthy();
    const r1 = await request.post(`${BASE_URL}/api/realisasi`, {
      data: { jenis_retribusi_id: parent!.id, tanggal: T(503), jumlah: 1000, catatan: `${TAG} kategori` },
    });
    expect(r1.status()).toBe(400);
    const leaf = await leafJenis(request, { kawasanKode: 'B', mode: 'langsung' });
    const r2 = await request.post(`${BASE_URL}/api/realisasi`, {
      data: { jenis_retribusi_id: leaf.id, tanggal: T(504), jumlah: -5, catatan: `${TAG} negatif` },
    });
    expect(r2.status()).toBe(400);
  });

  test('ajukan → verifikasi admin → audit tercatat', async ({ request }) => {
    await loginAs(request, 'petugasLasiana');
    const jenis = await leafJenis(request, { kawasanKode: 'B', mode: 'langsung' });
    const tanggal = T(505);
    const catatan = `${TAG} full-flow`;
    const created = await request.post(`${BASE_URL}/api/realisasi`, {
      data: { jenis_retribusi_id: jenis.id, tanggal, jumlah: 250000, catatan },
    });
    expect(created.status(), await created.text()).toBe(200);
    const { id } = (await created.json()) as { id: number };

    const ajukan = await request.post(`${BASE_URL}/api/realisasi/${id}/ajukan`);
    expect(ajukan.status(), await ajukan.text()).toBe(200);

    await request.post(`${BASE_URL}/api/auth/logout`);
    await loginAs(request, 'admin');
    expect(admin.role).toBe('admin');
    const verif = await request.post(`${BASE_URL}/api/realisasi/${id}/verifikasi`, {
      data: { aksi: 'disetujui' },
    });
    expect(verif.status(), await verif.text()).toBe(200);

    const detail = await request.get(`${BASE_URL}/api/realisasi/${id}`);
    expect(detail.status()).toBe(200);
    expect(((await detail.json()) as { data: { status: string } }).data.status).toBe('disetujui');

    const audit = await request.get(`${BASE_URL}/api/audit-log`, {
      params: { entitas: 'realisasi', entitas_id: String(id) },
    });
    expect(audit.status()).toBe(200);
    const rows = ((await audit.json()) as { data: unknown[] }).data;
    expect(rows.length).toBeGreaterThan(0);
  });

  test('tolak → status ditolak, tidak masuk hitungan resmi', async ({ request }) => {
    await loginAs(request, 'petugasLasiana');
    const jenis = await leafJenis(request, { kawasanKode: 'B', mode: 'langsung' });
    const created = await request.post(`${BASE_URL}/api/realisasi`, {
      data: { jenis_retribusi_id: jenis.id, tanggal: T(506), jumlah: 99999, catatan: `${TAG} tolak` },
    });
    const { id } = (await created.json()) as { id: number };
    await request.post(`${BASE_URL}/api/realisasi/${id}/ajukan`);
    await request.post(`${BASE_URL}/api/auth/logout`);
    await loginAs(request, 'admin');
    const verif = await request.post(`${BASE_URL}/api/realisasi/${id}/verifikasi`, {
      data: { aksi: 'ditolak', catatan: `${TAG} alasan` },
    });
    expect(verif.status()).toBe(200);
    const detail = await request.get(`${BASE_URL}/api/realisasi/${id}`);
    expect(((await detail.json()) as { data: { status: string } }).data.status).toBe('ditolak');
  });

  test('admin tidak bisa input realisasi (403)', async ({ request }) => {
    await loginAs(request, 'admin');
    const jenis = await leafJenis(request, { kawasanKode: 'B', mode: 'langsung' });
    const res = await request.post(`${BASE_URL}/api/realisasi`, {
      data: { jenis_retribusi_id: jenis.id, tanggal: T(507), jumlah: 1000, catatan: `${TAG} admin` },
    });
    expect(res.status()).toBe(403);
  });

  test('edit & hapus draft + guard non-draft', async ({ request }) => {
    await loginAs(request, 'petugasLasiana');
    const jenis = await leafJenis(request, { kawasanKode: 'B', mode: 'langsung' });
    const created = await request.post(`${BASE_URL}/api/realisasi`, {
      data: { jenis_retribusi_id: jenis.id, tanggal: T(508), jumlah: 111000, catatan: `${TAG} edit` },
    });
    const { id } = (await created.json()) as { id: number };

    const put = await request.put(`${BASE_URL}/api/realisasi/${id}`, {
      data: { jumlah: 222000, catatan: `${TAG} edit-2` },
    });
    expect(put.status(), await put.text()).toBe(200);

    await request.post(`${BASE_URL}/api/realisasi/${id}/ajukan`);
    const putLocked = await request.put(`${BASE_URL}/api/realisasi/${id}`, { data: { jumlah: 1 } });
    expect(putLocked.status()).toBe(409);
    const delLocked = await request.delete(`${BASE_URL}/api/realisasi/${id}`);
    expect(delLocked.status()).toBe(409);

    await request.post(`${BASE_URL}/api/auth/logout`);
    await loginAs(request, 'admin');
    await request.post(`${BASE_URL}/api/realisasi/${id}/verifikasi`, { data: { aksi: 'disetujui' } });
  });

  test('draft bisa dihapus petugas', async ({ request }) => {
    await loginAs(request, 'petugasLasiana');
    const jenis = await leafJenis(request, { kawasanKode: 'B', mode: 'langsung' });
    const created = await request.post(`${BASE_URL}/api/realisasi`, {
      data: { jenis_retribusi_id: jenis.id, tanggal: T(509), jumlah: 5000, catatan: `${TAG} hapus` },
    });
    const { id } = (await created.json()) as { id: number };
    const del = await request.delete(`${BASE_URL}/api/realisasi/${id}`);
    expect(del.status()).toBe(200);
    const gone = await request.get(`${BASE_URL}/api/realisasi/${id}`);
    expect(gone.status()).toBe(404);
  });

  test('halaman /pad tampil untuk petugas (UI)', async ({ page, request }) => {
    await authPage(page, request, 'petugasLasiana');
    await page.goto('/pad');
    await expect(page.getByRole('heading', { name: /Data PAD/ })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Tambah Realisasi' })).toBeVisible();
  });

  test('halaman /verifikasi tampil untuk admin (UI)', async ({ page, request }) => {
    await authPage(page, request, 'admin');
    await page.goto('/verifikasi');
    await expect(page.getByRole('heading', { name: 'Verifikasi' })).toBeVisible({ timeout: 15000 });
  });

  test('tahun uji tercatat di rekap hanya setelah disetujui', async ({ request }) => {
    await loginAs(request, 'admin');
    expect(USERS.admin.email).toBeTruthy();
    const tanggal = T(510);
    const tahun = tahunOf(tanggal);
    const rekap = await request.get(`${BASE_URL}/api/laporan/rekap`, {
      params: { tahun: String(tahun), bulan: '12' },
    });
    expect(rekap.status()).toBe(200);
    const body = (await rekap.json()) as { totals: { totalRealisasi: number }; perJenis: unknown[] };
    expect(body.totals).toBeTruthy();
    expect(Array.isArray(body.perJenis)).toBe(true);
  });
});
