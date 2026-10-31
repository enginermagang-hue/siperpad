import { test, expect } from '@playwright/test';
import { USERS, loginViaUI, attemptLoginUI, authPage, BASE_URL } from './helpers';

test.describe('Auth — login & session', () => {
  test('halaman login tampil untuk pengunjung', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Masuk', exact: true })).toBeVisible();
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
  });

  test('login gagal menampilkan pesan error', async ({ page }) => {
    await attemptLoginUI(page, 'tidak-ada@mail.com', 'salah123');
    await expect(page.getByRole('alert')).toContainText(/salah/i);
  });

  for (const who of ['admin', 'petugasLasiana', 'kepala'] as const) {
    test(`login ${USERS[who].role} (${who}) via UI berhasil ke dashboard`, async ({ page }) => {
      await loginViaUI(page, who);
      await expect(page).toHaveURL('/', { timeout: 15000 });
      await expect(page.getByRole('heading', { name: 'DASHBOARD UTAMA' })).toBeVisible({ timeout: 15000 });
    });
  }

  test('pengunjung tanpa sesi diarahkan ke /login', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/login/, { timeout: 15000 });
  });

  test('API /api/auth/me menolak tanpa sesi (401)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/auth/me`);
    expect(res.status()).toBe(401);
  });
});

test.describe('Guard role — middleware & API', () => {
  test('petugas tidak bisa akses /pengguna (redirect /)', async ({ page, request }) => {
    await authPage(page, request, 'petugasLasiana');
    await page.goto('/pengguna');
    await expect(page).not.toHaveURL(/\/pengguna/);
  });

  test('kepala tidak bisa akses /verifikasi (redirect /)', async ({ page, request }) => {
    await authPage(page, request, 'kepala');
    await page.goto('/verifikasi');
    await expect(page).not.toHaveURL(/\/verifikasi/);
  });

  test('kepala dilarang verifikasi via API (403)', async ({ request }) => {
    const killer = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: USERS.kepala.email, password: USERS.kepala.password },
    });
    expect(killer.ok()).toBeTruthy();
    const res = await request.post(`${BASE_URL}/api/realisasi/999999/verifikasi`, {
      data: { aksi: 'disetujui' },
    });
    expect(res.status()).toBe(403);
  });

  test('petugas dilarang akses API admin (403 users & target)', async ({ request }) => {
    const ok = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: USERS.petugasLasiana.email, password: USERS.petugasLasiana.password },
    });
    expect(ok.ok()).toBeTruthy();
    const users = await request.get(`${BASE_URL}/api/users`);
    expect(users.status()).toBe(403);
    const target = await request.post(`${BASE_URL}/api/target`, {
      data: { jenis_retribusi_id: 1, tahun: 2099, nilai: 1000 },
    });
    expect(target.status()).toBe(403);
  });

  test('admin bisa akses /pengguna & /verifikasi', async ({ page, request }) => {
    await authPage(page, request, 'admin');
    await page.goto('/pengguna');
    await expect(page.getByRole('heading', { name: 'Pengguna' })).toBeVisible({ timeout: 15000 });
    await page.goto('/verifikasi');
    await expect(page.getByRole('heading', { name: 'Verifikasi' })).toBeVisible({ timeout: 15000 });
  });
});
