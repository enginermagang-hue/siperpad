import { test, expect } from '@playwright/test';
import { BASE_URL, apiLogin, authPage, dbDeleteTestRows, makeRun } from './helpers';

test.describe.serial('Settings — ganti password', () => {
  const run = makeRun('SET');
  const TAG = run.tag;
  const email = `${TAG.toLowerCase().replace(/[^a-z0-9]/g, '')}@mail.com`;
  const oldPw = '123456';
  const newPw = 'newpass789';

  test.afterAll(async () => {
    await dbDeleteTestRows(TAG);
  });

  test('setup: buat user uji', async ({ request }) => {
    await apiLogin(request, 'admin');
    const kawasan = await request.get(`${BASE_URL}/api/kawasan`);
    const kw = ((await kawasan.json()) as { data: { id: number }[] }).data[0]!;
    const res = await request.post(`${BASE_URL}/api/users`, {
      data: { nama: `${TAG} User`, nip: '0', email, password: oldPw, role: 'user', kawasan_id: kw.id, aktif: 1 },
    });
    expect(res.status(), await res.text()).toBe(200);
  });

  test('ganti password: validasi pendek & salah lama', async ({ request }) => {
    const login = await request.post(`${BASE_URL}/api/auth/login`, { data: { email, password: oldPw } });
    expect(login.ok()).toBeTruthy();
    const short = await request.post(`${BASE_URL}/api/auth/change-password`, {
      data: { current_password: oldPw, new_password: '123' },
    });
    expect(short.status()).toBe(400);
    const wrong = await request.post(`${BASE_URL}/api/auth/change-password`, {
      data: { current_password: 'salah', new_password: newPw },
    });
    expect(wrong.status()).toBe(401);
  });

  test('ganti password berhasil → login baru ok, lama gagal', async ({ request }) => {
    const login = await request.post(`${BASE_URL}/api/auth/login`, { data: { email, password: oldPw } });
    expect(login.ok()).toBeTruthy();
    const chg = await request.post(`${BASE_URL}/api/auth/change-password`, {
      data: { current_password: oldPw, new_password: newPw },
    });
    expect(chg.status(), await chg.text()).toBe(200);

    await request.post(`${BASE_URL}/api/auth/logout`);
    const newLogin = await request.post(`${BASE_URL}/api/auth/login`, { data: { email, password: newPw } });
    expect(newLogin.ok()).toBeTruthy();

    await request.post(`${BASE_URL}/api/auth/logout`);
    const oldLogin = await request.post(`${BASE_URL}/api/auth/login`, { data: { email, password: oldPw } });
    expect(oldLogin.status()).toBe(401);
  });

  test('halaman /settings tampil (UI)', async ({ page, request }) => {
    await authPage(page, request, 'admin');
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Pengaturan' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Ganti Password' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Info Sistem' })).toBeVisible();
  });
});