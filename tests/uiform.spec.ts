import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  USERS,
  apiLogin,
  authPage,
  dbDeleteTestRows,
  leafJenis,
  makeRun,
} from './helpers';

test.describe.serial('UI input realisasi petugas (end-to-end form)', () => {
  const run = makeRun('UIFORM');
  const TAG = run.tag;
  const T = run.T;

  test.afterAll(async () => {
    await dbDeleteTestRows(TAG);
  });

  test('petugas isi form Tambah Realisasi → toast sukses → baris muncul', async ({ page, request }) => {
    await authPage(page, request, 'petugasLasiana');
    await apiLogin(request, 'petugasLasiana');
    const jenis = await leafJenis(request, { kawasanKode: 'B', mode: 'langsung' });
    const tanggal = T(900);
    const catatan = `${TAG} ui form`;

    await page.goto('/pad');
    await expect(page.getByRole('heading', { name: /Data PAD/ })).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle');
    const btn = page.getByRole('button', { name: 'Tambah Realisasi' });
    await expect(btn).toBeVisible({ timeout: 15000 });
    await btn.click();

    // AppDialog: Teleport ke body, panel punya aria-label judul dialog.
    const panel = page.getByRole('dialog', { name: 'Tambah Realisasi' });
    await expect(panel).toBeVisible({ timeout: 15000 });
    await panel.locator('select').first().selectOption(String(jenis.id), { force: true });
    await panel.locator('input[type="date"]').fill(tanggal);
    const rupiah = panel.locator('input[inputmode="numeric"]');
    await rupiah.fill('250000');
    await panel.locator('input[type="text"]').last().fill(catatan);
    await panel.getByRole('button', { name: 'Simpan', exact: true }).click();

    await expect(page.getByRole('status')).toContainText(/ditambahkan/i, { timeout: 15000 });
  });

  test('baris uji terverifikasi muncul di laporan admin (UI)', async ({ page, request }) => {
    await apiLogin(request, 'petugasLasiana');
    const jenis = await leafJenis(request, { kawasanKode: 'B', mode: 'langsung' });
    const tanggal = T(901);
    const created = await request.post(`${BASE_URL}/api/realisasi`, {
      data: { jenis_retribusi_id: jenis.id, tanggal, jumlah: 313000, catatan: `${TAG} tampil` },
    });
    expect(created.ok()).toBeTruthy();
    const { id } = (await created.json()) as { id: number };
    await request.post(`${BASE_URL}/api/realisasi/${id}/ajukan`);
    await request.post(`${BASE_URL}/api/auth/logout`);
    await apiLogin(request, 'admin');
    await request.post(`${BASE_URL}/api/realisasi/${id}/verifikasi`, { data: { aksi: 'disetujui' } });

    await authPage(page, request, 'admin');
    await expect(USERS.admin.email).toBeTruthy();
    await page.goto('/laporan');
    await expect(page.getByRole('heading', { name: 'Laporan Rekap PAD' })).toBeVisible({ timeout: 15000 });
  });
});
