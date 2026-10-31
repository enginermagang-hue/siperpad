import { test, expect } from '@playwright/test';
import { authPage } from './helpers';

test.describe('Verifikasi pages — UI smoke', () => {
  test('admin bisa buka halaman Verifikasi (realisasi diajukan)', async ({ page, request }) => {
    await authPage(page, request, 'admin');
    await page.goto('/verifikasi');
    await expect(page.getByRole('heading', { name: 'Verifikasi' })).toBeVisible({ timeout: 15000 });
  });

  test('admin bisa buka Kunci Periode', async ({ page, request }) => {
    await authPage(page, request, 'admin');
    await page.goto('/verifikasi/periode');
    await expect(page.getByRole('heading', { name: 'Kunci Periode' })).toBeVisible({ timeout: 15000 });
  });

  test('admin bisa buka Catatan Temuan', async ({ page, request }) => {
    await authPage(page, request, 'admin');
    await page.goto('/verifikasi/catatan');
    await expect(page.getByRole('heading', { name: 'Catatan Temuan' })).toBeVisible({ timeout: 15000 });
  });

  test('admin bisa buka Audit Trail', async ({ page, request }) => {
    await authPage(page, request, 'admin');
    await page.goto('/verifikasi/audit');
    await expect(page.getByRole('heading', { name: /Audit/i })).toBeVisible({ timeout: 15000 });
  });

  test('kepala & petugas tidak bisa buka /verifikasi (redirect)', async ({ page, request }) => {
    for (const who of ['kepala', 'petugasLasiana'] as const) {
      await authPage(page, request, who);
      await page.goto('/verifikasi');
      await expect(page).not.toHaveURL(/\/verifikasi/);
    }
  });
});